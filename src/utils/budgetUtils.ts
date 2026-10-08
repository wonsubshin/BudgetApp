import dayjs from 'dayjs';

export const calculateDailyBudget = (
  monthlyBudget: number,
  yearMonthStr: string // YYYY-MM
): number => {
  const daysInMonth = dayjs(yearMonthStr, 'YYYY-MM').daysInMonth();
  if (!daysInMonth || daysInMonth <= 0) return 0;
  return Math.floor(monthlyBudget / daysInMonth);
};

export const getBudgetStatusColor = (
  actualSpent: number,
  dailyBudget: number
): string => {
  if (actualSpent <= dailyBudget) {
    return '#2E7D32'; // 초록색 (예산 이내)
  }
  return '#D32F2F'; // 빨간색 (예산 초과)
};

export const calculateWeeklyRemainingBudget = (
  monthlyBudget: number,
  weekTotalSpent: number,
  yearMonthStr: string
): number => {
  const dailyBudget = calculateDailyBudget(monthlyBudget, yearMonthStr);
  const weeklyTarget = dailyBudget * 7;
  return weeklyTarget - weekTotalSpent;
};
