import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ViewMode } from '../../types/budget';

interface BudgetHeaderBannerProps {
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  dailyBudget: number;
  weeklyRemaining: number;
}

export const BudgetHeaderBanner: React.FC<BudgetHeaderBannerProps> = ({
  viewMode,
  onToggleViewMode,
  dailyBudget,
  weeklyRemaining,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.dailyBudgetText}>
          일일 권장 예산: <Text style={styles.boldText}>{dailyBudget.toLocaleString()}원</Text>
        </Text>
        <TouchableOpacity
          style={styles.toggleButton}
          activeOpacity={0.7}
          delayPressIn={0}
          onPress={() =>
            onToggleViewMode(viewMode === 'MONTHLY' ? 'WEEKLY' : 'MONTHLY')
          }
        >
          <Text style={styles.toggleText}>
            {viewMode === 'MONTHLY' ? '📅 주간 뷰' : '📆 월간 뷰'}
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'WEEKLY' && (
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyCardLabel}>이번 주 남은 예산 잔액</Text>
          <Text
            style={[
              styles.weeklyCardAmount,
              { color: weeklyRemaining >= 0 ? '#2E7D32' : '#D32F2F' },
            ]}
          >
            {weeklyRemaining.toLocaleString()} 원
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyBudgetText: {
    fontSize: 14,
    color: '#424242',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#212121',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
  },
  toggleText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
  },
  weeklyCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  weeklyCardLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  weeklyCardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
