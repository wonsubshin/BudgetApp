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
  cardCompany?: string; // 카드사 (신한카드, 국민카드, 현대카드 등)
  installmentType: InstallmentType;
  installmentMonths: number;
  isRecurring: boolean;
  createdAt?: string;
}

export interface RecurringRule {
  id: string;
  dayOfMonth: number; // 1 ~ 31
  isDaily?: boolean; // 매일 반복 여부
  startDate?: string; // 정기결제 시작일 (YYYY-MM-DD)
  categoryType: CategoryType;
  amount: number;
  merchant: string;
  paymentType: PaymentType;
  cardCompany?: string; // 카드사
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
