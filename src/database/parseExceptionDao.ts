import { getDb } from './db';

export interface ParseException {
  id: string;
  keyword: string;
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
      createdAt: r.created_at,
    }));
  },

  getAllExceptionKeywords(): string[] {
    return this.getAllExceptions().map((e) => e.keyword);
  },

  insertException(keyword: string): boolean {
    const db = getDb();
    const trimmed = keyword.trim();
    if (!trimmed) return false;
    try {
      db.execute(
        'INSERT OR IGNORE INTO parse_exceptions (id, keyword) VALUES (?, ?);',
        [String(Date.now()), trimmed]
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
