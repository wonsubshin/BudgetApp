export type CategoryType = 'EXPENSE' | 'SAVINGS';
export type PaymentType = 'CARD' | 'CASH';
export type InstallmentType = 'LUMP_SUM' | 'INSTALLMENT';
export type ViewMode = 'MONTHLY' | 'WEEKLY';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  categoryType: CategoryType;
  amount: number;
  merchant: string;
  paymentType: PaymentType;
  installmentType: InstallmentType;
  installmentMonths: number;
  isRecurring: boolean;
  createdAt?: string;
}

export interface RecurringRule {
  id: string;
  dayOfMonth: number; // 1 ~ 31
  categoryType: CategoryType;
  amount: number;
  merchant: string;
  paymentType: PaymentType;
  installmentType: InstallmentType;
  createdAt?: string;
}

export interface Holiday {
  locdate: string; // YYYY-MM-DD
  dateName: string;
  isHoliday: boolean;
  isCustom: boolean;
  updatedAt?: string;
}
