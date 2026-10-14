import { DeviceEventEmitter } from 'react-native';
import { getDb } from './db';
import { Transaction } from '../types/budget';
import { parseExceptionDao } from './parseExceptionDao';

export const transactionDao = {
  insertTransaction(tx: Transaction): void {
    const db = getDb();

    // 파싱 예외 단어 및 무효 가맹점 키워드 체크 ("드렸어요!", "결제금액", "q.samsungcard.com" 등)
    if (
      tx.merchant.includes('드렸어요') ||
      tx.merchant.includes('결제금액') ||
      tx.merchant.includes('q.samsungcard.com')
    ) {
      console.log(`⚠️ 예외 가맹점 키워드 차단: ${tx.merchant}`);
      return;
    }

    // 중복 체크: 시분초(created_at) OR 날짜(date), 사용처(merchant), 금액(amount)이 동일한 기존 기록이 있는지 확인
    if (tx.createdAt) {
      const dupCheck = db.execute(
        'SELECT COUNT(*) as count FROM transactions WHERE merchant = ? AND amount = ? AND created_at = ?;',
        [tx.merchant, tx.amount, tx.createdAt]
      );
      const cnt = dupCheck.rows?._array?.[0]?.count || 0;
      if (cnt > 0) {
        console.log(
          `⚠️ 동일한 결제 내역(시분초:${tx.createdAt}, 사용처:${tx.merchant}, 금액:${tx.amount})이 이미 존재하여 중복 추가를 방지했습니다.`
        );
        return;
      }
    } else {
      const dupCheck = db.execute(
        'SELECT COUNT(*) as count FROM transactions WHERE merchant = ? AND amount = ? AND date = ?;',
        [tx.merchant, tx.amount, tx.date]
      );
      const cnt = dupCheck.rows?._array?.[0]?.count || 0;
      if (cnt > 0) {
        console.log(
          `⚠️ 동일한 결제 내역(일자:${tx.date}, 사용처:${tx.merchant}, 금액:${tx.amount})이 이미 존재하여 중복 추가를 방지했습니다.`
        );
        return;
      }
    }

    if (tx.createdAt) {
      db.execute(
        `INSERT INTO transactions (id, date, category_type, amount, merchant, payment_type, card_company, installment_type, installment_months, is_recurring, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          tx.id,
          tx.date,
          tx.categoryType,
          tx.amount,
          tx.merchant,
          tx.paymentType,
          tx.cardCompany || null,
          tx.installmentType,
          tx.installmentMonths,
          tx.isRecurring ? 1 : 0,
          tx.createdAt,
        ]
      );
    } else {
      db.execute(
        `INSERT INTO transactions (id, date, category_type, amount, merchant, payment_type, card_company, installment_type, installment_months, is_recurring)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          tx.id,
          tx.date,
          tx.categoryType,
          tx.amount,
          tx.merchant,
          tx.paymentType,
          tx.cardCompany || null,
          tx.installmentType,
          tx.installmentMonths,
          tx.isRecurring ? 1 : 0,
        ]
      );
    }
    DeviceEventEmitter.emit('TRANSACTION_UPDATED');
  },

  updateTransaction(tx: Transaction): void {
    const db = getDb();
    db.execute(
      `UPDATE transactions
       SET date = ?, category_type = ?, amount = ?, merchant = ?, payment_type = ?, card_company = ?, installment_type = ?, installment_months = ?, is_recurring = ?
       WHERE id = ?;`,
      [
        tx.date,
        tx.categoryType,
        tx.amount,
        tx.merchant,
        tx.paymentType,
        tx.cardCompany || null,
        tx.installmentType,
        tx.installmentMonths,
        tx.isRecurring ? 1 : 0,
        tx.id,
      ]
    );
    DeviceEventEmitter.emit('TRANSACTION_UPDATED');
  },

  deleteTransaction(id: string): void {
    const db = getDb();
    db.execute('DELETE FROM transactions WHERE id = ?;', [id]);
    DeviceEventEmitter.emit('TRANSACTION_UPDATED');
  },

  deleteTransactionsByKeyword(keyword: string): number {
    const db = getDb();
    const trimmed = keyword.trim();
    if (!trimmed) return 0;
    try {
      const res = db.execute('DELETE FROM transactions WHERE merchant LIKE ? OR card_company LIKE ?;', [
        `%${trimmed}%`,
        `%${trimmed}%`,
      ]);
      DeviceEventEmitter.emit('TRANSACTION_UPDATED');
      return res.rowsAffected || 0;
    } catch (e) {
      return 0;
    }
  },

  purgeAllExceptionMatchedTransactions(): number {
    const db = getDb();
    const parseExceptions = parseExceptionDao.getAllExceptions();
    let totalPurged = 0;

    parseExceptions.forEach((e) => {
      if (e.keyword.trim()) {
        try {
          const res = db.execute(
            'DELETE FROM transactions WHERE merchant LIKE ? OR card_company LIKE ?;',
            [`%${e.keyword.trim()}%`, `%${e.keyword.trim()}%`]
          );
          totalPurged += res.rowsAffected || 0;
        } catch (err) {}
      }
    });

    // 기본 무효 가맹점 정제 ("드렸어요", "결제금액", "q.samsungcard.com")
    try {
      const res1 = db.execute("DELETE FROM transactions WHERE merchant LIKE '%드렸어요%';");
      const res2 = db.execute("DELETE FROM transactions WHERE merchant LIKE '%결제금액%';");
      const res3 = db.execute("DELETE FROM transactions WHERE merchant LIKE '%q.samsungcard.com%';");
      totalPurged += (res1.rowsAffected || 0) + (res2.rowsAffected || 0) + (res3.rowsAffected || 0);
    } catch (err) {}

    if (totalPurged > 0) {
      DeviceEventEmitter.emit('TRANSACTION_UPDATED');
    }

    return totalPurged;
  },

  getTransactionsByDate(dateStr: string): Transaction[] {
    const db = getDb();
    const result = db.execute(
      'SELECT * FROM transactions WHERE date = ? ORDER BY created_at DESC;',
      [dateStr]
    );

    const rows = result.rows?._array || [];
    return rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      categoryType: row.category_type,
      amount: row.amount,
      merchant: row.merchant,
      paymentType: row.payment_type,
      cardCompany: row.card_company || undefined,
      installmentType: row.installment_type,
      installmentMonths: row.installment_months,
      isRecurring: Boolean(row.is_recurring),
      createdAt: row.created_at,
    }));
  },

  getTransactionsByMonth(yearMonthStr: string): Transaction[] {
    const db = getDb();
    const result = db.execute(
      'SELECT * FROM transactions WHERE date LIKE ? ORDER BY date ASC;',
      [`${yearMonthStr}%`]
    );

    const rows = result.rows?._array || [];
    return rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      categoryType: row.category_type,
      amount: row.amount,
      merchant: row.merchant,
      paymentType: row.payment_type,
      cardCompany: row.card_company || undefined,
      installmentType: row.installment_type,
      installmentMonths: row.installment_months,
      isRecurring: Boolean(row.is_recurring),
      createdAt: row.created_at,
    }));
  },

  getTransactionsByYear(yearStr: string): Transaction[] {
    const db = getDb();
    const result = db.execute(
      'SELECT * FROM transactions WHERE date LIKE ? ORDER BY date ASC;',
      [`${yearStr}%`]
    );

    const rows = result.rows?._array || [];
    return rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      categoryType: row.category_type,
      amount: row.amount,
      merchant: row.merchant,
      paymentType: row.payment_type,
      cardCompany: row.card_company || undefined,
      installmentType: row.installment_type,
      installmentMonths: row.installment_months,
      isRecurring: Boolean(row.is_recurring),
      createdAt: row.created_at,
    }));
  },

  getAllInstallmentTransactions(): Transaction[] {
    const db = getDb();
    const result = db.execute(
      "SELECT * FROM transactions WHERE category_type = 'EXPENSE' AND installment_type = 'INSTALLMENT' AND installment_months > 1 ORDER BY date ASC;"
    );

    const rows = result.rows?._array || [];
    return rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      categoryType: row.category_type,
      amount: row.amount,
      merchant: row.merchant,
      paymentType: row.payment_type,
      cardCompany: row.card_company || undefined,
      installmentType: row.installment_type,
      installmentMonths: row.installment_months,
      isRecurring: Boolean(row.is_recurring),
      createdAt: row.created_at,
    }));
  },
};
