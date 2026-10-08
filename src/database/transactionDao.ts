import { getDb } from './db';
import { Transaction } from '../types/budget';

export const transactionDao = {
  insertTransaction(tx: Transaction): void {
    const db = getDb();
    db.execute(
      `INSERT INTO transactions (id, date, category_type, amount, merchant, payment_type, installment_type, installment_months, is_recurring)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        tx.id,
        tx.date,
        tx.categoryType,
        tx.amount,
        tx.merchant,
        tx.paymentType,
        tx.installmentType,
        tx.installmentMonths,
        tx.isRecurring ? 1 : 0,
      ]
    );
  },

  updateTransaction(tx: Transaction): void {
    const db = getDb();
    db.execute(
      `UPDATE transactions
       SET date = ?, category_type = ?, amount = ?, merchant = ?, payment_type = ?, installment_type = ?, installment_months = ?, is_recurring = ?
       WHERE id = ?;`,
      [
        tx.date,
        tx.categoryType,
        tx.amount,
        tx.merchant,
        tx.paymentType,
        tx.installmentType,
        tx.installmentMonths,
        tx.isRecurring ? 1 : 0,
        tx.id,
      ]
    );
  },

  deleteTransaction(id: string): void {
    const db = getDb();
    db.execute('DELETE FROM transactions WHERE id = ?;', [id]);
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
      installmentType: row.installment_type,
      installmentMonths: row.installment_months,
      isRecurring: Boolean(row.is_recurring),
      createdAt: row.created_at,
    }));
  },
};
