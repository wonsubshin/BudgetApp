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

            // 삼성 갤럭시 RCS/MMS/SMS 수신함 통합 호환 URI 목록
            val urisToQuery = listOf(
                Uri.parse("content://sms"),
                Uri.parse("content://sms/inbox"),
                Uri.parse("content://mms-sms/conversations")
            )

            var parsedCount = 0
            val processedBodies = HashSet<String>()

            for (uri in urisToQuery) {
                try {
                    val cursor = contentResolver.query(
                        uri,
                        arrayOf("body", "date"),
                        null,
                        null,
                        "date DESC LIMIT 300"
                    )

                    cursor?.use {
                        val bodyIndex = it.getColumnIndex("body")
                        val dateIndex = it.getColumnIndex("date")

                        while (it.moveToNext()) {
                            val body = if (bodyIndex != -1) it.getString(bodyIndex) ?: "" else ""
                            val smsTime = if (dateIndex != -1) it.getLong(dateIndex) else 0L

                            if (body.isNotBlank() && !processedBodies.contains(body)) {
                                processedBodies.add(body)
                                val fallbackTime = if (smsTime > 0) smsTime else System.currentTimeMillis()
                                val result = FinancialTextParser.parse(body, fallbackTime)

                                if (result.isPayment) {
                                    val smsReceivedDateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(fallbackTime))

                                    // targetDateStr이 없거나 ALL이거나, 파싱 날짜/수신 날짜가 일치하는 경우 자동 등록
                                    if (targetDateStr.isBlank() || targetDateStr == "ALL" || result.dateStr == targetDateStr || smsReceivedDateStr == targetDateStr) {
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
                    // 특정 URI 접근 예외 발생 시 다음 URI 계속 탐색
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
