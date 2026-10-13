package com.budgetapp.bridge

import android.content.ContentResolver
import android.net.Uri
import com.budgetapp.notification.AppNotificationListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

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

                    if (body.isNotBlank()) {
                        val result = FinancialTextParser.parse(body, if (smsTime > 0) smsTime else startTime)
                        if (result.isPayment) {
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

            // 푸시 알림 수신 히스토리 분석 추가
            val pushCount = AppNotificationListener.syncPushHistoryForDate(targetDateStr)
            val totalCount = parsedCount + pushCount

            promise.resolve(totalCount)
        } catch (e: Exception) {
            promise.reject("SMS_SYNC_ERROR", e.message, e)
        }
    }
}
