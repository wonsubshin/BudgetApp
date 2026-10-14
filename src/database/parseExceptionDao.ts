import { getDb } from './db';

export interface ParseException {
  id: string;
  keyword: string;
  applyPush: boolean;
  applySms: boolean;
  createdAt?: string;
}

export const parseExceptionDao = {
  getAllExceptions(): ParseException[] {
    const db = getDb();
    const result = db.execute('SELECT * FROM parse_exceptions ORDER BY created_at ASC;');
    const rows = result.rows?._array || [];
    return rows.map((r: any) => ({
      id: r.id,
      keyword: r.keyword,
      applyPush: r.apply_push === undefined || r.apply_push === null ? true : Boolean(r.apply_push),
      applySms: r.apply_sms === undefined || r.apply_sms === null ? true : Boolean(r.apply_sms),
      createdAt: r.created_at,
    }));
  },

  insertException(keyword: string, applyPush: boolean, applySms: boolean): boolean {
    const db = getDb();
    const trimmed = keyword.trim();
    if (!trimmed) return false;
    try {
      db.execute(
        'INSERT OR REPLACE INTO parse_exceptions (id, keyword, apply_push, apply_sms) VALUES (?, ?, ?, ?);',
        [String(Date.now()), trimmed, applyPush ? 1 : 0, applySms ? 1 : 0]
      );
      return true;
    } catch (e) {
      return false;
    }
  },

  updateException(id: string, keyword: string, applyPush: boolean, applySms: boolean): boolean {
    const db = getDb();
    const trimmed = keyword.trim();
    if (!trimmed) return false;
    try {
      db.execute(
        'UPDATE parse_exceptions SET keyword = ?, apply_push = ?, apply_sms = ? WHERE id = ?;',
        [trimmed, applyPush ? 1 : 0, applySms ? 1 : 0, id]
      );
      return true;
    } catch (e) {
      return false;
    }
  },

  deleteException(id: string): void {
    const db = getDb();
    db.execute('DELETE FROM parse_exceptions WHERE id = ?;', [id]);
  },
};
