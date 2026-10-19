package com.budgetapp.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.budgetapp.bridge.FinancialParserModule
import com.budgetapp.bridge.FinancialTextParser
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AppNotificationListener : NotificationListenerService() {

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        android.util.Log.d("AppNotificationListener", "NotificationListenerService connected!")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        if (instance == this) {
            instance = null
        }
        android.util.Log.d("AppNotificationListener", "NotificationListenerService disconnected!")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    private fun isExcludedAppNotification(packageName: String, fullContent: String): Boolean {
        val pkgLower = packageName.lowercase(Locale.getDefault())
        if (packageName == "com.android.systemui") return true

        // 발신 앱이 toss 관련이고 내용에 '걸음' 또는 '만보기'가 포함된 경우 수집 원천 제외
        if (pkgLower.contains("toss") && (fullContent.contains("걸음") || fullContent.contains("만보기"))) {
            return true
        }

        return false
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

        // systemui 및 toss 걸음 수 알림 수집 즉시 원천 제외
        if (isExcludedAppNotification(packageName, fullContent)) return

        // 1. 수신된 모든 앱 푸시 원문을 파일 버퍼 & 로컬 SQLite DB(app_notifications_raw)에 이중 보관
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
        if (isExcludedAppNotification(packageName, fullContent)) return

        val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        val postTimeStr = sdf.format(Date(if (postTimeMs > 0) postTimeMs else System.currentTimeMillis()))
        val id = "${postTimeMs}_${(1000..9999).random()}"

        // 1. JSON 파일 버퍼에 100% 보장 저장 (DB 락 발생 시 백업 수단)
        try {
            val bufferFile = File(filesDir, "app_notifications_buffer.json")
            val jsonArray = if (bufferFile.exists()) {
                try { JSONArray(bufferFile.readText()) } catch (e: Exception) { JSONArray() }
            } else {
                JSONArray()
            }

            val item = JSONObject().apply {
                put("id", id)
                put("package_name", packageName)
                put("title", title)
                put("text", text)
                put("big_text", bigText)
                put("raw_content", fullContent)
                put("post_time", postTimeStr)
            }

            jsonArray.put(item)
            while (jsonArray.length() > 300) {
                jsonArray.remove(0)
            }
            bufferFile.writeText(jsonArray.toString())
        } catch (e: Exception) {
            android.util.Log.e("AppNotificationListener", "Buffer write error: ${e.message}")
        }

        // 2. React Native(filesDir/budget_app.db) 및 Android(databases/budget_app.db) 양쪽 SQLite에 모두 저장
        val targetDbPaths = listOf(
            File(filesDir, "budget_app.db"),
            getDatabasePath("budget_app.db")
        )

        for (dbPath in targetDbPaths) {
            try {
                dbPath.parentFile?.mkdirs()
                val db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(dbPath, null)
                try { db.enableWriteAheadLogging() } catch (e: Exception) {}
                db.execSQL("PRAGMA busy_timeout = 3000;")

                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS app_notifications_raw (" +
                            "id TEXT PRIMARY KEY NOT NULL, " +
                            "package_name TEXT NOT NULL, " +
                            "title TEXT, " +
                            "text TEXT, " +
                            "big_text TEXT, " +
                            "raw_content TEXT NOT NULL, " +
                            "post_time TEXT NOT NULL, " +
                            "is_bookmarked BOOLEAN DEFAULT 0, " +
                            "created_at TEXT DEFAULT CURRENT_TIMESTAMP);"
                )

                // com.android.systemui 및 toss 걸음 수 노티피케이션 로그 즉시 정제 삭제
                db.execSQL("DELETE FROM app_notifications_raw WHERE package_name = 'com.android.systemui';")
                db.execSQL("DELETE FROM app_notifications_raw WHERE (LOWER(package_name) LIKE '%toss%') AND (raw_content LIKE '%걸음%' OR raw_content LIKE '%만보기%');")

                db.execSQL(
                    "INSERT OR IGNORE INTO app_notifications_raw (id, package_name, title, text, big_text, raw_content, post_time, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?, ?, 0);",
                    arrayOf(id, packageName, title, text, bigText, fullContent, postTimeStr)
                )

                db.execSQL("DELETE FROM app_notifications_raw WHERE post_time < datetime('now', '-30 days') AND (is_bookmarked = 0 OR is_bookmarked IS NULL);")
                db.close()
            } catch (e: Exception) {
                android.util.Log.e("AppNotificationListener", "SQLite write error on ${dbPath.absolutePath}: ${e.message}")
            }
        }
    }

    companion object {
        private var instance: AppNotificationListener? = null

        fun isServiceConnected(): Boolean {
            return instance != null
        }

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
                    val packageName = sbn.packageName ?: ""

                    val postTime = sbn.postTime
                    val extras = sbn.notification.extras
                    val title = extras.getCharSequence("android.title")?.toString() ?: ""
                    val text = extras.getCharSequence("android.text")?.toString() ?: ""
                    val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
                    val fullContent = "$title\n$text\n$bigText".trim()

                    if (fullContent.isNotBlank()) {
                        // systemui 및 toss 걸음 수 알림 제외
                        if (listener.isExcludedAppNotification(packageName, fullContent)) continue

                        // 수신함 결제 내역 실시간 동기화 실행 시 무조건 현재 떠 있는 모든 알림 목록을 보관
                        listener.saveRawNotification(
                            packageName,
                            title,
                            text,
                            bigText,
                            fullContent,
                            postTime
                        )

                        // 파싱 및 결제 이벤트 등록
                        if (targetDateStr == "ALL" || postTime in startTime..endTime) {
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
                android.util.Log.e("AppNotificationListener", "syncPushHistoryForDate error: ${e.message}", e)
            }
            return count
        }
    }
}
