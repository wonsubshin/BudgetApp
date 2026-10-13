package com.budgetapp.bridge

import android.content.Context
import android.content.ContentResolver
import android.net.Uri
import android.os.Build
import com.budgetapp.notification.AppNotificationListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SmsHistoryParserModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SmsHistoryParserModule"
    }

    @ReactMethod
    fun copyToClipboard(text: String, promise: Promise) {
        try {
            val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("BudgetApp Debug Log", text)
            clipboard.setPrimaryClip(clip)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun syncSmsHistoryWithLog(targetDateStr: String, promise: Promise) {
        val logBuilder = StringBuilder()
        logBuilder.append("=== BudgetApp SMS/MMS & Push Sync Diagnostic Log ===\n")
        logBuilder.append("Device: ").append(Build.MANUFACTURER ?: "").append(" ").append(Build.MODEL ?: "").append("\n")
        logBuilder.append("Android SDK: ").append(Build.VERSION.SDK_INT.toString()).append("\n")
        logBuilder.append("Target Date Filter: ").append(if (targetDateStr.isBlank()) "ALL" else targetDateStr).append("\n\n")

        try {
            val contentResolver: ContentResolver = reactContext.contentResolver

            var parsedCount = 0
            var scannedCount = 0
            val processedBodies = HashSet<String>()

            // 1. MMS 메시지 조회 (삼성/LG 장문 [Web발신] MMS)
            parsedCount += queryMmsMessages(contentResolver, logBuilder, targetDateStr, processedBodies)

            // 2. SMS 메시지 조회 (content://sms)
            val urisToQuery = listOf(
                Pair("content://sms", Uri.parse("content://sms")),
                Pair("content://sms/inbox", Uri.parse("content://sms/inbox"))
            )

            for (pair in urisToQuery) {
                val uriName = pair.first
                val uri = pair.second

                logBuilder.append("--- Querying URI: ").append(uriName).append(" ---\n")
                try {
                    val cursor = contentResolver.query(
                        uri,
                        arrayOf("body", "date"),
                        null,
                        null,
                        "date DESC LIMIT 150"
                    )

                    if (cursor == null) {
                        logBuilder.append("Cursor is NULL for ").append(uriName).append("\n")
                        continue
                    }

                    logBuilder.append("Cursor row count: ").append(cursor.count.toString()).append("\n")

                    cursor.use {
                        val bodyIndex = it.getColumnIndex("body")
                        val dateIndex = it.getColumnIndex("date")

                        while (it.moveToNext()) {
                            scannedCount++
                            val body = if (bodyIndex != -1) it.getString(bodyIndex) ?: "" else ""
                            var smsTime = if (dateIndex != -1) it.getLong(dateIndex) else 0L

                            if (body.isBlank()) continue
                            if (processedBodies.contains(body)) continue
                            processedBodies.add(body)

                            // 10자리(초 단위) 타임스탬프인 경우 밀리초로 변환
                            if (smsTime in 1..9999999999L) {
                                smsTime *= 1000L
                            }

                            val fallbackTime = if (smsTime > 0) smsTime else System.currentTimeMillis()
                            val smsReceivedDateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(fallbackTime))

                            val result = FinancialTextParser.parse(body, fallbackTime)

                            if (result.isPayment) {
                                val matchDate = targetDateStr.isBlank() || targetDateStr == "ALL" || result.dateStr == targetDateStr || smsReceivedDateStr.startsWith(targetDateStr)
                                logBuilder.append("[Match Found] Time: ").append(smsReceivedDateStr)
                                    .append(" | Card: ").append(result.cardCompany)
                                    .append(" | Amount: ").append(result.amount.toString())
                                    .append(" | Merchant: ").append(result.merchant)
                                    .append(" | DateFilterMatch: ").append(matchDate.toString()).append("\n")

                                if (matchDate) {
                                    FinancialParserModule.emitPaymentEvent(
                                        dateStr = result.dateStr,
                                        amount = result.amount,
                                        merchant = result.merchant,
                                        paymentType = "CARD",
                                        cardCompany = result.cardCompany,
                                        installmentType = result.installmentType,
                                        installmentMonths = result.installmentMonths,
                                        createdAtStr = result.createdAtStr
                                    )
                                    parsedCount++
                                }
                            } else {
                                if (body.contains("삼성") || body.contains("현대") || body.contains("신한") || body.contains("국민") || body.contains("승인") || body.contains("결제")) {
                                    logBuilder.append("[Candidate Inspected but Not Parsed] ").append(smsReceivedDateStr).append("\n")
                                    logBuilder.append("   Content: ").append(body.replace("\n", " ")).append("\n")
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    logBuilder.append("Error querying ").append(uriName).append(": ").append(e.message ?: "").append("\n")
                }
            }

            // 푸시 알림 히스토리 분석
            val pushCount = AppNotificationListener.syncPushHistoryForDate(targetDateStr)
            logBuilder.append("\nPush Notification Sync Count: ").append(pushCount.toString()).append("\n")
            logBuilder.append("Total Parsed Card Transactions: ").append((parsedCount + pushCount).toString()).append("\n")
            logBuilder.append("=========================================\n")

            val resultMap: WritableMap = Arguments.createMap().apply {
                putInt("count", parsedCount + pushCount)
                putInt("scannedCount", scannedCount)
                putString("debugLog", logBuilder.toString())
            }

            promise.resolve(resultMap)
        } catch (e: Exception) {
            logBuilder.append("\nFatal Sync Error: ").append(e.message ?: "").append("\n")
            promise.reject("SMS_SYNC_ERROR", logBuilder.toString(), e)
        }
    }

    private fun queryMmsMessages(
        contentResolver: ContentResolver,
        logBuilder: StringBuilder,
        targetDateStr: String,
        processedBodies: HashSet<String>
    ): Int {
        var count = 0
        try {
            logBuilder.append("--- Querying MMS URI: content://mms ---\n")
            val mmsUri = Uri.parse("content://mms")
            val cursor = contentResolver.query(
                mmsUri,
                arrayOf("_id", "date"),
                null,
                null,
                "date DESC LIMIT 100"
            )

            cursor?.use {
                val idIndex = it.getColumnIndex("_id")
                val dateIndex = it.getColumnIndex("date")

                while (it.moveToNext()) {
                    val mmsId = if (idIndex != -1) it.getString(idIndex) ?: "" else continue
                    var mmsTime = if (dateIndex != -1) it.getLong(dateIndex) else 0L

                    // MMS 타임스탬프는 초(Seconds) 단위로 저장되므로 1000을 곱함
                    if (mmsTime in 1..9999999999L) {
                        mmsTime *= 1000L
                    }

                    // MMS 텍스트 파트 파싱 (content://mms/part)
                    val partUri = Uri.parse("content://mms/part")
                    val partCursor = contentResolver.query(
                        partUri,
                        arrayOf("text", "ct"),
                        "mid = ?",
                        arrayOf(mmsId),
                        null
                    )

                    val bodyBuilder = StringBuilder()
                    partCursor?.use { pCursor ->
                        val textIdx = pCursor.getColumnIndex("text")
                        val ctIdx = pCursor.getColumnIndex("ct")
                        while (pCursor.moveToNext()) {
                            val ct = if (ctIdx != -1) pCursor.getString(ctIdx) ?: "" else ""
                            if (ct == "text/plain") {
                                val text = if (textIdx != -1) pCursor.getString(textIdx) ?: "" else ""
                                bodyBuilder.append(text).append("\n")
                            }
                        }
                    }

                    val body = bodyBuilder.toString().trim()
                    if (body.isNotBlank() && !processedBodies.contains(body)) {
                        processedBodies.add(body)
                        val fallbackTime = if (mmsTime > 0) mmsTime else System.currentTimeMillis()
                        val mmsReceivedDateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(fallbackTime))

                        val result = FinancialTextParser.parse(body, fallbackTime)
                        if (result.isPayment) {
                            val matchDate = targetDateStr.isBlank() || targetDateStr == "ALL" || result.dateStr == targetDateStr || mmsReceivedDateStr.startsWith(targetDateStr)
                            logBuilder.append("[MMS Match Found] Time: ").append(mmsReceivedDateStr)
                                .append(" | Card: ").append(result.cardCompany)
                                .append(" | Amount: ").append(result.amount.toString())
                                .append(" | Merchant: ").append(result.merchant)
                                .append(" | DateFilterMatch: ").append(matchDate.toString()).append("\n")

                            if (matchDate) {
                                FinancialParserModule.emitPaymentEvent(
                                    dateStr = result.dateStr,
                                    amount = result.amount,
                                    merchant = result.merchant,
                                    paymentType = "CARD",
                                    cardCompany = result.cardCompany,
                                    installmentType = result.installmentType,
                                    installmentMonths = result.installmentMonths,
                                    createdAtStr = result.createdAtStr
                                )
                                count++
                            }
                        } else {
                            if (body.contains("삼성") || body.contains("현대") || body.contains("신한") || body.contains("국민") || body.contains("승인") || body.contains("결제")) {
                                logBuilder.append("[MMS Candidate Inspected] ").append(mmsReceivedDateStr).append("\n")
                                logBuilder.append("   Content: ").append(body.replace("\n", " ")).append("\n")
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            logBuilder.append("Error querying MMS: ").append(e.message ?: "").append("\n")
        }
        return count
    }

    @ReactMethod
    fun syncSmsHistoryForDate(targetDateStr: String, promise: Promise) {
        syncSmsHistoryWithLog(targetDateStr, promise)
    }
}
