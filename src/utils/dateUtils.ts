import dayjs from 'dayjs';
import { CategoryType } from '../types/budget';
import { holidayDao } from '../database/holidayDao';

export const isWeekend = (dateStr: string): boolean => {
  try {
    const day = dayjs(dateStr).day();
    return day === 0 || day === 6; // 0: 일요일, 6: 토요일
  } catch (e) {
    return false;
  }
};

export const isHoliday = (dateStr: string): boolean => {
  try {
    return holidayDao.isHoliday(dateStr);
  } catch (e) {
    return false;
  }
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
  let maxLoop = 0;

  try {
    while (isRedDay(current.format('YYYY-MM-DD')) && maxLoop < 14) {
      current = current.add(1, 'day');
      maxLoop++;
    }
  } catch (e) {
    return dateStr;
  }

  return current.format('YYYY-MM-DD');
};
