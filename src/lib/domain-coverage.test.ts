import { describe, expect, it } from 'vitest';
import { Solar } from 'lunar-javascript';
import { auditAnalysisIntegrity } from './analysis-integrity';
import { calculateBazi, type BirthInput } from './bazi-audited';
import { buildLuckContext } from './context';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEvidenceSnapshot } from './evidence';
import { BRANCHES, JIA_ZI, STEMS } from './foundations';
import { buildInterpretationAssessment } from './interpretation-audited';
import { detectRelations } from './relations';
import { buildStrengthAdjudication } from './strength-audited';
import { buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';

const HOUR_BRANCH_CENTERS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
const JIE_NAMES = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'] as const;
const VALID_SET = new Set(JIA_ZI);

const MONTH_START_STEM: Record<string, string> = {
  甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲',
};
const HOUR_START_STEM: Record<string, string> = {
  甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬',
};

function defaultInput(overrides: Partial<BirthInput> = {}): BirthInput {
  return {
    calendarType: 'solar',
    leapMonth: false,
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    second: 0,
    gender: 'male',
    dayBoundary: 'midnight',
    timeBasis: 'civil',
    locationName: '覆盖测试',
    longitude: 120,
    latitude: 30,
    utcOffset: 8,
    dstMinutes: 0,
    ...overrides,
  };
}

function assertPillars(pillars: string[], label: string, errors: string[]): void {
  if (pillars.length !== 4 || pillars.some((item) => !VALID_SET.has(item))) {
    errors.push(`${label}: ${pillars.join(' ')}`);
  }
}

function directPillars(year: number, month: number, day: number, hour: number, minute: number, sect: 1 | 2): string[] {
  const eightChar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar().getEightChar();
  eightChar.setSect(sect);
  return [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()];
}

function addMinutes(text: string, minutes: number): [number, number, number, number, number] {
  const [datePart, timePart] = text.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

function solarTermsOfYear(year: number): string[] {
  const tables = [
    Solar.fromYmd(year, 1, 15).getLunar().getJieQiTable(),
    Solar.fromYmd(year, 6, 15).getLunar().getJieQiTable(),
  ];
  const found = new Map<string, string>();
  tables.forEach((table: Record<string, any>) => {
    JIE_NAMES.forEach((name) => {
      const value = table[name];
      if (value?.getYear() === year) found.set(name, value.toYmdHms());
    });
  });
  return [...found.values()];
}

function monthPillar(yearStem: string, monthBranch: string): string {
  const branchIndex = BRANCHES.indexOf(monthBranch as typeof BRANCHES[number]);
  const monthOffset = (branchIndex - 2 + 12) % 12;
  const startIndex = STEMS.indexOf(MONTH_START_STEM[yearStem] as typeof STEMS[number]);
  return `${STEMS[(startIndex + monthOffset) % 10]}${monthBranch}`;
}

function hourPillar(dayStem: string, hourBranch: string): string {
  const branchIndex = BRANCHES.indexOf(hourBranch as typeof BRANCHES[number]);
  const startIndex = STEMS.indexOf(HOUR_START_STEM[dayStem] as typeof STEMS[number]);
  return `${STEMS[(startIndex + branchIndex) % 10]}${hourBranch}`;
}

function temporalNatal(ganZhi: [string, string, string, string]): TemporalPillar[] {
  const references: NatalReferences = {
    dayStem: ganZhi[2][0],
    yearBranch: ganZhi[0][1],
    dayBranch: ganZhi[2][1],
  };
  return ganZhi.map((item, index) => buildTemporalPillar(
    `natal-${index}`,
    ['年柱', '月柱', '日柱', '时柱'][index],
    '原局',
    item,
    references,
  ));
}

function analyzeSynthetic(natal: TemporalPillar[]) {
  const relations = detectRelations(natal);
  const evidence = buildEvidenceSnapshot(natal, natal, relations);
  const dynamics = buildDynamicsSnapshot(natal, relations, evidence);
  const strength = buildStrengthAdjudication(natal, natal, relations, evidence, dynamics);
  const interpretation = buildInterpretationAssessment(
    natal,
    natal,
    relations,
    relations,
    evidence,
    evidence,
    dynamics,
    dynamics,
    strength,
    strength,
  );
  return { relations, evidence, dynamics, strength, interpretation };
}

describe('calendar domain coverage', () => {
  it('accepts every supported Gregorian date and both late-zi conventions', () => {
    const errors: string[] = [];
    let dates = 0;
    const cursor = new Date(Date.UTC(1900, 0, 1));
    const end = Date.UTC(2100, 11, 31);
    while (cursor.getTime() <= end) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      const day = cursor.getUTCDate();
      dates += 1;
      for (const [hour, minute] of [[0, 30], [12, 0], [23, 30]] as const) {
        assertPillars(directPillars(year, month, day, hour, minute, 1), `${year}-${month}-${day} ${hour}:${minute} sect1`, errors);
        assertPillars(directPillars(year, month, day, hour, minute, 2), `${year}-${month}-${day} ${hour}:${minute} sect2`, errors);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    expect(dates).toBe(73_414);
    expect(errors.slice(0, 20)).toEqual([]);
  }, 120_000);

  it('covers all twelve hour branches over a complete 60-year cycle', () => {
    const errors: string[] = [];
    let snapshots = 0;
    const cursor = new Date(Date.UTC(1984, 1, 4));
    const end = Date.UTC(2044, 1, 3);
    while (cursor.getTime() <= end) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      const day = cursor.getUTCDate();
      HOUR_BRANCH_CENTERS.forEach((hour) => {
        assertPillars(directPillars(year, month, day, hour, 30, 1), `${year}-${month}-${day} ${hour}:30 sect1`, errors);
        assertPillars(directPillars(year, month, day, hour, 30, 2), `${year}-${month}-${day} ${hour}:30 sect2`, errors);
        snapshots += 2;
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    expect(snapshots).toBeGreaterThan(525_000);
    expect(errors.slice(0, 20)).toEqual([]);
  }, 180_000);

  it('survives every supported jie boundary at one minute before and after', () => {
    const errors: string[] = [];
    let terms = 0;
    for (let year = 1900; year <= 2100; year += 1) {
      solarTermsOfYear(year).forEach((text) => {
        terms += 1;
        [-1, 0, 1].forEach((offset) => {
          const [y, m, d, h, minute] = addMinutes(text, offset);
          assertPillars(directPillars(y, m, d, h, minute, 1), `${text} offset ${offset} sect1`, errors);
          assertPillars(directPillars(y, m, d, h, minute, 2), `${text} offset ${offset} sect2`, errors);
        });
      });
    }
    expect(terms).toBe(2_412);
    expect(errors.slice(0, 20)).toEqual([]);
  }, 60_000);
});

describe('full interpretation factor domain', () => {
  it('analyzes every day pillar × year branch × month branch × hour branch state without empty or illegal outputs', () => {
    const errors: string[] = [];
    const seenDayMasters = new Set<string>();
    const seenMonthBranches = new Set<string>();
    const seenYearBranches = new Set<string>();
    const seenHourBranches = new Set<string>();
    const seenPatternTenGods = new Set<string>();
    const seenStrengthNames = new Set<string>();
    let cases = 0;

    JIA_ZI.forEach((dayPillar, dayIndex) => {
      const dayStem = dayPillar[0];
      seenDayMasters.add(dayStem);
      BRANCHES.forEach((yearBranch, yearIndex) => {
        const yearVariants = JIA_ZI.filter((item) => item[1] === yearBranch);
        const yearPillar = yearVariants[(dayIndex + yearIndex) % yearVariants.length];
        seenYearBranches.add(yearBranch);
        BRANCHES.forEach((monthBranch, monthIndex) => {
          const month = monthPillar(yearPillar[0], monthBranch);
          seenMonthBranches.add(monthBranch);
          BRANCHES.forEach((hourBranch) => {
            const hour = hourPillar(dayStem, hourBranch);
            seenHourBranches.add(hourBranch);
            cases += 1;
            try {
              const natal = temporalNatal([yearPillar, month, dayPillar, hour]);
              const result = analyzeSynthetic(natal);
              result.interpretation.pattern.candidates.forEach((item) => seenPatternTenGods.add(item.tenGod));
              result.strength.hypotheses.forEach((item) => seenStrengthNames.add(item.name));

              if (result.strength.leading.blockers.length) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: blocked strength leader`);
              if (result.interpretation.pattern.candidates.length !== natal[1].hiddenStems.length) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: pattern count mismatch`);
              if (result.interpretation.pattern.candidates.some((item) => !Number.isFinite(item.completeness))) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: non-finite pattern score`);
              if (result.strength.hypotheses.some((item) => !Number.isFinite(item.fit))) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: non-finite strength score`);
            } catch (error) {
              errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: ${error instanceof Error ? error.message : String(error)}`);
            }
          });
        });
      });
    });

    expect(cases).toBe(103_680);
    expect([...seenDayMasters].sort()).toEqual([...STEMS].sort());
    expect([...seenMonthBranches].sort()).toEqual([...BRANCHES].sort());
    expect([...seenYearBranches].sort()).toEqual([...BRANCHES].sort());
    expect([...seenHourBranches].sort()).toEqual([...BRANCHES].sort());
    expect(seenPatternTenGods.size).toBe(10);
    expect(seenStrengthNames).toEqual(new Set(['身旺候选', '偏强候选', '中和候选', '偏弱候选', '身弱候选', '从强候选', '从弱候选']));
    expect(errors.slice(0, 30)).toEqual([]);
  }, 180_000);
});

describe('runtime integrity report', () => {
  it('returns no hard failure for representative charts from every month branch and hour branch', () => {
    const failures: string[] = [];
    const dates = [
      [2024, 2, 10], [2024, 3, 10], [2024, 4, 10], [2024, 5, 10],
      [2024, 6, 10], [2024, 7, 10], [2024, 8, 10], [2024, 9, 10],
      [2024, 10, 10], [2024, 11, 10], [2024, 12, 10], [2025, 1, 10],
    ] as const;

    dates.forEach(([year, month, day], dateIndex) => {
      HOUR_BRANCH_CENTERS.forEach((hour, hourIndex) => {
        const chart = calculateBazi(defaultInput({
          year,
          month,
          day,
          hour,
          minute: 30,
          gender: (dateIndex + hourIndex) % 2 ? 'female' : 'male',
          dayBoundary: hour === 0 ? 'late-zi' : 'midnight',
        }));
        const context = buildLuckContext(chart, dateIndex % chart.luck.cycles.length, hourIndex % 10, hourIndex % 12);
        const natalEvidence = buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations);
        const currentEvidence = buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations);
        const natalDynamics = buildDynamicsSnapshot(chart.pillars, chart.relations, natalEvidence);
        const currentDynamics = buildDynamicsSnapshot(context.nodes, context.relations, currentEvidence);
        const natalStrength = buildStrengthAdjudication(chart.pillars, chart.pillars, chart.relations, natalEvidence, natalDynamics);
        const currentStrength = buildStrengthAdjudication(chart.pillars, context.nodes, context.relations, currentEvidence, currentDynamics);
        const interpretation = buildInterpretationAssessment(
          chart.pillars,
          context.nodes,
          chart.relations,
          context.relations,
          natalEvidence,
          currentEvidence,
          natalDynamics,
          currentDynamics,
          natalStrength,
          currentStrength,
        );
        const report = auditAnalysisIntegrity({
          chart,
          context,
          natalEvidence,
          currentEvidence,
          natalDynamics,
          currentDynamics,
          natalStrength,
          currentStrength,
          interpretation,
        });
        if (report.failures.length) failures.push(`${chart.solarText} ${chart.pillars.map((item) => item.ganZhi).join(' ')}: ${report.failures.join('; ')}`);
      });
    });

    expect(failures).toEqual([]);
  }, 60_000);
});
