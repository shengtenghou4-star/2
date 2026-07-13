import { growthStage, type HiddenStemRank } from './foundations';
import type { DynamicsSnapshot } from './dynamics';
import type { EvidenceSnapshot, TenGodFamily } from './evidence';
import {
  buildClimateAssessment,
  buildPatternAssessment as buildBasePatternAssessment,
  buildSupportBalanceTrack,
  compareTracks,
  type InterpretationAssessment,
  type InterpretationCondition,
  type PatternAssessment,
  type PatternCandidate,
  type PatternStatus,
} from './interpretation';
import type { ChartRelation } from './relations';
import type { StrengthAdjudication } from './strength';
import type { TemporalPillar } from './timeline';

export type {
  ClimateAssessment,
  ClimateAvailability,
  ClimateNeed,
  ConditionState,
  ElementAvailability,
  InterpretationAssessment,
  InterpretationCondition,
  PatternAssessment,
  PatternCandidate,
  PatternStatus,
  SupportBalanceElement,
  SupportBalanceTrack,
  TrackComparison,
  TrackRelation,
} from './interpretation';
export { buildClimateAssessment, buildSupportBalanceTrack, compareTracks } from './interpretation';

const STORAGE_BRANCHES = new Set(['辰', '戌', '丑', '未']);
const HARMFUL_MONTH_RELATIONS = new Set(['六冲', '六害', '六破', '相刑', '三刑', '自刑']);

function familyOf(tenGod: string): TenGodFamily {
  if (tenGod === '比肩' || tenGod === '劫财' || tenGod === '日主') return '比劫';
  if (tenGod === '正印' || tenGod === '偏印') return '印星';
  if (tenGod === '食神' || tenGod === '伤官') return '食伤';
  if (tenGod === '正财' || tenGod === '偏财') return '财星';
  return '官杀';
}

function visibleFamiliesExcludingDay(natalNodes: TemporalPillar[]): Map<TenGodFamily, number> {
  const counts = new Map<TenGodFamily, number>();
  natalNodes.forEach((node, index) => {
    if (index === 2 || node.label === '日柱') return;
    const family = familyOf(node.tenGod);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  });
  return counts;
}

function auditedPatternName(candidate: PatternCandidate, monthBranch: string, dayStem: string): string {
  if (STORAGE_BRANCHES.has(monthBranch)) {
    if (candidate.tenGod === '比肩' || candidate.tenGod === '劫财') {
      return `杂气${candidate.tenGod}月令候选`;
    }
    return `杂气${candidate.tenGod}格候选`;
  }

  // 建禄、月刃必须来自月支本气和日主十二长生位置，不能因为中余气碰巧同类就误命名。
  if (candidate.sourceRank === '本气' && candidate.tenGod === '比肩' && growthStage(dayStem, monthBranch) === '临官') {
    return '建禄格候选';
  }
  if (candidate.sourceRank === '本气' && candidate.tenGod === '劫财') {
    return growthStage(dayStem, monthBranch) === '帝旺' ? '月刃格候选' : '月劫格候选';
  }
  if (candidate.tenGod === '比肩' || candidate.tenGod === '劫财') {
    return `${candidate.tenGod}月令${candidate.sourceRank}候选`;
  }
  return `${candidate.tenGod}格候选`;
}

function relationsTouchingMonth(month: TemporalPillar, relations: ChartRelation[]): ChartRelation[] {
  return relations.filter((relation) => relation.members.some((member) => member.id === month.id));
}

function unique(items: string[]): string[] {
  return items.filter((item, index, array) => array.indexOf(item) === index);
}

