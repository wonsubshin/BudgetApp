import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import { RecurringRule, Holiday } from '../types/budget';
import {
  getMonthlyBudget,
  setMonthlyBudget,
  getLastHolidaySync,
} from '../storage/mmkv';
import { recurringDao } from '../database/recurringDao';
import { holidayDao } from '../database/holidayDao';
import { holidayService } from '../services/holidayService';
import { RecurringRuleModal } from '../components/settings/RecurringRuleModal';
import { formatNumberWithComma, parseNumberFromComma } from '../utils/budgetUtils';

export const SettingsScreen = () => {
  const [budgetStr, setBudgetStr] = useState(formatNumberWithComma(getMonthlyBudget()));
  const [lastSync, setLastSync] = useState(getLastHolidaySync());
  const [isSyncing, setIsSyncing] = useState(false);

  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RecurringRule | null>(null);

  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [customDate, setCustomDate] = useState('');
  const [customName, setCustomName] = useState('');

  const loadSettingsData = useCallback(() => {
    setRecurringRules(recurringDao.getAllRecurringRules());
    const currentYear = dayjs().format('YYYY');
    const holidays = holidayDao.getHolidaysByYear(currentYear);
    setCustomHolidays(holidays.filter((h) => h.isCustom));
    setLastSync(getLastHolidaySync());
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const handleSaveBudget = () => {
    const val = parseNumberFromComma(budgetStr);
    if (isNaN(val) || val <= 0) {
      Alert.alert('알림', '유효한 예산 금액을 입력해 주세요.');
      return;
    }
    setMonthlyBudget(val);
    Alert.alert('성공', '한 달 목표 예산이 변경되었습니다.');
  };

  const handleSyncHolidays = async () => {
    setIsSyncing(true);
    const year = dayjs().year();
    const success = await holidayService.syncHolidays(year);
    setIsSyncing(false);

    if (success) {
      Alert.alert('동기화 완료', `${year}년 공휴일 정보를 수신하여 저장했습니다.`);
    } else {
      Alert.alert('안내', '네트워크 미연결로 기본 내장 공휴일 데이터를 세팅했습니다.');
    }
    loadSettingsData();
  };

  const handleAddRule = () => {
    setSelectedRule(null);
    setModalVisible(true);
  };

  const handleSaveRule = (rule: RecurringRule) => {
    if (selectedRule) {
      recurringDao.updateRecurringRule(rule);
    } else {
      recurringDao.insertRecurringRule(rule);
    }
    loadSettingsData();
  };

  const handleDeleteRule = (id: string) => {
    recurringDao.deleteRecurringRule(id);
    loadSettingsData();
  };

  const handleAddCustomHoliday = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
      Alert.alert('알림', '날짜 형식(YYYY-MM-DD)에 맞춰 입력해 주세요.');
      return;
    }
    if (!customName.trim()) {
      Alert.alert('알림', '공휴일 명칭을 입력해 주세요.');
      return;
    }

    holidayDao.upsertHoliday({
      locdate: customDate,
      dateName: customName.trim(),
      isHoliday: true,
      isCustom: true,
    });

    setCustomDate('');
    setCustomName('');
    Alert.alert('성공', '임시 공휴일이 추가되었습니다.');
    loadSettingsData();
  };

  const handleDeleteCustomHoliday = (locdate: string) => {
    holidayDao.deleteCustomHoliday(locdate);
    loadSettingsData();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. 월 예산 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 목표 예산 설정</Text>
        <Text style={styles.sectionSub}>
          한 달 권장 예상 지출을 설정하여 일일 권장 금액을 계산합니다.
        </Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            value={budgetStr}
            onChangeText={(text) => setBudgetStr(formatNumberWithComma(text))}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 공휴일 동기화 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗓️ 공휴일 API 동기화</Text>
        <Text style={styles.sectionSub}>
          한국천문연구원 API를 통해 해당 연도의 법정/임시공휴일을 수신합니다.
        </Text>
        <Text style={styles.metaText}>
          최근 동기화 시각:{' '}
          {lastSync ? dayjs(lastSync).format('YYYY-MM-DD HH:mm') : '없음'}
        </Text>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSyncHolidays}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.syncBtnText}>🔄 공휴일 최신 동기화 실행</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. 정기 결제 관리 */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🔄 정기 결제 내역 관리</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddRule}>
            <Text style={styles.addBtnText}>+ 등록</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSub}>
          매달 반복되는 지출(영업일 이관) 및 적금(날짜 고정)을 관리합니다.
        </Text>

        {recurringRules.map((rule) => (
          <View key={rule.id} style={styles.itemCard}>
            <View>
              <Text style={styles.itemTitle}>
                매월 {rule.dayOfMonth}일 | {rule.merchant} (
                {rule.categoryType === 'EXPENSE' ? '지출' : '적금'})
              </Text>
              <Text style={styles.itemSub}>
                {rule.amount.toLocaleString()}원 ({rule.paymentType})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteRule(rule.id)}
              style={styles.deleteBadge}
            >
              <Text style={styles.deleteBadgeText}>삭제</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 4. 임시 공휴일 수동 추가 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✏️ 임시공휴일 수동 추가</Text>
        <Text style={styles.sectionSub}>
          사용자가 직접 특정 일자를 임시공휴일로 추가하거나 삭제합니다.
        </Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="YYYY-MM-DD"
            value={customDate}
            onChangeText={setCustomDate}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="공휴일 명칭"
            value={customName}
            onChangeText={setCustomName}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleAddCustomHoliday}>
            <Text style={styles.saveBtnText}>추가</Text>
          </TouchableOpacity>
        </View>

        {customHolidays.map((h) => (
          <View key={h.locdate} style={styles.itemCard}>
            <Text style={styles.itemTitle}>
              {h.locdate} ({h.dateName})
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteCustomHoliday(h.locdate)}
              style={styles.deleteBadge}
            >
              <Text style={styles.deleteBadgeText}>삭제</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <RecurringRuleModal
        visible={modalVisible}
        initialData={selectedRule}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveRule}
      />
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#212121',
  },
  saveBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  syncBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addBtnText: {
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 12,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  itemSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  deleteBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteBadgeText: {
    fontSize: 12,
    color: '#D32F2F',
  },
});
