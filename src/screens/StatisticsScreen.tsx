import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import dayjs from 'dayjs';
import { BarChart } from 'react-native-gifted-charts';
import { transactionDao } from '../database/transactionDao';
import { Transaction } from '../types/budget';

export const StatisticsScreen = () => {
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'));
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const [monthlyExpenseData, setMonthlyExpenseData] = useState<
    { month: string; expense: number; savings: number }[]
  >([]);

  const [yearlyData, setYearlyData] = useState<
    { year: string; expense: number; savings: number }[]
  >([]);

  const loadStatsData = useCallback(() => {
    // 1. 선택 연도의 월별 1~12월 통계 집계
    const yearTxs = transactionDao.getTransactionsByYear(selectedYear);
    const months = Array.from({ length: 12 }, (_, i) =>
      String(i + 1).padStart(2, '0')
    );

    const mData = months.map((m) => {
      const prefix = `${selectedYear}-${m}`;
      const mTransactions = yearTxs.filter((tx) => tx.date.startsWith(prefix));

      const expense = mTransactions
        .filter((tx) => tx.categoryType === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const savings = mTransactions
        .filter((tx) => tx.categoryType === 'SAVINGS')
        .reduce((sum, tx) => sum + tx.amount, 0);

      return { month: `${parseInt(m, 10)}월`, expense, savings };
    });

    setMonthlyExpenseData(mData);

    // 2. 최근 3개년 연도별 통계 집계
    const currentY = parseInt(selectedYear, 10);
    const years = [String(currentY - 2), String(currentY - 1), String(currentY)];

    const yData = years.map((y) => {
      const txs = transactionDao.getTransactionsByYear(y);
      const expense = txs
        .filter((tx) => tx.categoryType === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const savings = txs
        .filter((tx) => tx.categoryType === 'SAVINGS')
        .reduce((sum, tx) => sum + tx.amount, 0);

      return { year: `${y}년`, expense, savings };
    });

    setYearlyData(yData);
  }, [selectedYear]);

  useEffect(() => {
    loadStatsData();
  }, [loadStatsData]);

  // gifted-charts 차트 바 데이터 생성
  const barData = monthlyExpenseData.map((d) => ({
    value: d.expense / 10000, // 만원 단위로 차트 표기
    label: d.month,
    frontColor: '#2196F3',
  }));

  const totalYearExpense = monthlyExpenseData.reduce(
    (sum, d) => sum + d.expense,
    0
  );
  const totalYearSavings = monthlyExpenseData.reduce(
    (sum, d) => sum + d.savings,
    0
  );
  const monthlyAverageExpense = Math.floor(totalYearExpense / 12);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 연도 선택기 */}
      <View style={styles.yearPickerRow}>
        <TouchableOpacity
          onPress={() => setSelectedYear(String(parseInt(selectedYear, 10) - 1))}
          style={styles.arrowBtn}
        >
          <Text style={styles.arrowText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.yearTitle}>{selectedYear}년 통계</Text>
        <TouchableOpacity
          onPress={() => setSelectedYear(String(parseInt(selectedYear, 10) + 1))}
          style={styles.arrowBtn}
        >
          <Text style={styles.arrowText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 토글 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'MONTHLY' && styles.activeTabBtn]}
          onPress={() => setActiveTab('MONTHLY')}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'MONTHLY' && styles.activeTabBtnText,
            ]}
          >
            월별 지출 추이
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'YEARLY' && styles.activeTabBtn]}
          onPress={() => setActiveTab('YEARLY')}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'YEARLY' && styles.activeTabBtnText,
            ]}
          >
            연도별 비교
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. 월별 통계 뷰 */}
      {activeTab === 'MONTHLY' && (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 1~12월 지출 차트 (단위: 만원)</Text>
            <View style={{ marginTop: 16 }}>
              <BarChart
                data={barData}
                barWidth={16}
                spacing={12}
                roundedTop
                hideRules
                xAxisThickness={1}
                yAxisThickness={1}
                xAxisColor="#E0E0E0"
                yAxisColor="#E0E0E0"
                noOfSections={4}
              />
            </View>
          </View>

          {/* 수치 요약 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 {selectedYear}년 통계 수치 요약</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.label}>총 지출 금액:</Text>
              <Text style={styles.valueExpense}>
                {totalYearExpense.toLocaleString()} 원
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.label}>월평균 지출액:</Text>
              <Text style={styles.valueText}>
                {monthlyAverageExpense.toLocaleString()} 원
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.label}>총 적금/저축 금액:</Text>
              <Text style={styles.valueSavings}>
                {totalYearSavings.toLocaleString()} 원
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 2. 연도별 통계 뷰 */}
      {activeTab === 'YEARLY' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🗓️ 연도별 지출 및 저축 추이 비교</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>연도</Text>
            <Text style={[styles.th, { flex: 2 }]}>총 지출</Text>
            <Text style={[styles.th, { flex: 2 }]}>총 저축/적금</Text>
          </View>

          {yearlyData.map((y) => (
            <View key={y.year} style={styles.tableRow}>
              <Text style={[styles.tdBold, { flex: 1 }]}>{y.year}</Text>
              <Text style={[styles.tdExpense, { flex: 2 }]}>
                {y.expense.toLocaleString()} 원
              </Text>
              <Text style={[styles.tdSavings, { flex: 2 }]}>
                {y.savings.toLocaleString()} 원
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  yearPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  arrowBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 2,
  },
  arrowText: {
    fontSize: 14,
    color: '#2196F3',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabBtn: {
    backgroundColor: '#FFFFFF',
  },
  tabBtnText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabBtnText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  label: {
    fontSize: 14,
    color: '#666666',
  },
  valueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  valueExpense: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  valueSavings: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 8,
  },
  th: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666666',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tdBold: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  tdExpense: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '600',
    textAlign: 'right',
  },
  tdSavings: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
    textAlign: 'right',
  },
});
