import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import dayjs from 'dayjs';

const { SmsHistoryParserModule } = NativeModules;

export const syncSmsHistoryForDate = async (targetDateStr?: string): Promise<number> => {
  if (Platform.OS !== 'android') return 0;

  try {
    const dateToSync = targetDateStr || dayjs().format('YYYY-MM-DD');

    // READ_SMS 권한 확인 및 요청
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );

    if (!hasPermission) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS 읽기 권한 요청',
          message: `${dateToSync} 닉네임 설정일의 카드 결제 문자를 분석하여 가계부에 자동 등록하기 위해 권한이 필요합니다.`,
          buttonPositive: '허용',
          buttonNegative: '거부',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('⚠️ SMS READ 권한 거부됨');
        return 0;
      }
    }

    if (SmsHistoryParserModule && typeof SmsHistoryParserModule.syncSmsHistoryForDate === 'function') {
      const parsedCount: number = await SmsHistoryParserModule.syncSmsHistoryForDate(dateToSync);
      console.log(`📱 ${dateToSync} SMS history synced count:`, parsedCount);
      return parsedCount;
    }
  } catch (err) {
    console.warn('syncSmsHistoryForDate failed:', err);
  }

  return 0;
};
