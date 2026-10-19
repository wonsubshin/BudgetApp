import { open, QuickSQLiteConnection } from "react-native-quick-sqlite";

let dbInstance: QuickSQLiteConnection | null = null;

export const resetDbConnection = (): QuickSQLiteConnection => {
  try {
    if (dbInstance) {
      try {
        dbInstance.close();
      } catch (e) {}
    }
  } catch (e) {}
  dbInstance = open({ name: "budget_app.db" });
  return dbInstance;
};

export const getDb = (): QuickSQLiteConnection => {
  try {
    if (!dbInstance) {
      dbInstance = open({ name: "budget_app.db" });
    }
    return dbInstance;
  } catch (e) {
    console.warn("⚠️ SQLite DB 오픈 오류, 재연결을 시도합니다:", e);
    return resetDbConnection();
  }
};

export const initDatabase = (): void => {
  const db = getDb();

  try {
    db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        category_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        merchant TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        card_company TEXT,
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
        is_daily BOOLEAN DEFAULT 0,
        repeat_type TEXT,
        days_of_week TEXT,
        start_date TEXT,
        category_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        merchant TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        card_company TEXT,
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

    // 원문 앱푸시 로컬 저장용 테이블 (표준 FCM/안드로이드 컬럼 파싱 구조)
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

    // 파싱 예외 키워드 동적 관리 테이블 (적용 영역 PUSH, SMS 구분)
    db.execute(`
      CREATE TABLE IF NOT EXISTS parse_exceptions (
        id TEXT PRIMARY KEY NOT NULL,
        keyword TEXT UNIQUE NOT NULL,
        apply_push BOOLEAN DEFAULT 1,
        apply_sms BOOLEAN DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 초기 예외 키워드 시드 세팅 ('광고', 'q.samsungcard.com', '네이버페이', '결제금액', '드렸어요', '5일간')
    try {
      db.execute(
        `INSERT OR IGNORE INTO parse_exceptions (id, keyword, apply_push, apply_sms) VALUES ('1', '광고', 1, 1);`,
      );
      db.execute(
        `INSERT OR IGNORE INTO parse_exceptions (id, keyword, apply_push, apply_sms) VALUES ('2', 'q.samsungcard.com', 1, 1);`,
      );
      db.execute(
        `INSERT OR IGNORE INTO parse_exceptions (id, keyword, apply_push, apply_sms) VALUES ('3', '네이버페이', 1, 0);`,
      );
      db.execute(
        `INSERT OR IGNORE INTO parse_exceptions (id, keyword, apply_push, apply_sms) VALUES ('4', '결제금액', 1, 1);`,
      );
      db.execute(
        `INSERT OR IGNORE INTO parse_exceptions (id, keyword, apply_push, apply_sms) VALUES ('5', '드렸어요', 1, 1);`,
      );
      db.execute(
        `INSERT OR IGNORE INTO parse_exceptions (id, keyword, apply_push, apply_sms) VALUES ('6', '5일간', 1, 1);`,
      );
      db.execute(
        `UPDATE parse_exceptions SET apply_sms = 0 WHERE keyword = '네이버페이';`,
      );
    } catch (e) {}

    // 기존 설치 기기 컬럼 마이그레이션
    try {
      db.execute("ALTER TABLE transactions ADD COLUMN card_company TEXT;");
    } catch (e) {}

    try {
      db.execute("ALTER TABLE recurring_rules ADD COLUMN card_company TEXT;");
    } catch (e) {}

    try {
      db.execute(
        "ALTER TABLE recurring_rules ADD COLUMN is_daily BOOLEAN DEFAULT 0;",
      );
    } catch (e) {}

    try {
      db.execute("ALTER TABLE recurring_rules ADD COLUMN start_date TEXT;");
    } catch (e) {}

    try {
      db.execute("ALTER TABLE recurring_rules ADD COLUMN repeat_type TEXT;");
    } catch (e) {}

    try {
      db.execute("ALTER TABLE recurring_rules ADD COLUMN days_of_week TEXT;");
    } catch (e) {}

    try {
      db.execute(
        "ALTER TABLE parse_exceptions ADD COLUMN apply_push BOOLEAN DEFAULT 1;",
      );
    } catch (e) {}

    try {
      db.execute(
        "ALTER TABLE parse_exceptions ADD COLUMN apply_sms BOOLEAN DEFAULT 1;",
      );
    } catch (e) {}

    try {
      db.execute(
        "ALTER TABLE app_notifications_raw ADD COLUMN is_bookmarked BOOLEAN DEFAULT 0;",
      );
    } catch (e) {}
  } catch (fatal) {
    console.error("Database Initialization Fatal Error:", fatal);
  }
};