function auditCandidate(
  candidate: PatternCandidate,
  natalNodes: TemporalPillar[],
  natalRelations: ChartRelation[],
  contextRelations: ChartRelation[],
): PatternCandidate {
  const month = natalNodes[1];
  const day = natalNodes[2];
  if (!month || !day) return candidate;

  const visibleFamilies = visibleFamiliesExcludingDay(natalNodes);
  const hasExternalBiJie = (visibleFamilies.get('比劫') ?? 0) > 0;
  const supports = candidate.supports.filter((item) =>
    hasExternalBiJie || item !== '印比承接材料可见',
  );
  const objections = candidate.objections.filter((item) => {
    if (!hasExternalBiJie && item === '比劫透出，存在夺财或分财审查') return false;
    // 旧版把任何合会也当成“破格反证”；准确性审计后只把明确冲刑害破留在反证侧。
    if (item.startsWith('月支同时参与') || item.startsWith('岁运新增触及月支')) return false;
    return true;
  });

  const natalTouches = relationsTouchingMonth(month, natalRelations);
  const natalIds = new Set(natalTouches.map((item) => item.id));
  const temporalTouches = relationsTouchingMonth(month, contextRelations)
    .filter((item) => !natalIds.has(item.id));
  const harmfulNatal = natalTouches.filter((item) => HARMFUL_MONTH_RELATIONS.has(item.type));
  const harmfulTemporal = temporalTouches.filter((item) => HARMFUL_MONTH_RELATIONS.has(item.type));
  if (harmfulNatal.length) objections.push(`月支受${harmfulNatal.map((item) => item.name).join('、')}触及`);
  if (harmfulTemporal.length) objections.push(`岁运新增${harmfulTemporal.map((item) => item.name).join('、')}触及月支`);

  const auditedObjections = unique(objections);
  const rankBase: Record<HiddenStemRank, number> = { 本气: 0.5, 中气: 0.31, 余气: 0.2 };
  let completeness = rankBase[candidate.sourceRank];
  if (candidate.natalExactRevealCount > 0) completeness += 0.22;
  else if (candidate.sameFamilyVisibleCount > 0) completeness += 0.08;
  if (candidate.seasonalState === '旺' || candidate.seasonalState === '相') completeness += 0.1;
  completeness += Math.min(0.12, supports.length * 0.06);
  completeness -= Math.min(0.24, auditedObjections.length * 0.06);
  completeness = Math.max(0, Math.min(1, Math.round(completeness * 100) / 100));

  const status: PatternStatus = auditedObjections.length >= 2
    ? '冲突明显'
    : candidate.natalExactRevealCount > 0 && supports.length > 0
      ? '透干条件较齐'
      : candidate.natalExactRevealCount > 0 || supports.length > 0 || candidate.sameFamilyVisibleCount > 0
        ? '结构候选'
        : '月令名义候选';

  const conditions: InterpretationCondition[] = candidate.conditions
    .filter((item) => item.label !== '破格／混杂审查')
    .map((item) => item.label === '成格辅助'
      ? {
          ...item,
          state: supports.length ? '具备' : '未见',
          detail: supports.length ? supports.join('；') : '当前未见本规则库覆盖的典型辅助链。',
        }
      : item);

  const allTouches = [...natalTouches, ...temporalTouches];
  conditions.splice(Math.max(0, conditions.length - 1), 0, {
    id: `${candidate.id}:month-touch-audit`,
    label: '月支关系触及',
    state: harmfulNatal.length || harmfulTemporal.length ? '冲突' : allTouches.length ? '部分具备' : '未见',
    detail: allTouches.length
      ? `${allTouches.map((item) => `${item.scope}·${item.name}`).join('；')}。合会只记待裁决，冲刑害破才进入反证。`
      : '月支当前未被已收录关系触及。',
  });
  conditions.splice(Math.max(0, conditions.length - 1), 0, {
    id: `${candidate.id}:conflict-audit`,
    label: '破格／混杂审查',
    state: auditedObjections.length ? '冲突' : '未见',
    detail: auditedObjections.length ? auditedObjections.join('；') : '当前未见本规则库覆盖的明确反证。',
  });

  return {
    ...candidate,
    name: auditedPatternName(candidate, month.branch, day.stem),
    completeness,
    status,
    supports,
    objections: auditedObjections,
    conditions,
    note: `${candidate.note} 准确性审计已排除日主自身造成的伪“比劫透干”，并限制建禄／月刃命名条件。`,
  };
}

export function buildPatternAssessment(
  natalNodes: TemporalPillar[],
  contextNodes: TemporalPillar[],
  natalRelations: ChartRelation[],
  contextRelations: ChartRelation[],
  natalEvidence: EvidenceSnapshot,
  natalDynamics: DynamicsSnapshot,
): PatternAssessment {
  const base = buildBasePatternAssessment(
    natalNodes,
    contextNodes,
    natalRelations,
    contextRelations,
    natalEvidence,
    natalDynamics,
  );
  const candidates = base.candidates
    .map((candidate) => auditCandidate(candidate, natalNodes, natalRelations, contextRelations))
    .sort((left, right) => right.completeness - left.completeness || Number(right.primary) - Number(left.primary));
  const leading = candidates[0];
  if (!leading) throw new Error('格局候选准确性审计后为空。');
  return {
    ...base,
    leading,
    candidates,
    notes: [
      ...base.notes,
      '准确性审计：日柱日主不再被误算为额外“比劫透干”。',
      '准确性审计：建禄／月刃只允许由月支本气及对应临官／帝旺位置命名；杂气月不再出现“杂气建禄”这类混称。',
      '准确性审计：六合、三合、三会、半合、拱合只列为月支待裁决结构，不自动当作破格反证。',
    ],
  };
}

export function buildInterpretationAssessment(
  natalNodes: TemporalPillar[],
  contextNodes: TemporalPillar[],
  natalRelations: ChartRelation[],
  contextRelations: ChartRelation[],
  natalEvidence: EvidenceSnapshot,
  currentEvidence: EvidenceSnapshot,
  natalDynamics: DynamicsSnapshot,
  currentDynamics: DynamicsSnapshot,
  natalStrength: StrengthAdjudication,
  currentStrength: StrengthAdjudication,
): InterpretationAssessment {
  const dayMaster = natalNodes[2];
  if (!dayMaster) throw new Error('原局缺少日柱，无法建立解释双轨。');
  const pattern = buildPatternAssessment(
    natalNodes,
    contextNodes,
    natalRelations,
    contextRelations,
    natalEvidence,
    natalDynamics,
  );
  const climate = buildClimateAssessment(natalNodes, contextNodes);
  const natalSupportBalance = buildSupportBalanceTrack(dayMaster.stemElement, natalStrength);
  const currentSupportBalance = buildSupportBalanceTrack(dayMaster.stemElement, currentStrength);
  const comparisons = compareTracks(dayMaster.stemElement, climate, currentSupportBalance);
  void currentEvidence;
  void currentDynamics;

  return {
    pattern,
    climate,
    natalSupportBalance,
    currentSupportBalance,
    comparisons,
    notes: [
      '格局轨、气候轨与扶抑轨是三套不同问题；同一元素在不同轨道中的角色可能相反。',
      '本层只输出候选、材料和冲突，不输出最终格局、调候用神、扶抑用神、喜神或忌神。',
      '准确性审计启用：特殊格局命名、日主排除和月支关系反证均采用更严格条件。',
    ],
  };
}
