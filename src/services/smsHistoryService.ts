import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { SmsHistoryParserModule } = NativeModules;

export interface SmsSyncResult {
  count: number;
  scannedCount: number;
  debugLog: string;
}

export const syncSmsHistoryForDateWithLog = async (
  targetDateStr?: string
): Promise<SmsSyncResult> => {
  if (Platform.OS !== 'android') {
    return { count: 0, scannedCount: 0, debugLog: 'Android 플랫폼이 아닙니다.' };
  }

  try {
    const dateToSync = targetDateStr || 'ALL';

    // READ_SMS 권한 체크 및 요청
    const hasReadPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );

    if (!hasReadPermission) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS 읽기 권한 요청',
          message: '수신함의 카드 결제 문자를 분석하여 가계부에 자동 등록하기 위해 SMS 읽기 권한이 필요합니다.',
          buttonPositive: '허용',
          buttonNegative: '거부',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return {
          count: 0,
          scannedCount: 0,
          debugLog: 'READ_SMS 권한이 거부되었습니다.\n[스마트폰 설정 -> 애플리케이션 -> BudgetApp -> 권한]에서 SMS 권한을 허용해 주세요.',
        };
      }
    }

    if (
      SmsHistoryParserModule &&
      typeof SmsHistoryParserModule.syncSmsHistoryWithLog === 'function'
    ) {
      const res: SmsSyncResult = await SmsHistoryParserModule.syncSmsHistoryWithLog(dateToSync);
      return res;
    } else if (
      SmsHistoryParserModule &&
      typeof SmsHistoryParserModule.syncSmsHistoryForDate === 'function'
    ) {
      const count: number = await SmsHistoryParserModule.syncSmsHistoryForDate(dateToSync);
      return { count, scannedCount: 0, debugLog: `Parsed count: ${count}` };
    }
  } catch (err: any) {
    return {
      count: 0,
      scannedCount: 0,
      debugLog: `Sync error: ${err?.message || String(err)}`,
    };
  }

  return { count: 0, scannedCount: 0, debugLog: 'SMS 모듈을 찾을 수 없습니다.' };
};

export const syncSmsHistoryForDate = async (targetDateStr?: string): Promise<number> => {
  const res = await syncSmsHistoryForDateWithLog(targetDateStr);
  return res.count;
};
