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
        val packageName = sbnObj.packageName ?: ""
        val extras = sbnObj.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
        val fullContent = "$title\n$text\n$bigText".trim()

        if (fullContent.isBlank()) return

        // 1. 수신된 모든 앱 푸시 원문을 로컬 DB(app_notifications_raw)에 표준 컬럼별 영구 저장 (30일 초과 데이터 자동 청소)
        saveRawNotification(packageName, title, text, bigText, fullContent, sbnObj.postTime)

        // 2. DB에서 최근 예외 단어 규칙 로드
        FinancialTextParser.loadExceptionsFromDb(this)

        // 3. 모든 카드사/금융 푸시 알림 실시간 결제 파싱 (PUSH 영역)
        val result = FinancialTextParser.parse(fullContent, sbnObj.postTime, "PUSH")
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

    private fun saveRawNotification(
        packageName: String,
        title: String,
        text: String,
        bigText: String,
        fullContent: String,
        postTimeMs: Long
    ) {
        try {
            val dbPath = getDatabasePath("budget_app.db")
            dbPath.parentFile?.mkdirs()

            val db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(dbPath, null)

            // 테이블이 없는 경우 자동 생성 보장
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS app_notifications_raw (" +
                        "id TEXT PRIMARY KEY NOT NULL, " +
                        "package_name TEXT NOT NULL, " +
                        "title TEXT, " +
                        "text TEXT, " +
                        "big_text TEXT, " +
                        "raw_content TEXT NOT NULL, " +
                        "post_time TEXT NOT NULL, " +
                        "created_at TEXT DEFAULT CURRENT_TIMESTAMP);"
            )

            val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
            val postTimeStr = sdf.format(Date(if (postTimeMs > 0) postTimeMs else System.currentTimeMillis()))
            val id = "${postTimeMs}_${(1000..9999).random()}"

            db.execSQL(
                "INSERT OR IGNORE INTO app_notifications_raw (id, package_name, title, text, big_text, raw_content, post_time) VALUES (?, ?, ?, ?, ?, ?, ?);",
                arrayOf(id, packageName, title, text, bigText, fullContent, postTimeStr)
            )

            // 30일 지난 오래된 앱 푸시 원문 자동 삭제
            db.execSQL("DELETE FROM app_notifications_raw WHERE post_time < datetime('now', '-30 days');")
            db.close()
        } catch (e: Exception) {
            android.util.Log.e("AppNotificationListener", "Failed to save raw notification: ${e.message}", e)
        }
    }

    companion object {
        private var instance: AppNotificationListener? = null

        fun syncPushHistoryForDate(targetDateStr: String): Int {
            val listener = instance ?: return 0
            var count = 0
            try {
                FinancialTextParser.loadExceptionsFromDb(listener)

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
                    if (targetDateStr == "ALL" || postTime in startTime..endTime) {
                        val extras = sbn.notification.extras
                        val title = extras.getCharSequence("android.title")?.toString() ?: ""
                        val text = extras.getCharSequence("android.text")?.toString() ?: ""
                        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
                        val fullContent = "$title\n$text\n$bigText".trim()

                        if (fullContent.isNotBlank()) {
                            // 활성 푸시 스캔 시에도 DB 원문 저장 실행
                            listener.saveRawNotification(
                                sbn.packageName ?: "",
                                title,
                                text,
                                bigText,
                                fullContent,
                                postTime
                            )

                            val result = FinancialTextParser.parse(fullContent, postTime, "PUSH")
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
                }
            } catch (e: Exception) {
                // Ignore
            }
            return count
        }
    }
}
