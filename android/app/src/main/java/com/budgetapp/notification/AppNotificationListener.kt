package com.budgetapp.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.budgetapp.bridge.FinancialParserModule
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

class AppNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val sbnObj = sbn ?: return
        val packageName = sbnObj.packageName ?: return

        val extras = sbnObj.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
        val fullContent = "$title $text $bigText"

        // "카드" 문구가 포함된 경우에만 캐치
        if (!fullContent.contains("카드")) {
            return
        }

        if (packageName.contains("kakaopay") || fullContent.contains("카카오페이") || fullContent.contains("카카오")) {
            parseKakaoPayNotification(fullContent)
        } else if (packageName.contains("hyundaicard") || fullContent.contains("현대카드") || fullContent.contains("카드")) {
            parseHyundaiCardNotification(fullContent)
        }
    }

    private fun parseKakaoPayNotification(text: String) {
        val amountPattern = Pattern.compile("([0-9,]+)원")
        val matcher = amountPattern.matcher(text)

        if (matcher.find()) {
            val amountStr = matcher.group(1)?.replace(",", "") ?: "0"
            val amount = amountStr.toIntOrNull() ?: 0

            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val dateStr = dateFormat.format(Date())

            val words = text.split("\\s+".toRegex())
            val merchant = words.lastOrNull { it.isNotBlank() && !it.contains("원") && !it.contains("페이") } ?: "카카오페이 결제"

            FinancialParserModule.emitPaymentEvent(
                dateStr = dateStr,
                amount = amount,
                merchant = merchant,
                paymentType = "CARD",
                cardCompany = "카카오뱅크",
                installmentType = "LUMP_SUM",
                installmentMonths = 1
            )
        }
    }

    private fun parseHyundaiCardNotification(text: String) {
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
            val merchant = words.lastOrNull { it.isNotBlank() && !it.contains("원") && !it.contains("카드") && !it.contains("승인") } ?: "카드 결제"

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
