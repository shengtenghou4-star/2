import { Lunar, Solar } from 'lunar-javascript';
import { calculateTimeCorrection, effectiveBirthInput, type TimeCorrection } from './solar-time';
import { buildElementInteractions, detectRelations, type ChartRelation, type ElementInteraction } from './relations';
import { buildTemporalPillar, type FlowMonth, type TemporalPillar } from './timeline';

export type Gender = 'male' | 'female';
export type DayBoundary = 'midnight' | 'late-zi';
export type TimeBasis = 'civil' | 'true-solar';
export type CalendarType = 'solar' | 'lunar';
export type NatalPillarLabel = '年柱' | '月柱' | '日柱' | '时柱';

export interface BirthInput {
  calendarType: CalendarType;
  leapMonth: boolean;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  gender: Gender;
  dayBoundary: DayBoundary;
  timeBasis: TimeBasis;
  locationName: string;
  longitude: number;
  latitude: number;
  utcOffset: number;
  dstMinutes: number;
}

export interface PillarDetail extends TemporalPillar {
  label: NatalPillarLabel;
  layer: '原局';
}

export interface LuckMonth extends FlowMonth {}

export interface LuckYear {
  year: number;
  age: number;
  ganZhi: string;
  xunKong: string;
  pillar: TemporalPillar;
}

export interface LuckCycle {
  index: number;
  ganZhi: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  xunKong: string;
  pillar: TemporalPillar;
  years: LuckYear[];
}

export interface BaziChart {
  input: BirthInput;
  civilSolarInput: BirthInput;
  effectiveInput: BirthInput;
  timeCorrection: TimeCorrection;
  solarText: string;
  lunarText: string;
  zodiac: string;
  dayMaster: string;
  pillars: PillarDetail[];
  relations: ChartRelation[];
  elementInteractions: ElementInteraction[];
  prevJie: { name: string; datetime: string };
  nextJie: { name: string; datetime: string };
  prevQi: { name: string; datetime: string };
  nextQi: { name: string; datetime: string };
  auxiliary: {
    taiYuan: string;
    taiXi: string;
    mingGong: string;
    shenGong: string;
  };
  luck: {
    forward: boolean;
    startText: string;
    startSolar: string;
    cycles: LuckCycle[];
  };
}

export interface PillarDifference {
  label: NatalPillarLabel;
  civil: string;
  trueSolar: string;
}

export interface ChartComparison {
  civil: BaziChart;
  trueSolar: BaziChart;
  differences: PillarDifference[];
  hasDifference: boolean;
}

function nearTerm(term: any) {
  return {
    name: term.getName(),
    datetime: term.getSolar().toYmdHms(),
  };
}

function normalizeCalendarInput(input: BirthInput): BirthInput {
  if (input.calendarType === 'solar') return { ...input, leapMonth: false };
  const lunarMonth = input.leapMonth ? -input.month : input.month;
  const solar = Lunar.fromYmdHms(
    input.year,
    lunarMonth,
    input.day,
    input.hour,
    input.minute,
    input.second ?? 0,
  ).getSolar();
  return {
    ...input,
    calendarType: 'solar',
    leapMonth: false,
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour: solar.getHour(),
    minute: solar.getMinute(),
    second: solar.getSecond(),
  };
}

