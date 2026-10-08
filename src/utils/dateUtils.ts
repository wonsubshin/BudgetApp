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

export const getNextBusinessDay = (
  dateStr: string,
  categoryType: CategoryType
): string => {
  // 예외 규칙: 적금/저축 카테고리는 주말/공휴일과 무관하게 원본 일자 유지
  if (categoryType === 'SAVINGS') {
    return dateStr;
  }

  let current = dayjs(dateStr);

  // 주말(토/일)이거나 공휴일인 동안 하루씩 미룸
  while (isWeekend(current.format('YYYY-MM-DD')) || isHoliday(current.format('YYYY-MM-DD'))) {
    current = current.add(1, 'day');
  }

  return current.format('YYYY-MM-DD');
};
