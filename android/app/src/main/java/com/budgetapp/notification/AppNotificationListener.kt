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
        val title = extras.getString("android.title") ?: ""
        val text = extras.getString("android.text") ?: ""
        val fullContent = "$title $text"

        // 1. 카카오페이 푸시 알림 감지
        if (packageName.contains("kakaopay") || fullContent.contains("카카오페이")) {
            parseKakaoPayNotification(fullContent)
        }

        // 2. 현대카드 앱 푸시 알림 감지
        if (packageName.contains("hyundaicard") || fullContent.contains("현대카드")) {
            parseHyundaiCardNotification(fullContent)
        }
    }

    private fun parseKakaoPayNotification(text: String) {
        val amountPattern = Pattern.compile("([0-9,]+)원")
        val matcher = amountPattern.matcher(text)

        if (matcher.find()) {
            val amountStr = matcher.group(1)?.replace(",", "") ?: "0"
            val amount = amountStr.toIntOrNull() ?: 0

            val dateFormat = SimpleDateFormat("yyyy-MM-DD", Locale.getDefault())
            val dateStr = dateFormat.format(Date())

            FinancialParserModule.emitPaymentEvent(
                dateStr = dateStr,
                amount = amount,
                merchant = "카카오페이 결제",
                paymentType = "CARD",
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

            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val dateStr = dateFormat.format(Date())

            FinancialParserModule.emitPaymentEvent(
                dateStr = dateStr,
                amount = amount,
                merchant = "현대카드 결제",
                paymentType = "CARD",
                installmentType = installmentType,
                installmentMonths = installmentMonths
            )
        }
    }
}
