import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { Holiday } from '../types/budget';
import { holidayDao } from '../database/holidayDao';

export const CustomHolidayScreen = () => {
  const todayStr = dayjs().format('YYYY-MM-DD');

  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Form State
  const [locdateInput, setLocdateInput] = useState(todayStr);
  const [dateNameInput, setDateNameInput] = useState('');

  const loadHolidays = useCallback(() => {
    const list = holidayDao.getAllCustomHolidays();
    setCustomHolidays(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHolidays();
    }, [loadHolidays])
  );

  const handleOpenAddModal = () => {
    setEditingHoliday(null);
    setLocdateInput(todayStr);
    setDateNameInput('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setLocdateInput(holiday.locdate);
    setDateNameInput(holiday.dateName);
    setModalVisible(true);
  };

  const handleDelete = (locdate: string) => {
    Alert.alert('공휴일 삭제', `${locdate} 공휴일을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          holidayDao.deleteCustomHoliday(locdate);
          loadHolidays();
        },
      },
    ]);
  };

  const handleSave = () => {
    const trimmedDate = locdateInput.trim();
    const trimmedName = dateNameInput.trim();

    if (!trimmedDate) {
      Alert.alert('입력 오류', '달력에서 공휴일 날짜를 선택해 주세요.');
      return;
    }

    if (dayjs(trimmedDate).isBefore(dayjs(), 'day')) {
      Alert.alert('선택 오류', '오늘 이후 날짜만 임시공휴일로 등록할 수 있습니다.');
      return;
    }

    if (!trimmedName) {
      Alert.alert('입력 오류', '공휴일 명칭을 입력해 주세요.');
      return;
    }

    const newHoliday: Holiday = {
      locdate: trimmedDate,
      dateName: trimmedName,
      isHoliday: true,
      isCustom: true,
    };

    if (editingHoliday) {
      holidayDao.updateCustomHoliday(editingHoliday.locdate, newHoliday);
    } else {
      holidayDao.upsertHoliday(newHoliday);
    }

    setModalVisible(false);
    loadHolidays();
  };

  const renderItem = ({ item }: { item: Holiday }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.locdateText}>{item.locdate}</Text>
        <Text style={styles.dateNameText}>{item.dateName}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.7}
          delayPressIn={0}
          onPress={() => handleOpenEditModal(item)}
        >
          <Text style={styles.editBtnText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.7}
          delayPressIn={0}
          onPress={() => handleDelete(item.locdate)}
        >
          <Text style={styles.deleteBtnText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>📅 수동 지정 임시공휴일 관리</Text>
        <Text style={styles.bannerSubtitle}>
          달력에서 날짜를 선택하여 오늘 이후의 임시공휴일을 등록하고 관리합니다.
        </Text>
      </View>

      <FlatList
        data={customHolidays}
        keyExtractor={(item) => item.locdate}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 임시공휴일이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              하단의 [+ 공휴일 추가] 버튼을 눌러 달력에서 선택해 보세요.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.7}
        delayPressIn={0}
        onPress={handleOpenAddModal}
      >
        <Text style={styles.fabText}>+ 공휴일 추가</Text>
      </TouchableOpacity>

      {/* 등록 / 수정 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {editingHoliday ? '임시공휴일 수정' : '임시공휴일 등록'}
            </Text>

            {/* 달력 날짜 선택 버튼 */}
            <Text style={styles.inputLabel}>공휴일 날짜 선택 (오늘 이후만 가능)</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={() => setCalendarPickerVisible(true)}
            >
              <Text style={styles.datePickerBtnText}>
                📅 {locdateInput || '날짜 선택 (터치)'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>공휴일 명칭</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 창립기념일, 임시공휴일"
              value={dateNameInput}
              onChangeText={setDateNameInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.7}
                delayPressIn={0}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.7}
                delayPressIn={0}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 달력 서브 모달 (오늘 이전 비활성화) */}
      <Modal
        visible={calendarPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { padding: 12 }]}>
            <Text style={[styles.modalTitle, { marginHorizontal: 8, marginTop: 8 }]}>
              공휴일 날짜 선택 (오늘 이후)
            </Text>
            <Calendar
              minDate={todayStr} // 오늘 이전 날짜 비활성화
              current={locdateInput || todayStr}
              markedDates={{
                [locdateInput]: {
                  selected: true,
                  selectedColor: '#2196F3',
                },
              }}
              onDayPress={(day: any) => {
                setLocdateInput(day.dateString);
                setCalendarPickerVisible(false);
              }}
              theme={{
                todayTextColor: '#2196F3',
                arrowColor: '#2196F3',
              }}
            />
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 12, alignSelf: 'flex-end' }]}
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={() => setCalendarPickerVisible(false)}
            >
              <Text style={styles.cancelBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  banner: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#757575',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
  },
  cardInfo: {
    flex: 1,
  },
  locdateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 2,
  },
  dateNameText: {
    fontSize: 14,
    color: '#424242',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 13,
    color: '#424242',
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  deleteBtnText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#757575',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  /* 모달 스타일 */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 6,
    fontWeight: '500',
  },
  datePickerBtn: {
    borderWidth: 1,
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  datePickerBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
    color: '#212121',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
