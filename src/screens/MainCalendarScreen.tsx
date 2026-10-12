import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import dayjs from 'dayjs';
import { BudgetHeaderBanner } from '../components/calendar/BudgetHeaderBanner';
import { ViewMode, Transaction } from '../types/budget';
import {
  getMonthlyBudget,
  getViewMode,
  setViewMode as setStorageViewMode,
} from '../storage/mmkv';
import { transactionDao } from '../database/transactionDao';
import { recurringDao } from '../database/recurringDao';
import { getNextBusinessDay } from '../utils/dateUtils';
import {
  calculateDailyBudget,
  getBudgetStatusColor,
  calculateWeeklyRemainingBudget,
} from '../utils/budgetUtils';

LocaleConfig.locales['kr'] = {
  monthNames: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  monthNamesShort: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  dayNames: [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
  ],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'kr';

interface MainCalendarScreenProps {
  onSelectDate: (dateStr: string) => void;
  onOpenSettings?: () => void;
}

export const MainCalendarScreen: React.FC<MainCalendarScreenProps> = ({
  onSelectDate,
  onOpenSettings,
}) => {
  const [currentYearMonth, setCurrentYearMonth] = useState(
    dayjs().format('YYYY-MM')
  );
  const [viewMode, setMode] = useState<ViewMode>(getViewMode());
  const [dailyTotals, setDailyTotals] = useState<{ [date: string]: number }>({});
  const [monthlyBudget, setBudget] = useState(getMonthlyBudget());

  const loadCalendarData = useCallback(() => {
    const budget = getMonthlyBudget();
    setBudget(budget);

    // 1. 저장된 실제 거래 내역 조회
    const txs = transactionDao.getTransactionsByMonth(currentYearMonth);

    // 2. 정기 결제 내역 롤오버 계산 후 합산
    const recurringRules = recurringDao.getAllRecurringRules();
    const daysInMonth = dayjs(currentYearMonth, 'YYYY-MM').daysInMonth();
    const totals: { [date: string]: number } = {};

    // DB 거래 내역 반영
    txs.forEach((tx) => {
      if (tx.categoryType === 'EXPENSE') {
        totals[tx.date] = (totals[tx.date] || 0) + tx.amount;
      }
    });

    // 정기 결제 규칙 반영 (적금은 지정일, 지출은 영업일 이관 적용)
    recurringRules.forEach((rule) => {
      if (rule.dayOfMonth <= daysInMonth) {
        const rawDate = `${currentYearMonth}-${String(rule.dayOfMonth).padStart(
          2,
          '0'
        )}`;
        const effectiveDate = getNextBusinessDay(rawDate, rule.categoryType);

        if (rule.categoryType === 'EXPENSE') {
          totals[effectiveDate] = (totals[effectiveDate] || 0) + rule.amount;
        }
      }
    });

    setDailyTotals(totals);
  }, [currentYearMonth]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handleToggleViewMode = (mode: ViewMode) => {
    setMode(mode);
    setStorageViewMode(mode);
  };

  const dailyBudget = calculateDailyBudget(monthlyBudget, currentYearMonth);

  // 주간 뷰 계산 (이번 주 월~일 총 지출)
  const startOfWeek = dayjs().startOf('week').add(1, 'day'); // 월요일 기준
  let weekSpent = 0;
  for (let i = 0; i < 7; i++) {
    const dateStr = startOfWeek.add(i, 'day').format('YYYY-MM-DD');
    weekSpent += dailyTotals[dateStr] || 0;
  }
  const weeklyRemaining = calculateWeeklyRemainingBudget(
    monthlyBudget,
    weekSpent,
    currentYearMonth
  );

  // 커스텀 날짜 셀 렌더링
  const customDayComponent = ({ date, state }: any) => {
    if (!date) return null;
    const dateStr = date.dateString;
    const amount = dailyTotals[dateStr] || 0;
    const color = getBudgetStatusColor(amount, dailyBudget);
    const isToday = dateStr === dayjs().format('YYYY-MM-DD');

    return (
      <TouchableOpacity
        style={[styles.dayCell, isToday && styles.todayCell]}
        onPress={() => onSelectDate(dateStr)}
      >
        <Text
          style={[
            styles.dayText,
            state === 'disabled' && styles.disabledText,
            isToday && styles.todayText,
          ]}
        >
          {date.day}
        </Text>

        {amount > 0 && (
          <Text style={[styles.amountText, { color }]}>
            {amount.toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <BudgetHeaderBanner
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        dailyBudget={dailyBudget}
        weeklyRemaining={weeklyRemaining}
      />

      <Calendar
        current={`${currentYearMonth}-01`}
        onMonthChange={(month: any) => {
          const ym = `${month.year}-${String(month.month).padStart(2, '0')}`;
          setCurrentYearMonth(ym);
        }}
        dayComponent={customDayComponent}
        theme={{
          backgroundColor: '#FFFFFF',
          calendarBackground: '#FFFFFF',
          textSectionTitleColor: '#666666',
          selectedDayBackgroundColor: '#2196F3',
          todayTextColor: '#2196F3',
          arrowColor: '#2196F3',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  dayCell: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  todayCell: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '500',
  },
  todayText: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  disabledText: {
    color: '#BDBDBD',
  },
  amountText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
