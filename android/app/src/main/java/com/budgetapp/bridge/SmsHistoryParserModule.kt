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
        logBuilder.append("=== BudgetApp SMS & MMS Sync Diagnostic Log ===\n")
        logBuilder.append("Device: ").append(Build.MANUFACTURER ?: "").append(" ").append(Build.MODEL ?: "").append("\n")
        logBuilder.append("Android SDK: ").append(Build.VERSION.SDK_INT.toString()).append("\n")

        // 가입(닉네임 설정) 달의 1일 시작일 계산 (예: 2026-10-13 -> 2026-10-01)
        val monthStartDateStr = if (targetDateStr.length >= 7) "${targetDateStr.substring(0, 7)}-01" else SimpleDateFormat("yyyy-MM-01", Locale.getDefault()).format(Date())
        logBuilder.append("Target Date Filter: ").append(targetDateStr).append(" (Strictly Syncing from ").append(monthStartDateStr).append(" onwards)\n\n")

        try {
            val contentResolver: ContentResolver = reactContext.contentResolver

            var parsedCount = 0
            var scannedCount = 0
            val processedBodies = HashSet<String>()

            // 1. MMS 수신함 독립 조회
            logBuilder.append("--- 1. Querying MMS (content://mms) ---\n")
            try {
                val mmsUri = Uri.parse("content://mms")
                val mmsCursor = contentResolver.query(
                    mmsUri,
                    arrayOf("_id", "date"),
                    null,
                    null,
                    "date DESC LIMIT 150"
                )

                if (mmsCursor != null) {
                    logBuilder.append("MMS row count: ").append(mmsCursor.count.toString()).append("\n")
                    mmsCursor.use { cursor ->
                        val idIndex = cursor.getColumnIndex("_id")
                        val dateIndex = cursor.getColumnIndex("date")

                        while (cursor.moveToNext()) {
                            val mmsId = if (idIndex != -1) cursor.getString(idIndex) ?: "" else continue
                            var mmsTime = if (dateIndex != -1) cursor.getLong(dateIndex) else 0L

                            if (mmsTime in 1..9999999999L) {
                                mmsTime *= 1000L
                            }

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
                                scannedCount++

                                val fallbackTime = if (mmsTime > 0) mmsTime else System.currentTimeMillis()
                                val result = FinancialTextParser.parse(body, fallbackTime)
                                if (result.isPayment) {
                                    // 엄격한 시작일 체크: 가입월 1일 이상(result.dateStr >= monthStartDateStr)만 인정
                                    val matchDate = result.dateStr >= monthStartDateStr

                                    logBuilder.append("[MMS Match Found] Date: ").append(result.dateStr)
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
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                logBuilder.append("Error querying MMS: ").append(e.message ?: "").append("\n")
            }

            // 2. SMS 수신함 독립 조회 (content://sms/inbox)
            logBuilder.append("\n--- 2. Querying SMS Inbox (content://sms/inbox) ---\n")
            try {
                val smsUri = Uri.parse("content://sms/inbox")
                val smsCursor = contentResolver.query(
                    smsUri,
                    arrayOf("body", "date"),
                    null,
                    null,
                    "date DESC LIMIT 200"
                )

                if (smsCursor != null) {
                    logBuilder.append("SMS row count: ").append(smsCursor.count.toString()).append("\n")
                    smsCursor.use { cursor ->
                        val bodyIndex = cursor.getColumnIndex("body")
                        val dateIndex = cursor.getColumnIndex("date")

                        while (cursor.moveToNext()) {
                            val body = if (bodyIndex != -1) cursor.getString(bodyIndex) ?: "" else ""
                            var smsTime = if (dateIndex != -1) cursor.getLong(dateIndex) else 0L

                            if (body.isBlank()) continue
                            if (processedBodies.contains(body)) continue
                            processedBodies.add(body)
                            scannedCount++

                            if (smsTime in 1..9999999999L) {
                                smsTime *= 1000L
                            }

                            val fallbackTime = if (smsTime > 0) smsTime else System.currentTimeMillis()
                            val result = FinancialTextParser.parse(body, fallbackTime)

                            if (result.isPayment) {
                                // 엄격한 시작일 체크: 가입월 1일 이상(result.dateStr >= monthStartDateStr)만 인정
                                val matchDate = result.dateStr >= monthStartDateStr

                                logBuilder.append("[SMS Match Found] Date: ").append(result.dateStr)
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
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                logBuilder.append("Error querying SMS: ").append(e.message ?: "").append("\n")
            }

            // 3. 삼성 기본 '메세지' 어플 대화 저장소 조회
            val conversationUris = listOf(
                Pair("content://mms-sms/complete-conversations", Uri.parse("content://mms-sms/complete-conversations")),
                Pair("content://mms-sms/conversations", Uri.parse("content://mms-sms/conversations"))
            )

            for (pair in conversationUris) {
                val uriName = pair.first
                val uri = pair.second

                logBuilder.append("\n--- 3. Querying Messages App Storage (").append(uriName).append(") ---\n")
                try {
                    val cursor = contentResolver.query(
                        uri,
                        arrayOf("body", "date"),
                        null,
                        null,
                        "date DESC LIMIT 200"
                    )

                    if (cursor == null) {
                        logBuilder.append("Cursor is NULL for ").append(uriName).append("\n")
                        continue
                    }

                    logBuilder.append("Conversation row count: ").append(cursor.count.toString()).append("\n")
                    cursor.use { c ->
                        val bodyIndex = c.getColumnIndex("body")
                        val dateIndex = c.getColumnIndex("date")

                        while (c.moveToNext()) {
                            val body = if (bodyIndex != -1) c.getString(bodyIndex) ?: "" else ""
                            var msgTime = if (dateIndex != -1) c.getLong(dateIndex) else 0L

                            if (body.isBlank()) continue
                            if (processedBodies.contains(body)) continue
                            processedBodies.add(body)
                            scannedCount++

                            if (msgTime in 1..9999999999L) {
                                msgTime *= 1000L
                            }

                            val fallbackTime = if (msgTime > 0) msgTime else System.currentTimeMillis()
                            val result = FinancialTextParser.parse(body, fallbackTime)

                            if (result.isPayment) {
                                val matchDate = result.dateStr >= monthStartDateStr

                                logBuilder.append("[Conv Match Found] Date: ").append(result.dateStr)
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

    @ReactMethod
    fun syncSmsHistoryForDate(targetDateStr: String, promise: Promise) {
        syncSmsHistoryWithLog(targetDateStr, promise)
    }
}
