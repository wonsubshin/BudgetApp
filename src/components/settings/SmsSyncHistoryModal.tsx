import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import dayjs from 'dayjs';

const { SmsHistoryParserModule } = NativeModules;

interface SmsMessageItem {
  id: string;
  receivedTime: string;
  body: string;
  isTarget: boolean;
  cardCompany?: string;
  amount?: number;
  merchant?: string;
}

interface SmsSyncHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SmsSyncHistoryModal: React.FC<SmsSyncHistoryModalProps> = ({
  visible,
  onClose,
}) => {
  const [messages, setMessages] = useState<SmsMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInboxMessages();
    }
  }, [visible]);

  const loadInboxMessages = async () => {
    setIsLoading(true);
    try {
      if (SmsHistoryParserModule && typeof SmsHistoryParserModule.syncSmsHistoryWithLog === 'function') {
        const result = await SmsHistoryParserModule.syncSmsHistoryWithLog('ALL');
        const logText: string = result?.debugLog || '';

        const parsedItems: SmsMessageItem[] = [];
        const lines = logText.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.includes('Match Found]') || line.includes('Candidate Inspected]')) {
            const isMatch = line.includes('Match Found]');
            const timeMatch = line.match(/Time:\s*([0-9\s-:]+)/) || line.match(/\]\s*([0-9\s-:]+)/) || line.match(/Date:\s*([0-9\s-:]+)/);
            const timeStr = timeMatch ? timeMatch[1].trim() : dayjs().format('YYYY-MM-DD HH:mm:ss');

            if (isMatch) {
              const cardM = line.match(/Card:\s*([^|]+)/);
              const amountM = line.match(/Amount:\s*([0-9]+)/);
              const merchantM = line.match(/Merchant:\s*([^|]+)/);

              const cardCompany = cardM ? cardM[1].trim() : '카드';
              const amount = amountM ? parseInt(amountM[1].trim(), 10) : 0;
              const merchant = merchantM ? merchantM[1].trim() : '사용처';

              parsedItems.push({
                id: `msg_${i}_${Date.now()}`,
                receivedTime: timeStr,
                body: `${cardCompany} 승인 ${merchant} ${amount.toLocaleString()}원`,
                isTarget: true,
                cardCompany,
                amount,
                merchant,
              });
            } else {
              let content = '(일반/광고/비대상 문자 내용)';
              if (i + 1 < lines.length && lines[i + 1].includes('Content:')) {
                content = lines[i + 1].replace('Content:', '').trim();
              }

              parsedItems.push({
                id: `msg_${i}_${Date.now()}`,
                receivedTime: timeStr,
                body: content,
                isTarget: false,
              });
            }
          }
        }

        setMessages(parsedItems.slice(0, 120));
      }
    } catch (e) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.th, { flex: 1.2 }]}>수신 시각</Text>
      <Text style={[styles.th, { flex: 2.2 }]}>문자 / RCS 내용</Text>
      <Text style={[styles.th, { flex: 1.1 }]}>파싱 대상</Text>
    </View>
  );

  const renderItem = ({ item }: { item: SmsMessageItem }) => {
    return (
      <View style={styles.tableRow}>
        <Text style={[styles.tdTime, { flex: 1.2 }]}>{item.receivedTime}</Text>
        <View style={{ flex: 2.2 }}>
          <Text style={styles.tdBody} numberOfLines={3}>
            {item.body}
          </Text>
          {item.isTarget && item.amount !== undefined && (
            <Text style={styles.tdParsedDetail}>
              💳 {item.cardCompany} | {item.merchant} | {item.amount.toLocaleString()}원
            </Text>
          )}
        </View>
        <View style={{ flex: 1.1, alignItems: 'center' }}>
          <View style={[styles.badge, item.isTarget ? styles.targetBadge : styles.nonTargetBadge]}>
            <Text style={[styles.badgeText, item.isTarget ? styles.targetBadgeText : styles.nonTargetBadgeText]}>
              {item.isTarget ? '⭕ 파싱 대상' : '❌ 비대상'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>📋 수신함 결제 문자 동기화 파싱 내역</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.noticeText}>
            수신함 문자 중 카드 결제 조건에 부합하는 문자는 **[⭕ 파싱 대상]**으로 자동 수록되고, 일반/광고/예외 문자는 **[❌ 비대상]**으로 분류됩니다.
          </Text>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>수신함 결제 문자를 스캔 중입니다...</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderHeader}
              renderItem={renderItem}
              contentContainerStyle={{ paddingVertical: 6 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>동기화 스캔된 결제 문자 내역이 없습니다.</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity style={styles.bottomCloseBtn} onPress={onClose}>
            <Text style={styles.bottomCloseBtnText}>닫기</Text>
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
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#757575',
    fontWeight: 'bold',
  },
  noticeText: {
    fontSize: 11,
    color: '#616161',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#37474F',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  th: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  tdTime: {
    fontSize: 11,
    color: '#616161',
  },
  tdBody: {
    fontSize: 12,
    color: '#212121',
  },
  tdParsedDetail: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: 'bold',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  targetBadge: {
    backgroundColor: '#E8F5E9',
  },
  targetBadgeText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  nonTargetBadge: {
    backgroundColor: '#FFEBEE',
  },
  nonTargetBadgeText: {
    fontSize: 11,
    color: '#C62828',
    fontWeight: 'bold',
  },
  badgeText: {
    fontSize: 11,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  bottomCloseBtn: {
    marginTop: 12,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bottomCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
