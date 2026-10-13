package com.budgetapp.bridge

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
    fun syncSmsHistoryWithLog(targetDateStr: String, promise: Promise) {
        val logBuilder = StringBuilder()
        logBuilder.append("=== BudgetApp SMS & Push Sync Diagnostic Log ===\n")
        logBuilder.append("Device: ").append(Build.MANUFACTURER).append(" ").append(Build.MODEL).append("\n")
        logBuilder.append("Android SDK: ").append(Build.VERSION.SDK_INT).append("\n")
        logBuilder.append("Target Date Filter: ").append(if (targetDateStr.isBlank()) "ALL" else targetDateStr).append("\n\n")

        try {
            val contentResolver: ContentResolver = reactContext.contentResolver

            val urisToQuery = mapOf(
                "content://sms" to Uri.parse("content://sms"),
                "content://sms/inbox" to Uri.parse("content://sms/inbox"),
                "content://mms-sms/conversations" to Uri.parse("content://mms-sms/conversations")
            )

            var parsedCount = 0
            var scannedCount = 0
            val processedBodies = HashSet<String>()

            for ((uriName, uri) in urisToQuery) {
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

                    logBuilder.append("Cursor row count: ").append(cursor.count).append("\n")

                    cursor.use {
                        val bodyIndex = it.getColumnIndex("body")
                        val dateIndex = it.getColumnIndex("date")

                        while (it.moveToNext()) {
                            scannedCount++
                            val body = if (bodyIndex != -1) it.getString(bodyIndex) ?: "" else ""
                            val smsTime = if (dateIndex != -1) it.getLong(dateIndex) else 0L

                            if (body.isBlank()) continue
                            if (processedBodies.contains(body)) continue
                            processedBodies.add(body)

                            val fallbackTime = if (smsTime > 0) smsTime else System.currentTimeMillis()
                            val smsReceivedDateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(fallbackTime))

                            val result = FinancialTextParser.parse(body, fallbackTime)

                            if (result.isPayment) {
                                val matchDate = targetDateStr.isBlank() || targetDateStr == "ALL" || result.dateStr == targetDateStr || smsReceivedDateStr.startsWith(targetDateStr)
                                logBuilder.append("[Match Found] Time: ").append(smsReceivedDateStr)
                                    .append(" | Card: ").append(result.cardCompany)
                                    .append(" | Amount: ").append(result.amount)
                                    .append(" | Merchant: ").append(result.merchant)
                                    .append(" | DateFilterMatch: ").append(matchDate).append("\n")

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
                    logBuilder.append("Error querying ").append(uriName).append(": ").append(e.message).append("\n")
                }
            }

            // 푸시 알림 히스토리 분석
            val pushCount = AppNotificationListener.syncPushHistoryForDate(targetDateStr)
            logBuilder.append("\nPush Notification Sync Count: ").append(pushCount).append("\n")
            logBuilder.append("Total Parsed Card Transactions: ").append(parsedCount + pushCount).append("\n")
            logBuilder.append("=========================================\n")

            val resultMap: WritableMap = Arguments.createMap().apply {
                putInt("count", parsedCount + pushCount)
                putInt("scannedCount", scannedCount)
                putString("debugLog", logBuilder.toString())
            }

            promise.resolve(resultMap)
        } catch (e: Exception) {
            logBuilder.append("\nFatal Sync Error: ").append(e.message).append("\n")
            promise.reject("SMS_SYNC_ERROR", logBuilder.toString(), e)
        }
    }

    @ReactMethod
    fun syncSmsHistoryForDate(targetDateStr: String, promise: Promise) {
        syncSmsHistoryWithLog(targetDateStr, promise)
    }
}
