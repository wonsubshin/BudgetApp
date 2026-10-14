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
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {}

    // 1달 이상 된 오래된 푸시 알림 자동 청소
    try {
      db.execute("DELETE FROM app_notifications_raw WHERE post_time < datetime('now', '-30 days');");
    } catch (e) {}

    const resultMap = new Map<string, AppNotificationRaw>();

    try {
      const result = db.execute(
        'SELECT id, package_name, title, text, big_text, raw_content, post_time, created_at FROM app_notifications_raw ORDER BY post_time DESC LIMIT 300;'
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
              try {
                db.execute(
                  'INSERT OR IGNORE INTO app_notifications_raw (id, package_name, title, text, big_text, raw_content, post_time) VALUES (?, ?, ?, ?, ?, ?, ?);',
                  [
                    item.id || `${Date.now()}_${Math.random()}`,
                    item.package_name || '',
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

  deleteNotification(id: string): void {
    const db = getDb();
    try {
      db.execute('DELETE FROM app_notifications_raw WHERE id = ?;', [id]);
    } catch (e) {}
  },

  clearAllNotifications(): void {
    const db = getDb();
    try {
      db.execute('DELETE FROM app_notifications_raw;');
    } catch (e) {}
  },
};
