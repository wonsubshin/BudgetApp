import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import dayjs from 'dayjs';
import { setNickname, setNicknameCreatedAt, setMonthlyBudget } from '../storage/mmkv';
import { syncSmsHistoryForDate } from '../services/smsHistoryService';
import { formatNumberWithComma, parseNumberFromComma } from '../utils/budgetUtils';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const [name, setName] = useState('');
  const [budgetStr, setBudgetStr] = useState('1,500,000');

  const nameInputRef = useRef<TextInput>(null);
  const budgetInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // 마운트 후 모바일 가상 키보드를 즉시 띄우기 위해 포커스 부여
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!name.trim()) {
      Alert.alert('알림', '사용자 별명을 입력해 주세요.');
      nameInputRef.current?.focus();
      return;
    }

    const parsedBudget = parseNumberFromComma(budgetStr);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      Alert.alert('알림', '유효한 한 달 예상 예산을 입력해 주세요.');
      budgetInputRef.current?.focus();
      return;
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    setNickname(name.trim());
    setNicknameCreatedAt(todayStr);
    setMonthlyBudget(parsedBudget);

    // 닉네임 설정일(오늘)의 카드 결제 SMS/푸시 내역 자동 분석 및 등록
    try {
      const count = await syncSmsHistoryForDate(todayStr);
      if (count > 0) {
        Alert.alert('자동 등록 완료', `닉네임 설정일(${todayStr})의 카드 결제 내역 ${count}건을 수신하여 가계부에 자동 등록했습니다!`);
      }
    } catch (e) {
      console.warn('SMS sync error:', e);
    }

    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>가계부 앱에 오신 것을 환영합니다! 👋</Text>
          <Text style={styles.subtitle}>
            스탠드얼론 가계부 사용을 위한 기본 정보를 설정해 주세요.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>사용자 별명 (닉네임)</Text>
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              placeholder="예: 홍길동"
              placeholderTextColor="#9E9E9E"
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              textContentType="name"
              autoFocus={true}
              showSoftInputOnFocus={true}
              disableFullscreenUI={true}
              returnKeyType="next"
              onSubmitEditing={() => budgetInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>한 달 예상 사용 금액 (원)</Text>
            <TextInput
              ref={budgetInputRef}
              style={styles.input}
              placeholder="1,500,000"
              placeholderTextColor="#9E9E9E"
              keyboardType="numeric"
              value={budgetStr}
              onChangeText={(text) => setBudgetStr(formatNumberWithComma(text))}
              showSoftInputOnFocus={true}
              disableFullscreenUI={true}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>시작하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212121',
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
