# BudgetApp (React Native Standalone Android 가계부 앱) 아키텍처 및 상세 설계서

- **작성일**: 2026-10-08
- **플랫폼**: Android Standalone (React Native CLI + TypeScript)
- **로컬 영속성**: `react-native-mmkv`, `react-native-quick-sqlite`

---

## 1. 시스템 개요 및 기술 스택

### 기술 스택
- **Core Framework**: React Native CLI 0.73+ (TypeScript)
- **Navigation**: `@react-navigation/native`, `@react-navigation/native-stack`
- **Key-Value Storage**: `react-native-mmkv` (닉네임, 월예산, 뷰모드 저장)
- **Database**: `react-native-quick-sqlite` (거래내역, 정기결제, 공휴일 저장)
- **Date & Calendar**: `dayjs`, `react-native-calendars`
- **Charts**: `react-native-gifted-charts`
- **Native Modules (Android)**: Kotlin (`SmsReceiver`, `NotificationListenerService`)

---

## 2. 데이터베이스 스키마 및 MMKV 설계

### SQLite DDL (`transactions`, `recurring_rules`, `holidays`)

```sql
-- 1. 거래 내역 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  category_type TEXT NOT NULL,           -- 'EXPENSE' | 'SAVINGS'
  amount INTEGER NOT NULL,               -- 금액 (원)
  merchant TEXT NOT NULL,                -- 사용처
  payment_type TEXT NOT NULL,            -- 'CARD' | 'CASH'
  installment_type TEXT NOT NULL,        -- 'LUMP_SUM' | 'INSTALLMENT'
  installment_months INTEGER DEFAULT 1,  -- 할부 개월 수
  is_recurring BOOLEAN DEFAULT 0,        -- 정기 결제 자동 생성 항목 여부
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- 2. 정기 결제 규칙 테이블
CREATE TABLE IF NOT EXISTS recurring_rules (
  id TEXT PRIMARY KEY NOT NULL,
  day_of_month INTEGER NOT NULL,         -- 매월 지정일 (1~31)
  category_type TEXT NOT NULL,           -- 'EXPENSE' | 'SAVINGS'
  amount INTEGER NOT NULL,
  merchant TEXT NOT NULL,
  payment_type TEXT NOT NULL,            -- 'CARD' | 'CASH'
  installment_type TEXT NOT NULL,        -- 'LUMP_SUM' | 'INSTALLMENT'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. 공휴일 테이블
CREATE TABLE IF NOT EXISTS holidays (
  locdate TEXT PRIMARY KEY NOT NULL,     -- YYYY-MM-DD
  date_name TEXT NOT NULL,               -- 공휴일 명칭
  is_holiday BOOLEAN NOT NULL DEFAULT 1, -- 1: 공휴일 지정, 0: 해제
  is_custom BOOLEAN NOT NULL DEFAULT 0,  -- 1: 수동 등록, 0: API 동기화
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### MMKV Key-Value 매핑
- `user_nickname` (`string`): 사용자 별명 (미저장 시 온보딩 진입)
- `monthly_budget` (`number`): 한 달 예상 사용 금액 (원)
- `calendar_view_mode` (`"MONTHLY"` | `"WEEKLY"`): 달력 표기 모드
- `last_holiday_sync` (`string`): 공휴일 API 최근 동기화 일시

---

## 3. 핵심 비즈니스 유틸리티 명세

### 3.1 영업일 자동 롤오버 계산 (`getNextBusinessDay`)
- **규칙**:
  - `category_type === 'SAVINGS'` (`적금`, `ETF` 등): 주말/공휴일과 무관하게 **원래 일자** 유지.
  - `category_type === 'EXPENSE'`: 결제 예정일이 주말(토/일)이거나 `holidays` 테이블에 `is_holiday = 1`로 저장된 날인 경우, **다음 첫 번째 평일(영업일)**로 지출일 자동 이관.

### 3.2 월간/주간 일일 예산 계산 (`calculateDailyBudget`)
- **공식**:
  $$\text{일일 예상 금액} = \lfloor \frac{\text{한 달 예상 사용 금액}}{\text{해당 월의 총 일수}} \rfloor$$
- **상태 색상 표기**:
  - 당일 실지출 금액 $\le$ 일일 예상 금액 $\rightarrow$ **초록색** (`#2E7D32`)
  - 당일 실지출 금액 $>$ 일일 예상 금액 $\rightarrow$ **빨간색** (`#D32F2F`)
- **주간 뷰 잔여 예산**:
  $$\text{이번 주 잔여 예산} = (\text{일일 예상 금액} \times 7) - \text{이번 주 월~일 총 실지출}$$

### 3.3 공휴일 API 동기화 (`holidayService.ts`)
- **API Endpoint**: 한국천문연구원 특일 정보 API (`getRestDeInfo`)
- **동기화 흐름**:
  - 인터넷 연결 시 공공데이터포털 API 호출 $\rightarrow$ 연도별 공휴일 XML/JSON 파싱 $\rightarrow$ `holidays` 테이블 `INSERT OR REPLACE`.
  - 오프라인 시: 내장된 `fallbackHolidays` 기본 법정공휴일 리스트 적용.

---

## 4. 안드로이드 네이티브 모듈 설계 (Kotlin)

### 4.1 SMS Receiver (`SmsReceiver.kt`)
- `android.provider.Telephony.SMS_RECEIVED` 가로채기.
- 승인 문자 정규식 파싱: `[승인금액, 사용처, 일시불/할부]`.
- React Native Bridge (`FinancialParserModule`)의 `DeviceEventEmitter`를 통해 `onSmsPaymentReceived` 이벤트 발행.

### 4.2 KakaoPay Notification Listener (`KakaoNotificationListener.kt`)
- `NotificationListenerService` 상속 (`com.kakaopay.app` 등 카카오페이 패키지 패키지명 필터링).
- 카카오페이 승인 알림 텍스트 정규식 파싱 (`[일시, 금액, 사용처]`).
- `onNotificationPaymentReceived` 이벤트 발행.

### 4.3 Hyundai Card Notification Listener (`HyundaiCardNotificationListener.kt`)
- `NotificationListenerService` 내 패키지 필터링 (`com.hyundaicard.appcard` 등 현대카드 앱 패키지명).
- 현대카드 결제 승인 알림 텍스트 정규식 파싱 (예: `[현대카드] N,NNN원 일시불/N개월 승인 사용처`).
- 추출된 `[승인금액, 사용처, 일시불/할부, 일시]` 데이터를 `DeviceEventEmitter`를 통해 React Native로 전달 후 SQLite DB 적재.

---

## 5. 단계별 구현 계획 (Phases)

1. **Phase 1**: 아키텍처, 타입 정의, DB (SQLite Connection & DAOs) 및 MMKV 설정
2. **Phase 2**: 공휴일 API 동기화 (`holidayService`), 영업일 롤오버 (`getNextBusinessDay`), 예산 계산기 (`budgetUtils`)
3. **Phase 3**: 화면 개발 (Onboarding, MainCalendar, DailyDetail CRUD, Settings, Statistics)
4. **Phase 4**: 안드로이드 네이티브 모듈 (SMS Receiver, KakaoPay & 현대카드 Push Notification Listener, React Native Bridge)
