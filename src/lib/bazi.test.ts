import { describe, expect, it } from 'vitest';
import { Solar } from 'lunar-javascript';
import { calculateBazi, compareCivilAndTrueSolar, type BirthInput, type PillarDetail } from './bazi';
import { buildLuckContext } from './context';
import { detectRelations } from './relations';
import { calculateTimeCorrection, effectiveBirthInput } from './solar-time';
import { buildFlowMonths } from './timeline';

const base: BirthInput = {
  calendarType: 'solar',
  leapMonth: false,
  gender: 'male',
  dayBoundary: 'midnight',
  timeBasis: 'civil',
  year: 2005,
  month: 12,
  day: 23,
  hour: 8,
  minute: 37,
  locationName: '北京',
  longitude: 116.4074,
  latitude: 39.9042,
  utcOffset: 8,
  dstMinutes: 0,
};

function chartInput(overrides: Partial<BirthInput> = {}): BirthInput {
  return { ...base, ...overrides };
}

function relationPillar(label: PillarDetail['label'], ganZhi: string, index: number): PillarDetail {
  const chart = calculateBazi(chartInput());
  return {
    ...chart.pillars[index],
    id: `test-${index}`,
    label,
    ganZhi,
    stem: ganZhi[0],
    branch: ganZhi[1],
  };
}

describe('deterministic chart', () => {
  it('matches the documented four-pillar fixture', () => {
    const chart = calculateBazi(base);
    expect(chart.pillars.map((pillar) => pillar.ganZhi)).toEqual(['乙酉', '戊子', '辛巳', '壬辰']);
    expect(chart.pillars[2].tenGod).toBe('日主');
    expect(chart.pillars[2].hiddenStems.map((item) => `${item.stem}-${item.tenGod}-${item.rank}`)).toEqual([
      '丙-正官-本气', '庚-劫财-中气', '戊-正印-余气',
    ]);
  });

  it('supports both late-Zi day-boundary conventions', () => {
    const common = chartInput({ year: 1988, month: 2, day: 15, hour: 23, minute: 30 });
    const midnightBoundary = calculateBazi({ ...common, dayBoundary: 'midnight' });
    const lateZiBoundary = calculateBazi({ ...common, dayBoundary: 'late-zi' });
    expect(midnightBoundary.pillars[2].ganZhi).toBe('庚子');
    expect(lateZiBoundary.pillars[2].ganZhi).toBe('辛丑');
  });

  it('matches the upstream library for ten gods, hidden stems and growth stages across a fixture grid', () => {
    const fixtures = [
      [1901, 1, 9, 0], [1937, 3, 27, 18], [1966, 7, 15, 13], [1988, 2, 15, 22],
      [1995, 12, 18, 10], [2005, 12, 23, 8], [2019, 3, 27, 2], [2024, 1, 29, 9],
    ];
    const prefixes = ['Year', 'Month', 'Day', 'Time'];
    fixtures.forEach(([year, month, day, hour]) => {
      const chart = calculateBazi(chartInput({ year, month, day, hour, minute: 17 }));
      const eightChar = Solar.fromYmdHms(year, month, day, hour, 17, 0).getLunar().getEightChar();
      eightChar.setSect(2);
      chart.pillars.forEach((pillar, index) => {
        const prefix = prefixes[index];
        const expectedTenGod = prefix === 'Day' ? '日主' : eightChar[`get${prefix}ShiShenGan`]();
        expect(pillar.tenGod).toBe(expectedTenGod);
        expect(pillar.hiddenStems.map((item) => item.stem)).toEqual(eightChar[`get${prefix}HideGan`]());
        expect(pillar.hiddenStems.map((item) => item.tenGod)).toEqual(eightChar[`get${prefix}ShiShenZhi`]());
        expect(pillar.growthStage).toBe(eightChar[`get${prefix}DiShi`]());
      });
    });
  });
});

