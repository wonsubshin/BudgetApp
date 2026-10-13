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
        logBuilder.append("=== BudgetApp SMS, MMS & RCS (content://im/rcs_read_im) Diagnostic Log ===\n")
        logBuilder.append("Device: ").append(Build.MANUFACTURER ?: "").append(" ").append(Build.MODEL ?: "").append("\n")
        logBuilder.append("Android SDK: ").append(Build.VERSION.SDK_INT.toString()).append("\n")
        logBuilder.append("Target Date Filter: ").append(if (targetDateStr.isBlank()) "ALL" else targetDateStr).append("\n\n")

        try {
            val contentResolver: ContentResolver = reactContext.contentResolver

            var parsedCount = 0
            var scannedCount = 0
            val processedBodies = HashSet<String>()

            // 1. 삼성 갤럭시 RCS 전용 저장소 조회 (content://im/rcs_read_im)
            logBuilder.append("--- 1. Querying Samsung RCS IM Storage (content://im/rcs_read_im) ---\n")
            try {
                val rcsUri = Uri.parse("content://im/rcs_read_im")
                val rcsCursor = contentResolver.query(
                    rcsUri,
                    null,
                    null,
                    null,
                    "date DESC LIMIT 150"
                )

                if (rcsCursor == null) {
                    logBuilder.append("Cursor is NULL for content://im/rcs_read_im\n")
                } else {
                    logBuilder.append("RCS IM row count: ").append(rcsCursor.count.toString()).append("\n")
                    rcsCursor.use { c ->
                        val bodyIndex = if (c.getColumnIndex("body") != -1) c.getColumnIndex("body") else c.getColumnIndex("text")
                        val dateIndex = if (c.getColumnIndex("date") != -1) c.getColumnIndex("date") else c.getColumnIndex("date_sent")

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
                            val msgReceivedDateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(fallbackTime))

                            val result = FinancialTextParser.parse(body, fallbackTime)
                            if (result.isPayment) {
                                val matchDate = targetDateStr.isBlank() || targetDateStr == "ALL" || result.dateStr == targetDateStr || msgReceivedDateStr.startsWith(targetDateStr)
                                logBuilder.append("[RCS IM Match Found] Time: ").append(msgReceivedDateStr)
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
                                    logBuilder.append("[RCS IM Candidate Inspected] ").append(msgReceivedDateStr).append("\n")
                                    logBuilder.append("   Content: ").append(body.replace("\n", " ")).append("\n")
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                logBuilder.append("Error querying content://im/rcs_read_im: ").append(e.message ?: "").append("\n")
            }

            // 2. MMS 수신함 독립 조회 (content://mms)
            logBuilder.append("\n--- 2. Querying MMS (content://mms) ---\n")
            try {
                val mmsUri = Uri.parse("content://mms")
                val mmsCursor = contentResolver.query(
                    mmsUri,
                    arrayOf("_id", "date"),
                    null,
                    null,
                    "date DESC LIMIT 100"
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
                                        parsedCount++
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
                }
            } catch (e: Exception) {
                logBuilder.append("Error querying MMS: ").append(e.message ?: "").append("\n")
            }

            // 3. SMS 수신함 독립 조회 (content://sms/inbox)
            logBuilder.append("\n--- 3. Querying SMS Inbox (content://sms/inbox) ---\n")
            try {
                val smsUri = Uri.parse("content://sms/inbox")
                val smsCursor = contentResolver.query(
                    smsUri,
                    arrayOf("body", "date"),
                    null,
                    null,
                    "date DESC LIMIT 150"
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
                            val smsReceivedDateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(fallbackTime))

                            val result = FinancialTextParser.parse(body, fallbackTime)

                            if (result.isPayment) {
                                val matchDate = targetDateStr.isBlank() || targetDateStr == "ALL" || result.dateStr == targetDateStr || smsReceivedDateStr.startsWith(targetDateStr)
                                logBuilder.append("[SMS Match Found] Time: ").append(smsReceivedDateStr)
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
                                    logBuilder.append("[SMS Candidate Inspected] ").append(smsReceivedDateStr).append("\n")
                                    logBuilder.append("   Content: ").append(body.replace("\n", " ")).append("\n")
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                logBuilder.append("Error querying SMS: ").append(e.message ?: "").append("\n")
            }

            // 4. 삼성 기본 '메세지' 어플 대화 저장소 조회
            val conversationUris = listOf(
                Pair("content://mms-sms/complete-conversations", Uri.parse("content://mms-sms/complete-conversations")),
                Pair("content://mms-sms/conversations", Uri.parse("content://mms-sms/conversations"))
            )

            for (pair in conversationUris) {
                val uriName = pair.first
                val uri = pair.second

                logBuilder.append("\n--- 4. Querying Messages App Storage (").append(uriName).append(") ---\n")
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
                            val msgReceivedDateStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(fallbackTime))

                            val result = FinancialTextParser.parse(body, fallbackTime)
                            if (result.isPayment) {
                                val matchDate = targetDateStr.isBlank() || targetDateStr == "ALL" || result.dateStr == targetDateStr || msgReceivedDateStr.startsWith(targetDateStr)
                                logBuilder.append("[Conv Match Found] Time: ").append(msgReceivedDateStr)
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
