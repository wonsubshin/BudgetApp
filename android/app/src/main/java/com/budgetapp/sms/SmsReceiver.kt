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
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
            if (messages.isEmpty()) return

            val fullBody = messages.joinToString("") { it.messageBody ?: "" }
            if (fullBody.isNotBlank()) {
                parseAndEmitPayment(fullBody)
            }
        }
    }

    private fun parseAndEmitPayment(body: String) {
        // "카드" 문구가 포함된 경우에만 캐치
        if (!body.contains("카드")) {
            return
        }

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
        }
    }
}
