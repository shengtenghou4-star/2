import { describe, expect, it } from 'vitest';
import { buildEnergyAssessment, buildEnergySnapshot, ENERGY_MODEL, isValidEnergySnapshot } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { detectRelations } from './relations';
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

function snapshot(natal: TemporalPillar[], nodes: TemporalPillar[] = natal) {
  const relations = detectRelations(nodes);
  const evidence = buildEvidenceSnapshot(natal, nodes, relations);
  return buildEnergySnapshot(natal, nodes, relations, evidence);
}

describe('energy model conservation', () => {
  it('assigns exactly 100 base units to every pillar before multipliers', () => {
    const natal = natalNodes(['甲子', '丁午', '庚寅', '癸丑']);
    const result = snapshot(natal);
    expect(result.totalBaseUnits).toBe(400);
    natal.forEach((node) => {
      const nodeTotal = result.contributions
        .filter((item) => item.nodeId === node.id)
        .reduce((sum, item) => sum + item.baseUnits, 0);
      expect(nodeTotal).toBeCloseTo(ENERGY_MODEL.pillarBaseUnits, 8);
    });
  });

  it('keeps every branch reservoir at 60 units across one two and three hidden-stem branches', () => {
    const natal = natalNodes(['甲子', '丁午', '庚寅', '癸丑']);
    const result = snapshot(natal);
    natal.forEach((node) => {
      const hiddenTotal = result.contributions
        .filter((item) => item.nodeId === node.id && item.sourceType === '地支藏能')
        .reduce((sum, item) => sum + item.baseUnits, 0);
      expect(hiddenTotal).toBeCloseTo(60, 8);
    });
  });

  it('normalizes five-element percentages to exactly 10000 basis points', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const result = snapshot(natal);
    expect(result.elements.reduce((sum, item) => sum + item.basisPoints, 0)).toBe(10_000);
    expect(result.balance.supportBasisPoints + result.balance.oppositionBasisPoints).toBe(10_000);
    expect(isValidEnergySnapshot(result)).toBe(true);
  });
});

describe('energy model determinism and traceability', () => {
  it('returns byte-equivalent output for the same chart and context', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const context = [
      ...natal,
      temporalNode(natal, 'luck', '丙寅大运', '大运', '丙寅'),
      temporalNode(natal, 'year', '甲辰流年', '流年', '甲辰'),
      temporalNode(natal, 'month', '庚午流月', '流月', '庚午'),
    ];
    expect(JSON.stringify(snapshot(natal, context))).toBe(JSON.stringify(snapshot(natal, context)));
  });

  it('records the complete multiplicative formula for every contribution', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const result = snapshot(natal);
    result.contributions.forEach((item) => {
      const expected = item.baseUnits * item.factors.position * item.factors.layer * item.factors.season * item.factors.activation * item.factors.relation;
      expect(item.effectiveUnits).toBeCloseTo(expected, 2);
      expect(item.formula).toContain('=');
    });
  });
});

describe('energy model factor semantics', () => {
  it('keeps temporal layer capacity in 大运 > 流年 > 流月 order for equal visible material', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const nodes = [
      ...natal,
      temporalNode(natal, 'luck', '辛酉大运', '大运', '辛酉'),
      temporalNode(natal, 'year', '辛酉流年', '流年', '辛酉'),
      temporalNode(natal, 'month', '辛酉流月', '流月', '辛酉'),
    ];
    const result = buildEnergySnapshot(natal, nodes, [], buildEvidenceSnapshot(natal, nodes, []));
    const visible = (id: string) => result.contributions.find((item) => item.nodeId === id && item.sourceType === '天干显能')!.rawUnits;
    expect(visible('luck')).toBeGreaterThan(visible('year'));
    expect(visible('year')).toBeGreaterThan(visible('month'));
  });

  it('discounts a stem touched by five-combination without changing its element identity', () => {
    const natal = natalNodes(['甲子', '己丑', '丙寅', '丁卯']);
    const relations = detectRelations(natal);
    const result = buildEnergySnapshot(natal, natal, relations, buildEvidenceSnapshot(natal, natal, relations));
    const yearStem = result.contributions.find((item) => item.nodeId === 'natal-0' && item.sourceType === '天干显能')!;
    expect(yearStem.relationNames.some((name) => name.includes('甲己'))).toBe(true);
    expect(yearStem.factors.relation).toBeLessThan(1);
    expect(yearStem.element).toBe('木');
  });

  it('raises a visible stem activation when exact roots exist but never above the model cap', () => {
    const natal = natalNodes(['甲寅', '丙寅', '甲寅', '甲寅']);
    const result = snapshot(natal);
    const dayStem = result.contributions.find((item) => item.nodeId === 'natal-2' && item.sourceType === '天干显能')!;
    expect(dayStem.factors.activation).toBeGreaterThan(1);
    expect(dayStem.factors.activation).toBeLessThanOrEqual(ENERGY_MODEL.visibleRootActivation.cap);
  });
});

describe('energy assessment comparison', () => {
  it('returns absolute units and percentage-point deltas for all five elements', () => {
    const natal = natalNodes(['乙酉', '戊子', '辛巳', '壬辰']);
    const context = [
      ...natal,
      temporalNode(natal, 'luck', '丙寅大运', '大运', '丙寅'),
      temporalNode(natal, 'year', '甲辰流年', '流年', '甲辰'),
      temporalNode(natal, 'month', '庚午流月', '流月', '庚午'),
    ];
    const natalRelations = detectRelations(natal);
    const contextRelations = detectRelations(context);
    const assessment = buildEnergyAssessment(
      natal,
      context,
      natalRelations,
      contextRelations,
      buildEvidenceSnapshot(natal, natal, natalRelations),
      buildEvidenceSnapshot(natal, context, contextRelations),
    );
    expect(assessment.delta).toHaveLength(5);
    expect(assessment.current.totalBaseUnits).toBe(700);
    expect(assessment.delta.some((item) => item.unitDelta !== 0)).toBe(true);
  });
});
