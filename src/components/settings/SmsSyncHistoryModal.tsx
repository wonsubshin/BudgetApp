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
  Clipboard,
  Alert,
  ScrollView,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [debugLogText, setDebugLogText] = useState('');
  const [showLogView, setShowLogView] = useState(false);

  const pageSize = 50; // 한 화면에 50건씩 페이징 처리

  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
      setShowLogView(false);
      loadInboxMessages();
    }
  }, [visible]);

  const loadInboxMessages = async () => {
    setIsLoading(true);
    let logCollector = `=== BudgetApp SMS Sync Diagnostic Log (${dayjs().format('YYYY-MM-DD HH:mm:ss')}) ===\n`;
    logCollector += `Native Module Present: ${Boolean(SmsHistoryParserModule)}\n`;

    try {
      // 1. 진단 로그 수집 실행
      if (SmsHistoryParserModule && typeof SmsHistoryParserModule.syncSmsHistoryWithLog === 'function') {
        try {
          const syncRes = await SmsHistoryParserModule.syncSmsHistoryWithLog('ALL');
          logCollector += `\n--- Native Sync Log Output ---\n${syncRes?.debugLog || '(로그 없음)'}\n`;
        } catch (syncErr: any) {
          logCollector += `\n⚠️ syncSmsHistoryWithLog Error: ${syncErr?.message || syncErr}\n`;
        }
      }

      // 2. 수신함 메시지 리스트 수집 실행
      if (SmsHistoryParserModule && typeof SmsHistoryParserModule.getInboxMessagesForInspection === 'function') {
        try {
          const rawList: any[] = await SmsHistoryParserModule.getInboxMessagesForInspection();
          logCollector += `\nGetInboxMessages Count: ${rawList ? rawList.length : 0}\n`;

          const parsedItems: SmsMessageItem[] = (rawList || []).map((item, idx) => ({
            id: item.id || `msg_${idx}_${Date.now()}`,
            receivedTime: item.receivedTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
            body: item.body || '(문자 내용)',
            isTarget: Boolean(item.isTarget),
            cardCompany: item.cardCompany || '카드',
            amount: item.amount || 0,
            merchant: item.merchant || '사용처',
          }));

          setMessages(parsedItems);
        } catch (inspectErr: any) {
          logCollector += `\n⚠️ getInboxMessagesForInspection Error: ${inspectErr?.message || inspectErr}\n`;
        }
      } else {
        logCollector += `\n⚠️ getInboxMessagesForInspection Method not found on NativeModule.\n`;
      }
    } catch (e: any) {
      logCollector += `\n⚠️ General Error: ${e?.message || e}\n`;
    } finally {
      setIsLoading(false);
      setDebugLogText(logCollector);
    }
  };

  const handleCopyDebugLog = () => {
    if (!debugLogText) {
      Alert.alert('알림', '복사할 디버그 로그가 존재하지 않습니다.');
      return;
    }
    Clipboard.setString(debugLogText);
    Alert.alert('복사 완료 📋', '디버그 진단 로그가 클립보드에 복사되었습니다! 채팅창에 붙여넣어 전달해 주세요.');
  };

  const totalPages = Math.ceil(messages.length / pageSize) || 1;
  const paginatedMessages = messages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

          {/* 디버그 로그 복사 및 로그 뷰 토글 버튼 라인 */}
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={styles.copyLogBtn}
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={handleCopyDebugLog}
            >
              <Text style={styles.copyLogBtnText}>📋 디버그 로그 복사하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleLogBtn}
              activeOpacity={0.7}
              delayPressIn={0}
              onPress={() => setShowLogView(!showLogView)}
            >
              <Text style={styles.toggleLogBtnText}>
                {showLogView ? '📊 결과 목록 보기' : '🔍 진단 로그 텍스트 보기'}
              </Text>
            </TouchableOpacity>
          </View>

          {showLogView ? (
            <ScrollView style={styles.logScrollView}>
              <Text style={styles.logText}>{debugLogText}</Text>
            </ScrollView>
          ) : isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>수신함 결제 문자를 스캔 진단 중입니다...</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                data={paginatedMessages}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                renderItem={renderItem}
                contentContainerStyle={{ paddingVertical: 6 }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>동기화 스캔된 결제 문자 내역이 없습니다.</Text>
                    <Text style={styles.emptySubText}>
                      상단의 [📋 디버그 로그 복사하기] 버튼을 눌러 로그를 전달해 주세요.
                    </Text>
                  </View>
                }
              />

              {/* 한 화면 50건 페이징 컨트롤러 */}
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage <= 1 && styles.disabledPageBtn]}
                  disabled={currentPage <= 1}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={[styles.pageBtnText, currentPage <= 1 && styles.disabledPageBtnText]}>
                    ◀ 이전 50건
                  </Text>
                </TouchableOpacity>

                <Text style={styles.pageInfoText}>
                  {currentPage} / {totalPages} 페이지 (총 {messages.length}건)
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage >= totalPages && styles.disabledPageBtn]}
                  disabled={currentPage >= totalPages}
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <Text style={[styles.pageBtnText, currentPage >= totalPages && styles.disabledPageBtnText]}>
                    다음 50건 ▶
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
    maxHeight: '92%',
    flex: 1,
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
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  copyLogBtn: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  copyLogBtnText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: 'bold',
  },
  toggleLogBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleLogBtnText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '600',
  },
  logScrollView: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  logText: {
    color: '#4CAF50',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
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
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 6,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  disabledPageBtn: {
    backgroundColor: '#F5F5F5',
  },
  pageBtnText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  disabledPageBtnText: {
    color: '#BDBDBD',
  },
  pageInfoText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '600',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: 'bold',
  },
  emptySubText: {
    fontSize: 11,
    color: '#757575',
    marginTop: 6,
  },
  bottomCloseBtn: {
    marginTop: 10,
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
