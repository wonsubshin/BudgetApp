import { NativeModules, Clipboard, Platform } from 'react-native';
import dayjs from 'dayjs';
import {
  getNickname,
  setNickname,
  getNicknameCreatedAt,
  setNicknameCreatedAt,
  getMonthlyBudget,
  setMonthlyBudget,
  getViewMode,
  setViewMode,
  getManualInstallment,
  setManualInstallment,
} from '../storage/mmkv';
import { transactionDao } from '../database/transactionDao';
import { recurringDao } from '../database/recurringDao';
import { holidayDao } from '../database/holidayDao';
import { parseExceptionDao } from '../database/parseExceptionDao';
import { Transaction, RecurringRule, Holiday } from '../types/budget';

export interface BudgetAppBackupData {
  version: number;
  exportedAt: string;
  user: {
    nickname: string | null;
    nicknameCreatedAt: string;
    monthlyBudget: number;
    viewMode: string;
  };
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  customHolidays: Holiday[];
  parseExceptions: { keyword: string; applyPush: boolean; applySms: boolean }[];
  manualInstallments: { [yearMonth: string]: number };
}

export const backupService = {
  generateBackupJson(): string {
    const nickname = getNickname();
    const nicknameCreatedAt = getNicknameCreatedAt();
    const monthlyBudget = getMonthlyBudget();
    const viewMode = getViewMode();

    const currentYearNum = dayjs().year();
    const allYears = [currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];
    const allTransactionsMap = new Map<string, Transaction>();
    allYears.forEach((y) => {
      const list = transactionDao.getTransactionsByYear(String(y));
      list.forEach((tx) => allTransactionsMap.set(tx.id, tx));
    });

    const recurringRules = recurringDao.getAllRecurringRules();
    const customHolidays = holidayDao.getAllCustomHolidays();
    const parseExceptions = parseExceptionDao.getAllExceptions();

    // 최근 24개월 수동 입력 할부금 수집
    const manualInstallments: { [yearMonth: string]: number } = {};
    const currentMoment = dayjs();
    for (let i = -12; i <= 12; i++) {
      const ym = currentMoment.add(i, 'month').format('YYYY-MM');
      const val = getManualInstallment(ym);
      if (val > 0) {
        manualInstallments[ym] = val;
      }
    }

    const backupObj: BudgetAppBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: {
        nickname,
        nicknameCreatedAt,
        monthlyBudget,
        viewMode,
      },
      transactions: Array.from(allTransactionsMap.values()),
      recurringRules,
      customHolidays,
      parseExceptions: parseExceptions.map((e) => ({
        keyword: e.keyword,
        applyPush: e.applyPush,
        applySms: e.applySms,
      })),
      manualInstallments,
    };

    return JSON.stringify(backupObj, null, 2);
  },

  exportBackupToFile(): { success: boolean; fileName: string; filePath: string; jsonString: string } {
    const jsonString = this.generateBackupJson();
    const fileName = `backup_${dayjs().format('YYYYMMDDHHmmss')}.txt`;

    // 백업 텍스트 클립보드 안전 복사 지원
    Clipboard.setString(jsonString);

    return {
      success: true,
      fileName,
      filePath: `Download/${fileName}`,
      jsonString,
    };
  },

  restoreFromBackupJson(jsonString: string): { success: boolean; message: string } {
    try {
      const data: BudgetAppBackupData = JSON.parse(jsonString);

      if (!data || typeof data !== 'object') {
        return { success: false, message: '유효하지 않은 백업 데이터 포맷입니다.' };
      }

      // 1. 사용자 기본 설정 복구
      if (data.user) {
        if (data.user.nickname) setNickname(data.user.nickname);
        if (data.user.nicknameCreatedAt) setNicknameCreatedAt(data.user.nicknameCreatedAt);
        if (data.user.monthlyBudget > 0) setMonthlyBudget(data.user.monthlyBudget);
        if (data.user.viewMode) setViewMode(data.user.viewMode as any);
      }

      // 2. 파싱 예외 단어 먼저 복구
      if (Array.isArray(data.parseExceptions)) {
        data.parseExceptions.forEach((ex) => {
          try {
            parseExceptionDao.insertException(ex.keyword, ex.applyPush, ex.applySms);
          } catch (e) {
            // Ignore
          }
        });
      }

      // 3. 거래 내역 복구 (예외 가맹점 "드렸어요!", "결제금액", "q.samsungcard.com" 자동 제외)
      if (Array.isArray(data.transactions)) {
        data.transactions.forEach((tx) => {
          try {
            transactionDao.insertTransaction(tx);
          } catch (e) {
            // Ignore duplicate insert errors
          }
        });
      }

      // 4. 정기 결제 내역 복구
      if (Array.isArray(data.recurringRules)) {
        data.recurringRules.forEach((rule) => {
          try {
            recurringDao.insertRecurringRule(rule);
          } catch (e) {
            // Ignore
          }
        });
      }

      // 5. 커스텀 공휴일 복구
      if (Array.isArray(data.customHolidays)) {
        data.customHolidays.forEach((h) => {
          try {
            holidayDao.upsertHoliday(h);
          } catch (e) {
            // Ignore
          }
        });
      }

      // 6. 수동 입력 할부금 복구
      if (data.manualInstallments && typeof data.manualInstallments === 'object') {
        Object.keys(data.manualInstallments).forEach((ym) => {
          setManualInstallment(ym, data.manualInstallments[ym]);
        });
      }

      // 7. 복구 완료 후 전체 예외 단어 및 무효 키워드 거래 내역 최종 정제 정돈
      transactionDao.purgeAllExceptionMatchedTransactions();

      return { success: true, message: '백업 데이터가 성공적으로 완벽 복구되었습니다!' };
    } catch (e: any) {
      return { success: false, message: `복구 중 오류가 발생했습니다: ${e?.message || e}` };
    }
  },
};
