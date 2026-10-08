import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Transaction } from '../types/budget';
import { transactionDao } from '../database/transactionDao';
import { TransactionModal } from '../components/transaction/TransactionModal';

export const DailyDetailScreen = ({ route }: any) => {
  const dateStr = route?.params?.dateStr || new Date().toISOString().slice(0, 10);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const loadTransactions = useCallback(() => {
    const list = transactionDao.getTransactionsByDate(dateStr);
    setTransactions(list);
  }, [dateStr]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleAdd = () => {
    setSelectedTx(null);
    setModalVisible(true);
  };

  const handleEdit = (tx: Transaction) => {
    setSelectedTx(tx);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('삭제 확인', '해당 거래 내역을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          transactionDao.deleteTransaction(id);
          loadTransactions();
        },
      },
    ]);
  };

  const handleSave = (tx: Transaction) => {
    if (selectedTx) {
      transactionDao.updateTransaction(tx);
    } else {
      transactionDao.insertTransaction(tx);
    }
    loadTransactions();
  };

  const totalExpense = transactions
    .filter((tx) => tx.categoryType === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSavings = transactions
    .filter((tx) => tx.categoryType === 'SAVINGS')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <Text
            style={[
              styles.categoryBadge,
              item.categoryType === 'EXPENSE'
                ? styles.expenseBadge
                : styles.savingsBadge,
            ]}
          >
            {item.categoryType === 'EXPENSE' ? '지출' : '적금'}
          </Text>
          <Text style={styles.merchantText}>{item.merchant}</Text>
        </View>

        <Text style={styles.amountText}>
          {item.amount.toLocaleString()} 원
        </Text>
      </View>

      <View style={styles.cardDetail}>
        <Text style={styles.metaText}>
          {item.paymentType === 'CARD' ? '💳 카드' : '💵 현금'} |{' '}
          {item.installmentType === 'LUMP_SUM'
            ? '일시불'
            : `${item.installmentMonths}개월 할부`}
          {item.isRecurring ? ' (정기결제)' : ''}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.btnText}>수정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.deleteBtnText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 일별 통합 배너 */}
      <View style={styles.summaryBanner}>
        <Text style={styles.dateTitle}>{dateStr} 거래 내역</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryExpense}>
            총 지출: {totalExpense.toLocaleString()}원
          </Text>
          <Text style={styles.summarySavings}>
            총 적금: {totalSavings.toLocaleString()}원
          </Text>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 거래 내역이 없습니다.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <Text style={styles.fabText}>+ 거래 추가</Text>
      </TouchableOpacity>

      <TransactionModal
        visible={modalVisible}
        dateStr={dateStr}
        initialData={selectedTx}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  summaryBanner: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryExpense: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '600',
  },
  summarySavings: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  expenseBadge: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  savingsBadge: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  },
  merchantText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  amountText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  cardDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FAFAFA',
  },
  metaText: {
    fontSize: 12,
    color: '#757575',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  btnText: {
    fontSize: 12,
    color: '#424242',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#D32F2F',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9E9E9E',
    fontSize: 14,
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
});
