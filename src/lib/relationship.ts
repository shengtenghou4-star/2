import type { AnalysisBundle } from './analysis-bundle';
import type { BaziChart } from './bazi';
import { buildElementInteractions, detectRelations, type ChartRelation } from './relations';
import type { TemporalPillar } from './timeline';

export const RELATIONSHIP_MODEL_VERSION = 'MJ-L1.0.0';

export type RelationshipConfidence = '高' | '中' | '低';

export interface RelationshipEvidence {
  id: string;
  label: string;
  detail: string;
  value?: number;
}

export interface RelationshipAxis {
  id: 'expression' | 'security' | 'boundary' | 'responsibility' | 'resource';
  name: string;
  score: number;
  summary: string;
  evidence: RelationshipEvidence[];
}

export interface RelationshipProfile {
  version: string;
  headline: string;
  summary: string;
  confidence: RelationshipConfidence;
  axes: RelationshipAxis[];
  needs: string[];
  risks: string[];
  notes: string[];
}

export interface CompatibilityAxis {
  id: 'attraction' | 'communication' | 'stability' | 'autonomy' | 'cooperation';
  name: string;
  score: number;
  summary: string;
  evidence: RelationshipEvidence[];
}

export interface CompatibilityAssessment {
  version: string;
  fingerprint: string;
  headline: string;
  summary: string;
  confidence: RelationshipConfidence;
  confidenceScore: number;
  axes: CompatibilityAxis[];
  strengths: string[];
  tensions: string[];
  agreements: string[];
  crossRelations: ChartRelation[];
  notes: string[];
}

const round = (value: number, digits = 2) => {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
};
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function confidence(score: number): RelationshipConfidence {
  if (score >= 72) return '高';
  if (score >= 50) return '中';
  return '低';
}

