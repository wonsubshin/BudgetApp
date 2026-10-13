package com.budgetapp.bridge

import android.content.ContentResolver
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

class SmsHistoryParserModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SmsHistoryParserModule"
    }

    @ReactMethod
    fun syncSmsHistoryForDate(targetDateStr: String, promise: Promise) {
        try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val targetDate: Date = try {
                sdf.parse(targetDateStr) ?: Date()
            } catch (e: Exception) {
                Date()
            }

            val cal = Calendar.getInstance()
            cal.time = targetDate
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val startTime = cal.timeInMillis

            cal.set(Calendar.HOUR_OF_DAY, 23)
            cal.set(Calendar.MINUTE, 59)
            cal.set(Calendar.SECOND, 59)
            cal.set(Calendar.MILLISECOND, 999)
            val endTime = cal.timeInMillis

            val contentResolver: ContentResolver = reactContext.contentResolver
            val uri = Uri.parse("content://sms/inbox")

            val cursor = contentResolver.query(
                uri,
                arrayOf("body", "date"),
                "date >= ? AND date <= ?",
                arrayOf(startTime.toString(), endTime.toString()),
                "date DESC"
            )

            var parsedCount = 0

            cursor?.use {
                val bodyIndex = it.getColumnIndex("body")
                val dateIndex = it.getColumnIndex("date")

                while (it.moveToNext()) {
                    val body = if (bodyIndex != -1) it.getString(bodyIndex) ?: "" else ""
                    val smsTime = if (dateIndex != -1) it.getLong(dateIndex) else 0L

                    if (body.isNotBlank() && body.contains("카드")) {
                        val smsDateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(if (smsTime > 0) smsTime else startTime))
                        val success = parseAndEmitPayment(body, smsDateStr)
                        if (success) {
                            parsedCount++
                        }
                    }
                }
            }

            promise.resolve(parsedCount)
        } catch (e: Exception) {
            promise.reject("SMS_SYNC_ERROR", e.message, e)
        }
    }

    private fun parseAndEmitPayment(body: String, dateStr: String): Boolean {
        val amountPattern = Pattern.compile("([0-9,]+)원")
        val installmentPattern = Pattern.compile("(일시불|([0-9]+)개월)")

        val amountMatcher = amountPattern.matcher(body)
        val installmentMatcher = installmentPattern.matcher(body)

        if (amountMatcher.find()) {
            val rawAmount = amountMatcher.group(1)?.replace(",", "") ?: "0"
            val amount = rawAmount.toIntOrNull() ?: 0
            if (amount <= 0) return false

            var installmentType = "LUMP_SUM"
            var installmentMonths = 1

            if (installmentMatcher.find()) {
                val instText = installmentMatcher.group(1) ?: "일시불"
                if (instText != "일시불") {
                    installmentType = "INSTALLMENT"
                    installmentMonths = installmentMatcher.group(2)?.toIntOrNull() ?: 1
                }
            }

            val cardCompany = when {
                body.contains("신한") -> "신한카드"
                body.contains("국민") || body.contains("KB") -> "국민카드"
                body.contains("현대") -> "현대카드"
                body.contains("삼성") -> "삼성카드"
                body.contains("롯데") -> "롯데카드"
                body.contains("하나") -> "하나카드"
                body.contains("우리") -> "우리카드"
                body.contains("농협") || body.contains("NH") -> "NH농협카드"
                body.contains("카카오") -> "카카오뱅크"
                else -> "기타카드"
            }

            val words = body.split("\\s+".toRegex())
            val merchant = words.lastOrNull { it.isNotBlank() && !it.contains("원") && !it.contains("발신") } ?: "카드 결제"

            FinancialParserModule.emitPaymentEvent(
                dateStr = dateStr,
                amount = amount,
                merchant = merchant,
                paymentType = "CARD",
                cardCompany = cardCompany,
                installmentType = installmentType,
                installmentMonths = installmentMonths
            )
            return true
        }
        return false
    }
}
