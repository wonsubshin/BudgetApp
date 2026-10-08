import { DeviceEventEmitter, EmitterSubscription } from 'react-native';
import { transactionDao } from '../database/transactionDao';
import { Transaction } from '../types/budget';

export const subscribeNativePaymentEvents = (
  onInserted?: (tx: Transaction) => void
): EmitterSubscription => {
  return DeviceEventEmitter.addListener(
    'onPaymentParsed',
    (event: {
      date: string;
      amount: number;
      merchant: string;
      paymentType: string;
      installmentType: string;
      installmentMonths: number;
    }) => {
      try {
        const tx: Transaction = {
          id: String(Date.now()),
          date: event.date,
          categoryType: 'EXPENSE',
          amount: event.amount,
          merchant: event.merchant,
          paymentType: event.paymentType === 'CASH' ? 'CASH' : 'CARD',
          installmentType:
            event.installmentType === 'INSTALLMENT' ? 'INSTALLMENT' : 'LUMP_SUM',
          installmentMonths: event.installmentMonths || 1,
          isRecurring: false,
        };

        transactionDao.insertTransaction(tx);
        if (onInserted) {
          onInserted(tx);
        }
      } catch (err) {
        console.warn('Native payment event insert failed:', err);
      }
    }
  );
};
