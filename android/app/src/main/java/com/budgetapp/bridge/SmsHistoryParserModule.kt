package com.budgetapp.bridge

import android.content.ContentResolver
import android.net.Uri
import com.budgetapp.notification.AppNotificationListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.text.SimpleDateFormat
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
            val contentResolver: ContentResolver = reactContext.contentResolver

            // 삼성 갤럭시 등 다양한 안드로이드 단말 호환성을 위해 content://sms URI 사용
            val uri = Uri.parse("content://sms")

            val cursor = contentResolver.query(
                uri,
                arrayOf("body", "date"),
                null,
                null,
                "date DESC LIMIT 300"
            )

            var parsedCount = 0

            cursor?.use {
                val bodyIndex = it.getColumnIndex("body")
                val dateIndex = it.getColumnIndex("date")

                while (it.moveToNext()) {
                    val body = if (bodyIndex != -1) it.getString(bodyIndex) ?: "" else ""
                    val smsTime = if (dateIndex != -1) it.getLong(dateIndex) else 0L

                    if (body.isNotBlank()) {
                        val fallbackTime = if (smsTime > 0) smsTime else System.currentTimeMillis()
                        val result = FinancialTextParser.parse(body, fallbackTime)

                        if (result.isPayment) {
                            val smsReceivedDateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(fallbackTime))

                            // 파싱된 결제 날짜 또는 SMS 수신일이 targetDateStr과 일치하는 경우 자동 등록
                            if (targetDateStr.isBlank() || result.dateStr == targetDateStr || smsReceivedDateStr == targetDateStr) {
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

            // 푸시 알림 수신 히스토리 분석 추가
            val pushCount = AppNotificationListener.syncPushHistoryForDate(targetDateStr)
            val totalCount = parsedCount + pushCount

            promise.resolve(totalCount)
        } catch (e: Exception) {
            promise.reject("SMS_SYNC_ERROR", e.message, e)
        }
    }
}
