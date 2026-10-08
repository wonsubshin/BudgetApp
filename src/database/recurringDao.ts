import { getDb } from './db';
import { RecurringRule } from '../types/budget';

export const recurringDao = {
  insertRecurringRule(rule: RecurringRule): void {
    const db = getDb();
    db.execute(
      `INSERT INTO recurring_rules (id, day_of_month, category_type, amount, merchant, payment_type, installment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        rule.id,
        rule.dayOfMonth,
        rule.categoryType,
        rule.amount,
        rule.merchant,
        rule.paymentType,
        rule.installmentType,
      ]
    );
  },

  updateRecurringRule(rule: RecurringRule): void {
    const db = getDb();
    db.execute(
      `UPDATE recurring_rules
       SET day_of_month = ?, category_type = ?, amount = ?, merchant = ?, payment_type = ?, installment_type = ?
       WHERE id = ?;`,
      [
        rule.dayOfMonth,
        rule.categoryType,
        rule.amount,
        rule.merchant,
        rule.paymentType,
        rule.installmentType,
        rule.id,
      ]
    );
  },

  deleteRecurringRule(id: string): void {
    const db = getDb();
    db.execute('DELETE FROM recurring_rules WHERE id = ?;', [id]);
  },

  getAllRecurringRules(): RecurringRule[] {
    const db = getDb();
    const result = db.execute('SELECT * FROM recurring_rules ORDER BY day_of_month ASC;');
    const rows = result.rows?._array || [];
    return rows.map((row: any) => ({
      id: row.id,
      dayOfMonth: row.day_of_month,
      categoryType: row.category_type,
      amount: row.amount,
      merchant: row.merchant,
      paymentType: row.payment_type,
      installmentType: row.installment_type,
      createdAt: row.created_at,
    }));
  },
};
