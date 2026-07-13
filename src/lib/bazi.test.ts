import { describe, expect, it } from 'vitest';
import { calculateBazi } from './bazi';

const base = {
  gender: 'male' as const,
  dayBoundary: 'midnight' as const,
  minute: 37,
};

describe('calculateBazi', () => {
  it('matches a documented four-pillar fixture', () => {
    const chart = calculateBazi({ ...base, year: 2005, month: 12, day: 23, hour: 8 });
    expect(chart.pillars.map((pillar) => pillar.ganZhi)).toEqual(['乙酉', '戊子', '辛巳', '壬辰']);
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
