package com.budgetapp.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.budgetapp.bridge.FinancialParserModule
import com.budgetapp.bridge.FinancialTextParser
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AppNotificationListener : NotificationListenerService() {

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val sbnObj = sbn ?: return
        val extras = sbnObj.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
        val fullContent = "$title\n$text\n$bigText"

        val result = FinancialTextParser.parse(fullContent, sbnObj.postTime)
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
        }
    }

    companion object {
        private var instance: AppNotificationListener? = null

        fun syncPushHistoryForDate(targetDateStr: String): Int {
            val listener = instance ?: return 0
            var count = 0
            try {
                val activeNotifs = listener.activeNotifications ?: return 0
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val targetDate = try { sdf.parse(targetDateStr) ?: Date() } catch (e: Exception) { Date() }

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

                for (sbn in activeNotifs) {
                    val postTime = sbn.postTime
                    if (postTime in startTime..endTime) {
                        val extras = sbn.notification.extras
                        val title = extras.getCharSequence("android.title")?.toString() ?: ""
                        val text = extras.getCharSequence("android.text")?.toString() ?: ""
                        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
                        val fullContent = "$title\n$text\n$bigText"

                        val result = FinancialTextParser.parse(fullContent, postTime)
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
                            count++
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore
            }
            return count
        }
    }
}
