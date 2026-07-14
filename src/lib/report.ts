import type { EnergyAssessment, EnergyContribution, ElementEnergyRow } from './energy';
import type { Element } from './foundations';
import type { InterpretationAssessment, PatternCandidate, TrackComparison } from './interpretation-audited';
import type {
  StrengthAdjudication,
  StrengthConfidence,
  StrengthEvidenceItem,
  StrengthHypothesisName,
} from './strength-audited';
import type { TemporalPillar } from './timeline';

export const CORE_REPORT_VERSION = 'MJ-R1.0.0';

export type ReportConfidence = '高' | '中' | '低';
export type ReportFindingKind = '结构优势' | '核心矛盾' | '岁运变化' | '待复核';
export type ReportSeverity = '积极' | '中性' | '注意';
export type EvidenceKind = '月令证据' | '力量证据' | '格局条件' | '能量贡献' | '轨道冲突';

export interface ReportEvidenceRef {
  id: string;
  kind: EvidenceKind;
  label: string;
  detail: string;
  layer: string;
  value?: number;
}

export interface ReportFinding {
  id: string;
  kind: ReportFindingKind;
  severity: ReportSeverity;
  title: string;
  summary: string;
  confidence: ReportConfidence;
  evidence: ReportEvidenceRef[];
  counterEvidence: ReportEvidenceRef[];
}

export interface ReportVerdict {
  label: string;
  detail: string;
  confidence: ReportConfidence;
  score: number;
}

export interface CoreReport {
  version: string;
  fingerprint: string;
  headline: string;
  executiveSummary: string;
  confidence: ReportConfidence;
  confidenceScore: number;
  verdicts: {
    strength: ReportVerdict;
    pattern: ReportVerdict;
    climate: ReportVerdict;
    energy: ReportVerdict;
  };
  strengths: ReportFinding[];
  tensions: ReportFinding[];
  temporalChanges: ReportFinding[];
  overturnConditions: ReportFinding[];
  evidenceIndex: ReportEvidenceRef[];
  notes: string[];
}

export interface BuildCoreReportInput {
  natalNodes: TemporalPillar[];
  contextNodes: TemporalPillar[];
  natalStrength: StrengthAdjudication;
  currentStrength: StrengthAdjudication;
  interpretation: InterpretationAssessment;
  energy: EnergyAssessment;
}

const FAMILY_LANGUAGE: Record<string, { axis: string; capacity: string; caution: string }> = {
  比劫: {
    axis: '自主与同类协同',
    capacity: '自主驱动、竞争意识和同类资源联动是结构中的重要力量。',
    caution: '同类力量过度集中时，需要注意竞争、分配和边界问题。',
  },
  印星: {
    axis: '吸收与支撑',
    capacity: '学习吸收、规则内化、资格支持和恢复能力是结构中的重要力量。',
    caution: '印星过重时，容易形成吸收多于输出或依赖既有框架的结构倾向。',
  },
  食伤: {
    axis: '表达与输出',
    capacity: '表达、技术输出、创造和把内部能力转化为外部成果是结构中的重要力量。',
    caution: '输出力量过强时，需要核验是否进一步消耗日主或与官杀形成冲突。',
  },
  财星: {
    axis: '资源与现实执行',
    capacity: '资源调度、现实交换、结果意识和执行落地是结构中的重要力量。',
    caution: '财星过重时，需要核验日主是否有足够承载能力以及比劫争夺问题。',
  },
  官杀: {
    axis: '约束与目标推进',
    capacity: '责任、规则压力、目标约束和在压力下推进事务是结构中的重要力量。',
    caution: '官杀过重时，需要核验是否有印星承接、食伤制化或形成持续压力。',
  },
};

