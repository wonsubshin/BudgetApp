import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { setNickname, setMonthlyBudget } from '../storage/mmkv';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const [name, setName] = useState('');
  const [budgetStr, setBudgetStr] = useState('1500000');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('알림', '사용자 별명을 입력해 주세요.');
      return;
    }

    const parsedBudget = parseInt(budgetStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      Alert.alert('알림', '유효한 한 달 예상 예산을 입력해 주세요.');
      return;
    }

    setNickname(name.trim());
    setMonthlyBudget(parsedBudget);
    onComplete();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>가계부 앱에 오신 것을 환영합니다! 👋</Text>
      <Text style={styles.subtitle}>
        스탠드얼론 가계부 사용을 위한 기본 정보를 설정해 주세요.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>사용자 별명 (닉네임)</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 홍길동"
          placeholderTextColor="#9E9E9E"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>한 달 예상 사용 금액 (원)</Text>
        <TextInput
          style={styles.input}
          placeholder="1500000"
          placeholderTextColor="#9E9E9E"
          keyboardType="numeric"
          value={budgetStr}
          onChangeText={setBudgetStr}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>시작하기</Text>
      </TouchableOpacity>
    </View>
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
