import { NativeModules, PermissionsAndroid, Platform, Alert } from 'react-native';

const { SmsHistoryParserModule } = NativeModules;

export const syncSmsHistoryForDate = async (targetDateStr?: string): Promise<number> => {
  if (Platform.OS !== 'android') return 0;

  try {
    const dateToSync = targetDateStr || 'ALL';

    // READ_SMS 및 RECEIVE_SMS 권한 확인 및 요청
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
        Alert.alert(
          '권한 필요',
          'SMS 읽기 권한이 거부되어 수신함 문자를 분석할 수 없습니다.\n[스마트폰 설정 -> 애플리케이션 -> BudgetApp -> 권한]에서 SMS 권한을 허용해 주세요.'
        );
        return 0;
      }
    }

    if (SmsHistoryParserModule && typeof SmsHistoryParserModule.syncSmsHistoryForDate === 'function') {
      const parsedCount: number = await SmsHistoryParserModule.syncSmsHistoryForDate(dateToSync);
      console.log(`📱 [SMS History Sync] ${dateToSync} parsed count:`, parsedCount);
      return parsedCount;
    }
  } catch (err) {
    console.warn('syncSmsHistoryForDate failed:', err);
  }

  return 0;
};