export function calculateBazi(input: BirthInput): BaziChart {
  validateBirthInput(input);

  const civilSolarInput = normalizeCalendarInput(input);
  const effective = effectiveBirthInput(civilSolarInput);
  const timeCorrection = calculateTimeCorrection(civilSolarInput);
  const solar = Solar.fromYmdHms(
    effective.year,
    effective.month,
    effective.day,
    effective.hour,
    effective.minute,
    effective.second ?? 0,
  );
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(input.dayBoundary === 'late-zi' ? 1 : 2);

  const rawPillars: Array<{ label: NatalPillarLabel; ganZhi: string }> = [
    { label: '年柱', ganZhi: eightChar.getYear() },
    { label: '月柱', ganZhi: eightChar.getMonth() },
    { label: '日柱', ganZhi: eightChar.getDay() },
    { label: '时柱', ganZhi: eightChar.getTime() },
  ];
  const references = {
    dayStem: rawPillars[2].ganZhi[0],
    yearBranch: rawPillars[0].ganZhi[1],
    dayBranch: rawPillars[2].ganZhi[1],
  };
  const pillars = rawPillars.map((item, index) => {
    const pillar = buildTemporalPillar(
      `natal-${index}`,
      item.label,
      '原局',
      item.ganZhi,
      references,
    ) as PillarDetail;
    if (item.label === '日柱') pillar.tenGod = '日主';
    return pillar;
  });

  const yun = eightChar.getYun(input.gender === 'male' ? 1 : 0);
  const cycles = (yun.getDaYun(10) as any[])
    .filter((cycle) => cycle.getIndex() > 0)
    .map((cycle) => {
      const cyclePillar = buildTemporalPillar(
        `dayun-${cycle.getIndex()}`,
        `${cycle.getStartAge()}—${cycle.getEndAge()}岁大运`,
        '大运',
        cycle.getGanZhi(),
        references,
      );
      const years = (cycle.getLiuNian() as any[]).map((year) => {
        const yearPillar = buildTemporalPillar(
          `liunian-${year.getYear()}`,
          `${year.getYear()}流年`,
          '流年',
          year.getGanZhi(),
          references,
        );
        return {
          year: year.getYear(),
          age: year.getAge(),
          ganZhi: year.getGanZhi(),
          xunKong: year.getXunKong(),
          pillar: yearPillar,
        };
      });
      return {
        index: cycle.getIndex(),
        ganZhi: cycle.getGanZhi(),
        startYear: cycle.getStartYear(),
        endYear: cycle.getEndYear(),
        startAge: cycle.getStartAge(),
        endAge: cycle.getEndAge(),
        xunKong: cycle.getXunKong(),
        pillar: cyclePillar,
        years,
      };
    });

  return {
    input,
    civilSolarInput,
    effectiveInput: effective,
    timeCorrection,
    solarText: solar.toYmdHms(),
    lunarText: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
    zodiac: lunar.getYearShengXiaoExact(),
    dayMaster: references.dayStem,
    pillars,
    relations: detectRelations(pillars),
    elementInteractions: buildElementInteractions(pillars),
    prevJie: nearTerm(lunar.getPrevJie()),
    nextJie: nearTerm(lunar.getNextJie()),
    prevQi: nearTerm(lunar.getPrevQi()),
    nextQi: nearTerm(lunar.getNextQi()),
    auxiliary: {
      taiYuan: `${eightChar.getTaiYuan()} · ${eightChar.getTaiYuanNaYin()}`,
      taiXi: `${eightChar.getTaiXi()} · ${eightChar.getTaiXiNaYin()}`,
      mingGong: `${eightChar.getMingGong()} · ${eightChar.getMingGongNaYin()}`,
      shenGong: `${eightChar.getShenGong()} · ${eightChar.getShenGongNaYin()}`,
    },
    luck: {
      forward: yun.isForward(),
      startText: `${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}天${yun.getStartHour()}小时`,
      startSolar: yun.getStartSolar().toYmdHms(),
      cycles,
    },
  };
}

export function compareCivilAndTrueSolar(input: BirthInput): ChartComparison {
  const civil = calculateBazi({ ...input, timeBasis: 'civil' });
  const trueSolar = calculateBazi({ ...input, timeBasis: 'true-solar' });
  const differences = civil.pillars.flatMap((pillar, index) => {
    const corrected = trueSolar.pillars[index];
    return pillar.ganZhi === corrected.ganZhi
      ? []
      : [{ label: pillar.label, civil: pillar.ganZhi, trueSolar: corrected.ganZhi }];
  });
  return { civil, trueSolar, differences, hasDifference: differences.length > 0 };
}

export function validateBirthInput(input: BirthInput): void {
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    throw new Error('年份目前支持 1900—2100。');
  }
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    throw new Error('月份必须在 1—12 之间。');
  }
  const maxDay = input.calendarType === 'lunar' ? 30 : 31;
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > maxDay) {
    throw new Error(`${input.calendarType === 'lunar' ? '农历' : '公历'}日期无效。`);
  }
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
    throw new Error('小时必须在 0—23 之间。');
  }
  if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) {
    throw new Error('分钟必须在 0—59 之间。');
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error('经度必须在 -180—180 之间，东经为正。');
  }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error('纬度必须在 -90—90 之间，北纬为正。');
  }
  if (!Number.isFinite(input.utcOffset) || input.utcOffset < -14 || input.utcOffset > 14) {
    throw new Error('UTC时差必须在 -14—14 之间。');
  }
  if (!Number.isFinite(input.dstMinutes) || input.dstMinutes < -120 || input.dstMinutes > 180) {
    throw new Error('夏令时修正必须在 -120—180 分钟之间。');
  }

  if (input.calendarType === 'lunar') {
    try {
      Lunar.fromYmdHms(
        input.year,
        input.leapMonth ? -input.month : input.month,
        input.day,
        input.hour,
        input.minute,
        input.second ?? 0,
      );
    } catch {
      throw new Error('该农历日期或闰月在所选年份不存在。');
    }
    return;
  }

  const probe = new Date(Date.UTC(input.year, input.month - 1, input.day));
  if (
    probe.getUTCFullYear() !== input.year ||
    probe.getUTCMonth() !== input.month - 1 ||
    probe.getUTCDate() !== input.day
  ) {
    throw new Error('公历日期不存在。');
  }
}