describe('calendar and true solar time', () => {
  it('accepts a real lunar leap month and converts it to the civil solar date', () => {
    const chart = calculateBazi(chartInput({
      calendarType: 'lunar', leapMonth: true, year: 2023, month: 2, day: 1, hour: 12, minute: 0,
    }));
    expect([chart.civilSolarInput.year, chart.civilSolarInput.month, chart.civilSolarInput.day]).toEqual([2023, 3, 22]);
  });

  it('rejects a lunar leap month that does not exist', () => {
    expect(() => calculateBazi(chartInput({
      calendarType: 'lunar', leapMonth: true, year: 2023, month: 3, day: 1,
    }))).toThrow('闰月');
  });

  it('separates longitude, equation-of-time and DST corrections', () => {
    const input = chartInput({ year: 2003, month: 1, day: 1, hour: 12, minute: 0 });
    const correction = calculateTimeCorrection(input);
    expect(correction.standardMeridian).toBe(120);
    expect(correction.longitudeCorrectionMinutes).toBeCloseTo(-14.3704, 3);
    expect(correction.totalCorrectionMinutes).toBeCloseTo(
      correction.longitudeCorrectionMinutes + correction.equationOfTimeMinutes,
      6,
    );
  });

  it('can cross the civil-date boundary and reports changed pillars', () => {
    const input = chartInput({ year: 2003, month: 1, day: 1, hour: 0, minute: 5, timeBasis: 'true-solar' });
    const effective = effectiveBirthInput(input);
    expect(`${effective.year}-${effective.month}-${effective.day}`).toBe('2002-12-31');
    expect(compareCivilAndTrueSolar(input).hasDifference).toBe(true);
  });
});

describe('luck timeline', () => {
  it('enriches big luck and annual pillars with ten gods, hidden stems and shen sha', () => {
    const chart = calculateBazi(base);
    expect(chart.luck.cycles).toHaveLength(9);
    expect(chart.luck.cycles[0].pillar.tenGod).toBe('七杀');
    expect(chart.luck.cycles[0].pillar.hiddenStems.length).toBeGreaterThan(0);
    expect(chart.pillars[0].shenSha.map((item) => item.name)).toEqual(expect.arrayContaining(['禄神', '将星']));
  });

  it('builds twelve solar-term months with exact boundaries', () => {
    const chart = calculateBazi(chartInput({ year: 2023, month: 5, day: 3, hour: 9 }));
    const references = { dayStem: chart.pillars[2].stem, yearBranch: chart.pillars[0].branch, dayBranch: chart.pillars[2].branch };
    const months = buildFlowMonths(2023, '癸卯', references);
    expect(months.map((month) => month.pillar.ganZhi)).toEqual([
      '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥', '甲子', '乙丑',
    ]);
    expect(months[0].startText.startsWith('2023-02-04')).toBe(true);
    expect(months[11].endText.startsWith('2024-02-04')).toBe(true);
  });

  it('combines natal, big-luck, annual and monthly pillars without interpreting strength', () => {
    const chart = calculateBazi(base);
    const context = buildLuckContext(chart, 0, 0, 0);
    expect(context.nodes).toHaveLength(7);
    expect(context.relations.some((relation) => relation.scope === '岁运介入')).toBe(true);
    expect(context.elementInteractions).toHaveLength(84);
  });
});

describe('relation detector', () => {
  it('keeps pair relations, half combinations and complete combinations as separate facts', () => {
    const relations = detectRelations([
      relationPillar('年柱', '甲申', 0), relationPillar('月柱', '己子', 1),
      relationPillar('日柱', '庚辰', 2), relationPillar('时柱', '丙午', 3),
    ]);
    expect(relations.some((item) => item.type === '五合' && item.name.includes('甲己合'))).toBe(true);
    expect(relations.some((item) => item.type === '三合' && item.name === '申子辰三合水局')).toBe(true);
    expect(relations.some((item) => item.type === '六冲' && item.name === '子午相冲')).toBe(true);
  });
});
