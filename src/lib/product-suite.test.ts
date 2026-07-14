import { describe, expect, it } from 'vitest';
import { buildAnalysisBundle, buildNatalAnalysisBundle } from './analysis-bundle';
import { calculateBazi, type BirthInput } from './bazi-audited';
import { buildLuckContext } from './context';
import { buildLifeForecast, buildMonthlyForecast, isValidLifeForecast } from './forecast';
import { buildCompatibilityAssessment, isValidCompatibility } from './relationship-audited';
import { buildRelationshipProfile } from './relationship';
import { buildWealthAssessment, isValidWealthAssessment } from './wealth';

function input(overrides: Partial<BirthInput> = {}): BirthInput {
  return {
    calendarType: 'solar', leapMonth: false,
    year: 2003, month: 7, day: 14, hour: 12, minute: 0,
    gender: 'male', dayBoundary: 'midnight', timeBasis: 'civil',
    locationName: '测试', longitude: 120, latitude: 30, utcOffset: 8, dstMinutes: 0,
    ...overrides,
  };
}

describe('wealth product engine', () => {
  it('returns five distinct conserved wealth axes and practical channels', () => {
    const chart = calculateBazi(input());
    const context = buildLuckContext(chart, 1, 4, 6);
    const bundle = buildAnalysisBundle(chart, context);
    const result = buildWealthAssessment(chart, context, bundle);
    expect(isValidWealthAssessment(result)).toBe(true);
    expect(new Set(result.axes.map((item) => item.id)).size).toBe(5);
    expect(result.axes.map((item) => item.score)).toEqual([...result.axes.map((item) => item.score)].sort((a, b) => b - a));
    const consumerText = JSON.stringify({
      headline: result.headline,
      summary: result.summary,
      axes: result.axes,
      channels: result.channels,
      risks: result.risks,
      temporalSignals: result.temporalSignals,
    });
    expect(consumerText).not.toMatch(/必然富有|保证赚钱|保证收益|财富金额为/);
    expect(result.notes.some((note) => note.includes('不预测具体财富金额'))).toBe(true);
    expect(result.notes.some((note) => note.includes('不等于必然富有'))).toBe(true);
  });
});

describe('relationship and compatibility engines', () => {
  it('builds a complete single-chart relationship mechanism profile', () => {
    const chart = calculateBazi(input());
    const bundle = buildAnalysisBundle(chart, buildLuckContext(chart));
    const profile = buildRelationshipProfile(bundle);
    expect(profile.axes).toHaveLength(5);
    expect(new Set(profile.axes.map((item) => item.id)).size).toBe(5);
    expect(profile.needs.length).toBeGreaterThan(0);
    expect(profile.risks.length).toBeGreaterThan(0);
  });

  it('compares two full charts without duplicate-structure inflation or fixed destiny language', () => {
    const left = calculateBazi(input());
    const right = calculateBazi(input({ year: 2001, month: 11, day: 8, hour: 18, gender: 'female' }));
    const result = buildCompatibilityAssessment(left, buildNatalAnalysisBundle(left), right, buildNatalAnalysisBundle(right));
    expect(isValidCompatibility(result)).toBe(true);
    expect(result.axes).toHaveLength(5);
    expect(result.agreements.length).toBeGreaterThan(0);
    expect(result.notes.some((note) => note.includes('唯一结构去重'))).toBe(true);
    const consumerText = JSON.stringify({
      headline: result.headline,
      summary: result.summary,
      strengths: result.strengths,
      tensions: result.tensions,
      agreements: result.agreements,
    });
    expect(consumerText).not.toMatch(/生肖不合所以|你们天生一对|一定分手|命中注定/);
    expect(result.notes.some((note) => note.includes('不使用生肖一票否决'))).toBe(true);
    expect(result.notes.some((note) => note.includes('不把五行互补视为天生一对'))).toBe(true);
  });
});

describe('life forecast timeline', () => {
  it('scores every available luck year and twelve flow months inside bounds', () => {
    const chart = calculateBazi(input());
    const forecast = buildLifeForecast(chart);
    const months = buildMonthlyForecast(chart, 2, 5);
    expect(isValidLifeForecast(forecast)).toBe(true);
    expect(forecast.points.length).toBeGreaterThanOrEqual(80);
    expect(months).toHaveLength(12);
    months.forEach((item) => {
      expect(item.opportunity).toBeGreaterThanOrEqual(0);
      expect(item.opportunity).toBeLessThanOrEqual(100);
      expect(item.pressure).toBeGreaterThanOrEqual(0);
      expect(item.pressure).toBeLessThanOrEqual(100);
      expect(item.change).toBeGreaterThanOrEqual(0);
      expect(item.change).toBeLessThanOrEqual(100);
    });
  }, 60_000);

  it('is deterministic for the same chart', () => {
    const chart = calculateBazi(input({ year: 1988, month: 2, day: 4, hour: 23, dayBoundary: 'late-zi' }));
    expect(JSON.stringify(buildLifeForecast(chart))).toBe(JSON.stringify(buildLifeForecast(chart)));
  }, 60_000);
});
