import { describe, expect, it } from 'vitest';
import { buildCareerAssessment, isValidCareerAssessment } from './career';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEnergyAssessment } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { buildInterpretationAssessment } from './interpretation-audited';
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

function assessmentFor(natal: TemporalPillar[], context: TemporalPillar[] = natal) {
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
  return buildCareerAssessment({
    natalNodes: natal,
    contextNodes: context,
    natalEvidence,
    currentEvidence,
    natalDynamics,
    currentDynamics,
    natalStrength,
    currentStrength,
    interpretation,
    energy,
  });
}

describe('career topic completeness', () => {
  it('ranks all five career mechanisms with traceable scores', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const assessment = assessmentFor(natal);
    expect(isValidCareerAssessment(assessment)).toBe(true);
    expect(assessment.modes.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(assessment.modes.map((item) => item.family))).toEqual(new Set(['印星', '食伤', '财星', '官杀', '比劫']));
    expect(assessment.primaryMode.family).not.toBe(assessment.secondaryMode.family);
    assessment.modes.forEach((mode) => {
      expect(mode.score).toBeGreaterThanOrEqual(0);
      expect(mode.score).toBeLessThanOrEqual(100);
      expect(mode.evidence.length).toBeGreaterThan(0);
    });
  });

  it('returns deterministic byte-equivalent output', () => {
    const natal = natalNodes(['甲午', '丙午', '庚寅', '戊辰']);
    expect(JSON.stringify(assessmentFor(natal))).toBe(JSON.stringify(assessmentFor(natal)));
  });

  it('describes work mechanisms rather than assigning a fixed industry', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const text = JSON.stringify(assessmentFor(natal));
    expect(text).not.toMatch(/你必须从事|唯一职业|命中注定|必然成功/);
    expect(text).toContain('职业能力');
    expect(text).toContain('组织环境');
  });
});

describe('career risk and carrying semantics', () => {
  it('surfaces overload risk when wealth or authority material meets weak carrying', () => {
    const natal = natalNodes(['甲午', '丙午', '庚寅', '丁卯']);
    const assessment = assessmentFor(natal);
    expect(assessment.risks.length).toBeGreaterThan(0);
    expect(assessment.risks.some((risk) =>
      risk.title.includes('负荷') || risk.title.includes('过度使用') || risk.title.includes('权威'),
    )).toBe(true);
  });

  it('preserves both upside and caution when output and authority coexist', () => {
    const natal = natalNodes(['壬子', '辛酉', '甲辰', '丁卯']);
    const assessment = assessmentFor(natal);
    const output = assessment.modes.find((item) => item.family === '食伤')!;
    const authority = assessment.modes.find((item) => item.family === '官杀')!;
    expect(output).toBeDefined();
    expect(authority).toBeDefined();
    expect(assessment.risks.some((risk) => risk.title.includes('组织权威') || risk.title.includes('过度使用'))).toBe(true);
  });
});

describe('career temporal signals', () => {
  it('separates natal career base from current temporal activation', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const context = [
      ...natal,
      temporalNode(natal, 'luck', '甲午大运', '大运', '甲午'),
      temporalNode(natal, 'year', '丙午流年', '流年', '丙午'),
      temporalNode(natal, 'month', '丁巳流月', '流月', '丁巳'),
    ];
    const assessment = assessmentFor(natal, context);
    expect(assessment.temporalSignals.length).toBeGreaterThan(0);
    expect(assessment.temporalSignals.some((signal) =>
      signal.explanation.includes('原局') || signal.explanation.includes('当前') || signal.explanation.includes('岁运'),
    )).toBe(true);
    expect(assessment.notes.some((note) => note.includes('不改写原局'))).toBe(true);
  });
});
