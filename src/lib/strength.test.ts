import { describe, expect, it } from 'vitest';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEvidenceSnapshot } from './evidence';
import { detectRelations } from './relations';
import { buildStrengthAdjudication } from './strength';
import { buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';

function buildNodes(ganZhi: string[], layers?: TemporalPillar['layer'][]): TemporalPillar[] {
  const references: NatalReferences = {
    dayStem: ganZhi[2][0],
    yearBranch: ganZhi[0][1],
    dayBranch: ganZhi[2][1],
  };
  const labels = ['年柱', '月柱', '日柱', '时柱', '大运', '流年', '流月'];
  return ganZhi.map((item, index) => buildTemporalPillar(
    `node-${index}`,
    labels[index],
    layers?.[index] ?? '原局',
    item,
    references,
  ));
}

function adjudicate(natal: TemporalPillar[], context = natal) {
  const relations = detectRelations(context);
  const evidence = buildEvidenceSnapshot(natal, context, relations);
  const dynamics = buildDynamicsSnapshot(context, relations, evidence);
  return buildStrengthAdjudication(natal, context, relations, evidence, dynamics);
}

describe('strength adjudication', () => {
  it('keeps a seasonally supported and heavily rooted chart on the strong side', () => {
    const natal = buildNodes(['庚申', '己酉', '庚申', '戊辰']);
    const result = adjudicate(natal);

    expect(result.supportTotal).toBeGreaterThan(result.oppositionTotal);
    expect(result.supportRatio).toBeGreaterThan(0.65);
    expect(['身旺候选', '偏强候选', '从强候选']).toContain(result.leading.name);
    expect(result.evidence.some((item) => item.category === '根气')).toBe(true);
  });

  it('keeps a fire-season chart without metal roots on the weak side', () => {
    const natal = buildNodes(['甲午', '丙午', '庚寅', '丁卯']);
    const result = adjudicate(natal);

    expect(result.oppositionTotal).toBeGreaterThan(result.supportTotal);
    expect(result.supportRatio).toBeLessThan(0.4);
    expect(['偏弱候选', '身弱候选', '从弱候选']).toContain(result.leading.name);
    expect(result.evidence.filter((item) => item.category === '根气')).toHaveLength(0);
  });

  it('separates natal constitution from supportive luck overlays', () => {
    const natal = buildNodes(['甲午', '丙午', '庚寅', '丁卯']);
    const context = buildNodes(
      ['甲午', '丙午', '庚寅', '丁卯', '庚申', '辛酉', '戊辰'],
      ['原局', '原局', '原局', '原局', '大运', '流年', '流月'],
    );
    const natalResult = adjudicate(natal);
    const currentResult = adjudicate(natal, context);

    expect(natalResult.mode).toBe('原局底盘');
    expect(currentResult.mode).toBe('岁运叠加');
    expect(currentResult.supportRatio).toBeGreaterThan(natalResult.supportRatio);
    expect(natalResult.leading.name).toBe(adjudicate(natal).leading.name);
  });

  it('blocks easy following-strong claims when an opposing stem is still visible', () => {
    const natal = buildNodes(['庚申', '己酉', '庚申', '丙辰']);
    const result = adjudicate(natal);
    const followingStrong = result.hypotheses.find((item) => item.name === '从强候选');

    expect(followingStrong).toBeDefined();
    expect(followingStrong?.blockers.some((item) => item.includes('透干'))).toBe(true);
  });

  it('publishes an auditable ledger rather than a single opaque score', () => {
    const natal = buildNodes(['甲申', '己子', '庚辰', '丙午']);
    const result = adjudicate(natal);

    expect(result.evidence.length).toBeGreaterThan(5);
    expect(result.evidence.every((item) => item.ruleId.startsWith('STR-'))).toBe(true);
    expect(result.evidence.every((item) => Number.isFinite(item.effectiveWeight))).toBe(true);
    expect(result).not.toHaveProperty('strengthScore');
    expect(result).not.toHaveProperty('finalUsefulGod');
  });
});
