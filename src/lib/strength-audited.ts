import type { DynamicsSnapshot } from './dynamics';
import type { EvidenceSnapshot } from './evidence';
import type { ChartRelation } from './relations';
import {
  buildStrengthAdjudication as buildBaseStrengthAdjudication,
  type StrengthAdjudication,
  type StrengthConfidence,
  type StrengthEvidenceItem,
  type StrengthHypothesis,
  type StrengthHypothesisName,
} from './strength';
import type { TemporalPillar } from './timeline';

export type {
  StrengthAdjudication,
  StrengthAxis,
  StrengthConfidence,
  StrengthEvidenceItem,
  StrengthHypothesis,
  StrengthHypothesisName,
} from './strength';

const FOLLOW_NAMES = new Set<StrengthHypothesisName>(['从强候选', '从弱候选']);

function unique(items: string[]): string[] {
  return items.filter((item, index, array) => array.indexOf(item) === index);
}

function visibleEvidence(
  evidence: StrengthEvidenceItem[],
  axis: StrengthEvidenceItem['axis'],
): StrengthEvidenceItem[] {
  return evidence.filter((item) =>
    item.axis === axis && (item.category === '显干' || item.category === '重复引动'),
  );
}

function auditFollowCandidate(
  candidate: StrengthHypothesis,
  evidence: StrengthEvidenceItem[],
): StrengthHypothesis {
  if (!FOLLOW_NAMES.has(candidate.name)) return { ...candidate, blockers: [...candidate.blockers] };

  const blockers = [...candidate.blockers];
  if (candidate.name === '从强候选') {
    if (visibleEvidence(evidence, '耗泄克身').length > 0) {
      blockers.push('仍见耗泄克身方向的显干或岁运重复引动');
    }
  } else if (visibleEvidence(evidence, '扶身').length > 0) {
    blockers.push('仍见扶身方向的显干或岁运重复引动');
  }

  const auditedBlockers = unique(blockers);
  return {
    ...candidate,
    blockers: auditedBlockers,
    // “阻断”在语义上应当真的阻断领先，而不是只轻微打折后仍有机会排第一。
    fit: auditedBlockers.length > 0 ? Math.min(candidate.fit, 0.18) : candidate.fit,
    note: auditedBlockers.length > 0
      ? '从势条件被反向显干、根气或方向性证据阻断；本候选保留用于审计，但不得领先。'
      : candidate.note,
  };
}

function confidenceAfterAudit(
  hypotheses: StrengthHypothesis[],
  result: StrengthAdjudication,
): StrengthConfidence {
  const leading = hypotheses[0];
  const second = hypotheses[1];
  if (!leading) return '低';
  const gap = second ? leading.fit - second.fit : leading.fit;
  const directionalTotal = result.supportTotal + result.oppositionTotal;
  const uncertaintyRatio = directionalTotal + result.uncertainTotal > 0
    ? result.uncertainTotal / (directionalTotal + result.uncertainTotal)
    : 1;
  if (gap >= 0.18 && result.unresolved.length <= 1 && uncertaintyRatio < 0.12) return '高';
  if (gap >= 0.08 && result.unresolved.length <= 5 && uncertaintyRatio < 0.25) return '中';
  return '低';
}

export function buildStrengthAdjudication(
  natalNodes: TemporalPillar[],
  contextNodes: TemporalPillar[],
  relations: ChartRelation[],
  evidence: EvidenceSnapshot,
  dynamics: DynamicsSnapshot,
): StrengthAdjudication {
  const base = buildBaseStrengthAdjudication(natalNodes, contextNodes, relations, evidence, dynamics);
  const hypotheses = base.hypotheses
    .map((candidate) => auditFollowCandidate(candidate, base.evidence))
    .sort((left, right) => right.fit - left.fit);
  const leading = hypotheses[0];
  if (!leading) throw new Error('力量候选准确性审计后为空。');

  return {
    ...base,
    leading,
    hypotheses,
    confidence: confidenceAfterAudit(hypotheses, base),
    notes: [
      ...base.notes,
      '准确性审计：从势候选一旦存在明确阻断项，只保留在候选表中，不允许继续成为领先结论。',
      '准确性审计：岁运重复引动仍属于显干证据，不得在从格阻断检查中漏算。',
    ],
  };
}
