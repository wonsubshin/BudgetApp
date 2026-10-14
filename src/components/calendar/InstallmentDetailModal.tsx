import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';

export interface InstallmentItemDetail {
  id: string;
  merchant: string;
  cardCompany: string;
  monthlyAmount: number;
  totalPrincipal: number;
  installmentMonths: number;
  currentCount: number;
  remainingCount: number;
  isManualInput?: boolean;
}

interface InstallmentDetailModalProps {
  visible: boolean;
  currentYearMonth: string;
  items: InstallmentItemDetail[];
  totalSum: number;
  onClose: () => void;
}

export const InstallmentDetailModal: React.FC<InstallmentDetailModalProps> = ({
  visible,
  currentYearMonth,
  items,
  totalSum,
  onClose,
}) => {
  const renderItem = ({ item }: { item: InstallmentItemDetail }) => {
    if (item.isManualInput) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.merchantText}>✏️ 사용자 직접 기입 할부금</Text>
            <Text style={styles.amountText}>{item.monthlyAmount.toLocaleString()} 원</Text>
          </View>
          <Text style={styles.subText}>※ 사용자가 월간 뷰에서 직접 수동 입력한 건입니다.</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.merchantText}>
            💳 {item.merchant} ({item.cardCompany || '카드'})
          </Text>
          <Text style={styles.amountText}>{item.monthlyAmount.toLocaleString()} 원</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.detailPatternText}>
            [원금 {item.totalPrincipal.toLocaleString()}원 / {item.installmentMonths}개월]
          </Text>
          <Text style={styles.countText}>
            ({item.currentCount}회차 / 잔여 {item.remainingCount}회)
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>🔍 {currentYearMonth} 할부 청구 내역 상세</Text>
            <TouchableOpacity style={styles.closeHeaderBtn} onPress={onClose}>
              <Text style={styles.closeHeaderBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.totalBanner}>
            <Text style={styles.totalBannerLabel}>이달 총 할부 청구금액 합계</Text>
            <Text style={styles.totalBannerValue}>{totalSum.toLocaleString()} 원</Text>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 8 }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>조회일 기준 잔여 할부가 진행 중인 내역이 없습니다.</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    maxHeight: '85%',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  closeHeaderBtn: {
    padding: 4,
  },
  closeHeaderBtnText: {
    fontSize: 18,
    color: '#757575',
    fontWeight: 'bold',
  },
  totalBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalBannerLabel: {
    fontSize: 12,
    color: '#1565C0',
    marginBottom: 4,
  },
  totalBannerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  merchantText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  amountText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailPatternText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '500',
  },
  countText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 11,
    color: '#757575',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  closeBtn: {
    marginTop: 12,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