function hash(parts: string[]): string {
  let value = 2166136261;
  for (const char of parts.join('|')) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return `ML-${(value >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function family(bundle: AnalysisBundle, name: string) {
  const row = bundle.energy.current.elements.find((item) => item.family === name);
  if (!row) throw new Error(`关系模型缺少${name}分仓。`);
  return row;
}

function axis(id: RelationshipAxis['id'], name: string, score: number, summary: string, evidence: RelationshipEvidence[]): RelationshipAxis {
  return { id, name, score: round(clamp(score)), summary, evidence };
}

export function buildRelationshipProfile(bundle: AnalysisBundle): RelationshipProfile {
  const output = family(bundle, '食伤');
  const resource = family(bundle, '印星');
  const peers = family(bundle, '比劫');
  const authority = family(bundle, '官杀');
  const wealth = family(bundle, '财星');
  const support = bundle.currentStrength.supportRatio * 100;
  const contested = bundle.energy.current.contestedPercent;

  const axes = [
    axis('expression', '表达与沟通', 22 + output.percentage * 1.65 + resource.percentage * 0.35 - contested * 0.15, '衡量感受、需求和分歧能否被表达并转化为双方可理解的信息。', [
      { id: 'rel:output', label: `食伤${output.percentage.toFixed(2)}%`, detail: `显性${(output.visibleUnits / Math.max(1, output.effectiveUnits) * 100).toFixed(2)}%。`, value: output.percentage },
      { id: 'rel:resource', label: `印星${resource.percentage.toFixed(2)}%`, detail: '印星提供理解、倾听与内部加工。', value: resource.percentage },
    ]),
    axis('security', '安全与依恋', 18 + resource.percentage * 1.35 + authority.percentage * 0.52 + support * 0.28 - contested * 0.18, '衡量关系中对稳定、承诺、可预测性和情绪恢复的需要。', [
      { id: 'rel:security-resource', label: `印星${resource.percentage.toFixed(2)}%`, detail: '印星对应吸收、照顾与恢复资源。', value: resource.percentage },
      { id: 'rel:security-authority', label: `官杀${authority.percentage.toFixed(2)}%`, detail: '官杀对应责任、规则和承诺压力。', value: authority.percentage },
    ]),
    axis('boundary', '自主与边界', 20 + peers.percentage * 1.42 + support * 0.22 - wealth.percentage * 0.16, '衡量在亲密关系中保持自我、协商空间和拒绝不合理要求的能力。', [
      { id: 'rel:peers', label: `比劫${peers.percentage.toFixed(2)}%`, detail: '比劫对应自主、同侪和边界竞争。', value: peers.percentage },
      { id: 'rel:support', label: `扶身${support.toFixed(2)}%`, detail: `${bundle.currentStrength.leading.name}领先；扶身证据${support.toFixed(2)}%，耗泄克身证据${(100 - support).toFixed(2)}%。`, value: support },
    ]),
    axis('responsibility', '责任与长期建设', 18 + authority.percentage * 1.38 + resource.percentage * 0.42 + wealth.percentage * 0.35 - (support < 35 ? 8 : 0), '衡量是否愿意承担关系责任、建立秩序并把关系落实到共同生活。', [
      { id: 'rel:authority', label: `官杀${authority.percentage.toFixed(2)}%`, detail: '官杀承担规则、责任与长期约束。', value: authority.percentage },
      { id: 'rel:wealth', label: `财星${wealth.percentage.toFixed(2)}%`, detail: '财星对应现实资源、照料投入和生活安排。', value: wealth.percentage },
    ]),
    axis('resource', '资源共享与照料', 18 + wealth.percentage * 1.22 + resource.percentage * 0.6 + output.percentage * 0.28 - peers.percentage * 0.12, '衡量金钱、时间、照料、家务和现实资源能否形成双方认可的交换。', [
      { id: 'rel:resource-wealth', label: `财星${wealth.percentage.toFixed(2)}%`, detail: '财星对应现实投入与资源交换。', value: wealth.percentage },
      { id: 'rel:resource-resource', label: `印星${resource.percentage.toFixed(2)}%`, detail: '印星对应照料与支持。', value: resource.percentage },
    ]),
  ].sort((a, b) => b.score - a.score);

  const strongest = axes[0];
  const weakest = axes[axes.length - 1];
  const needs = [
    strongest.id === 'security' ? '关系需要稳定回应、可靠承诺与恢复空间。' : `关系中最容易主动调用的是${strongest.name}。`,
    weakest.id === 'expression' ? '重要感受需要明确说出，避免让对方靠猜。' : `${weakest.name}是更需要通过约定、练习或伴侣协作补足的环节。`,
    contested >= 30 ? '关系质量对边界、角色与现实环境较敏感，冲突时应先确认问题属于情感还是结构。' : '当前关系能力较少被合冲刑害集中牵制，可优先建立稳定反馈习惯。',
  ];
  const risks = [
    peers.percentage >= 28 ? '自主与竞争力量较强，关系中容易把协商变成输赢。' : '',
    authority.percentage >= 28 ? '责任与规则力量较强，容易把关系经营成任务或考核。' : '',
    resource.percentage >= 30 ? '照料与理解需求较高，需防止沉默期待和过度代偿。' : '',
    output.percentage >= 30 ? '表达输出较强，冲突时需要给对方完整回应空间。' : '',
  ].filter(Boolean);

  return {
    version: RELATIONSHIP_MODEL_VERSION,
    headline: `${strongest.name}是关系中的第一主轴，${weakest.name}需要更多协商与练习`,
    summary: `该结构更容易通过${strongest.name}维系关系；长期稳定取决于是否把${weakest.name}转化为清晰约定，而不是期待双方天然同步。`,
    confidence: confidence((strongest.score + (100 - contested)) / 2),
    axes,
    needs,
    risks: risks.length ? risks : ['当前未见单一压倒性的关系风险，重点在真实沟通和现实分工。'],
    notes: [
      '单人关系画像描述自身关系机制，不代表任何具体伴侣一定如何反应。',
      '关系质量不能由生肖、单一合冲或五行互补直接决定。',
    ],
  };
}

function prefixNodes(chart: BaziChart, prefix: string): TemporalPillar[] {
  return chart.pillars.map((item) => ({ ...item, id: `${prefix}:${item.id}`, label: `${prefix === 'A' ? '甲方' : '乙方'}${item.label}` }));
}

function crossRelations(left: BaziChart, right: BaziChart): ChartRelation[] {
  const nodes = [...prefixNodes(left, 'A'), ...prefixNodes(right, 'B')];
  return detectRelations(nodes).filter((relation) => {
    const ids = relation.members.map((item) => item.id);
    return ids.some((id) => id.startsWith('A:')) && ids.some((id) => id.startsWith('B:'));
  });
}

function relationStructureKey(relation: ChartRelation): string {
  return `${relation.type}:${relation.resultElement ?? ''}:${relation.members.map((item) => item.char).sort().join('')}`;
}

function relationCounts(relations: ChartRelation[]) {
  const seen = new Set<string>();
  const unique = relations.filter((item) => {
    const key = relationStructureKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const positive = unique.filter((item) => ['五合', '六合', '三合', '三会', '半合', '拱合'].includes(item.type));
  const conflict = unique.filter((item) => ['相冲', '六冲', '六害', '六破', '相刑', '三刑', '自刑'].includes(item.type));
  return { positive, conflict, unique };
}

export function buildCompatibilityAssessment(
  leftChart: BaziChart,
  leftBundle: AnalysisBundle,
  rightChart: BaziChart,
  rightBundle: AnalysisBundle,
): CompatibilityAssessment {
  const relations = crossRelations(leftChart, rightChart);
  const { positive, conflict, unique } = relationCounts(relations);
  const interactions = buildElementInteractions([...prefixNodes(leftChart, 'A'), ...prefixNodes(rightChart, 'B')]);
  const crossInteractions = interactions.filter((item) => item.left.id.startsWith('A:') !== item.right.id.startsWith('A:'));
  const generating = crossInteractions.filter((item) => item.type === '相生').length;
  const controlling = crossInteractions.filter((item) => item.type === '相克').length;
  const same = crossInteractions.filter((item) => item.type === '同类').length;
  const leftProfile = buildRelationshipProfile(leftBundle);
  const rightProfile = buildRelationshipProfile(rightBundle);
  const expressionGap = Math.abs(leftProfile.axes.find((item) => item.id === 'expression')!.score - rightProfile.axes.find((item) => item.id === 'expression')!.score);
  const securityGap = Math.abs(leftProfile.axes.find((item) => item.id === 'security')!.score - rightProfile.axes.find((item) => item.id === 'security')!.score);
  const boundaryGap = Math.abs(leftProfile.axes.find((item) => item.id === 'boundary')!.score - rightProfile.axes.find((item) => item.id === 'boundary')!.score);

  const evidenceBase: RelationshipEvidence[] = relations.slice(0, 5).map((item) => ({ id: `compat:${item.id}`, label: item.name, detail: item.note }));
  const axes: CompatibilityAxis[] = [
    { id: 'attraction', name: '吸引与互相注意', score: round(clamp(48 + positive.length * 8 - conflict.length * 3 + Math.min(8, same * 0.25))), summary: `合与同类结构提高互相注意，但吸引不等于长期稳定。评分按${unique.length}种唯一跨盘结构计算，重复位置只保留为证据。`, evidence: evidenceBase },
    { id: 'communication', name: '沟通可译性', score: round(clamp(78 - expressionGap * 0.65 + generating * 0.55 - controlling * 0.25)), summary: '比较双方表达强度、理解方式与五行传递是否容易形成翻译桥梁。', evidence: [{ id: 'compat:expression-gap', label: `表达差${expressionGap.toFixed(2)}`, detail: '差距越大，越需要明确沟通节奏。', value: expressionGap }] },
    { id: 'stability', name: '稳定与承诺', score: round(clamp(76 - securityGap * 0.58 + positive.length * 3 - conflict.length * 6)), summary: '比较双方稳定需求是否接近，以及跨盘冲害刑是否增加关系维护成本。', evidence: [{ id: 'compat:security-gap', label: `安全需求差${securityGap.toFixed(2)}`, detail: '差距较大时，双方对承诺和空间的解释可能不同。', value: securityGap }] },
    { id: 'autonomy', name: '自主与边界', score: round(clamp(80 - boundaryGap * 0.62 - conflict.length * 3 + Math.min(8, same * 0.18))), summary: '衡量双方能否在亲密与独立之间形成不靠控制维持的边界。', evidence: [{ id: 'compat:boundary-gap', label: `边界差${boundaryGap.toFixed(2)}`, detail: '差距越大，越需要提前约定联系频率、决策权和个人空间。', value: boundaryGap }] },
    { id: 'cooperation', name: '现实协作', score: round(clamp(52 + generating * 0.9 + positive.length * 4 - controlling * 0.45 - conflict.length * 4)), summary: '衡量资源、任务和长期生活安排能否形成有效协作。', evidence: [{ id: 'compat:interactions', label: `相生${generating}·相克${controlling}·同类${same}`, detail: '只记录结构互动，不直接判吉凶。' }] },
  ].sort((a, b) => b.score - a.score);
  const average = axes.reduce((sum, item) => sum + item.score, 0) / axes.length;
  const volatility = conflict.length * 4 + Math.max(expressionGap, securityGap, boundaryGap) * 0.18;
  const confidenceScore = round(clamp(average - volatility * 0.22 + Math.min(8, unique.length)));
  const strengths = axes.filter((item) => item.score >= 65).slice(0, 3).map((item) => `${item.name}较强：${item.summary}`);
  const tensions = axes.filter((item) => item.score < 58).slice(0, 3).map((item) => `${item.name}需要主动经营：${item.summary}`);
  if (conflict.length) tensions.push(`去重后检测到${conflict.length}种冲、刑、害或破，冲突重点应落实到具体角色与现实议题，而不是只贴“不合”标签。`);

  return {
    version: RELATIONSHIP_MODEL_VERSION,
    fingerprint: hash([leftChart.pillars.map((item) => item.ganZhi).join(''), rightChart.pillars.map((item) => item.ganZhi).join(''), axes.map((item) => `${item.id}${item.score}`).join('')]),
    headline: `${axes[0].name}是双方最强连接，${axes[axes.length - 1].name}是首要经营课题`,
    summary: `两张盘不是“合或不合”的二元判断。当前五轴平均分${average.toFixed(2)}，真正决定关系质量的是高分连接能否转化为日常行为，以及低分轴是否建立明确协议。`,
    confidence: confidence(confidenceScore),
    confidenceScore,
    axes,
    strengths: strengths.length ? strengths : ['当前没有单一压倒性优势，关系质量更依赖现实沟通与共同经历。'],
    tensions: tensions.length ? tensions.slice(0, 4) : ['当前没有单一压倒性结构冲突，仍需通过现实相处验证。'],
    agreements: [
      '明确联系频率、个人空间和冲突暂停机制。',
      '把金钱、家务、照料和长期计划写成双方都能执行的规则。',
      '发生分歧时区分价值观冲突、信息误解和资源分配，不把所有问题归因于感情。',
    ],
    crossRelations: relations,
    notes: [
      '合盘不使用生肖一票否决，也不把五行互补视为天生一对。',
      `评分按${unique.length}种唯一跨盘结构计算；完整账本保留全部${relations.length}个位置落点。`,
      '模型只比较结构机制；真实关系还取决于安全、尊重、沟通、共同目标和是否存在控制或伤害。',
    ],
  };
}

export function isValidCompatibility(value: CompatibilityAssessment): boolean {
  return value.axes.length === 5 && new Set(value.axes.map((item) => item.id)).size === 5 && value.axes.every((item) => Number.isFinite(item.score) && item.score >= 0 && item.score <= 100) && value.strengths.length > 0 && value.tensions.length > 0 && value.agreements.length > 0;
}
