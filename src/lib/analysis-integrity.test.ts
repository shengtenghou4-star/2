import { describe, expect, it } from 'vitest';
import { auditAnalysisIntegrity } from './analysis-integrity';
import { calculateBazi, type BirthInput } from './bazi-audited';
import { buildLuckContext } from './context';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEvidenceSnapshot } from './evidence';
import { buildInterpretationAssessment } from './interpretation-audited';
import { buildStrengthAdjudication } from './strength-audited';

const input: BirthInput = {
  calendarType: 'solar',
  leapMonth: false,
  year: 2024,
  month: 3,
  day: 10,
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
};

function reportForInput() {
  const chart = calculateBazi(input);
  const context = buildLuckContext(chart);
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
  return auditAnalysisIntegrity({
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
}

describe('analysis integrity semantics', () => {
  it('treats naturally empty climate or regulation tracks as valid, not missing analysis', () => {
    const report = reportForInput();
    expect(report.level).toBe('通过');
    expect(report.failures).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.checks.find((item) => item.id === 'sparse-materials')?.level).toBe('通过');
  });
});
