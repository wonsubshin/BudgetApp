import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { parseExceptionDao, ParseException } from '../database/parseExceptionDao';
import { transactionDao } from '../database/transactionDao';

interface ParseExceptionsScreenProps {
  onBack?: () => void;
}

export const ParseExceptionsScreen: React.FC<ParseExceptionsScreenProps> = ({
  onBack,
}) => {
  const [exceptions, setExceptions] = useState<ParseException[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [applyPush, setApplyPush] = useState(true);
  const [applySms, setApplySms] = useState(true);

  const loadExceptions = useCallback(() => {
    const list = parseExceptionDao.getAllExceptions();
    setExceptions(list);
  }, []);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) {
      Alert.alert('알림', '파싱 예외 문구를 입력해 주세요.');
      return;
    }

    if (!applyPush && !applySms) {
      Alert.alert('알림', 'APP PUSH 또는 문자 중 최소 하나 이상의 영역을 체크해 주세요.');
      return;
    }

    const success = parseExceptionDao.insertException(trimmed, applyPush, applySms);
    if (success) {
      // applySms가 true인 예외 단어인 경우에만 기존 문자 결제 이력을 DB에서 정제 삭제
      let purgedCount = 0;
      if (applySms) {
        purgedCount = transactionDao.deleteTransactionsByKeyword(trimmed);
      }

      setNewKeyword('');
      setApplyPush(true);
      setApplySms(true);
      loadExceptions();

      if (purgedCount > 0) {
        Alert.alert(
          '성공',
          `'${trimmed}' 문구가 파싱 예외 단어로 등록되었으며, 해당 단어가 포함되어 기존 등록되었던 결제 이력 ${purgedCount}건을 가계부 DB에서 정제 삭제했습니다.`
        );
      } else {
        Alert.alert('성공', `'${trimmed}' 문구가 파싱 예외 단어로 정상 등록되었습니다.`);
      }
    } else {
      Alert.alert('알림', '이미 등록된 예외 단어이거나 추가 중 오류가 발생했습니다.');
    }
  };

  const handleToggleArea = (item: ParseException, target: 'push' | 'sms') => {
    const nextPush = target === 'push' ? !item.applyPush : item.applyPush;
    const nextSms = target === 'sms' ? !item.applySms : item.applySms;

    if (!nextPush && !nextSms) {
      Alert.alert('알림', 'APP PUSH 또는 문자 중 최소 하나 이상의 영역을 체크해야 합니다.');
      return;
    }

    parseExceptionDao.updateException(item.id, item.keyword, nextPush, nextSms);
    loadExceptions();
  };

  const handleDeleteKeyword = (id: string, keyword: string) => {
    Alert.alert('예외 단어 삭제', `'${keyword}' 단어를 파싱 예외 목록에서 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          parseExceptionDao.deleteException(id);
          loadExceptions();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ParseException }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.keywordText}>🚫 {item.keyword}</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.badgeChip, item.applyPush && styles.selectedBadgeChip]}
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={() => handleToggleArea(item, 'push')}
          >
            <Text style={[styles.badgeChipText, item.applyPush && styles.selectedBadgeChipText]}>
              {item.applyPush ? '✓ APP PUSH' : '☐ APP PUSH'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.badgeChip, item.applySms && styles.selectedBadgeChip]}
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={() => handleToggleArea(item, 'sms')}
          >
            <Text style={[styles.badgeChipText, item.applySms && styles.selectedBadgeChipText]}>
              {item.applySms ? '✓ 문자(RCS/SMS/MMS)' : '☐ 문자'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        activeOpacity={0.7}
        delayPressIn={0}
        onPress={() => handleDeleteKeyword(item.id, item.keyword)}
      >
        <Text style={styles.deleteBtnText}>삭제</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        {onBack && (
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={onBack}
          >
            <Text style={styles.backBtnText}>◀ 뒤로</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.bannerTitle}>🚫 결제 파싱 예외 문구 관리</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.noticeText}>
          이곳에 등록된 단어가 포함된 메시지는 **체크된 영역(APP PUSH 또는 문자)에서 가계부 파싱이 예외 처리**됩니다. (문자 영역 체크 시에만 해당 단어 결제 이력이 정제 삭제됩니다)
        </Text>

        <View style={styles.inputBox}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="예: 광고, 네이버페이, q.samsungcard.com"
              value={newKeyword}
              onChangeText={setNewKeyword}
              autoCapitalize="none"
              autoCorrect={false}
              disableFullscreenUI={true}
            />
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={handleAddKeyword}
            >
              <Text style={styles.addBtnText}>+ 등록</Text>
            </TouchableOpacity>
          </View>

          {/* 적용 영역 체크박스 */}
          <Text style={styles.checkboxLabel}>예외 적용 영역 선택 (필수):</Text>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[styles.checkboxChip, applyPush && styles.selectedCheckboxChip]}
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={() => setApplyPush(!applyPush)}
            >
              <Text style={[styles.checkboxChipText, applyPush && styles.selectedCheckboxChipText]}>
                {applyPush ? '☑ APP PUSH' : '☐ APP PUSH'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkboxChip, applySms && styles.selectedCheckboxChip]}
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={() => setApplySms(!applySms)}
            >
              <Text style={[styles.checkboxChipText, applySms && styles.selectedCheckboxChipText]}>
                {applySms ? '☑ 문자 (RCS, SMS, MMS)' : '☐ 문자 (RCS, SMS, MMS)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={exceptions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>등록된 파싱 예외 문구가 없습니다.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backBtn: {
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  noticeText: {
    fontSize: 12,
    color: '#616161',
    marginBottom: 12,
    lineHeight: 18,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#212121',
  },
  addBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkboxChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  selectedCheckboxChip: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  checkboxChipText: {
    fontSize: 12,
    color: '#616161',
  },
  selectedCheckboxChipText: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  keywordText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badgeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#EEEEEE',
  },
  selectedBadgeChip: {
    backgroundColor: '#E8F5E9',
  },
  badgeChipText: {
    fontSize: 11,
    color: '#757575',
  },
  selectedBadgeChipText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
});
