package com.budgetapp.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.budgetapp.bridge.FinancialParserModule
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

class PushTestReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "com.budgetapp.TEST_PUSH") {
            val rawText = intent.getStringExtra("text") ?: intent.getStringExtra("body") ?: ""
            val text = rawText.replace("'", "").replace("\"", "").trim()

            // "카드" 문구가 포함된 경우에만 캐치
            if (text.isNotBlank() && text.contains("카드")) {
                parseNotification(text)
            }
        }
    }

    private fun parseNotification(text: String) {
        val amountPattern = Pattern.compile("([0-9,]+)원")
        val installmentPattern = Pattern.compile("(일시불|([0-9]+)개월)")

        val amountMatcher = amountPattern.matcher(text)
        val installmentMatcher = installmentPattern.matcher(text)

        if (amountMatcher.find()) {
            val amountStr = amountMatcher.group(1)?.replace(",", "") ?: "0"
            val amount = amountStr.toIntOrNull() ?: 0

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
                text.contains("신한") -> "신한카드"
                text.contains("국민") || text.contains("KB") -> "국민카드"
                text.contains("현대") -> "현대카드"
                text.contains("삼성") -> "삼성카드"
                text.contains("롯데") -> "롯데카드"
                text.contains("하나") -> "하나카드"
                text.contains("우리") -> "우리카드"
                text.contains("농협") || text.contains("NH") -> "NH농협카드"
                text.contains("카카오") -> "카카오뱅크"
                else -> "현대카드"
            }

            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val dateStr = dateFormat.format(Date())

            val words = text.split("\\s+".toRegex())
            val merchant = words.lastOrNull {
                it.isNotBlank() && !it.contains("원") && !it.contains("카드") && !it.contains("승인")
            } ?: "카드 결제"

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
