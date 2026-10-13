import { DeviceEventEmitter } from 'react-native';
import dayjs from 'dayjs';
import { getDb } from './db';
import { RecurringRule } from '../types/budget';

export const recurringDao = {
  insertRecurringRule(rule: RecurringRule): void {
    const db = getDb();
    const startDate = rule.startDate || dayjs().format('YYYY-MM-DD');
    db.execute(
      `INSERT INTO recurring_rules (id, day_of_month, is_daily, start_date, category_type, amount, merchant, payment_type, card_company, installment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        rule.id,
        rule.dayOfMonth,
        rule.isDaily ? 1 : 0,
        startDate,
        rule.categoryType,
        rule.amount,
        rule.merchant,
        rule.paymentType,
        rule.cardCompany || null,
        rule.installmentType,
      ]
    );
    DeviceEventEmitter.emit('TRANSACTION_UPDATED');
  },

  updateRecurringRule(rule: RecurringRule): void {
    const db = getDb();
    const startDate = rule.startDate || dayjs().format('YYYY-MM-DD');
    db.execute(
      `UPDATE recurring_rules
       SET day_of_month = ?, is_daily = ?, start_date = ?, category_type = ?, amount = ?, merchant = ?, payment_type = ?, card_company = ?, installment_type = ?
       WHERE id = ?;`,
      [
        rule.dayOfMonth,
        rule.isDaily ? 1 : 0,
        startDate,
        rule.categoryType,
        rule.amount,
        rule.merchant,
        rule.paymentType,
        rule.cardCompany || null,
        rule.installmentType,
        rule.id,
      ]
    );
    DeviceEventEmitter.emit('TRANSACTION_UPDATED');
  },

  deleteRecurringRule(id: string): void {
    const db = getDb();
    db.execute('DELETE FROM recurring_rules WHERE id = ?;', [id]);
    DeviceEventEmitter.emit('TRANSACTION_UPDATED');
  },

  getAllRecurringRules(): RecurringRule[] {
    const db = getDb();
    const result = db.execute('SELECT * FROM recurring_rules ORDER BY day_of_month ASC;');
    const rows = result.rows?._array || [];
    return rows.map((row: any) => ({
      id: row.id,
      dayOfMonth: row.day_of_month,
      isDaily: Boolean(row.is_daily),
      startDate: row.start_date || dayjs().format('YYYY-MM-DD'),
      categoryType: row.category_type,
      amount: row.amount,
      merchant: row.merchant,
      paymentType: row.payment_type,
      cardCompany: row.card_company || undefined,
      installmentType: row.installment_type,
      createdAt: row.created_at,
    }));
  },
};