const STRENGTH_LABEL: Record<StrengthHypothesisName, string> = {
  身旺候选: '身旺',
  偏强候选: '偏强',
  中和候选: '中和',
  偏弱候选: '偏弱',
  身弱候选: '身弱',
  从强候选: '从强结构',
  从弱候选: '从弱结构',
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function confidenceFromScore(score: number): ReportConfidence {
  if (score >= 0.75) return '高';
  if (score >= 0.55) return '中';
  return '低';
}

function confidenceWeight(confidence: StrengthConfidence): number {
  return confidence === '高' ? 0.88 : confidence === '中' ? 0.68 : 0.45;
}

function uniqueEvidence(items: ReportEvidenceRef[]): ReportEvidenceRef[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function simpleHash(parts: string[]): string {
  let hash = 2166136261;
  for (const character of parts.join('|')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `MR-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function strengthEvidenceRef(item: StrengthEvidenceItem): ReportEvidenceRef {
  return {
    id: `report:${item.id}`,
    kind: item.category === '月令' ? '月令证据' : '力量证据',
    label: item.label,
    detail: `${item.source}；${item.explanation}`,
    layer: item.layer,
    value: item.effectiveWeight,
  };
}

function energyEvidenceRef(item: EnergyContribution): ReportEvidenceRef {
  return {
    id: `report:${item.id}`,
    kind: '能量贡献',
    label: `${item.nodeLabel}${item.stem}${item.element} · ${item.tenGod}`,
    detail: `${item.sourceType}${item.rank ? `·${item.rank}` : ''}；${item.formula}`,
    layer: item.layer,
    value: item.effectiveUnits,
  };
}

function patternEvidenceRef(pattern: PatternCandidate, detail: string, suffix: string): ReportEvidenceRef {
  return {
    id: `report:${pattern.id}:${suffix}`,
    kind: '格局条件',
    label: pattern.name,
    detail,
    layer: '原局月令',
    value: round(pattern.completeness * 100),
  };
}

function trackEvidenceRef(item: TrackComparison): ReportEvidenceRef {
  return {
    id: `report:${item.id}`,
    kind: '轨道冲突',
    label: `${item.climateElement} · ${item.supportBalanceRelation}`,
    detail: item.detail,
    layer: '调候／扶抑',
  };
}

function topEvidence(
  result: StrengthAdjudication,
  axis: StrengthEvidenceItem['axis'],
  limit = 3,
): ReportEvidenceRef[] {
  return result.evidence
    .filter((item) => item.axis === axis)
    .sort((left, right) => right.effectiveWeight - left.effectiveWeight)
    .slice(0, limit)
    .map(strengthEvidenceRef);
}

function patternScore(pattern: PatternCandidate): number {
  const statusFactor: Record<PatternCandidate['status'], number> = {
    月令名义候选: 0.42,
    结构候选: 0.62,
    透干条件较齐: 0.82,
    冲突明显: 0.38,
  };
  const objectionPenalty = Math.min(0.25, pattern.objections.length * 0.06);
  return clamp(pattern.completeness * 0.72 + statusFactor[pattern.status] * 0.28 - objectionPenalty);
}

function strengthVerdict(result: StrengthAdjudication): ReportVerdict {
  const score = clamp(
    confidenceWeight(result.confidence) * 0.62 +
      result.leading.fit * 0.38 -
      Math.min(0.2, result.unresolved.length * 0.025),
  );
  const support = round(result.supportRatio * 100);
  return {
    label: STRENGTH_LABEL[result.leading.name],
    detail: `当前最优旺衰判断为${STRENGTH_LABEL[result.leading.name]}，扶身证据占${support}%，耗泄克身证据占${round(100 - support)}%。`,
    confidence: confidenceFromScore(score),
    score: round(score * 100),
  };
}

function patternVerdict(pattern: PatternCandidate): ReportVerdict {
  const score = patternScore(pattern);
  const detail = pattern.status === '透干条件较齐'
    ? `${pattern.name}为当前最优结构判断，月令来源、透干与辅助条件相对齐全。`
    : pattern.status === '冲突明显'
      ? `${pattern.name}仍是排序最高的月令候选，但存在明显混杂或破格反证。`
      : `${pattern.name}为当前最优结构候选，现阶段仍需制化、清纯度与应验复核。`;
  return {
    label: pattern.name,
    detail,
    confidence: confidenceFromScore(score),
    score: round(score * 100),
  };
}

function climateVerdict(interpretation: InterpretationAssessment): ReportVerdict {
  const needs = interpretation.climate.needs;
  const conflicts = interpretation.comparisons.filter((item) => item.supportBalanceRelation === '方向冲突');
  if (!needs.length) {
    return {
      label: '无单一调候元素',
      detail: `${interpretation.climate.monthBranch}月的保守气候轨不预设单一调候元素，应继续结合日干与节气深浅。`,
      confidence: '中',
      score: 58,
    };
  }
  const needText = needs.map((item) => `${item.element}${item.role}`).join('、');
  const score = clamp(0.72 - conflicts.length * 0.12);
  return {
    label: needText,
    detail: `气候轨优先关注${needText}${conflicts.length ? `；其中${conflicts.length}项与当前扶抑方向冲突，不能直接等同为喜用。` : '，且当前未见与扶抑方向的直接冲突。'}`,
    confidence: confidenceFromScore(score),
    score: round(score * 100),
  };
}

function energyVerdict(energy: EnergyAssessment): ReportVerdict {
  const current = energy.current;
  const score = clamp(
    0.86 -
      Math.min(0.3, current.contestedPercent / 200) -
      (current.balanceScore < 35 ? 0.08 : 0),
  );
  const dominant = current.elements.find((item) => item.element === current.dominantElement)!;
  const weakest = current.elements.find((item) => item.element === current.weakestElement)!;
  return {
    label: `${current.dominantElement}主导 · ${current.weakestElement}最弱`,
    detail: `${current.dominantElement}占${dominant.percentage.toFixed(2)}%，${current.weakestElement}占${weakest.percentage.toFixed(2)}%；五行均衡度${current.balanceScore.toFixed(2)}，争议能量${current.contestedPercent.toFixed(2)}%。`,
    confidence: confidenceFromScore(score),
    score: round(score * 100),
  };
}

function topFamilyRows(energy: EnergyAssessment): ElementEnergyRow[] {
  return [...energy.current.elements].sort((left, right) => right.effectiveUnits - left.effectiveUnits);
}

function buildStrengths(
  energy: EnergyAssessment,
  interpretation: InterpretationAssessment,
  currentStrength: StrengthAdjudication,
): ReportFinding[] {
  const findings: ReportFinding[] = [];
  const rows = topFamilyRows(energy);
  const primary = rows[0];
  const secondary = rows[1];
  const primaryLanguage = FAMILY_LANGUAGE[primary.family];
  findings.push({
    id: `finding:strength:energy:${primary.element}`,
    kind: '结构优势',
    severity: '积极',
    title: `${primaryLanguage.axis}是当前最突出的结构轴`,
    summary: `${primary.element}能量占${primary.percentage.toFixed(2)}%，对应${primary.family}。${primaryLanguage.capacity}`,
    confidence: primary.percentage >= 30 ? '高' : '中',
    evidence: energy.current.contributions
      .filter((item) => item.element === primary.element)
      .slice(0, 3)
      .map(energyEvidenceRef),
    counterEvidence: energy.current.contributions
      .filter((item) => item.element === energy.current.weakestElement)
      .slice(0, 1)
      .map(energyEvidenceRef),
  });

  if (secondary && secondary.percentage >= 20) {
    const language = FAMILY_LANGUAGE[secondary.family];
    findings.push({
      id: `finding:strength:secondary:${secondary.element}`,
      kind: '结构优势',
      severity: '积极',
      title: `${language.axis}构成第二支撑`,
      summary: `${secondary.element}占${secondary.percentage.toFixed(2)}%，使结构不只依赖单一五行。${language.capacity}`,
      confidence: '中',
      evidence: energy.current.contributions
        .filter((item) => item.element === secondary.element)
        .slice(0, 2)
        .map(energyEvidenceRef),
      counterEvidence: [],
    });
  }

  if (interpretation.pattern.leading.supports.length) {
    findings.push({
      id: 'finding:strength:pattern-support',
      kind: '结构优势',
      severity: '积极',
      title: `${interpretation.pattern.leading.name}存在可识别的辅助链`,
      summary: interpretation.pattern.leading.supports.join('；'),
      confidence: interpretation.pattern.leading.status === '透干条件较齐' ? '高' : '中',
      evidence: interpretation.pattern.leading.supports.slice(0, 3).map((detail, index) =>
        patternEvidenceRef(interpretation.pattern.leading, detail, `support-${index}`),
      ),
      counterEvidence: interpretation.pattern.leading.objections.slice(0, 2).map((detail, index) =>
        patternEvidenceRef(interpretation.pattern.leading, detail, `objection-${index}`),
      ),
    });
  } else if (currentStrength.confidence === '高') {
    findings.push({
      id: 'finding:strength:clear-direction',
      kind: '结构优势',
      severity: '积极',
      title: '旺衰方向相对清晰',
      summary: `${STRENGTH_LABEL[currentStrength.leading.name]}判断领先，且主要证据与反向证据的差距较明确。`,
      confidence: '高',
      evidence: topEvidence(currentStrength, currentStrength.supportRatio >= 0.5 ? '扶身' : '耗泄克身'),
      counterEvidence: topEvidence(currentStrength, currentStrength.supportRatio >= 0.5 ? '耗泄克身' : '扶身', 2),
    });
  }

  return findings.slice(0, 3);
}

function buildTensions(
  energy: EnergyAssessment,
  interpretation: InterpretationAssessment,
  currentStrength: StrengthAdjudication,
): ReportFinding[] {
  const findings: ReportFinding[] = [];
  const weak = energy.current.elements.find((item) => item.element === energy.current.weakestElement)!;
  const dominant = energy.current.elements.find((item) => item.element === energy.current.dominantElement)!;

  if (energy.current.balanceScore < 65 || dominant.percentage - weak.percentage >= 20) {
    findings.push({
      id: 'finding:tension:concentration',
      kind: '核心矛盾',
      severity: '注意',
      title: '五行分布存在明显集中与短板',
      summary: `${dominant.element}为${dominant.percentage.toFixed(2)}%，而${weak.element}仅${weak.percentage.toFixed(2)}%；均衡度为${energy.current.balanceScore.toFixed(2)}。这表示结构重心明确，但弱项不能仅凭“补缺”机械处理。`,
      confidence: '高',
      evidence: energy.current.contributions
        .filter((item) => item.element === dominant.element)
        .slice(0, 3)
        .map(energyEvidenceRef),
      counterEvidence: energy.current.contributions
        .filter((item) => item.element === weak.element)
        .slice(0, 2)
        .map(energyEvidenceRef),
    });
  }

  const conflicts = interpretation.comparisons.filter((item) => item.supportBalanceRelation === '方向冲突');
  if (conflicts.length) {
    findings.push({
      id: 'finding:tension:track-conflict',
      kind: '核心矛盾',
      severity: '注意',
      title: '调候需求与扶抑方向发生冲突',
      summary: conflicts.map((item) => item.detail).join('；'),
      confidence: '高',
      evidence: conflicts.map(trackEvidenceRef),
      counterEvidence: interpretation.comparisons
        .filter((item) => item.supportBalanceRelation === '方向一致')
        .map(trackEvidenceRef),
    });
  }

  if (interpretation.pattern.leading.objections.length) {
    findings.push({
      id: 'finding:tension:pattern-objection',
      kind: '核心矛盾',
      severity: '注意',
      title: `${interpretation.pattern.leading.name}存在成格反证`,
      summary: interpretation.pattern.leading.objections.slice(0, 3).join('；'),
      confidence: interpretation.pattern.leading.objections.length >= 2 ? '高' : '中',
      evidence: interpretation.pattern.leading.objections.slice(0, 3).map((detail, index) =>
        patternEvidenceRef(interpretation.pattern.leading, detail, `tension-${index}`),
      ),
      counterEvidence: interpretation.pattern.leading.supports.slice(0, 2).map((detail, index) =>
        patternEvidenceRef(interpretation.pattern.leading, detail, `counter-${index}`),
      ),
    });
  }

  if (energy.current.contestedPercent >= 25) {
    findings.push({
      id: 'finding:tension:contested-energy',
      kind: '核心矛盾',
      severity: '注意',
      title: '较多能量处于合冲刑害的争议状态',
      summary: `当前${energy.current.contestedPercent.toFixed(2)}%的有效能量受到关系触及，因此表面占比与实际可用程度之间存在折扣。`,
      confidence: '中',
      evidence: energy.current.contributions.filter((item) => item.contested).slice(0, 4).map(energyEvidenceRef),
      counterEvidence: [],
    });
  }

  if (currentStrength.unresolved.length && findings.length < 3) {
    findings.push({
      id: 'finding:tension:unresolved',
      kind: '核心矛盾',
      severity: '注意',
      title: '旺衰裁决仍有未决作用链',
      summary: currentStrength.unresolved.slice(0, 3).join('；'),
      confidence: currentStrength.confidence === '低' ? '高' : '中',
      evidence: topEvidence(currentStrength, '不确定', 3),
      counterEvidence: [],
    });
  }

  return findings.slice(0, 3);
}

function buildTemporalChanges(
  energy: EnergyAssessment,
  natalStrength: StrengthAdjudication,
  currentStrength: StrengthAdjudication,
  interpretation: InterpretationAssessment,
): ReportFinding[] {
  const findings: ReportFinding[] = [];
  const deltas = [...energy.delta].sort((left, right) => Math.abs(right.percentagePointDelta) - Math.abs(left.percentagePointDelta));
  const primary = deltas[0];
  if (primary && Math.abs(primary.percentagePointDelta) >= 0.5) {
    findings.push({
      id: `finding:temporal:energy:${primary.element}`,
      kind: '岁运变化',
      severity: '中性',
      title: `${primary.element}是当前岁运变化最大的五行`,
      summary: `${primary.element}由原局${primary.natalPercentage.toFixed(2)}%变为${primary.currentPercentage.toFixed(2)}%，变化${primary.percentagePointDelta > 0 ? '+' : ''}${primary.percentagePointDelta.toFixed(2)}个百分点；绝对模型量变化${primary.unitDelta > 0 ? '+' : ''}${primary.unitDelta.toFixed(2)}。`,
      confidence: '高',
      evidence: energy.current.contributions
        .filter((item) => item.element === primary.element && item.layer !== '原局')
        .slice(0, 4)
        .map(energyEvidenceRef),
      counterEvidence: [],
    });
  }

  if (natalStrength.leading.name !== currentStrength.leading.name) {
    findings.push({
      id: 'finding:temporal:strength-shift',
      kind: '岁运变化',
      severity: '注意',
      title: '当前旺衰状态相对原局发生偏移',
      summary: `原局以${STRENGTH_LABEL[natalStrength.leading.name]}领先，当前岁运叠加后转为${STRENGTH_LABEL[currentStrength.leading.name]}。这只描述当前阶段，不改写出生底盘。`,
      confidence: currentStrength.confidence,
      evidence: topEvidence(currentStrength, currentStrength.supportRatio >= natalStrength.supportRatio ? '扶身' : '耗泄克身'),
      counterEvidence: topEvidence(natalStrength, natalStrength.supportRatio >= currentStrength.supportRatio ? '扶身' : '耗泄克身', 2),
    });
  } else {
    const delta = round((currentStrength.supportRatio - natalStrength.supportRatio) * 100);
    if (Math.abs(delta) >= 3) {
      findings.push({
        id: 'finding:temporal:strength-ratio',
        kind: '岁运变化',
        severity: '中性',
        title: '旺衰领先结论未变，但力量构成正在移动',
        summary: `${STRENGTH_LABEL[currentStrength.leading.name]}仍然领先，扶身占比较原局${delta > 0 ? '上升' : '下降'}${Math.abs(delta).toFixed(2)}个百分点。`,
        confidence: currentStrength.confidence,
        evidence: topEvidence(currentStrength, delta > 0 ? '扶身' : '耗泄克身'),
        counterEvidence: [],
      });
    }
  }

  const reveals = interpretation.pattern.candidates.filter((item) => item.temporalExactRevealCount > 0);
  if (reveals.length) {
    findings.push({
      id: 'finding:temporal:pattern-reveal',
      kind: '岁运变化',
      severity: '中性',
      title: '岁运正在引动月令格局材料',
      summary: reveals.map((item) => `${item.sourceStem}${item.tenGod}透出${item.temporalExactRevealCount}处`).join('；') + '。这些只作引动，不改写原局格局来源。',
      confidence: '中',
      evidence: reveals.map((item, index) => patternEvidenceRef(item, `岁运透出${item.temporalExactRevealCount}处`, `temporal-${index}`)),
      counterEvidence: [],
    });
  }

  return findings.slice(0, 3);
}

function buildOverturnConditions(
  currentStrength: StrengthAdjudication,
  interpretation: InterpretationAssessment,
): ReportFinding[] {
  const findings: ReportFinding[] = [];
  const second = currentStrength.hypotheses[1];
  if (second) {
    const gap = round((currentStrength.leading.fit - second.fit) * 100);
    if (gap < 15) {
      findings.push({
        id: 'finding:overturn:close-strength',
        kind: '待复核',
        severity: '注意',
        title: '旺衰第一、第二候选距离较近',
        summary: `${STRENGTH_LABEL[currentStrength.leading.name]}与${STRENGTH_LABEL[second.name]}的拟合差仅${gap.toFixed(2)}分。出生时间口径、合化裁决或关键根气状态变化，都可能改变排序。`,
        confidence: '高',
        evidence: topEvidence(currentStrength, currentStrength.supportRatio >= 0.5 ? '扶身' : '耗泄克身', 2),
        counterEvidence: topEvidence(currentStrength, currentStrength.supportRatio >= 0.5 ? '耗泄克身' : '扶身', 2),
      });
    }
  }

  if (interpretation.pattern.leading.objections.length) {
    findings.push({
      id: 'finding:overturn:pattern',
      kind: '待复核',
      severity: '注意',
      title: '格局结论取决于反证能否被制化',
      summary: `若${interpretation.pattern.leading.objections.slice(0, 2).join('、')}得到有效制化，${interpretation.pattern.leading.name}的可信度会上升；若冲突进一步加强，则只能保留为月令候选。`,
      confidence: '中',
      evidence: interpretation.pattern.leading.objections.slice(0, 2).map((detail, index) =>
        patternEvidenceRef(interpretation.pattern.leading, detail, `overturn-${index}`),
      ),
      counterEvidence: interpretation.pattern.leading.supports.slice(0, 2).map((detail, index) =>
        patternEvidenceRef(interpretation.pattern.leading, detail, `support-overturn-${index}`),
      ),
    });
  }

  const conflicts = interpretation.comparisons.filter((item) => item.supportBalanceRelation === '方向冲突');
  if (conflicts.length) {
    findings.push({
      id: 'finding:overturn:track-priority',
      kind: '待复核',
      severity: '注意',
      title: '最终取用取决于调候与扶抑的优先级',
      summary: '当前存在调候与扶抑方向冲突。必须结合节气深浅、原局承载和岁运实际应验，不能仅按缺什么补什么。',
      confidence: '高',
      evidence: conflicts.map(trackEvidenceRef),
      counterEvidence: [],
    });
  }

  if (!findings.length) {
    findings.push({
      id: 'finding:overturn:general',
      kind: '待复核',
      severity: '中性',
      title: '当前结论的主要复核入口',
      summary: '出生时刻、晚子时口径、真太阳时修正、合化是否成立以及关键人生事件应验，是后续校准结论的主要入口。',
      confidence: '中',
      evidence: [],
      counterEvidence: [],
    });
  }

  return findings.slice(0, 3);
}

function overallConfidence(
  strength: ReportVerdict,
  pattern: ReportVerdict,
  climate: ReportVerdict,
  energy: ReportVerdict,
  tensions: ReportFinding[],
): { score: number; confidence: ReportConfidence } {
  const base = (strength.score * 0.38 + pattern.score * 0.27 + climate.score * 0.15 + energy.score * 0.2) / 100;
  const highTensions = tensions.filter((item) => item.confidence === '高').length;
  const score = clamp(base - highTensions * 0.035);
  return { score: round(score * 100), confidence: confidenceFromScore(score) };
}

export function buildCoreReport(input: BuildCoreReportInput): CoreReport {
  const day = input.natalNodes[2];
  const month = input.natalNodes[1];
  if (!day || !month) throw new Error('缺少年柱／月柱／日柱，无法生成命盘总报告。');

  const strength = strengthVerdict(input.currentStrength);
  const pattern = patternVerdict(input.interpretation.pattern.leading);
  const climate = climateVerdict(input.interpretation);
  const energy = energyVerdict(input.energy);
  const strengths = buildStrengths(input.energy, input.interpretation, input.currentStrength);
  const tensions = buildTensions(input.energy, input.interpretation, input.currentStrength);
  const temporalChanges = buildTemporalChanges(
    input.energy,
    input.natalStrength,
    input.currentStrength,
    input.interpretation,
  );
  const overturnConditions = buildOverturnConditions(input.currentStrength, input.interpretation);
  const overall = overallConfidence(strength, pattern, climate, energy, tensions);

  const dominant = input.energy.current.elements.find((item) => item.element === input.energy.current.dominantElement)!;
  const dominantLanguage = FAMILY_LANGUAGE[dominant.family];
  const strengthShift = input.natalStrength.leading.name === input.currentStrength.leading.name
    ? `原局与当前岁运均以${STRENGTH_LABEL[input.currentStrength.leading.name]}为领先判断`
    : `原局${STRENGTH_LABEL[input.natalStrength.leading.name]}，当前岁运转为${STRENGTH_LABEL[input.currentStrength.leading.name]}`;
  const headline = `${day.stem}${day.stemElement}日主，${month.branch}月；${strengthShift}，${input.interpretation.pattern.leading.name}居格局候选首位。`;
  const executiveSummary = `${day.stem}${day.stemElement}生于${month.branch}月，当前结构以${dominant.element}${dominant.family}最突出，主轴落在${dominantLanguage.axis}。旺衰方面，${strength.detail}格局方面，${pattern.detail}${climate.detail}`;

  const evidenceIndex = uniqueEvidence([
    ...strengths.flatMap((item) => [...item.evidence, ...item.counterEvidence]),
    ...tensions.flatMap((item) => [...item.evidence, ...item.counterEvidence]),
    ...temporalChanges.flatMap((item) => [...item.evidence, ...item.counterEvidence]),
    ...overturnConditions.flatMap((item) => [...item.evidence, ...item.counterEvidence]),
  ]);

  return {
    version: CORE_REPORT_VERSION,
    fingerprint: simpleHash([
      input.natalNodes.map((item) => item.ganZhi).join(''),
      input.contextNodes.map((item) => item.ganZhi).join(''),
      input.currentStrength.leading.name,
      input.interpretation.pattern.leading.name,
      input.energy.current.elements.map((item) => `${item.element}${item.basisPoints}`).join(''),
    ]),
    headline,
    executiveSummary,
    confidence: overall.confidence,
    confidenceScore: overall.score,
    verdicts: { strength, pattern, climate, energy },
    strengths,
    tensions,
    temporalChanges,
    overturnConditions,
    evidenceIndex,
    notes: [
      `${CORE_REPORT_VERSION} 是由确定性规则模板生成的总报告，不调用大模型自由发挥。`,
      '“当前最优判断”表示在现有证据、口径和模型版本下排序第一，不表示不存在流派分歧或反证。',
      '结构优势描述命盘中更容易被调用的能力轴，不等于现实中的必然人格或成就。',
      '总报告只汇总已存在的排盘、能量、旺衰、格局和调候结果，不额外发明新的命理事实。',
    ],
  };
}

export function isValidCoreReport(report: CoreReport): boolean {
  const findingIds = [
    ...report.strengths,
    ...report.tensions,
    ...report.temporalChanges,
    ...report.overturnConditions,
  ].map((item) => item.id);
  const evidenceIds = report.evidenceIndex.map((item) => item.id);
  return (
    Boolean(report.headline && report.executiveSummary && report.fingerprint) &&
    report.confidenceScore >= 0 &&
    report.confidenceScore <= 100 &&
    new Set(findingIds).size === findingIds.length &&
    new Set(evidenceIds).size === evidenceIds.length &&
    Object.values(report.verdicts).every((item) => item.score >= 0 && item.score <= 100) &&
    report.strengths.length > 0 &&
    report.tensions.length > 0 &&
    report.overturnConditions.length > 0
  );
}
