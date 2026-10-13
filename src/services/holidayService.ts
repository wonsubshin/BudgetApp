import { holidayDao } from '../database/holidayDao';
import { fallbackHolidays } from '../utils/fallbackHolidays';
import { setLastHolidaySync } from '../storage/mmkv';
import { Holiday } from '../types/budget';

const PUBLIC_HOLIDAY_API = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';
// 서비스 키 (필요시 대체 가능하도록 설정)
const API_KEY = 'bf09ccab001ebac6d639311400710826a9c70ba4f7deff2a5f671a99dfce9335';

export const holidayService = {
  seedFallbackHolidays(): void {
    fallbackHolidays.forEach((h) => {
      holidayDao.upsertHoliday(h);
    });
  },

  async syncHolidays(year: number): Promise<boolean> {
    try {
      const url = `${PUBLIC_HOLIDAY_API}?solYear=${year}&ServiceKey=${API_KEY}&_type=json&numOfRows=100`;
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`API response failed with status ${response.status}`);
      }

      const json = await response.json();
      const items = json?.response?.body?.items?.item;

      if (items && Array.isArray(items)) {
        items.forEach((item: any) => {
          const rawDate = String(item.locdate);
          const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
          const holiday: Holiday = {
            locdate: formattedDate,
            dateName: item.dateName || '공휴일',
            isHoliday: item.isHoliday === 'Y' || item.isHoliday === true,
            isCustom: false,
          };
          holidayDao.upsertHoliday(holiday);
        });
      }

      setLastHolidaySync(new Date().toISOString());
      return true;
    } catch (error) {
      console.warn('Holiday API fetch failed, seeding fallback holidays:', error);
      this.seedFallbackHolidays();
      return false;
    }
  },
};
