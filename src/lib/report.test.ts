import { describe, expect, it } from 'vitest';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEnergyAssessment } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { buildInterpretationAssessment } from './interpretation-audited';
import { buildCoreReport, isValidCoreReport } from './report-audited';
import { detectRelations } from './relations';
import { buildStrengthAdjudication } from './strength-audited';
import { buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';

function natalNodes(ganZhi: [string, string, string, string]): TemporalPillar[] {
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

function temporalNode(
  natal: TemporalPillar[],
  id: string,
  label: string,
  layer: '大运' | '流年' | '流月',
  ganZhi: string,
): TemporalPillar {
  return buildTemporalPillar(id, label, layer, ganZhi, {
    dayStem: natal[2].stem,
    yearBranch: natal[0].branch,
    dayBranch: natal[2].branch,
  });
}

function reportFor(natal: TemporalPillar[], context: TemporalPillar[] = natal) {
  const natalRelations = detectRelations(natal);
  const contextRelations = detectRelations(context);
  const natalEvidence = buildEvidenceSnapshot(natal, natal, natalRelations);
  const currentEvidence = buildEvidenceSnapshot(natal, context, contextRelations);
  const natalDynamics = buildDynamicsSnapshot(natal, natalRelations, natalEvidence);
  const currentDynamics = buildDynamicsSnapshot(context, contextRelations, currentEvidence);
  const natalStrength = buildStrengthAdjudication(natal, natal, natalRelations, natalEvidence, natalDynamics);
  const currentStrength = buildStrengthAdjudication(natal, context, contextRelations, currentEvidence, currentDynamics);
  const interpretation = buildInterpretationAssessment(
    natal,
    context,
    natalRelations,
    contextRelations,
    natalEvidence,
    currentEvidence,
    natalDynamics,
    currentDynamics,
    natalStrength,
    currentStrength,
  );
  const energy = buildEnergyAssessment(
    natal,
    context,
    natalRelations,
    contextRelations,
    natalEvidence,
    currentEvidence,
  );
  return buildCoreReport({
    natalNodes: natal,
    contextNodes: context,
    natalStrength,
    currentStrength,
    interpretation,
    energy,
  });
}

function hasForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) =>
    ['usefulGod', 'yongShen', 'favorableElements', 'unfavorableElements', 'xiShen', 'jiShen'].includes(key) ||
    hasForbiddenKey(child),
  );
}

describe('core report determinism and completeness', () => {
  it('produces a complete consumer report with unique traceable evidence', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const context = [
      ...natal,
      temporalNode(natal, 'luck', '丙寅大运', '大运', '丙寅'),
      temporalNode(natal, 'year', '甲辰流年', '流年', '甲辰'),
      temporalNode(natal, 'month', '庚午流月', '流月', '庚午'),
    ];
    const report = reportFor(natal, context);
    expect(isValidCoreReport(report)).toBe(true);
    expect(report.headline).toContain('辛金日主');
    expect(report.headline).toContain('子月');
    expect(report.verdicts.strength.label).not.toContain('候选');
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.tensions.length).toBeGreaterThan(0);
    expect(report.overturnConditions.length).toBeGreaterThan(0);
    expect(new Set(report.evidenceIndex.map((item) => item.id)).size).toBe(report.evidenceIndex.length);
  });

  it('returns byte-equivalent output for the same chart and context', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    expect(JSON.stringify(reportFor(natal))).toBe(JSON.stringify(reportFor(natal)));
  });

  it('never invents final useful-god or favorable-element fields', () => {
    const natal = natalNodes(['甲午', '丙午', '庚寅', '戊辰']);
    const report = reportFor(natal);
    expect(hasForbiddenKey(report)).toBe(false);
  });
});

describe('core report conflict visibility', () => {
  it('surfaces pattern objections instead of presenting the leading pattern as uncontested', () => {
    const natal = natalNodes(['壬子', '辛酉', '甲辰', '丁卯']);
    const report = reportFor(natal);
    expect(report.tensions.some((item) =>
      item.title.includes('成格反证') || item.summary.includes('伤官见官'),
    )).toBe(true);
    expect(report.verdicts.pattern.detail).toMatch(/候选|反证|复核|冲突/);
  });

  it('reports current temporal change without rewriting the natal base', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const context = [
      ...natal,
      temporalNode(natal, 'luck', '甲午大运', '大运', '甲午'),
      temporalNode(natal, 'year', '丙午流年', '流年', '丙午'),
      temporalNode(natal, 'month', '丁巳流月', '流月', '丁巳'),
    ];
    const report = reportFor(natal, context);
    expect(report.temporalChanges.length).toBeGreaterThan(0);
    expect(report.temporalChanges.some((item) => item.summary.includes('原局') || item.summary.includes('当前'))).toBe(true);
  });
});
