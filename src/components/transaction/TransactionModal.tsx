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
  Transaction,
  CategoryType,
  PaymentType,
  InstallmentType,
} from '../../types/budget';

interface TransactionModalProps {
  visible: boolean;
  dateStr: string;
  initialData?: Transaction | null;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  dateStr,
  initialData,
  onClose,
  onSave,
}) => {
  const [categoryType, setCategoryType] = useState<CategoryType>('EXPENSE');
  const [amountStr, setAmountStr] = useState('');
  const [merchant, setMerchant] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('CARD');
  const [installmentType, setInstallmentType] = useState<InstallmentType>('LUMP_SUM');
  const [installmentMonths, setInstallmentMonths] = useState('1');

  useEffect(() => {
    if (initialData) {
      setCategoryType(initialData.categoryType);
      setAmountStr(String(initialData.amount));
      setMerchant(initialData.merchant);
      setPaymentType(initialData.paymentType);
      setInstallmentType(initialData.installmentType);
      setInstallmentMonths(String(initialData.installmentMonths || 1));
    } else {
      setCategoryType('EXPENSE');
      setAmountStr('');
      setMerchant('');
      setPaymentType('CARD');
      setInstallmentType('LUMP_SUM');
      setInstallmentMonths('1');
    }
  }, [initialData, visible]);

  // 비즈니스 룰: 현금 선택 시 할부여부는 자동으로 '일시불'로 고정
  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    if (type === 'CASH') {
      setInstallmentType('LUMP_SUM');
      setInstallmentMonths('1');
    }
  };

  const handleSave = () => {
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('알림', '유효한 금액을 입력해 주세요.');
      return;
    }

    if (!merchant.trim()) {
      Alert.alert('알림', '사용처를 입력해 주세요.');
      return;
    }

    const months = parseInt(installmentMonths, 10) || 1;

    const tx: Transaction = {
      id: initialData ? initialData.id : String(Date.now()),
      date: dateStr,
      categoryType,
      amount,
      merchant: merchant.trim(),
      paymentType,
      installmentType: paymentType === 'CASH' ? 'LUMP_SUM' : installmentType,
      installmentMonths: paymentType === 'CASH' || installmentType === 'LUMP_SUM' ? 1 : months,
      isRecurring: initialData ? initialData.isRecurring : false,
    };

    onSave(tx);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {initialData ? '거래 내역 수정' : '거래 내역 추가'} ({dateStr})
          </Text>

          {/* 구분 선택 (지출 / 적금) */}
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
                💸 지출
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
                🏦 적금/저축
              </Text>
            </TouchableOpacity>
          </View>

          {/* 사용처 */}
          <Text style={styles.label}>사용처</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 스타벅스, 청약저축"
            value={merchant}
            onChangeText={setMerchant}
          />

          {/* 금액 */}
          <Text style={styles.label}>금액 (원)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={amountStr}
            onChangeText={setAmountStr}
          />

          {/* 지불 유형 (카드 / 현금) */}
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
                💳 카드
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
                💵 현금
              </Text>
            </TouchableOpacity>
          </View>

          {/* 할부 여부 (현금 시 고정) */}
          <Text style={styles.label}>할부 여부</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                installmentType === 'LUMP_SUM' && styles.selectedOptionBtn,
              ]}
              onPress={() => setInstallmentType('LUMP_SUM')}
            >
              <Text
                style={[
                  styles.optionText,
                  installmentType === 'LUMP_SUM' && styles.selectedOptionText,
                ]}
              >
                일시불
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionBtn,
                installmentType === 'INSTALLMENT' && styles.selectedOptionBtn,
                paymentType === 'CASH' && styles.disabledBtn,
              ]}
              disabled={paymentType === 'CASH'}
              onPress={() => setInstallmentType('INSTALLMENT')}
            >
              <Text
                style={[
                  styles.optionText,
                  installmentType === 'INSTALLMENT' && styles.selectedOptionText,
                  paymentType === 'CASH' && styles.disabledText,
                ]}
              >
                할부
              </Text>
            </TouchableOpacity>
          </View>

          {paymentType === 'CASH' && (
            <Text style={styles.noticeText}>
              ※ 현금 결제 시 할부여부는 '일시불'로 고정됩니다.
            </Text>
          )}

          {paymentType === 'CARD' && installmentType === 'INSTALLMENT' && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>할부 개월 수</Text>
              <TextInput
                style={styles.input}
                placeholder="3"
                keyboardType="numeric"
                value={installmentMonths}
                onChangeText={setInstallmentMonths}
              />
            </View>
          )}

          {/* 하단 버튼 */}
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
  disabledBtn: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
  },
  optionText: {
    fontSize: 14,
    color: '#666666',
  },
  selectedOptionText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#BDBDBD',
  },
  noticeText: {
    fontSize: 12,
    color: '#E65100',
    marginTop: 6,
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
