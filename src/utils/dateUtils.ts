import dayjs from 'dayjs';
import { CategoryType } from '../types/budget';
import { holidayDao } from '../database/holidayDao';

export const isWeekend = (dateStr: string): boolean => {
  const day = dayjs(dateStr).day();
  return day === 0 || day === 6; // 0: 일요일, 6: 토요일
};

export const isHoliday = (dateStr: string): boolean => {
  return holidayDao.isHoliday(dateStr);
};

export const isRedDay = (dateStr: string): boolean => {
  return isWeekend(dateStr) || isHoliday(dateStr);
};

export const getNextBusinessDay = (
  dateStr: string,
  categoryType: CategoryType
): string => {
  if (categoryType === 'SAVINGS') {
    return dateStr;
  }

  let current = dayjs(dateStr);

  while (isRedDay(current.format('YYYY-MM-DD'))) {
    current = current.add(1, 'day');
  }

  return current.format('YYYY-MM-DD');
};
