import type { AnalysisBundle } from './analysis-bundle';
import type { BaziChart } from './bazi';
import type { LuckContext } from './context';
import type { ElementEnergyRow } from './energy';
import type { TenGodFamily } from './evidence';

export const WEALTH_MODEL_VERSION = 'MJ-W1.0.0';

export type WealthConfidence = '高' | '中' | '低';
export type WealthRiskLevel = '低' | '中' | '高';

export interface WealthEvidence {
  id: string;
  label: string;
  detail: string;
  value?: number;
}

export interface WealthAxis {
  id: 'creation' | 'capture' | 'retention' | 'scale' | 'resilience';
  name: string;
  score: number;
  confidence: WealthConfidence;
  summary: string;
  evidence: WealthEvidence[];
}

export interface WealthChannel {
  id: string;
  title: string;
  fit: '高匹配' | '中匹配' | '条件匹配';
  explanation: string;
  evidence: WealthEvidence[];
}

export interface WealthRisk {
  id: string;
  title: string;
  level: WealthRiskLevel;
  explanation: string;
  control: string;
  evidence: WealthEvidence[];
}

export interface WealthAssessment {
  version: string;
  fingerprint: string;
  headline: string;
  summary: string;
  confidence: WealthConfidence;
  confidenceScore: number;
  axes: WealthAxis[];
  channels: WealthChannel[];
  risks: WealthRisk[];
  temporalSignals: string[];
  notes: string[];
}

