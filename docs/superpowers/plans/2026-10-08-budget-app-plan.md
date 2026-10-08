# BudgetApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native CLI (TypeScript) standalone Android budget application with local MMKV storage, SQLite database, budget calculation banner (green/red status), Korean holiday auto-rollover, statistics charts, and native Android SMS/Push notification parsers.

**Architecture:** JSI-backed `react-native-quick-sqlite` for persistent transactions/recurring rules/holidays and `react-native-mmkv` for instant preferences. Native Kotlin services capture SMS and KakaoPay/Hyundai Card push notifications, passing parsed transaction events across Native Bridge to SQLite.

**Tech Stack:** React Native CLI, TypeScript, `react-native-mmkv`, `react-native-quick-sqlite`, `@react-navigation/native-stack`, `react-native-calendars`, `react-native-gifted-charts`, `dayjs`, Kotlin (Android Native BroadcastReceiver & NotificationListenerService).

**Spec:** [docs/superpowers/specs/2026-10-08-budget-app-design.md](file:///d:/dev/sourceCode/testbad/BudgetApp/docs/superpowers/specs/2026-10-08-budget-app-design.md)

## Global Constraints
- Android Standalone App (no external server required for core logic).
- Cash payment forced to single payment (`LUMP_SUM`).
- Savings category (`SAVINGS`) fixed to scheduled date without business day rollover.
- Expense category (`EXPENSE`) rolls over to next business day if scheduled on weekend or holiday.
- Daily budget formula: `floor(Monthly Budget / Total Days in Month)`.
- Daily budget color: Green if `actual <= budget`, Red if `actual > budget`.

---

### Task 1: Type Definitions, Storage (MMKV) and SQLite Database DAOs

**Files:**
- Create: `src/types/budget.ts`
- Create: `src/storage/mmkv.ts`
- Create: `src/database/db.ts`
- Create: `src/database/transactionDao.ts`
- Create: `src/database/recurringDao.ts`
- Create: `src/database/holidayDao.ts`

**Interfaces:**
- Consumes: None
- Produces: `initDatabase()`, `getTransactionDao()`, `getRecurringDao()`, `getHolidayDao()`, `storage` (MMKV)

- [ ] **Step 1: Create TypeScript type definitions**
Create `src/types/budget.ts` defining `Transaction`, `RecurringRule`, `Holiday`, `CategoryType` (`'EXPENSE' | 'SAVINGS'`), `PaymentType` (`'CARD' | 'CASH'`), `InstallmentType` (`'LUMP_SUM' | 'INSTALLMENT'`), and `ViewMode` (`'MONTHLY' | 'WEEKLY'`).

- [ ] **Step 2: Create MMKV Storage Wrapper**
Create `src/storage/mmkv.ts` exposing `getNickname()`, `setNickname()`, `getMonthlyBudget()`, `setMonthlyBudget()`, `getViewMode()`, `setViewMode()`.

- [ ] **Step 3: Create SQLite Initialization & DAOs**
Create `src/database/db.ts`, `transactionDao.ts`, `recurringDao.ts`, and `holidayDao.ts` with SQL table DDL execution and CRUD methods (insert, update, delete, query by month/date).

- [ ] **Step 4: Commit Task 1**
Commit changes with `git add src/ && git commit -m "feat: setup types, mmkv storage, and sqlite daos"`.

---

### Task 2: Holiday Sync Service, Rollover & Budget Calculators

**Files:**
- Create: `src/utils/fallbackHolidays.ts`
- Create: `src/services/holidayService.ts`
- Create: `src/utils/dateUtils.ts`
- Create: `src/utils/budgetUtils.ts`

**Interfaces:**
- Consumes: `getHolidayDao()` from Task 1
- Produces: `syncHolidays(year: number)`, `getNextBusinessDay(dateStr: string, category: CategoryType)`, `calculateDailyBudget(monthlyBudget: number, yearMonth: string)`

- [ ] **Step 1: Create Fallback Holidays List**
Create `src/utils/fallbackHolidays.ts` containing default Korean legal holidays (New Year, Lunar New Year, Chuseok, Independence Movement Day, Children's Day, etc.).

- [ ] **Step 2: Create Holiday Sync Service**
Create `src/services/holidayService.ts` fetching public data API (`getRestDeInfo`) and saving results into SQLite `holidays` table via `holidayDao`.

- [ ] **Step 3: Implement Business Day Rollover Utility**
Create `src/utils/dateUtils.ts` with `isWeekend`, `isHoliday`, and `getNextBusinessDay(dateStr, category)`.

- [ ] **Step 4: Implement Daily & Weekly Budget Calculators**
Create `src/utils/budgetUtils.ts` with `calculateDailyBudget(monthlyBudget, yearMonth)` using `Math.floor(monthlyBudget / daysInMonth)` and status color evaluation (`#2E7D32` vs `#D32F2F`).

- [ ] **Step 5: Commit Task 2**
Commit changes with `git add src/ && git commit -m "feat: implement holiday sync, business day rollover, and budget calculators"`.

---

### Task 3: Onboarding & Navigation Setup

**Files:**
- Create: `src/screens/OnboardingScreen.tsx`
- Create: `src/navigation/AppNavigator.tsx`

**Interfaces:**
- Consumes: `getNickname()`, `setNickname()` from Task 1
- Produces: React Navigation container with conditionally loaded screens

- [ ] **Step 1: Create Onboarding Screen**
Create `src/screens/OnboardingScreen.tsx` prompting user for nickname and saving to MMKV.

- [ ] **Step 2: Create App Navigator**
Create `src/navigation/AppNavigator.tsx` checking `getNickname()`. If null/empty -> `OnboardingScreen`, else -> Main Tab Navigator.

- [ ] **Step 3: Commit Task 3**
Commit changes with `git add src/ && git commit -m "feat: add onboarding screen and main navigation"`.

---

### Task 4: Main Calendar Screen (Monthly / Weekly Budget View)

**Files:**
- Create: `src/screens/MainCalendarScreen.tsx`
- Create: `src/components/calendar/BudgetHeaderBanner.tsx`

**Interfaces:**
- Consumes: `getTransactionDao()`, `getRecurringDao()`, `calculateDailyBudget()`, `getNextBusinessDay()`
- Produces: Calendar Screen component with view mode toggle and budget banner

- [ ] **Step 1: Create Budget Banner Component**
Create `src/components/calendar/BudgetHeaderBanner.tsx` displaying weekly remaining budget and daily budget target.

- [ ] **Step 2: Create Main Calendar Screen**
Create `src/screens/MainCalendarScreen.tsx` using `react-native-calendars`, integrating monthly/weekly toggle, rendering daily spent amount and green/red status indicator.

- [ ] **Step 3: Commit Task 4**
Commit changes with `git add src/ && git commit -m "feat: create main calendar screen with weekly/monthly toggle and budget banner"`.

---

### Task 5: Daily Transaction Detail & CRUD Screen

**Files:**
- Create: `src/screens/DailyDetailScreen.tsx`
- Create: `src/components/transaction/TransactionModal.tsx`

**Interfaces:**
- Consumes: `getTransactionDao()`, `Transaction` type
- Produces: Daily detail listing screen and CRUD modal

- [ ] **Step 1: Create Transaction Modal Component**
Create `src/components/transaction/TransactionModal.tsx` supporting Add/Edit forms. Enforce constraint: If `paymentType === 'CASH'`, force `installmentType = 'LUMP_SUM'`.

- [ ] **Step 2: Create Daily Detail Screen**
Create `src/screens/DailyDetailScreen.tsx` showing daily itemized transactions list, total daily expense/savings, and delete action.

- [ ] **Step 3: Commit Task 5**
Commit changes with `git add src/ && git commit -m "feat: add daily transaction list screen and crud modal"`.

---

### Task 6: Settings Screen (Budget, Recurring Rules & Holidays)

**Files:**
- Create: `src/screens/SettingsScreen.tsx`
- Create: `src/components/settings/RecurringRuleModal.tsx`

**Interfaces:**
- Consumes: `getRecurringDao()`, `getHolidayDao()`, MMKV monthly budget setter
- Produces: Settings Screen

- [ ] **Step 1: Create Recurring Rule Form Modal**
Create `src/components/settings/RecurringRuleModal.tsx` to add/edit recurring monthly rules.

- [ ] **Step 2: Create Settings Screen**
Create `src/screens/SettingsScreen.tsx` for updating monthly target budget, triggering holiday sync, managing recurring rules, and adding manual custom holidays.

- [ ] **Step 3: Commit Task 6**
Commit changes with `git add src/ && git commit -m "feat: add settings screen for budget, recurring rules, and holiday management"`.

---

### Task 7: Statistics Screen

**Files:**
- Create: `src/screens/StatisticsScreen.tsx`

**Interfaces:**
- Consumes: `getTransactionDao()`
- Produces: Monthly & Yearly statistics screen

- [ ] **Step 1: Implement Statistics Screen with Gifted Charts**
Create `src/screens/StatisticsScreen.tsx` utilizing `react-native-gifted-charts` for 1-12 month expense bar chart and yearly savings comparison.

- [ ] **Step 2: Commit Task 7**
Commit changes with `git add src/ && git commit -m "feat: add monthly and yearly statistics screen with charts"`.

---

### Task 8: Native Android Modules (SMS, KakaoPay & Hyundai Card Push Parsers)

**Files:**
- Create: `android/app/src/main/java/com/budgetapp/sms/SmsReceiver.kt`
- Create: `android/app/src/main/java/com/budgetapp/notification/AppNotificationListener.kt`
- Create: `android/app/src/main/java/com/budgetapp/bridge/FinancialParserModule.kt`
- Create: `android/app/src/main/java/com/budgetapp/bridge/FinancialParserPackage.kt`
- Create: `src/services/nativeParserBridge.ts`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: Android OS SMS & Notification APIs
- Produces: JS native event bridge `NativeParserBridge.subscribePaymentEvents(callback)`

- [ ] **Step 1: Declare Permissions & Services in AndroidManifest.xml**
Add `RECEIVE_SMS`, `READ_SMS`, `BIND_NOTIFICATION_LISTENER_SERVICE` to AndroidManifest.xml.

- [ ] **Step 2: Implement SmsReceiver in Kotlin**
Create `SmsReceiver.kt` matching card approval SMS patterns (amount, merchant, date, installment).

- [ ] **Step 3: Implement AppNotificationListener in Kotlin**
Create `AppNotificationListener.kt` listening to KakaoPay (`com.kakaopay.app`) and Hyundai Card (`com.hyundaicard.appcard`) push notifications, extracting payment details.

- [ ] **Step 4: Implement React Native Bridge Module & Package**
Create `FinancialParserModule.kt` & `FinancialParserPackage.kt` emitting `onPaymentParsed` event via `DeviceEventEmitter`.

- [ ] **Step 5: Implement JS Bridge Subscription Service**
Create `src/services/nativeParserBridge.ts` subscribing to Native events and saving parsed payment entries directly into SQLite `transactions` table.

- [ ] **Step 6: Commit Task 8**
Commit changes with `git add android/ src/ && git commit -m "feat: implement android native SMS and push notification listener bridge"`.
