import { describe, expect, it } from 'vitest';
import { buildDynamicsSnapshot, contactMode } from './dynamics';
import { buildEvidenceSnapshot } from './evidence';
import { detectRelations } from './relations';
import { buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';

const references: NatalReferences = {
  dayStem: '庚',
  yearBranch: '申',
  dayBranch: '辰',
};

function node(id: string, label: string, layer: TemporalPillar['layer'], ganZhi: string): TemporalPillar {
  return buildTemporalPillar(id, label, layer, ganZhi, references);
}

function fixture() {
  const natal = [
    node('year', '年柱', '原局', '甲申'),
    node('month', '月柱', '原局', '己子'),
    node('day', '日柱', '原局', '庚辰'),
    node('time', '时柱', '原局', '丙午'),
  ];
  const context = [
    ...natal,
    node('luck', '甲戌大运', '大运', '甲戌'),
    node('annual', '壬寅流年', '流年', '壬寅'),
    node('monthly', '丁未流月', '流月', '丁未'),
  ];
  const relations = detectRelations(context);
  const evidence = buildEvidenceSnapshot(natal, context, relations);
  return { natal, context, relations, evidence, dynamics: buildDynamicsSnapshot(context, relations, evidence) };
}

describe('relation topology', () => {
  it('distinguishes natal adjacency from cross-layer contact', () => {
    const { context } = fixture();
    expect(contactMode(context[0], context[1])).toBe('相邻柱');
    expect(contactMode(context[0], context[2])).toBe('隔一柱');
    expect(contactMode(context[2], context[4])).toBe('岁运跨层');
  });
});

describe('combine and clash candidates', () => {
  it('keeps a five-combine candidate conflicted when one member is also clashed', () => {
    const { dynamics } = fixture();
    const combine = dynamics.combines.find((item) => item.name.includes('甲己合'));
    expect(combine).toBeDefined();
    expect(combine?.candidate).toBe('合绊与冲突并存');
    expect(combine?.conditions.some((item) => item.label === '争合或受冲' && item.state === '冲突并存')).toBe(true);
  });

  it('marks natal Zi-Wu clash as a clash candidate without declaring destruction', () => {
    const { dynamics } = fixture();
    const clash = dynamics.clashes.find((item) => item.name === '子午相冲');
    expect(clash?.candidate).toBe('原局对冲候选');
    expect(clash?.note.includes('不等于已经冲散')).toBe(true);
  });

  it('recognizes storehouse clashes only as opening candidates', () => {
    const natal = [
      node('year2', '年柱', '原局', '甲辰'),
      node('month2', '月柱', '原局', '乙戌'),
      node('day2', '日柱', '原局', '庚申'),
      node('time2', '时柱', '原局', '丙子'),
    ];
    const relations = detectRelations(natal);
    const evidence = buildEvidenceSnapshot(natal, natal, relations);
    const dynamics = buildDynamicsSnapshot(natal, relations, evidence);
    const clash = dynamics.clashes.find((item) => item.name === '辰戌相冲');
    expect(clash?.storehouseClash).toBe(true);
    expect(clash?.candidate).toBe('冲库／冲开候选');
  });
});

describe('passage and regulation chains', () => {
  it('separates hidden mediator material from visible mediation', () => {
    const { dynamics } = fixture();
    const metalWood = dynamics.passages.find((item) =>
      item.sourceElement === '金' && item.mediatorElement === '水' && item.targetElement === '木',
    );
    expect(metalWood).toBeDefined();
    expect(metalWood?.mediatorHiddenCount).toBeGreaterThan(0);
    expect(metalWood?.status).toBe('显干通关材料齐备');
  });

  it('builds day-master-centered regulation candidates without a strength verdict', () => {
    const { dynamics } = fixture();
    const officerResource = dynamics.regulations.find((item) => item.name === '官杀生印、印生身候选');
    expect(officerResource?.status).toBe('显干链条齐备');
    expect(dynamics).not.toHaveProperty('strengthScore');
    expect(dynamics).not.toHaveProperty('dayMasterStrength');
  });
});
