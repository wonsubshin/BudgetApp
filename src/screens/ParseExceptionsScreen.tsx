import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  NativeModules,
} from 'react-native';
import { parseExceptionDao, ParseException } from '../database/parseExceptionDao';

interface ParseExceptionsScreenProps {
  onBack?: () => void;
}

export const ParseExceptionsScreen: React.FC<ParseExceptionsScreenProps> = ({
  onBack,
}) => {
  const [exceptions, setExceptions] = useState<ParseException[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

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

    const success = parseExceptionDao.insertException(trimmed);
    if (success) {
      setNewKeyword('');
      loadExceptions();
      Alert.alert('성공', `'${trimmed}' 문구가 파싱 예외 단어로 등록되었습니다.`);
    } else {
      Alert.alert('알림', '이미 등록된 예외 단어이거나 추가 중 오류가 발생했습니다.');
    }
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
      <Text style={styles.keywordText}>🚫 {item.keyword}</Text>
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
          이곳에 등록된 단어가 포함된 RCS, SMS, MMS 및 앱 푸시 알림은 **결제 가계부 파싱에서 자동으로 제외** 처리됩니다.
        </Text>

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
    marginBottom: 14,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
