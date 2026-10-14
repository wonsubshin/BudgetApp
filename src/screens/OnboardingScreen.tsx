import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
} from 'react-native';
import dayjs from 'dayjs';
import { setNickname, setNicknameCreatedAt, setMonthlyBudget } from '../storage/mmkv';
import { syncSmsHistoryForDate } from '../services/smsHistoryService';
import { formatNumberWithComma, parseNumberFromComma } from '../utils/budgetUtils';

const ADJECTIVES = [
  '절약하는', '지갑닫은', '소비참는', '부자되는', '무지출',
  '짠돌이', '지혜로운', '계획적인', '통장지키는', '알뜰한',
  '현명한', '검소한', '아껴쓰는', '재테크잘하는', '돈모으는',
  '시드머니버는', '월급지키는', '영수증챙기는', '할인받는', '쿠폰쓰는',
  '부지런한', '꼼꼼한', '똑똑한', '가계부적는', '체크카드쓰는',
  '포인트모으는', '투자하는', '적금붓는', '배당금받는', '자산가되는',
  '성실한', '신중한', '통장쪼개는', '야무진', '똑소리나는',
  '소비자제하는', '복리효과누리는', '수익내는', '절세하는', '연말정산받는',
  '주식하는', '부동산공부하는', '상가사는', '건물주되는', '파이어족',
  '경제관념있는', '수입늘리는', '지출줄이는', '스마트한', '전략적인',
  '눈부신', '용감한', '행복한', '기분좋은', '열정적인',
  '성공하는', '목표달성하는', '1억모으는', '10억만드는', '자산2배되는',
  '든든한', '안전하게버는', '차곡차곡모으는', '한푼두푼아끼는', '낭비없는',
  '실속있는', '짠테크전문가', '가성비찾는', '최저가검색하는', '네이버포인트버는',
  '캐시백받는', '금융지식풍부한', '자산관리하는', '재산늘리는', '복리수익내는',
  '안정적인', '탄탄한', '내집마련하는', '청약당첨되는', '성공투자하는',
  '수익률높은', '통장빵빵한', '머니마스터', '자산상승하는', '기적을만드는',
  '돈벼락맞는', '대박나는', '꽃길걷는', '희망찬', '미래를준비하는'
];

const NOUNS = [
  '곰돌이', '다람쥐', '펭귄', '개미', '토끼',
  '강아지', '고양이', '부엉이', '호랑이', '여우',
  '사자', '판다', '코알라', '사슴', '돌고래',
  '수달', '너구리', '햄스터', '원숭이', '표범',
  '낙타', '코끼리', '기린', '하마', '물개',
  '독수리', '올빼미', '까치', '비둘기', '오리',
  '거위', '백조', '병아리', '공룡', '드래곤',
  '유니콘', '페가수스', '피닉스', '요정', '영웅',
  '대장', '박사', '마스터', '킹', '퀸',
  '왕자', '공주', '기사', '탐험가', '전문가',
  '선생님', '대장님', '파이팅맨', '러너', '부자',
  '건물주', '투자왕', '절약왕', '짠돌이왕', '재테크왕',
  '적금왕', '자산가', '금융왕', '수익왕', '포인트왕',
  '쿠폰왕', '실속왕', '가계부왕', '청약왕', '나비',
  '꿀벌', '무당벌레', '잠자리', '반딧불이', '참새',
  '제비', '두루미', '갈매기', '파랑새', '아기곰',
  '아기사자', '아기호랑이', '아기펭귄', '아기다람쥐', '행복이',
  '대박이', '부자이', '드림이', '희망이', '머니맨'
];

export const getRandomNickname = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const [name, setName] = useState('');
  const [budgetStr, setBudgetStr] = useState('');

  const nameInputRef = useRef<TextInput>(null);
  const budgetInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // 마운트 후 가상 키보드 자동 포커스
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerateRandomNickname = () => {
    const randomName = getRandomNickname();
    setName(randomName);
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    // 필수값 검증: 닉네임
    if (!name.trim()) {
      Alert.alert('필수 입력', '사용자 별명(닉네임)을 입력해 주세요.');
      nameInputRef.current?.focus();
      return;
    }

    // 필수값 검증: 예산
    const parsedBudget = parseNumberFromComma(budgetStr);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      Alert.alert('필수 입력', '유효한 한 달 예상 사용 금액(예산)을 입력해 주세요.');
      budgetInputRef.current?.focus();
      return;
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    setNickname(name.trim());
    setNicknameCreatedAt(todayStr);
    setMonthlyBudget(parsedBudget);

    // 닉네임 설정일(오늘)의 카드 결제 SMS/푸시 내역 자동 분석 및 등록
    try {
      await syncSmsHistoryForDate(todayStr);
    } catch (e) {
      console.warn('SMS sync error:', e);
    }

    // 닉네임 설정 완료 후 즉시 앱 푸시 알림 접근 권한 승인 안내 유도
    if (Platform.OS === 'android') {
      Alert.alert(
        '🔔 알림 접근 권한 승인 안내',
        '카드 결제 앱 푸시 알림을 실시간으로 파싱하여 예산가계부에 자동 반영하려면 [알림 접근 허용] 권한이 필요합니다. 지금 설정 화면으로 이동하시겠습니까?',
        [
          {
            text: '나중에',
            style: 'cancel',
            onPress: () => onComplete(),
          },
          {
            text: '설정으로 이동',
            onPress: () => {
              try {
                Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
              } catch (e) {
                // Ignore
              }
              onComplete();
            },
          },
        ]
      );
    } else {
      onComplete();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>예산가계부에 오신 것을 환영합니다! 👋</Text>
          <Text style={styles.subtitle}>
            스탠드얼론 예산가계부 사용을 위한 필수 정보를 설정해 주세요.
          </Text>

          {/* 닉네임 입력 & 랜덤 생성 버튼 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>사용자 별명 (닉네임) *필수</Text>
            <View style={styles.nicknameRow}>
              <TextInput
                ref={nameInputRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="예: 절약하는 곰돌이"
                placeholderTextColor="#9E9E9E"
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                textContentType="name"
                autoFocus={true}
                showSoftInputOnFocus={true}
                disableFullscreenUI={true}
                returnKeyType="next"
                onSubmitEditing={() => budgetInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={styles.randomBtn}
                activeOpacity={0.7}
                delayPressIn={0}
                onPress={handleGenerateRandomNickname}
              >
                <Text style={styles.randomBtnText}>🎲 랜덤 생성</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 예산 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>한 달 예상 사용 금액 (원) *필수</Text>
            <TextInput
              ref={budgetInputRef}
              style={styles.input}
              placeholder="예: 1,500,000"
              placeholderTextColor="#9E9E9E"
              keyboardType="numeric"
              value={budgetStr}
              onChangeText={(text) => setBudgetStr(formatNumberWithComma(text))}
              showSoftInputOnFocus={true}
              disableFullscreenUI={true}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>시작하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  nicknameRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212121',
  },
  randomBtn: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#90CAF9',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  randomBtnText: {
    color: '#1565C0',
    fontWeight: 'bold',
    fontSize: 13,
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
