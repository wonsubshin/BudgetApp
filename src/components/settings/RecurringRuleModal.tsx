import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  RecurringRule,
  CategoryType,
  PaymentType,
  InstallmentType,
} from '../../types/budget';
import { formatNumberWithComma, parseNumberFromComma } from '../../utils/budgetUtils';

interface RecurringRuleModalProps {
  visible: boolean;
  initialData?: RecurringRule | null;
  onClose: () => void;
  onSave: (rule: RecurringRule) => void;
}

export const RecurringRuleModal: React.FC<RecurringRuleModalProps> = ({
  visible,
  initialData,
  onClose,
  onSave,
}) => {
  const [dayStr, setDayStr] = useState('1');
  const [categoryType, setCategoryType] = useState<CategoryType>('EXPENSE');
  const [amountStr, setAmountStr] = useState('');
  const [merchant, setMerchant] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('CARD');
  const [installmentType, setInstallmentType] = useState<InstallmentType>('LUMP_SUM');

  useEffect(() => {
    if (initialData) {
      setDayStr(String(initialData.dayOfMonth));
      setCategoryType(initialData.categoryType);
      setAmountStr(formatNumberWithComma(initialData.amount));
      setMerchant(initialData.merchant);
      setPaymentType(initialData.paymentType);
      setInstallmentType(initialData.installmentType);
    } else {
      setDayStr('1');
      setCategoryType('EXPENSE');
      setAmountStr('');
      setMerchant('');
      setPaymentType('CARD');
      setInstallmentType('LUMP_SUM');
    }
  }, [initialData, visible]);

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    if (type === 'CASH') {
      setInstallmentType('LUMP_SUM');
    }
  };

  const handleSave = () => {
    const dayOfMonth = parseInt(dayStr, 10);
    if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      Alert.alert('알림', '유효한 지정일(1~31)을 입력해 주세요.');
      return;
    }

    const amount = parseNumberFromComma(amountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('알림', '유효한 금액을 입력해 주세요.');
      return;
    }

    if (!merchant.trim()) {
      Alert.alert('알림', '사용처를 입력해 주세요.');
      return;
    }

    const rule: RecurringRule = {
      id: initialData ? initialData.id : String(Date.now()),
      dayOfMonth,
      categoryType,
      amount,
      merchant: merchant.trim(),
      paymentType,
      installmentType: paymentType === 'CASH' ? 'LUMP_SUM' : installmentType,
    };

    onSave(rule);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {initialData ? '정기 결제 수정' : '정기 결제 등록'}
          </Text>

          {/* 지정일 */}
          <Text style={styles.label}>매월 지정일 (1 ~ 31일)</Text>
          <TextInput
            style={styles.input}
            placeholder="15"
            keyboardType="numeric"
            value={dayStr}
            onChangeText={setDayStr}
          />

          {/* 구분 */}
          <Text style={styles.label}>구분</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                categoryType === 'EXPENSE' && styles.selectedOptionBtn,
              ]}
              onPress={() => setCategoryType('EXPENSE')}
            >
              <Text
                style={[
                  styles.optionText,
                  categoryType === 'EXPENSE' && styles.selectedOptionText,
                ]}
              >
                💸 지출 (영업일 이관)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionBtn,
                categoryType === 'SAVINGS' && styles.selectedOptionBtn,
              ]}
              onPress={() => setCategoryType('SAVINGS')}
            >
              <Text
                style={[
                  styles.optionText,
                  categoryType === 'SAVINGS' && styles.selectedOptionText,
                ]}
              >
                🏦 적금 (날짜 유지)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 사용처 */}
          <Text style={styles.label}>사용처</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 넷플릭스, 주택청약"
            value={merchant}
            onChangeText={setMerchant}
          />

          {/* 금액 */}
          <Text style={styles.label}>금액 (원)</Text>
          <TextInput
            style={styles.input}
            placeholder="17,000"
            keyboardType="numeric"
            value={amountStr}
            onChangeText={(text) => setAmountStr(formatNumberWithComma(text))}
          />

          {/* 지불 유형 */}
          <Text style={styles.label}>지불 유형</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                paymentType === 'CARD' && styles.selectedOptionBtn,
              ]}
              onPress={() => handlePaymentTypeChange('CARD')}
            >
              <Text
                style={[
                  styles.optionText,
                  paymentType === 'CARD' && styles.selectedOptionText,
                ]}
              >
                카드
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionBtn,
                paymentType === 'CASH' && styles.selectedOptionBtn,
              ]}
              onPress={() => handlePaymentTypeChange('CASH')}
            >
              <Text
                style={[
                  styles.optionText,
                  paymentType === 'CASH' && styles.selectedOptionText,
                ]}
              >
                현금
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212121',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginTop: 12,
    marginBottom: 6,
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedOptionBtn: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  optionText: {
    fontSize: 13,
    color: '#666666',
  },
  selectedOptionText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
  cancelBtnText: {
    color: '#666666',
    fontWeight: 'bold',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
