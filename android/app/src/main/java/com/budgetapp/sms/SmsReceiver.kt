package com.budgetapp.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.budgetapp.bridge.FinancialParserModule
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            for (sms in messages) {
                val body = sms.messageBody ?: continue
                parseAndEmitPayment(body)
            }
        }
    }

    private fun parseAndEmitPayment(body: String) {
        // [카드 승인 정규식 예시]
        // 예: "[Web발신] 신한카드 승인 홍*동 15,000원 일시불 10/08 12:30 스타벅스강남점"
        val amountPattern = Pattern.compile("([0-9,]+)원")
        val installmentPattern = Pattern.compile("(일시불|([0-9]+)개월)")

        val amountMatcher = amountPattern.matcher(body)
        val installmentMatcher = installmentPattern.matcher(body)

        if (amountMatcher.find()) {
            val rawAmount = amountMatcher.group(1)?.replace(",", "") ?: "0"
            val amount = rawAmount.toIntOrNull() ?: 0

            var installmentType = "LUMP_SUM"
            var installmentMonths = 1

            if (installmentMatcher.find()) {
                val instText = installmentMatcher.group(1) ?: "일시불"
                if (instText != "일시불") {
                    installmentType = "INSTALLMENT"
                    installmentMonths = installmentMatcher.group(2)?.toIntOrNull() ?: 1
                }
            }

            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val dateStr = dateFormat.format(Date())

            // 간단 추출 또는 전체 바디에서 사용처 추출
            val merchant = body.lines().firstOrNull { it.contains("승인") } ?: "카드 결제"

            FinancialParserModule.emitPaymentEvent(
                dateStr = dateStr,
                amount = amount,
                merchant = merchant,
                paymentType = "CARD",
                installmentType = installmentType,
                installmentMonths = installmentMonths
            )
        }
    }
}
