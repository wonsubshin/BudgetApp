import { NativeModules } from 'react-native';
import { getDb } from './db';

const { SmsHistoryParserModule } = NativeModules;

export interface AppNotificationRaw {
  id: string;
  packageName: string;
  title: string;
  text: string;
  bigText: string;
  rawContent: string;
  postTime: string;
  isBookmarked: boolean;
  createdAt?: string;
}

export const appNotificationDao = {
  getRecentNotifications(): AppNotificationRaw[] {
    const db = getDb();

    try {
      db.execute(`
        CREATE TABLE IF NOT EXISTS app_notifications_raw (
          id TEXT PRIMARY KEY NOT NULL,
          package_name TEXT NOT NULL,
          title TEXT,
          text TEXT,
          big_text TEXT,
          raw_content TEXT NOT NULL,
          post_time TEXT NOT NULL,
          is_bookmarked BOOLEAN DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    try {
      db.execute('ALTER TABLE app_notifications_raw ADD COLUMN is_bookmarked BOOLEAN DEFAULT 0;');
    } catch (e) {}

    // com.android.systemui 원천 소제
    try {
      db.execute("DELETE FROM app_notifications_raw WHERE package_name = 'com.android.systemui';");
    } catch (e) {}

    // toss 걸음 수 알림 원천 소제
    try {
      db.execute("DELETE FROM app_notifications_raw WHERE (LOWER(package_name) LIKE '%toss%') AND (raw_content LIKE '%걸음%' OR raw_content LIKE '%만보기%');");
    } catch (e) {}

    // 1달 이상 된 오래된 푸시 알림 중 미보관(is_bookmarked=0) 항목만 자동 청소
    try {
      db.execute("DELETE FROM app_notifications_raw WHERE post_time < datetime('now', '-30 days') AND (is_bookmarked = 0 OR is_bookmarked IS NULL);");
    } catch (e) {}

    const resultMap = new Map<string, AppNotificationRaw>();

    try {
      const result = db.execute(
        "SELECT id, package_name, title, text, big_text, raw_content, post_time, is_bookmarked, created_at FROM app_notifications_raw WHERE package_name != 'com.android.systemui' AND NOT (LOWER(package_name) LIKE '%toss%' AND (raw_content LIKE '%걸음%' OR raw_content LIKE '%만보기%')) ORDER BY post_time DESC LIMIT 300;"
      );
      const rows = result.rows?._array || [];
      rows.forEach((r: any) => {
        resultMap.set(r.id, {
          id: r.id,
          packageName: r.package_name || '',
          title: r.title || '',
          text: r.text || '',
          bigText: r.big_text || '',
          rawContent: r.raw_content || '',
          postTime: r.post_time || '',
          isBookmarked: Boolean(r.is_bookmarked),
          createdAt: r.created_at,
        });
      });
    } catch (e) {}

    return Array.from(resultMap.values()).sort((a, b) => b.postTime.localeCompare(a.postTime));
  },

  async syncNativeBufferToDb(): Promise<AppNotificationRaw[]> {
    const db = getDb();
    try {
      if (SmsHistoryParserModule && typeof SmsHistoryParserModule.getAppNotificationsBuffer === 'function') {
        const rawJsonStr = await SmsHistoryParserModule.getAppNotificationsBuffer();
        if (rawJsonStr && rawJsonStr !== '[]') {
          const list = JSON.parse(rawJsonStr);
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              const pkg = (item.package_name || item.packageName || '').toLowerCase();
              const content = item.raw_content || item.rawContent || '';

              if (pkg === 'com.android.systemui') return;
              if (pkg.includes('toss') && (content.includes('걸음') || content.includes('만보기'))) return;

              try {
                db.execute(
                  'INSERT OR IGNORE INTO app_notifications_raw (id, package_name, title, text, big_text, raw_content, post_time, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?, ?, 0);',
                  [
                    item.id || `${Date.now()}_${Math.random()}`,
                    pkg,
                    item.title || '',
                    item.text || '',
                    item.big_text || '',
                    item.raw_content || '',
                    item.post_time || '',
                  ]
                );
              } catch (err) {}
            });
          }
        }
      }
    } catch (e) {}

    return this.getRecentNotifications();
  },

  toggleBookmark(id: string, isBookmarked: boolean): void {
    const db = getDb();
    try {
      db.execute('UPDATE app_notifications_raw SET is_bookmarked = ? WHERE id = ?;', [
        isBookmarked ? 1 : 0,
        id,
      ]);
    } catch (e) {}
  },

  deleteNotification(id: string): void {
    const db = getDb();
    try {
      db.execute('DELETE FROM app_notifications_raw WHERE id = ?;', [id]);
    } catch (e) {}
  },

  clearAllNotifications(): void {
    const db = getDb();
    try {
      // 보관된 항목(is_bookmarked=1)은 삭제하지 않고 미보관 항목만 삭제
      db.execute('DELETE FROM app_notifications_raw WHERE is_bookmarked = 0 OR is_bookmarked IS NULL;');
    } catch (e) {}
  },
};
