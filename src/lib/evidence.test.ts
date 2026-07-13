import { describe, expect, it } from 'vitest';
import { calculateBazi, type BirthInput } from './bazi';
import { buildLuckContext } from './context';
import { buildEvidenceSnapshot } from './evidence';

const input: BirthInput = {
  calendarType: 'solar',
  leapMonth: false,
  year: 2005,
  month: 12,
  day: 23,
  hour: 8,
  minute: 37,
  gender: 'male',
  dayBoundary: 'midnight',
  timeBasis: 'civil',
  locationName: '北京',
  longitude: 116.4074,
  latitude: 39.9042,
  utcOffset: 8,
  dstMinutes: 0,
};

describe('month-command evidence', () => {
  it('records season, main qi and day-master state without emitting a strength score', () => {
    const chart = calculateBazi(input);
    const context = buildLuckContext(chart, 0, 0, 0);
    const evidence = buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations);

    expect(evidence.monthCommand.monthBranch).toBe('子');
    expect(evidence.monthCommand.phase).toBe('冬水');
    expect(evidence.monthCommand.mainQiStem).toBe('癸');
    expect(evidence.monthCommand.mainQiTenGod).toBe('食神');
    expect(evidence.monthCommand.dayMasterStem).toBe('辛');
    expect(evidence.monthCommand.dayMasterSeasonalState).toBe('休');
    expect(evidence).not.toHaveProperty('strengthScore');
  });
});

describe('root and reveal evidence', () => {
  it('separates exact roots from same-element roots', () => {
    const chart = calculateBazi(input);
    const context = buildLuckContext(chart, 0, 0, 0);
    const evidence = buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations);

    expect(evidence.dayMasterRoots.some((root) =>
      root.branchLabel === '年柱' && root.branch === '酉' && root.hiddenStem === '辛' && root.kind === '同干根',
    )).toBe(true);

    expect(evidence.dayMasterRoots.some((root) =>
      root.branchLabel === '日柱' && root.branch === '巳' && root.hiddenStem === '庚' && root.kind === '同类根',
    )).toBe(true);
  });

  it('records hidden-stem exposure and relation touches as facts only', () => {
    const chart = calculateBazi(input);
    const context = buildLuckContext(chart, 0, 0, 0);
    const evidence = buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations);

    expect(evidence.exactReveals.some((reveal) =>
      reveal.branchLabel === '年柱' && reveal.hiddenStem === '辛' && reveal.visibleLabel === '日柱',
    )).toBe(true);

    const exactYearRoot = evidence.dayMasterRoots.find((root) => root.branchLabel === '年柱' && root.kind === '同干根');
    expect(exactYearRoot?.relationTouches.some((touch) => touch.type === '六合')).toBe(true);
    expect(exactYearRoot?.note.includes('同干根')).toBe(true);
  });

  it('keeps ten-god occurrence totals internally consistent', () => {
    const chart = calculateBazi(input);
    const context = buildLuckContext(chart, 0, 0, 0);
    const evidence = buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations);

    const expectedOccurrences = context.nodes.length + context.nodes.reduce((sum, node) => sum + node.hiddenStems.length, 0);
    expect(evidence.familyLedger.reduce((sum, item) => sum + item.total, 0)).toBe(expectedOccurrences);
  });
});
