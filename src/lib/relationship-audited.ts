import type { AnalysisBundle } from './analysis-bundle';
import type { BaziChart } from './bazi';
import {
  buildCompatibilityAssessment as buildBaseCompatibilityAssessment,
  buildRelationshipProfile,
  isValidCompatibility as isBaseValidCompatibility,
  type CompatibilityAssessment,
  type CompatibilityAxis,
} from './relationship';

export type {
  CompatibilityAssessment,
  CompatibilityAxis,
  RelationshipAxis,
  RelationshipConfidence,
  RelationshipEvidence,
  RelationshipProfile,
} from './relationship';
export { RELATIONSHIP_MODEL_VERSION, buildRelationshipProfile } from './relationship';

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round = (value: number) => Math.round(value * 100) / 100;

function structureKey(relation: CompatibilityAssessment['crossRelations'][number]): string {
  const chars = relation.members.map((item) => item.char).sort().join('');
  return `${relation.type}:${relation.resultElement ?? ''}:${chars}`;
}

function uniqueStructures(relations: CompatibilityAssessment['crossRelations']) {
  const seen = new Set<string>();
  return relations.filter((relation) => {
    const key = structureKey(relation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPositive(type: string): boolean {
  return ['五合', '六合', '三合', '三会', '半合', '拱合'].includes(type);
}

function isConflict(type: string): boolean {
  return ['相冲', '六冲', '六害', '六破', '相刑', '三刑', '自刑'].includes(type);
}

function replaceAxis(axes: CompatibilityAxis[], id: CompatibilityAxis['id'], score: number, extra: string): CompatibilityAxis[] {
  return axes.map((axis) => axis.id === id ? {
    ...axis,
    score: round(clamp(score)),
    summary: `${axis.summary}${extra}`,
  } : axis).sort((left, right) => right.score - left.score);
}

export function buildCompatibilityAssessment(
  leftChart: BaziChart,
  leftBundle: AnalysisBundle,
  rightChart: BaziChart,
  rightBundle: AnalysisBundle,
): CompatibilityAssessment {
  const base = buildBaseCompatibilityAssessment(leftChart, leftBundle, rightChart, rightBundle);
  const unique = uniqueStructures(base.crossRelations);
  const positive = unique.filter((item) => isPositive(item.type)).length;
  const conflict = unique.filter((item) => isConflict(item.type)).length;
  const duplicateCount = Math.max(0, base.crossRelations.length - unique.length);
  const rawAttraction = base.axes.find((item) => item.id === 'attraction')!;
  const auditedCeiling = 48 + positive * 7 - conflict * 5 + Math.min(6, positive * 1.5);
  const attractionScore = Math.min(rawAttraction.score, auditedCeiling);
  let axes = replaceAxis(
    base.axes,
    'attraction',
    attractionScore,
    ` 评分按${unique.length}种唯一跨盘结构计算；${duplicateCount}个重复落点只保留在证据账，不重复加分。`,
  );
  const average = axes.reduce((sum, item) => sum + item.score, 0) / axes.length;
  const confidenceScore = round(clamp(average - conflict * 2.5 + positive * 1.2));
  const strengths = axes.filter((item) => item.score >= 65).slice(0, 3).map((item) => `${item.name}较强：${item.summary}`);
  const tensions = axes.filter((item) => item.score < 58).slice(0, 3).map((item) => `${item.name}需要主动经营：${item.summary}`);
  if (conflict) tensions.push(`去重后仍有${conflict}种冲、刑、害或破结构，需要落实到现实边界、责任和资源议题。`);
  axes = [...axes];

  return {
    ...base,
    headline: `${axes[0].name}是双方最强连接，${axes[axes.length - 1].name}是首要经营课题`,
    summary: `两张盘不是“合或不合”的二元判断。去重后的五轴平均分为${average.toFixed(2)}；高分连接能否落到行为、低分轴能否建立协议，比重复出现多少个合局更重要。`,
    confidence: confidenceScore >= 72 ? '高' : confidenceScore >= 50 ? '中' : '低',
    confidenceScore,
    axes,
    strengths: strengths.length ? strengths : ['当前没有单一压倒性优势，关系质量更依赖现实沟通与共同经历。'],
    tensions: tensions.length ? tensions.slice(0, 4) : ['当前没有单一压倒性结构冲突，仍需通过现实相处验证。'],
    notes: [
      ...base.notes,
      `匹配评分按唯一结构去重；完整账本仍保留全部${base.crossRelations.length}个位置落点。`,
    ],
  };
}

export function isValidCompatibility(value: CompatibilityAssessment): boolean {
  return isBaseValidCompatibility(value) && value.axes[0].score >= value.axes[value.axes.length - 1].score;
}
