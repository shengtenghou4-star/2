import { describe, expect, it } from 'vitest';
import { calculateBazi, compareCivilAndTrueSolar, type BirthInput, type PillarDetail } from './bazi';
import { calculateTimeCorrection, effectiveBirthInput } from './solar-time';
import { detectRelations } from './relations';

const base: Omit<BirthInput, 'year' | 'month' | 'day' | 'hour'> = {
  gender: 'male',
  dayBoundary: 'midnight',
  timeBasis: 'civil',
  minute: 37,
  locationName: '北京',
  longitude: 116.4074,
  latitude: 39.9042,
  utcOffset: 8,
  dstMinutes: 0,
};

function pillar(label: PillarDetail['label'], ganZhi: string): PillarDetail {
  return {
    label,
    ganZhi,
    stem: ganZhi[0],
    branch: ganZhi[1],
    stemElement: '',
    branchElement: '',
    tenGod: '',
    hiddenStems: [],
    naYin: '',
    growthStage: '',
    xun: '',
    xunKong: '',
  };
}

describe('calculateBazi', () => {
  it('matches a documented four-pillar fixture', () => {
    const chart = calculateBazi({ ...base, year: 2005, month: 12, day: 23, hour: 8 });
    expect(chart.pillars.map((item) => item.ganZhi)).toEqual(['乙酉', '戊子', '辛巳', '壬辰']);
    expect(chart.pillars[2].hiddenStems.map((item) => item.stem)).toEqual(['丙', '庚', '戊']);
  });

  it('supports both late-Zi day-boundary conventions', () => {
    const common = { ...base, year: 1988, month: 2, day: 15, hour: 23, minute: 30 };
    const midnightBoundary = calculateBazi({ ...common, dayBoundary: 'midnight' });
    const lateZiBoundary = calculateBazi({ ...common, dayBoundary: 'late-zi' });

    expect(midnightBoundary.pillars[2].ganZhi).toBe('庚子');
    expect(lateZiBoundary.pillars[2].ganZhi).toBe('辛丑');
    expect(midnightBoundary.pillars[3].ganZhi).toBe('戊子');
    expect(lateZiBoundary.pillars[3].ganZhi).toBe('戊子');
  });

  it('builds non-empty luck cycles and annual records', () => {
    const chart = calculateBazi({ ...base, year: 2003, month: 1, day: 1, hour: 12, minute: 0 });
    expect(chart.luck.cycles.length).toBe(9);
    expect(chart.luck.cycles[0].ganZhi).toBe('癸丑');
    expect(chart.luck.cycles[0].years).toHaveLength(10);
  });
});

describe('true solar time', () => {
  it('separates longitude, equation-of-time and DST corrections', () => {
    const input: BirthInput = { ...base, year: 2003, month: 1, day: 1, hour: 12, minute: 0 };
    const correction = calculateTimeCorrection(input);

    expect(correction.standardMeridian).toBe(120);
    expect(correction.longitudeCorrectionMinutes).toBeCloseTo(-14.3704, 3);
    expect(correction.dstCorrectionMinutes).toBe(0);
    expect(correction.totalCorrectionMinutes).toBeCloseTo(
      correction.longitudeCorrectionMinutes + correction.equationOfTimeMinutes,
      6,
    );
  });

  it('can cross the civil-date boundary', () => {
    const input: BirthInput = {
      ...base,
      year: 2003,
      month: 1,
      day: 1,
      hour: 0,
      minute: 5,
      timeBasis: 'true-solar',
    };
    const effective = effectiveBirthInput(input);
    expect(`${effective.year}-${effective.month}-${effective.day}`).toBe('2002-12-31');
  });

  it('returns both charts and identifies changed pillars', () => {
    const comparison = compareCivilAndTrueSolar({
      ...base,
      year: 2003,
      month: 1,
      day: 1,
      hour: 0,
      minute: 5,
    });
    expect(comparison.hasDifference).toBe(true);
    expect(comparison.differences.some((item) => item.label === '日柱' || item.label === '时柱')).toBe(true);
  });
});

describe('relation detector', () => {
  it('keeps pair relations and complete combinations as auditable facts', () => {
    const relations = detectRelations([
      pillar('年柱', '甲申'),
      pillar('月柱', '己子'),
      pillar('日柱', '庚辰'),
      pillar('时柱', '丙午'),
    ]);

    expect(relations.some((item) => item.type === '五合' && item.name.includes('甲己合'))).toBe(true);
    expect(relations.some((item) => item.type === '三合' && item.name === '申子辰三合水局')).toBe(true);
    expect(relations.some((item) => item.type === '六冲' && item.name === '子午相冲')).toBe(true);
  });
});
