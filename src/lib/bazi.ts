import { Solar } from 'lunar-javascript';

export type Gender = 'male' | 'female';
export type DayBoundary = 'midnight' | 'late-zi';

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  gender: Gender;
  dayBoundary: DayBoundary;
}

export interface HiddenStem {
  stem: string;
  tenGod: string;
}

export interface PillarDetail {
  label: '年柱' | '月柱' | '日柱' | '时柱';
  ganZhi: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  tenGod: string;
  hiddenStems: HiddenStem[];
  naYin: string;
  growthStage: string;
  xun: string;
  xunKong: string;
}

export interface LuckYear {
  year: number;
  age: number;
  ganZhi: string;
  xunKong: string;
}

export interface LuckCycle {
  index: number;
  ganZhi: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  xunKong: string;
  years: LuckYear[];
}

export interface BaziChart {
  input: BirthInput;
  solarText: string;
  lunarText: string;
  zodiac: string;
  dayMaster: string;
  pillars: PillarDetail[];
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

const STEM_ELEMENTS: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const BRANCH_ELEMENTS: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

function splitWuXing(value: string): [string, string] {
  const chars = [...value];
  return [chars[0] ?? '', chars[1] ?? ''];
}

function buildPillar(eightChar: any, prefix: 'Year' | 'Month' | 'Day' | 'Time', label: PillarDetail['label']): PillarDetail {
  const ganZhi = eightChar[`get${prefix}`]();
  const stem = eightChar[`get${prefix}Gan`]();
  const branch = eightChar[`get${prefix}Zhi`]();
  const hidden = eightChar[`get${prefix}HideGan`]() as string[];
  const hiddenGods = eightChar[`get${prefix}ShiShenZhi`]() as string[];
  const [stemElementFromLibrary, branchElementFromLibrary] = splitWuXing(eightChar[`get${prefix}WuXing`]());

  return {
    label,
    ganZhi,
    stem,
    branch,
    stemElement: STEM_ELEMENTS[stem] ?? stemElementFromLibrary,
    branchElement: BRANCH_ELEMENTS[branch] ?? branchElementFromLibrary,
    tenGod: prefix === 'Day' ? '日主' : eightChar[`get${prefix}ShiShenGan`](),
    hiddenStems: hidden.map((item, index) => ({ stem: item, tenGod: hiddenGods[index] ?? '' })),
    naYin: eightChar[`get${prefix}NaYin`](),
    growthStage: eightChar[`get${prefix}DiShi`](),
    xun: eightChar[`get${prefix}Xun`](),
    xunKong: eightChar[`get${prefix}XunKong`](),
  };
}

function nearTerm(term: any) {
  return {
    name: term.getName(),
    datetime: term.getSolar().toYmdHms(),
  };
}

export function calculateBazi(input: BirthInput): BaziChart {
  validateBirthInput(input);

  const solar = Solar.fromYmdHms(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    input.second ?? 0,
  );
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // lunar-javascript: sect 1 = 23:00 后按次日；sect 2 = 晚子时仍属当日。
  eightChar.setSect(input.dayBoundary === 'late-zi' ? 1 : 2);

  const yun = eightChar.getYun(input.gender === 'male' ? 1 : 0);
  const cycles = (yun.getDaYun(10) as any[])
    .filter((cycle) => cycle.getIndex() > 0)
    .map((cycle) => ({
      index: cycle.getIndex(),
      ganZhi: cycle.getGanZhi(),
      startYear: cycle.getStartYear(),
      endYear: cycle.getEndYear(),
      startAge: cycle.getStartAge(),
      endAge: cycle.getEndAge(),
      xunKong: cycle.getXunKong(),
      years: (cycle.getLiuNian() as any[]).map((year) => ({
        year: year.getYear(),
        age: year.getAge(),
        ganZhi: year.getGanZhi(),
        xunKong: year.getXunKong(),
      })),
    }));

  return {
    input,
    solarText: solar.toYmdHms(),
    lunarText: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
    zodiac: lunar.getYearShengXiaoExact(),
    dayMaster: eightChar.getDayGan(),
    pillars: [
      buildPillar(eightChar, 'Year', '年柱'),
      buildPillar(eightChar, 'Month', '月柱'),
      buildPillar(eightChar, 'Day', '日柱'),
      buildPillar(eightChar, 'Time', '时柱'),
    ],
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

export function validateBirthInput(input: BirthInput): void {
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    throw new Error('年份目前支持 1900—2100。');
  }
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    throw new Error('月份必须在 1—12 之间。');
  }
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) {
    throw new Error('日期无效。');
  }
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
    throw new Error('小时必须在 0—23 之间。');
  }
  if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) {
    throw new Error('分钟必须在 0—59 之间。');
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
