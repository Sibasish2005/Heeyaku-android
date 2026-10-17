import {
  getTodayStartTimestamp,
  isTimestampToday,
  getMonthRange,
} from '../src/utils/dateRange';

describe('dateRange utility', () => {
  it('calculates start of today timestamp accurately to 00:00:00.000', () => {
    const todayStart = getTodayStartTimestamp();
    const date = new Date(todayStart);

    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it('correctly verifies if a timestamp occurred today', () => {
    const now = Date.now();
    expect(isTimestampToday(now)).toBe(true);

    const pastYear = Date.now() - 365 * 24 * 60 * 60 * 1000;
    expect(isTimestampToday(pastYear)).toBe(false);

    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    expect(isTimestampToday(tomorrow)).toBe(false);
  });

  it('builds valid monthly ranges for completed calendar months', () => {
    // January 2024 has 31 days
    const jan = getMonthRange(2024, 0);
    expect(jan.monthLabel).toBe('January 2024');
    expect(jan.days.length).toBe(31);
    expect(jan.days[0].dayNumber).toBe(1);
    expect(jan.days[30].dayNumber).toBe(31);
    expect(jan.isCurrentMonth).toBe(false);

    // February in leap year 2024 has 29 days
    const feb2024 = getMonthRange(2024, 1);
    expect(feb2024.days.length).toBe(29);

    // February in non-leap year 2023 has 28 days
    const feb2023 = getMonthRange(2023, 1);
    expect(feb2023.days.length).toBe(28);
  });
});
