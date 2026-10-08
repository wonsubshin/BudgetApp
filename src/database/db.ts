import { open, QuickSQLiteConnection } from 'react-native-quick-sqlite';

let dbInstance: QuickSQLiteConnection | null = null;

export const getDb = (): QuickSQLiteConnection => {
  if (!dbInstance) {
    dbInstance = open({ name: 'budget_app.db' });
  }
  return dbInstance;
};

export const initDatabase = (): void => {
  const db = getDb();

  db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      category_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      merchant TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      installment_type TEXT NOT NULL,
      installment_months INTEGER DEFAULT 1,
      is_recurring BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY NOT NULL,
      day_of_month INTEGER NOT NULL,
      category_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      merchant TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      installment_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS holidays (
      locdate TEXT PRIMARY KEY NOT NULL,
      date_name TEXT NOT NULL,
      is_holiday BOOLEAN NOT NULL DEFAULT 1,
      is_custom BOOLEAN NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
};
