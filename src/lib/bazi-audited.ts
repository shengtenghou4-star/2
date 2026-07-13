import { Lunar } from 'lunar-javascript';
import {
  calculateBazi as calculateBaseBazi,
  compareCivilAndTrueSolar as compareBaseCivilAndTrueSolar,
  validateBirthInput as validateBaseBirthInput,
  type BaziChart,
  type BirthInput,
  type ChartComparison,
} from './bazi';

export type {
  BaziChart,
  BirthInput,
  CalendarType,
  ChartComparison,
  DayBoundary,
  Gender,
  LuckCycle,
  LuckMonth,
  LuckYear,
  NatalPillarLabel,
  PillarDetail,
  PillarDifference,
  TimeBasis,
} from './bazi';

export function validateBirthInput(input: BirthInput): void {
  validateBaseBirthInput(input);
  const second = input.second ?? 0;
  if (!Number.isInteger(second) || second < 0 || second > 59) {
    throw new Error('秒数必须在 0—59 之间。');
  }

  if (input.calendarType !== 'lunar') return;
  const requestedMonth = input.leapMonth ? -input.month : input.month;
  let lunar: any;
  try {
    lunar = Lunar.fromYmdHms(
      input.year,
      requestedMonth,
      input.day,
      input.hour,
      input.minute,
      second,
    );
  } catch {
    throw new Error('该农历日期或闰月在所选年份不存在。');
  }

  // 部分历法库会对越界日期做归一化而不是抛错，必须用回读值再核一遍。
  if (
    lunar.getYear() !== input.year ||
    lunar.getMonth() !== requestedMonth ||
    lunar.getDay() !== input.day ||
    lunar.getHour() !== input.hour ||
    lunar.getMinute() !== input.minute ||
    lunar.getSecond() !== second
  ) {
    throw new Error('该农历日期、闰月或时间不存在，系统拒绝自动归一化。');
  }
}

export function calculateBazi(input: BirthInput): BaziChart {
  validateBirthInput(input);
  return calculateBaseBazi(input);
}

export function compareCivilAndTrueSolar(input: BirthInput): ChartComparison {
  validateBirthInput(input);
  return compareBaseCivilAndTrueSolar(input);
}