const round = (value: number, digits = 2) => {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
};
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function hash(parts: string[]): string {
  let value = 2166136261;
  for (const char of parts.join('|')) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return `MW-${(value >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function confidence(score: number, evidence: number): WealthConfidence {
  if (score >= 72 && evidence >= 3) return '高';
  if (score >= 48 && evidence >= 2) return '中';
  return '低';
}

function row(bundle: AnalysisBundle, family: TenGodFamily): ElementEnergyRow {
  const item = bundle.energy.current.elements.find((candidate) => candidate.family === family);
  if (!item) throw new Error(`财富模型缺少${family}能量分仓。`);
  return item;
}

function ev(item: ElementEnergyRow, label = item.family): WealthEvidence {
  return {
    id: `wealth:${item.family}:${item.element}:${label}`,
    label: `${item.element}${label} ${item.percentage.toFixed(2)}%`,
    detail: `有效量${item.effectiveUnits.toFixed(2)}，显干${item.visibleUnits.toFixed(2)}，藏干${item.hiddenUnits.toFixed(2)}，争议${item.contestedUnits.toFixed(2)}。`,
    value: item.percentage,
  };
}

function axis(
  id: WealthAxis['id'],
  name: string,
  score: number,
  summary: string,
  evidence: WealthEvidence[],
): WealthAxis {
  return { id, name, score: round(clamp(score)), confidence: confidence(score, evidence.length), summary, evidence };
}

export function buildWealthAssessment(chart: BaziChart, context: LuckContext, bundle: AnalysisBundle): WealthAssessment {
  const output = row(bundle, '食伤');
  const wealth = row(bundle, '财星');
  const authority = row(bundle, '官杀');
  const resource = row(bundle, '印星');
  const peers = row(bundle, '比劫');
  const support = bundle.currentStrength.supportRatio * 100;
  const contested = bundle.energy.current.contestedPercent;
  const creation = axis(
    'creation',
    '价值创造',
    18 + output.percentage * 1.55 + resource.percentage * 0.55 + (bundle.currentDynamics.regulations.some((item) => item.name === '食伤生财候选' && item.status !== '材料不全') ? 9 : 0) - output.contestedUnits / Math.max(1, output.effectiveUnits) * 9,
    '衡量能否把知识、技术、表达或解决方案转化为外部可用成果。',
    [ev(output, '食伤'), ev(resource, '印星')],
  );
  const capture = axis(
    'capture',
    '收入捕获',
    16 + wealth.percentage * 1.72 + output.percentage * 0.45 + (bundle.currentDynamics.regulations.some((item) => item.name === '食伤生财候选' && item.status !== '材料不全') ? 10 : 0) - (support < 38 ? 7 : 0),
    '衡量成果连接客户、交易、定价、收入或资源交换的能力。',
    [ev(wealth, '财星'), ev(output, '食伤')],
  );
  const retention = axis(
    'retention',
    '财富留存',
    22 + support * 0.42 + resource.percentage * 0.48 + authority.percentage * 0.25 - peers.percentage * 0.28 - contested * 0.22,
    '衡量收入能否通过纪律、边界、风险意识与长期积累沉淀下来。',
    [ev(resource, '印星'), ev(authority, '官杀'), ev(peers, '比劫')],
  );
  const scale = axis(
    'scale',
    '资源放大',
    14 + wealth.percentage * 0.88 + authority.percentage * 1.18 + peers.percentage * 0.35 + (bundle.currentDynamics.regulations.some((item) => item.name === '财生官杀候选' && item.status !== '材料不全') ? 9 : 0) - (support < 35 ? 9 : 0),
    '衡量能否从个人产出升级到预算、团队、资产、制度或更大责任范围。',
    [ev(wealth, '财星'), ev(authority, '官杀'), ev(peers, '比劫')],
  );
  const resilience = axis(
    'resilience',
    '抗波动能力',
    28 + bundle.energy.current.balanceScore * 0.48 + resource.percentage * 0.35 + support * 0.18 - contested * 0.42,
    '衡量财富结构面对收入波动、责任增加与关系冲突时的稳定性。',
    [ev(resource, '印星'), { id: 'wealth:balance', label: `五行均衡度 ${bundle.energy.current.balanceScore.toFixed(2)}`, detail: `争议能量${contested.toFixed(2)}%。`, value: bundle.energy.current.balanceScore }],
  );
  const axes = [creation, capture, retention, scale, resilience].sort((a, b) => b.score - a.score);

  const channels: WealthChannel[] = [
    {
      id: 'wealth:channel:skill',
      title: '专业与产品收入',
      fit: creation.score >= 70 ? '高匹配' : creation.score >= 50 ? '中匹配' : '条件匹配',
      explanation: '依靠专业知识、技术、内容、产品和解决方案创造可计价成果。适合先把能力标准化，再连接客户或组织需求。',
      evidence: creation.evidence,
    },
    {
      id: 'wealth:channel:business',
      title: '经营与交易收入',
      fit: capture.score >= 70 ? '高匹配' : capture.score >= 50 ? '中匹配' : '条件匹配',
      explanation: '依靠客户、项目、销售、资源配置、成本收益或交易闭环获得回报。关键是定价权和真实承载能力。',
      evidence: capture.evidence,
    },
    {
      id: 'wealth:channel:scale',
      title: '管理与资源放大',
      fit: scale.score >= 70 ? '高匹配' : scale.score >= 50 ? '中匹配' : '条件匹配',
      explanation: '依靠团队、制度、预算、资产或平台扩大结果。需要权责匹配，不能只追求名义规模。',
      evidence: scale.evidence,
    },
  ];

  const risks: WealthRisk[] = [];
  if (capture.score >= 60 && support < 40) {
    risks.push({
      id: 'wealth:risk:overload', title: '机会规模可能超过个人承载', level: support < 32 ? '高' : '中',
      explanation: '财星与收入捕获能力并不等于可以无限承担客户、债务、预算或项目责任。扶身偏低时，规模扩张更容易转化为现金流和精力压力。',
      control: '优先建立分阶段投入、止损、授权和现金储备，不以账面机会替代可兑现利润。', evidence: [ev(wealth), { id: 'wealth:support', label: `扶身${support.toFixed(2)}%`, detail: bundle.currentStrength.summary, value: support }],
    });
  }
  if (peers.percentage >= 22 && wealth.percentage >= 16) {
    risks.push({
      id: 'wealth:risk:allocation', title: '合作与分配边界需要前置', level: peers.percentage >= 30 ? '高' : '中',
      explanation: '同类竞争与财星同时有力时，财富问题容易出现在股权、分成、信用、朋友合作或资源归属，而不是单纯赚不到钱。',
      control: '把所有权、退出机制、贡献口径和资金权限写在关系之前。', evidence: [ev(peers), ev(wealth)],
    });
  }
  if (contested >= 30) {
    risks.push({
      id: 'wealth:risk:volatility', title: '财富可用性受关系冲突影响', level: contested >= 50 ? '高' : '中',
      explanation: `当前${contested.toFixed(2)}%有效能量受到合冲刑害触及，收入和资源状态可能对组织关系、合作方或阶段环境更敏感。`,
      control: '区分利润、现金流、合同权利和实际控制，不把短期到账视为稳定财富。', evidence: [{ id: 'wealth:contested', label: `争议能量${contested.toFixed(2)}%`, detail: '关系触及部分已经在能量模型中折减。', value: contested }],
    });
  }
  if (!risks.length) {
    risks.push({
      id: 'wealth:risk:generic', title: '当前未见单一压倒性的财富风险', level: '低',
      explanation: '风险较分散，重点应放在把高分能力轴转化为真实收入并持续记录现金流，而不是机械追求最弱五行。',
      control: '用真实收入、储蓄率、负债率和投资回撤校准模型。', evidence: [ev(wealth), { id: 'wealth:resilience', label: `抗波动${resilience.score.toFixed(2)}`, detail: resilience.summary, value: resilience.score }],
    });
  }

  const temporalSignals = bundle.energy.delta
    .slice()
    .sort((a, b) => Math.abs(b.percentagePointDelta) - Math.abs(a.percentagePointDelta))
    .slice(0, 2)
    .map((item) => `${item.element}由${item.natalPercentage.toFixed(2)}%变为${item.currentPercentage.toFixed(2)}%，${item.percentagePointDelta >= 0 ? '增加' : '减少'}${Math.abs(item.percentagePointDelta).toFixed(2)}个百分点。`);
  const confidenceScore = round(clamp(axes[0].score * 0.45 + axes[1].score * 0.25 + resilience.score * 0.2 + (100 - contested) * 0.1));

  return {
    version: WEALTH_MODEL_VERSION,
    fingerprint: hash([chart.pillars.map((item) => item.ganZhi).join(''), context.nodes.map((item) => item.ganZhi).join(''), axes.map((item) => `${item.id}${item.score}`).join('')]),
    headline: `${axes[0].name}是当前最强财富轴，${axes[1].name}提供第二支撑`,
    summary: `财富结构不只看财星多少。当前更应先用${axes[0].name}建立稳定结果，再通过${axes[1].name}形成收入、留存或规模闭环。`,
    confidence: confidence(confidenceScore, axes[0].evidence.length + axes[1].evidence.length),
    confidenceScore,
    axes,
    channels,
    risks: risks.slice(0, 4),
    temporalSignals,
    notes: [
      `${WEALTH_MODEL_VERSION} 分析价值创造、收入捕获、留存、规模和抗波动，不预测具体财富金额。`,
      '财富得分不替代真实现金流、资产负债表、税务、市场环境和投资风险评估。',
      '财星高不等于必然富有；能否创造、捕获、留存和承载必须分开判断。',
    ],
  };
}

export function isValidWealthAssessment(value: WealthAssessment): boolean {
  return value.axes.length === 5 && new Set(value.axes.map((item) => item.id)).size === 5 && value.axes.every((item) => Number.isFinite(item.score) && item.score >= 0 && item.score <= 100) && value.channels.length >= 3 && value.risks.length > 0 && value.confidenceScore >= 0 && value.confidenceScore <= 100;
}
