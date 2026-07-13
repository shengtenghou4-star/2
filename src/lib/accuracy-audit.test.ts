import { describe, expect, it } from 'vitest';
import { Lunar, Solar } from 'lunar-javascript';
import { calculateBazi, type BirthInput } from './bazi';
import { validateBirthInput as validateAuditedBirthInput } from './bazi-audited';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEvidenceSnapshot } from './evidence';
import { buildPatternAssessment } from './interpretation-audited';
import { detectRelations } from './relations';
import { buildStrengthAdjudication } from './strength-audited';
import { buildFlowMonths, buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';

function input(overrides: Partial<BirthInput> = {}): BirthInput {
  return {
    calendarType: 'solar',
    leapMonth: false,
    year: 2005,
    month: 12,
    day: 23,
    hour: 8,
    minute: 37,
    second: 0,
    gender: 'male',
    dayBoundary: 'midnight',
    timeBasis: 'civil',
    locationName: '审计测试',
    longitude: 120,
    latitude: 30,
    utcOffset: 8,
    dstMinutes: 0,
    ...overrides,
  };
}

function directPillars(value: BirthInput): string[] {
  const solar = Solar.fromYmdHms(value.year, value.month, value.day, value.hour, value.minute, value.second ?? 0);
  const eightChar = solar.getLunar().getEightChar();
  eightChar.setSect(value.dayBoundary === 'late-zi' ? 1 : 2);
  return [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()];
}

function natalNodes(ganZhi: string[]): TemporalPillar[] {
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

function patternFor(ganZhi: string[]) {
  const natal = natalNodes(ganZhi);
  const relations = detectRelations(natal);
  const evidence = buildEvidenceSnapshot(natal, natal, relations);
  const dynamics = buildDynamicsSnapshot(natal, relations, evidence);
  return buildPatternAssessment(natal, natal, relations, relations, evidence, dynamics);
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('official lunar-javascript regression fixtures', () => {
  it('matches the upstream 2005-12-23 eight-char fixture and detail tables', () => {
    const chart = calculateBazi(input());
    expect(chart.pillars.map((item) => item.ganZhi)).toEqual(['乙酉', '戊子', '辛巳', '壬辰']);
    expect(chart.pillars.map((item) => item.hiddenStems.map((hidden) => hidden.stem).join(','))).toEqual([
      '辛', '癸', '丙,庚,戊', '戊,乙,癸',
    ]);
    expect(chart.pillars.map((item) => item.tenGod)).toEqual(['偏财', '正印', '日主', '伤官']);
    expect(chart.pillars.map((item) => item.growthStage)).toEqual(['临官', '长生', '死', '墓']);
  });

  it('keeps the two late-zi day-boundary conventions distinct', () => {
    const base = input({ year: 1988, month: 2, day: 15, hour: 23, minute: 30 });
    expect(calculateBazi({ ...base, dayBoundary: 'midnight' }).pillars.map((item) => item.ganZhi)).toEqual([
      '戊辰', '甲寅', '庚子', '戊子',
    ]);
    expect(calculateBazi({ ...base, dayBoundary: 'late-zi' }).pillars.map((item) => item.ganZhi)).toEqual([
      '戊辰', '甲寅', '辛丑', '戊子',
    ]);
  });
});

describe('large deterministic differential checks', () => {
  it('matches direct lunar-javascript pillars for 800 civil-time samples', () => {
    const random = lcg(20260714);
    for (let index = 0; index < 800; index += 1) {
      const value = input({
        year: 1901 + Math.floor(random() * 199),
        month: 1 + Math.floor(random() * 12),
        day: 1 + Math.floor(random() * 28),
        hour: Math.floor(random() * 24),
        minute: Math.floor(random() * 60),
        second: Math.floor(random() * 60),
        dayBoundary: random() < 0.5 ? 'midnight' : 'late-zi',
      });
      const chart = calculateBazi(value);
      expect(chart.pillars.map((item) => item.ganZhi), `sample ${index}: ${chart.solarText}`).toEqual(directPillars(value));
    }
  });

  it('matches direct library pillars at the computed true-solar effective time', () => {
    const random = lcg(73021);
    for (let index = 0; index < 300; index += 1) {
      const value = input({
        year: 1920 + Math.floor(random() * 160),
        month: 1 + Math.floor(random() * 12),
        day: 1 + Math.floor(random() * 28),
        hour: Math.floor(random() * 24),
        minute: Math.floor(random() * 60),
        longitude: -170 + random() * 340,
        utcOffset: -12 + Math.floor(random() * 25),
        dstMinutes: [0, 30, 60, 90][Math.floor(random() * 4)],
        dayBoundary: random() < 0.5 ? 'midnight' : 'late-zi',
        timeBasis: 'true-solar',
      });
      const chart = calculateBazi(value);
      expect(chart.pillars.map((item) => item.ganZhi), `true-solar sample ${index}: ${chart.solarText}`).toEqual(
        directPillars(chart.effectiveInput),
      );
    }
  });
});

describe('birth input strictness', () => {
  it('rejects an out-of-range second instead of allowing Date normalization', () => {
    expect(() => validateAuditedBirthInput(input({ second: 60 }))).toThrow('秒数必须在 0—59 之间');
  });

  it('round-trips a real leap lunar month and rejects a nonexistent leap month', () => {
    expect(() => validateAuditedBirthInput(input({
      calendarType: 'lunar', year: 2023, month: 2, day: 1, leapMonth: true,
    }))).not.toThrow();
    expect(() => validateAuditedBirthInput(input({
      calendarType: 'lunar', year: 2023, month: 3, day: 1, leapMonth: true,
    }))).toThrow();
  });

  it('does not accept a normalized lunar date as though it were the requested date', () => {
    const invalid = input({ calendarType: 'lunar', year: 2024, month: 1, day: 30, leapMonth: false });
    let valid = true;
    try {
      const probe: any = Lunar.fromYmdHms(2024, 1, 30, 8, 37, 0);
      valid = probe.getYear() === 2024 && probe.getMonth() === 1 && probe.getDay() === 30;
    } catch {
      valid = false;
    }
    if (!valid) expect(() => validateAuditedBirthInput(invalid)).toThrow();
  });
});

describe('flow-month differential checks', () => {
  it('matches upstream LiuYue gan-zhi sequences across multiple luck cycles', () => {
    const solar = Solar.fromYmdHms(1990, 7, 16, 9, 20, 0);
    const eightChar: any = solar.getLunar().getEightChar();
    const natal = calculateBazi(input({ year: 1990, month: 7, day: 16, hour: 9, minute: 20 }));
    const references: NatalReferences = {
      dayStem: natal.pillars[2].stem,
      yearBranch: natal.pillars[0].branch,
      dayBranch: natal.pillars[2].branch,
    };
    const yun: any = eightChar.getYun(1);
    const years: any[] = yun.getDaYun(8)
      .filter((cycle: any) => cycle.getIndex() > 0)
      .flatMap((cycle: any) => cycle.getLiuNian())
      .filter((_: any, index: number) => index % 13 === 0)
      .slice(0, 10);

    years.forEach((year: any) => {
      const ours = buildFlowMonths(year.getYear(), year.getGanZhi(), references).map((month) => month.pillar.ganZhi);
      const upstream = year.getLiuYue().map((month: any) => month.getGanZhi());
      expect(ours, `flow months of ${year.getYear()} ${year.getGanZhi()}`).toEqual(upstream);
    });
  });

  it('keeps every flow-month interval strictly increasing across the year boundary', () => {
    [1901, 1950, 2000, 2024, 2099].forEach((year) => {
      const months = buildFlowMonths(year, Solar.fromYmd(year, 6, 15).getLunar().getYearInGanZhiExact(), {
        dayStem: '甲', yearBranch: '子', dayBranch: '午',
      });
      months.forEach((month, index) => {
        expect(new Date(month.startText.replace(' ', 'T')).getTime()).toBeLessThan(new Date(month.endText.replace(' ', 'T')).getTime());
        if (index > 0) expect(month.startText).toBe(months[index - 1].endText);
      });
    });
  });
});

describe('relation-table invariants', () => {
  const references: NatalReferences = { dayStem: '甲', yearBranch: '子', dayBranch: '午' };
  const node = (id: string, branch: string) => buildTemporalPillar(id, id, '原局', `甲${branch}`, references);

  it('does not duplicate relation ids even when multiple tables overlap', () => {
    const branches = ['寅', '巳', '申', '亥', '子', '辰', '午', '戌', '丑', '未', '酉', '卯'];
    const relations = detectRelations(branches.map((branch, index) => node(`n${index}`, branch)));
    expect(new Set(relations.map((item) => item.id)).size).toBe(relations.length);
  });

  it('recognizes self-punishment only for 辰午酉亥 repeated branches', () => {
    ['辰', '午', '酉', '亥'].forEach((branch) => {
      expect(detectRelations([node('a', branch), node('b', branch)]).some((item) => item.type === '自刑')).toBe(true);
    });
    ['子', '丑', '寅', '卯', '巳', '未', '申', '戌'].forEach((branch) => {
      expect(detectRelations([node('a', branch), node('b', branch)]).some((item) => item.type === '自刑')).toBe(false);
    });
  });
});

describe('audited interpretation semantics', () => {
  it('does not treat the day master itself as an extra visible peer objection to wealth', () => {
    const result = patternFor(['丙子', '戊辰', '甲午', '庚申']);
    const wealth = result.candidates.find((item) => item.tenGod === '偏财');
    expect(wealth).toBeDefined();
    expect(wealth?.objections).not.toContain('比劫透出，存在夺财或分财审查');
  });

  it('does not misname a middle hidden peer as 建禄', () => {
    const result = patternFor(['甲子', '辛巳', '庚辰', '壬午']);
    const peer = result.candidates.find((item) => item.sourceStem === '庚');
    expect(peer?.sourceRank).toBe('中气');
    expect(peer?.name).toContain('比肩月令中气候选');
    expect(peer?.name).not.toContain('建禄');
  });

  it('does not produce the nonsensical label 杂气建禄', () => {
    const result = patternFor(['甲子', '戊辰', '戊午', '庚申']);
    expect(result.candidates.some((item) => item.name.includes('杂气建禄'))).toBe(false);
    expect(result.candidates.some((item) => item.name === '杂气比肩月令候选')).toBe(true);
  });

  it('records a pure month-branch combination as pending structure rather than automatic breakage', () => {
    const result = patternFor(['甲子', '辛酉', '乙辰', '丙午']);
    const officer = result.candidates.find((item) => item.tenGod === '七杀');
    expect(officer?.conditions.some((item) => item.label === '月支关系触及' && item.state === '部分具备')).toBe(true);
    expect(officer?.objections.some((item) => item.includes('辰酉六合'))).toBe(false);
  });
});

describe('audited follow-structure blocking', () => {
  it('keeps every blocked follow candidate below the leading range', () => {
    const natal = natalNodes(['甲午', '丙午', '庚寅', '戊辰']);
    const relations = detectRelations(natal);
    const evidence = buildEvidenceSnapshot(natal, natal, relations);
    const dynamics = buildDynamicsSnapshot(natal, relations, evidence);
    const result = buildStrengthAdjudication(natal, natal, relations, evidence, dynamics);
    result.hypotheses
      .filter((item) => (item.name === '从强候选' || item.name === '从弱候选') && item.blockers.length > 0)
      .forEach((item) => expect(item.fit).toBeLessThanOrEqual(0.18));
    expect(result.leading.blockers).toEqual([]);
  });
});
