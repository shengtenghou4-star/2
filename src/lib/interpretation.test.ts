import { describe, expect, it } from 'vitest';
import { detectRelations } from './relations';
import { buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';
import { buildEvidenceSnapshot } from './evidence';
import { buildDynamicsSnapshot } from './dynamics';
import { buildStrengthAdjudication } from './strength';
import {
  buildClimateAssessment,
  buildInterpretationAssessment,
  buildPatternAssessment,
  buildSupportBalanceTrack,
  compareTracks,
} from './interpretation';

function natalNodes(ganZhi: string[]): TemporalPillar[] {
  const references: NatalReferences = {
    dayStem: ganZhi[2][0],
    yearBranch: ganZhi[0][1],
    dayBranch: ganZhi[2][1],
  };
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  return ganZhi.map((item, index) => buildTemporalPillar(`natal-${index}`, labels[index], '原局', item, references));
}

function temporalNode(
  natal: TemporalPillar[],
  id: string,
  label: string,
  layer: '大运' | '流年' | '流月',
  ganZhi: string,
): TemporalPillar {
  const references: NatalReferences = {
    dayStem: natal[2].stem,
    yearBranch: natal[0].branch,
    dayBranch: natal[2].branch,
  };
  return buildTemporalPillar(id, label, layer, ganZhi, references);
}

function snapshot(natal: TemporalPillar[], context: TemporalPillar[] = natal) {
  const natalRelations = detectRelations(natal);
  const contextRelations = detectRelations(context);
  const natalEvidence = buildEvidenceSnapshot(natal, natal, natalRelations);
  const currentEvidence = buildEvidenceSnapshot(natal, context, contextRelations);
  const natalDynamics = buildDynamicsSnapshot(natal, natalRelations, natalEvidence);
  const currentDynamics = buildDynamicsSnapshot(context, contextRelations, currentEvidence);
  const natalStrength = buildStrengthAdjudication(natal, natal, natalRelations, natalEvidence, natalDynamics);
  const currentStrength = buildStrengthAdjudication(natal, context, contextRelations, currentEvidence, currentDynamics);
  return {
    natalRelations,
    contextRelations,
    natalEvidence,
    currentEvidence,
    natalDynamics,
    currentDynamics,
    natalStrength,
    currentStrength,
  };
}

describe('month-command pattern candidates', () => {
  it('keeps the revealed month main qi as the leading natal pattern candidate', () => {
    const natal = natalNodes(['甲子', '甲寅', '庚辰', '壬午']);
    const data = snapshot(natal);
    const pattern = buildPatternAssessment(
      natal,
      natal,
      data.natalRelations,
      data.contextRelations,
      data.natalEvidence,
      data.natalDynamics,
    );
    expect(pattern.leading.name).toBe('偏财格候选');
    expect(pattern.leading.sourceRank).toBe('本气');
    expect(pattern.leading.natalExactRevealCount).toBeGreaterThan(0);
  });

  it('exposes hurt-officer versus officer conflict instead of silently declaring formation', () => {
    const natal = natalNodes(['壬子', '辛酉', '甲辰', '丁卯']);
    const data = snapshot(natal);
    const pattern = buildPatternAssessment(
      natal,
      natal,
      data.natalRelations,
      data.contextRelations,
      data.natalEvidence,
      data.natalDynamics,
    );
    const officer = pattern.candidates.find((item) => item.tenGod === '正官');
    expect(officer).toBeDefined();
    expect(officer?.objections.some((item) => item.includes('伤官见官'))).toBe(true);
    expect(officer?.conditions.some((item) => item.label === '破格／混杂审查' && item.state === '冲突')).toBe(true);
  });

  it('records temporal reveal as activation without rewriting the natal source', () => {
    const natal = natalNodes(['壬子', '戊辰', '甲寅', '庚午']);
    const context = [...natal, temporalNode(natal, 'flow', '癸卯流年', '流年', '癸卯')];
    const data = snapshot(natal, context);
    const pattern = buildPatternAssessment(
      natal,
      context,
      data.natalRelations,
      data.contextRelations,
      data.natalEvidence,
      data.natalDynamics,
    );
    const gui = pattern.candidates.find((item) => item.sourceStem === '癸');
    expect(gui?.temporalExactRevealCount).toBe(1);
    expect(gui?.conditions.some((item) => item.label === '岁运透出' && item.state === '部分具备')).toBe(true);
    expect(pattern.notes.some((item) => item.includes('不改写出生格局来源'))).toBe(true);
  });
});

describe('climate and support-balance tracks', () => {
  it('keeps winter fire need as a climate baseline and detects temporal supplementation', () => {
    const natal = natalNodes(['庚申', '戊子', '庚辰', '乙卯']);
    const context = [...natal, temporalNode(natal, 'luck', '丙午大运', '大运', '丙午')];
    const climate = buildClimateAssessment(natal, context);
    const fire = climate.needs.find((item) => item.element === '火');
    expect(climate.profile).toContain('寒湿');
    expect(fire?.natal.status).toBe('未见');
    expect(fire?.current.status).toBe('显干可见');
    expect(fire?.temporalAdded).toBe(true);
  });

  it('gives a weak metal day master an印比扶身 direction without calling it final useful god', () => {
    const natal = natalNodes(['甲午', '丙午', '庚寅', '戊辰']);
    const data = snapshot(natal);
    const track = buildSupportBalanceTrack('金', data.natalStrength);
    expect(track.orientation).toBe('宜扶候选');
    expect(track.elements.map((item) => item.element)).toEqual(expect.arrayContaining(['土', '金']));
    expect(track).not.toHaveProperty('usefulGod');
    expect(track).not.toHaveProperty('yongShen');
  });

  it('marks climate water versus weak-metal support direction as a track conflict', () => {
    const natal = natalNodes(['甲午', '丙午', '庚寅', '戊辰']);
    const data = snapshot(natal);
    const climate = buildClimateAssessment(natal, natal);
    const track = buildSupportBalanceTrack('金', data.natalStrength);
    const comparisons = compareTracks('金', climate, track);
    expect(comparisons.some((item) => item.climateElement === '水' && item.supportBalanceRelation === '方向冲突')).toBe(true);
  });

  it('returns three separate tracks and no final use-god field', () => {
    const natal = natalNodes(['甲午', '丙午', '庚寅', '戊辰']);
    const data = snapshot(natal);
    const result = buildInterpretationAssessment(
      natal,
      natal,
      data.natalRelations,
      data.contextRelations,
      data.natalEvidence,
      data.currentEvidence,
      data.natalDynamics,
      data.currentDynamics,
      data.natalStrength,
      data.currentStrength,
    );
    expect(result.pattern).toBeDefined();
    expect(result.climate).toBeDefined();
    expect(result.natalSupportBalance).toBeDefined();
    expect(result).not.toHaveProperty('usefulGod');
    expect(result).not.toHaveProperty('favorableElements');
  });
});
