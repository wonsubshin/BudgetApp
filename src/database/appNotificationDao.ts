import { getDb } from './db';

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
    // 1달 이상 된 오래된 푸시 알림 자동 청소
    try {
      db.execute("DELETE FROM app_notifications_raw WHERE post_time < datetime('now', '-30 days');");
    } catch (e) {}

    const result = db.execute(
      'SELECT * FROM app_notifications_raw ORDER BY post_time DESC LIMIT 300;'
    );
    const rows = result.rows?._array || [];
    return rows.map((r: any) => ({
      id: r.id,
      packageName: r.package_name || '',
      title: r.title || '',
      text: r.text || '',
      bigText: r.big_text || '',
      rawContent: r.raw_content || '',
      postTime: r.post_time || '',
      createdAt: r.created_at,
    }));
  },

  deleteNotification(id: string): void {
    const db = getDb();
    db.execute('DELETE FROM app_notifications_raw WHERE id = ?;', [id]);
  },

  clearAllNotifications(): void {
    const db = getDb();
    db.execute('DELETE FROM app_notifications_raw;');
  },
};
