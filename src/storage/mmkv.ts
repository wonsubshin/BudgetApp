import { MMKV } from 'react-native-mmkv';
import dayjs from 'dayjs';
import { ViewMode } from '../types/budget';

export const storage = new MMKV({ id: 'budget-app-storage' });

const KEYS = {
  USER_NICKNAME: 'user_nickname',
  NICKNAME_CREATED_AT: 'nickname_created_at',
  MONTHLY_BUDGET: 'monthly_budget',
  CALENDAR_VIEW_MODE: 'calendar_view_mode',
  LAST_HOLIDAY_SYNC: 'last_holiday_sync',
};

export const getNickname = (): string | null => {
  return storage.getString(KEYS.USER_NICKNAME) || null;
};

export const setNickname = (nickname: string): void => {
  storage.set(KEYS.USER_NICKNAME, nickname);
};

export const getNicknameCreatedAt = (): string => {
  return storage.getString(KEYS.NICKNAME_CREATED_AT) || '2026-10-12';
};

export const setNicknameCreatedAt = (dateStr: string): void => {
  storage.set(KEYS.NICKNAME_CREATED_AT, dateStr);
};

export const getMonthlyBudget = (): number => {
  return storage.getNumber(KEYS.MONTHLY_BUDGET) ?? 1500000; // 기본값 1,500,000원
};

export const setMonthlyBudget = (budget: number): void => {
  storage.set(KEYS.MONTHLY_BUDGET, budget);
};

export const getViewMode = (): ViewMode => {
  const mode = storage.getString(KEYS.CALENDAR_VIEW_MODE);
  return mode === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';
};

export const setViewMode = (mode: ViewMode): void => {
  storage.set(KEYS.CALENDAR_VIEW_MODE, mode);
};

export const getLastHolidaySync = (): string | null => {
  return storage.getString(KEYS.LAST_HOLIDAY_SYNC) || null;
};

export const setLastHolidaySync = (isoTimestamp: string): void => {
  storage.set(KEYS.LAST_HOLIDAY_SYNC, isoTimestamp);
};

export const getManualInstallment = (yearMonthStr: string): number => {
  return storage.getNumber(`manual_installment_${yearMonthStr}`) ?? 0;
};

export const setManualInstallment = (yearMonthStr: string, amount: number): void => {
  storage.set(`manual_installment_${yearMonthStr}`, amount);
};
