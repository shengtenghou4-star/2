import type { DynamicsSnapshot, RegulationCandidate } from './dynamics';
import type { EnergyAssessment, EnergySnapshot, ElementEnergyRow } from './energy';
import type { EvidenceSnapshot, TenGodFamily } from './evidence';
import type { Element } from './foundations';
import type { InterpretationAssessment } from './interpretation-audited';
import type { StrengthAdjudication } from './strength-audited';
import type { TemporalPillar } from './timeline';

export const CAREER_MODEL_VERSION = 'MJ-C1.0.0';

export type CareerConfidence = '高' | '中' | '低';
export type CareerEvidenceKind = '能量' | '显隐' | '格局' | '制化' | '旺衰' | '岁运';
export type CareerRiskLevel = '低' | '中' | '高';

export interface CareerEvidenceRef {
  id: string;
  kind: CareerEvidenceKind;
  label: string;
  detail: string;
  value?: number;
}

export interface CareerModeDefinition {
  family: TenGodFamily;
  name: string;
  shortName: string;
  mechanism: string;
  environment: string[];
  contribution: string;
  caution: string;
}

export interface CareerModeScore {
  family: TenGodFamily;
  name: string;
  shortName: string;
  score: number;
  confidence: CareerConfidence;
  percentage: number;
  visibleRatio: number;
  natalRatio: number;
  contestedRatio: number;
  patternBonus: number;
  regulationBonus: number;
  carryingAdjustment: number;
  rank: number;
  evidence: CareerEvidenceRef[];
  counterEvidence: CareerEvidenceRef[];
  explanation: string;
}

export interface CareerEnvironmentFit {
  id: string;
  title: string;
  fit: '高匹配' | '中匹配' | '条件匹配';
  explanation: string;
  evidence: CareerEvidenceRef[];
}

export interface CareerRisk {
  id: string;
  title: string;
  level: CareerRiskLevel;
  explanation: string;
  mitigation: string;
  evidence: CareerEvidenceRef[];
}

export interface CareerPathway {
  id: string;
  title: string;
  status: '链条较齐' | '部分具备' | '待补桥梁';
  explanation: string;
  steps: string[];
  evidence: CareerEvidenceRef[];
}

export interface CareerTemporalSignal {
  id: string;
  title: string;
  direction: '增强' | '减弱' | '重排';
  explanation: string;
  evidence: CareerEvidenceRef[];
}

export interface CareerAssessment {
  version: string;
  fingerprint: string;
  headline: string;
  summary: string;
  confidence: CareerConfidence;
  confidenceScore: number;
  primaryMode: CareerModeScore;
  secondaryMode: CareerModeScore;
  modes: CareerModeScore[];
  environments: CareerEnvironmentFit[];
  risks: CareerRisk[];
  pathways: CareerPathway[];
  temporalSignals: CareerTemporalSignal[];
  notes: string[];
}

export interface BuildCareerAssessmentInput {
  natalNodes: TemporalPillar[];
  contextNodes: TemporalPillar[];
  natalEvidence: EvidenceSnapshot;
  currentEvidence: EvidenceSnapshot;
  natalDynamics: DynamicsSnapshot;
  currentDynamics: DynamicsSnapshot;
  natalStrength: StrengthAdjudication;
  currentStrength: StrengthAdjudication;
  interpretation: InterpretationAssessment;
  energy: EnergyAssessment;
}

const FAMILY_ORDER: TenGodFamily[] = ['印星', '食伤', '财星', '官杀', '比劫'];

export const CAREER_MODES: Record<TenGodFamily, CareerModeDefinition> = {
  印星: {
    family: '印星',
    name: '专业研究与知识体系',
    shortName: '专业研究',
    mechanism: '通过学习、抽象、认证、方法论和长期知识积累形成竞争力。',
    environment: ['允许深度学习与专业积累', '标准清楚且知识可沉淀', '重视资质、方法和长期信誉'],
    contribution: '适合把复杂问题整理成可复用的知识、框架、标准或专业判断。',
    caution: '需要防止长期吸收却迟迟不输出，或过度依赖既有权威与安全区。',
  },
  食伤: {
    family: '食伤',
    name: '表达创造与产品输出',
    shortName: '表达创造',
    mechanism: '通过表达、设计、技术输出、产品化和解决问题把内部能力转成外部成果。',
    environment: ['允许试验和迭代', '成果可以直接被看见或使用', '保留一定表达与方法自主权'],
    contribution: '适合把想法、技术或洞察转化成产品、内容、方案和可交付成果。',
    caution: '需要防止只追求表达快感而忽略规则、承载能力和商业闭环。',
  },
  财星: {
    family: '财星',
    name: '商业经营与资源配置',
    shortName: '商业经营',
    mechanism: '通过资源交换、客户需求、成本收益、执行和结果责任形成职业价值。',
    environment: ['目标和结果可衡量', '能够接触客户、预算或资源配置', '允许以效率和回报检验决策'],
    contribution: '适合把机会、资源和关系转化成可衡量的经营结果。',
    caution: '需要防止承担超过自身承载的资源责任，或只看短期结果而透支长期能力。',
  },
  官杀: {
    family: '官杀',
    name: '规则治理与责任推进',
    shortName: '规则治理',
    mechanism: '通过规则、责任、目标压力、组织协调和风险控制推动复杂事务落地。',
    environment: ['权责边界相对清楚', '目标严肃且需要可靠交付', '存在制度、合规或风险控制要求'],
    contribution: '适合承担责任、建立秩序、控制风险并在约束条件下推进目标。',
    caution: '需要防止长期处于高压和过度服从，或把规则本身误当成最终目的。',
  },
  比劫: {
    family: '比劫',
    name: '自主竞争与团队动员',
    shortName: '自主竞争',
    mechanism: '通过自主决策、竞争、同侪协作、谈判和团队动员形成行动力量。',
    environment: ['个人拥有明确责任区', '允许竞争、谈判和快速决策', '团队关系以共同目标而非纯层级维系'],
    contribution: '适合主动开局、争取资源、带动同类伙伴并在不确定环境中抢占位置。',
    caution: '需要防止边界冲突、资源争夺和在缺少规则时把竞争升级为内耗。',
  },
};

const FAMILY_RELATION_NAMES: Record<TenGodFamily, string[]> = {
  印星: ['官杀生印、印生身候选', '印制食伤候选'],
  食伤: ['食伤生财候选', '食伤制官杀候选'],
  财星: ['食伤生财候选', '财生官杀候选'],
  官杀: ['财生官杀候选', '官杀生印、印生身候选', '食伤制官杀候选'],
  比劫: ['比劫生食伤候选'],
};

function round(value: number, digits = 2): number {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function confidenceFromScore(score: number, evidenceCount: number, gap: number): CareerConfidence {
  if (score >= 72 && evidenceCount >= 3 && gap >= 8) return '高';
  if (score >= 52 && evidenceCount >= 2) return '中';
  return '低';
}

function simpleHash(parts: string[]): string {
  let hash = 2166136261;
  for (const character of parts.join('|')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `MC-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function rowForFamily(snapshot: EnergySnapshot, family: TenGodFamily): ElementEnergyRow {
  const row = snapshot.elements.find((item) => item.family === family);
  if (!row) throw new Error(`事业模型无法取得${family}能量分仓。`);
  return row;
}

function familyOfTenGod(tenGod: string): TenGodFamily {
  if (tenGod === '日主' || tenGod === '比肩' || tenGod === '劫财') return '比劫';
  if (tenGod === '正印' || tenGod === '偏印') return '印星';
  if (tenGod === '食神' || tenGod === '伤官') return '食伤';
  if (tenGod === '正财' || tenGod === '偏财') return '财星';
  return '官杀';
}

function energyRef(row: ElementEnergyRow, scope: '原局' | '当前'): CareerEvidenceRef {
  return {
    id: `career:energy:${scope}:${row.family}:${row.element}`,
    kind: '能量',
    label: `${row.element}${row.family} · ${row.percentage.toFixed(2)}%`,
    detail: `${scope}有效量${row.effectiveUnits.toFixed(2)}，显干${row.visibleUnits.toFixed(2)}，藏干${row.hiddenUnits.toFixed(2)}，争议量${row.contestedUnits.toFixed(2)}。`,
    value: row.percentage,
  };
}

function visibilityRef(row: ElementEnergyRow): CareerEvidenceRef {
  const ratio = row.effectiveUnits > 0 ? row.visibleUnits / row.effectiveUnits : 0;
  return {
    id: `career:visibility:${row.family}:${row.element}`,
    kind: '显隐',
    label: `${row.family}显性能量占${(ratio * 100).toFixed(2)}%`,
    detail: ratio >= 0.55
      ? '该能力轴较容易直接表达、被外部角色识别。'
      : ratio >= 0.25
        ? '该能力轴既有显性表达，也依赖内部积累或具体情境触发。'
        : '该能力轴更多潜藏在地支材料中，需要角色、平台或岁运引动后才容易外显。',
    value: round(ratio * 100),
  };
}

function patternFamily(input: BuildCareerAssessmentInput): TenGodFamily {
  return input.interpretation.pattern.leading.family;
}

function regulationMatches(family: TenGodFamily, dynamics: DynamicsSnapshot): RegulationCandidate[] {
  const names = new Set(FAMILY_RELATION_NAMES[family]);
  return dynamics.regulations.filter((item) => names.has(item.name) && item.status !== '材料不全');
}

function regulationRefs(items: RegulationCandidate[]): CareerEvidenceRef[] {
  return items.slice(0, 3).map((item) => ({
    id: `career:regulation:${item.id}`,
    kind: '制化',
    label: `${item.name} · ${item.status}`,
    detail: `${item.presentLabels.join('、') || '未见完整材料'}；${item.note}`,
    value: item.status === '显干链条齐备' ? 100 : 60,
  }));
}

function carryingAdjustment(family: TenGodFamily, strength: StrengthAdjudication): number {
  const support = strength.supportRatio;
  if (family === '财星' || family === '官杀') {
    if (support < 0.35) return -8;
    if (support < 0.45) return -4;
    if (support > 0.62) return 4;
  }
  if (family === '食伤') {
    if (support < 0.32) return -6;
    if (support > 0.68) return 3;
  }
  if (family === '印星') {
    if (support > 0.72) return -3;
    if (support < 0.4) return 5;
  }
  if (family === '比劫') {
    if (support > 0.72) return -4;
    if (support < 0.38) return 4;
  }
  return 0;
}

function strengthRef(family: TenGodFamily, strength: StrengthAdjudication, adjustment: number): CareerEvidenceRef {
  return {
    id: `career:strength:${family}:${strength.mode}`,
    kind: '旺衰',
    label: `${strength.leading.name} · 扶身${(strength.supportRatio * 100).toFixed(2)}%`,
    detail: adjustment > 0
      ? `${family}能力轴与当前承载方向相对协调，获得${adjustment}分修正。`
      : adjustment < 0
        ? `${family}能力轴虽然有材料，但当前承载条件形成${Math.abs(adjustment)}分折减。`
        : `${family}能力轴当前不因旺衰承载获得额外加减。`,
    value: adjustment,
  };
}

function scoreMode(
  family: TenGodFamily,
  input: BuildCareerAssessmentInput,
  snapshot: EnergySnapshot,
): Omit<CareerModeScore, 'rank' | 'confidence'> {
  const row = rowForFamily(snapshot, family);
  const definition = CAREER_MODES[family];
  const visibleRatio = row.effectiveUnits > 0 ? clamp(row.visibleUnits / row.effectiveUnits) : 0;
  const natalRatio = row.effectiveUnits > 0 ? clamp(row.natalUnits / row.effectiveUnits) : 0;
  const contestedRatio = row.effectiveUnits > 0 ? clamp(row.contestedUnits / row.effectiveUnits) : 0;
  const pattern = input.interpretation.pattern.leading;
  const patternBonus = patternFamily(input) === family
    ? round(7 + pattern.completeness * 8)
    : 0;
  const regulations = regulationMatches(family, input.currentDynamics);
  const regulationBonus = round(Math.min(12, regulations.reduce((sum, item) =>
    sum + (item.status === '显干链条齐备' ? 6 : 3.5), 0)));
  const carry = carryingAdjustment(family, input.currentStrength);
  const energyComponent = Math.min(52, row.percentage * 1.55);
  const visibilityComponent = visibleRatio * 14;
  const depthComponent = natalRatio * 8;
  const contestPenalty = contestedRatio * 12;
  const score = round(clamp((
    14 + energyComponent + visibilityComponent + depthComponent + patternBonus + regulationBonus + carry - contestPenalty
  ) / 100) * 100);

  const evidence: CareerEvidenceRef[] = [
    energyRef(row, snapshot.mode === '原局底盘' ? '原局' : '当前'),
    visibilityRef(row),
    strengthRef(family, input.currentStrength, carry),
    ...regulationRefs(regulations),
  ];
  if (patternFamily(input) === family) {
    evidence.push({
      id: `career:pattern:${pattern.id}:${family}`,
      kind: '格局',
      label: `${pattern.name} · ${pattern.status}`,
      detail: `月令格局来源属于${family}，完整度${(pattern.completeness * 100).toFixed(2)}%。${pattern.supports.join('；') || '当前未见额外辅助链。'}`,
      value: round(pattern.completeness * 100),
    });
  }
  const counterEvidence: CareerEvidenceRef[] = [];
  if (contestedRatio >= 0.2) {
    counterEvidence.push({
      id: `career:contest:${family}:${row.element}`,
      kind: '能量',
      label: `${family}有${(contestedRatio * 100).toFixed(2)}%处于关系争议`,
      detail: '合冲刑害触及会降低该能力轴的稳定可用性，因此不能只看表面占比。',
      value: round(contestedRatio * 100),
    });
  }
  if (patternFamily(input) === family && pattern.objections.length) {
    counterEvidence.push({
      id: `career:pattern-objection:${pattern.id}:${family}`,
      kind: '格局',
      label: `${pattern.name}存在反证`,
      detail: pattern.objections.slice(0, 3).join('；'),
      value: pattern.objections.length,
    });
  }

  return {
    family,
    name: definition.name,
    shortName: definition.shortName,
    score,
    percentage: row.percentage,
    visibleRatio: round(visibleRatio * 100),
    natalRatio: round(natalRatio * 100),
    contestedRatio: round(contestedRatio * 100),
    patternBonus,
    regulationBonus,
    carryingAdjustment: carry,
    evidence,
    counterEvidence,
    explanation: `${definition.mechanism}${definition.contribution}`,
  };
}

function rankModes(input: BuildCareerAssessmentInput, snapshot: EnergySnapshot): CareerModeScore[] {
  const draft = FAMILY_ORDER.map((family) => scoreMode(family, input, snapshot))
    .sort((left, right) => right.score - left.score || FAMILY_ORDER.indexOf(left.family) - FAMILY_ORDER.indexOf(right.family));
  return draft.map((item, index) => {
    const next = draft[index + 1];
    const gap = next ? item.score - next.score : item.score;
    return {
      ...item,
      rank: index + 1,
      confidence: confidenceFromScore(item.score, item.evidence.length, gap),
    };
  });
}

function environmentFits(primary: CareerModeScore, secondary: CareerModeScore): CareerEnvironmentFit[] {
  const first = CAREER_MODES[primary.family];
  const second = CAREER_MODES[secondary.family];
  const combined = pairEnvironment(primary.family, secondary.family);
  return [
    {
      id: `career:environment:primary:${primary.family}`,
      title: `${primary.shortName}主导环境`,
      fit: primary.confidence === '高' ? '高匹配' : '中匹配',
      explanation: `${first.environment.join('；')}。这些条件能让${first.shortName}从潜在能力变成稳定产出。`,
      evidence: primary.evidence.slice(0, 3),
    },
    {
      id: `career:environment:secondary:${secondary.family}`,
      title: `${secondary.shortName}协同环境`,
      fit: secondary.score >= 60 ? '高匹配' : '中匹配',
      explanation: `${second.environment.join('；')}。它不是替代主轴，而是提供第二种完成工作的机制。`,
      evidence: secondary.evidence.slice(0, 2),
    },
    {
      id: `career:environment:pair:${primary.family}:${secondary.family}`,
      title: combined.title,
      fit: combined.fit,
      explanation: combined.detail,
      evidence: [...primary.evidence.slice(0, 1), ...secondary.evidence.slice(0, 1)],
    },
  ];
}

function pairEnvironment(left: TenGodFamily, right: TenGodFamily): { title: string; fit: CareerEnvironmentFit['fit']; detail: string } {
  const key = [left, right].sort((a, b) => FAMILY_ORDER.indexOf(a) - FAMILY_ORDER.indexOf(b)).join('+');
  const pairs: Record<string, { title: string; fit: CareerEnvironmentFit['fit']; detail: string }> = {
    '印星+食伤': {
      title: '研究转化型岗位', fit: '高匹配',
      detail: '适合先形成专业判断，再把知识转化为产品、方案、教学、研究成果或技术输出；评价标准应同时看深度与交付。',
    },
    '印星+官杀': {
      title: '专业治理型岗位', fit: '高匹配',
      detail: '适合需要专业门槛、制度责任和风险判断的环境，例如标准制定、专业服务、研究治理或复杂项目管理机制。',
    },
    '食伤+财星': {
      title: '产品商业化岗位', fit: '高匹配',
      detail: '适合把创意、技术和解决方案直接连接客户、收入、效率或市场反馈，工作闭环越清楚越能发挥。',
    },
    '财星+官杀': {
      title: '经营管理型岗位', fit: '高匹配',
      detail: '适合同时承担资源结果和组织责任的角色，既要理解经营，也要建立流程、预算、风控和交付秩序。',
    },
    '食伤+官杀': {
      title: '创新受约束的复杂岗位', fit: '条件匹配',
      detail: '适合在明确目标和规则下解决新问题，但需要真实授权与清楚边界；否则容易形成表达方式与组织要求的摩擦。',
    },
    '比劫+食伤': {
      title: '自主创造型岗位', fit: '高匹配',
      detail: '适合拥有独立责任区、能够快速试错并以作品或成果说话的角色；需要基本资源与反馈机制避免单打独斗。',
    },
    '比劫+财星': {
      title: '开拓经营型岗位', fit: '条件匹配',
      detail: '适合主动争取客户、资源和交易机会，但必须建立所有权、分配和风险边界，避免竞争转化为内耗。',
    },
    '比劫+官杀': {
      title: '授权型领导岗位', fit: '条件匹配',
      detail: '适合责任清楚、授权真实的带队或攻坚角色；纯服从型环境会压制自主性，纯无规则环境又容易失控。',
    },
    '印星+财星': {
      title: '专业价值经营岗位', fit: '中匹配',
      detail: '适合把专业知识、数据、资质或方法论转化为客户价值和商业结果，需要明确从知识到收益的中间产品。',
    },
    '印星+比劫': {
      title: '独立专业型岗位', fit: '中匹配',
      detail: '适合以个人专业判断建立影响力，并在同侪合作或竞争中形成位置；需要避免闭门研究或过度维护自我边界。',
    },
  };
  return pairs[key] ?? {
    title: '双模式复合岗位',
    fit: '中匹配',
    detail: `适合同时调用${CAREER_MODES[left].shortName}与${CAREER_MODES[right].shortName}的复合职责，并通过清晰评价标准避免两种机制互相牵制。`,
  };
}

function buildRisks(input: BuildCareerAssessmentInput, modes: CareerModeScore[]): CareerRisk[] {
  const risks: CareerRisk[] = [];
  const primary = modes[0];
  const secondary = modes[1];
  const primaryDef = CAREER_MODES[primary.family];
  risks.push({
    id: `career:risk:primary:${primary.family}`,
    title: `${primary.shortName}过度使用`,
    level: primary.percentage >= 32 || primary.score >= 78 ? '中' : '低',
    explanation: primaryDef.caution,
    mitigation: `保留${secondary.shortName}作为第二工作机制，并为主轴设置可衡量的输出、反馈或边界。`,
    evidence: [...primary.evidence.slice(0, 2), ...primary.counterEvidence.slice(0, 1)],
  });

  const weakCarrying = input.currentStrength.supportRatio < 0.4;
  if (weakCarrying && (rowForFamily(input.energy.current, '财星').percentage >= 18 || rowForFamily(input.energy.current, '官杀').percentage >= 18)) {
    risks.push({
      id: 'career:risk:overload',
      title: '责任与资源负荷可能超过承载',
      level: input.currentStrength.supportRatio < 0.32 ? '高' : '中',
      explanation: '财星或官杀承担结果和责任，但当前扶身证据偏低。职业上容易表现为项目、客户、预算或组织压力集中到个人。',
      mitigation: '优先选择权责匹配、资源真实、可分阶段交付的角色；不要只凭职位级别或机会规模判断是否适合。',
      evidence: [
        energyRef(rowForFamily(input.energy.current, '财星'), '当前'),
        energyRef(rowForFamily(input.energy.current, '官杀'), '当前'),
        strengthRef('官杀', input.currentStrength, carryingAdjustment('官杀', input.currentStrength)),
      ],
    });
  }

  const output = rowForFamily(input.energy.current, '食伤');
  const authority = rowForFamily(input.energy.current, '官杀');
  if (output.percentage >= 18 && authority.percentage >= 18) {
    const hasControl = input.currentDynamics.regulations.some((item) =>
      item.name === '食伤制官杀候选' && item.status !== '材料不全');
    risks.push({
      id: 'career:risk:expression-authority',
      title: '表达创新与组织权威需要重新对齐',
      level: hasControl ? '中' : '高',
      explanation: hasControl
        ? '食伤与官杀同时有力，并出现制化材料。处理得当可形成解决复杂问题的能力，处理不当则容易与流程、上级或合规要求发生摩擦。'
        : '食伤与官杀同时较强，但制化链不完整。容易出现方法很强、组织接受度不足，或规则压力压制有效创新。',
      mitigation: '把反对意见转化为可验证方案、数据和风险控制，而不是只用表达强度对抗权威。',
      evidence: [energyRef(output, '当前'), energyRef(authority, '当前'), ...regulationRefs(regulationMatches('食伤', input.currentDynamics))],
    });
  }

  if (input.energy.current.contestedPercent >= 30) {
    risks.push({
      id: 'career:risk:volatility',
      title: '职业能力调用受关系冲突影响较大',
      level: input.energy.current.contestedPercent >= 50 ? '高' : '中',
      explanation: `当前${input.energy.current.contestedPercent.toFixed(2)}%的有效能量受到合冲刑害触及，意味着角色变化、组织关系或阶段环境会显著影响能力是否稳定发挥。`,
      mitigation: '优先确认岗位真实权限、资源来源和协作边界；避免只根据职位名称判断工作内容。',
      evidence: input.energy.current.contributions.filter((item) => item.contested).slice(0, 3).map((item) => ({
        id: `career:contested:${item.id}`,
        kind: '能量' as const,
        label: `${item.nodeLabel}${item.stem}${item.element}受关系触及`,
        detail: `${item.formula}；${item.relationNames.join('、')}`,
        value: item.effectiveUnits,
      })),
    });
  }

  return risks.slice(0, 4);
}

function pathwayStatus(regulation: RegulationCandidate | undefined): CareerPathway['status'] {
  if (!regulation) return '待补桥梁';
  return regulation.status === '显干链条齐备' ? '链条较齐' : '部分具备';
}

function buildPathways(input: BuildCareerAssessmentInput, modes: CareerModeScore[]): CareerPathway[] {
  const primary = modes[0];
  const secondary = modes[1];
  const results: CareerPathway[] = [];
  const pair = [primary.family, secondary.family];

  const candidateNames: Array<{ title: string; name: string; steps: string[]; detail: string }> = [];
  if (pair.includes('印星') && pair.includes('食伤')) {
    candidateNames.push({
      title: '从专业积累到可见产出', name: '印制食伤候选',
      steps: ['建立专业框架', '转化为产品／方案／表达', '用外部反馈修正知识体系'],
      detail: '关键不是只学习或只表达，而是形成知识—输出—反馈闭环。',
    });
  }
  if (pair.includes('食伤') && pair.includes('财星')) {
    candidateNames.push({
      title: '从能力输出到商业结果', name: '食伤生财候选',
      steps: ['形成可交付成果', '连接客户或真实需求', '建立收入／效率／资源回报闭环'],
      detail: '职业升级点在于把作品和能力转化为可衡量价值。',
    });
  }
  if (pair.includes('财星') && pair.includes('官杀')) {
    candidateNames.push({
      title: '从经营结果到组织责任', name: '财生官杀候选',
      steps: ['掌握资源与结果', '建立流程和风险控制', '承担更大范围的组织责任'],
      detail: '适合由业务或资源能力向管理、治理和责任范围升级。',
    });
  }
  if (pair.includes('官杀') && pair.includes('印星')) {
    candidateNames.push({
      title: '从责任压力到专业权威', name: '官杀生印、印生身候选',
      steps: ['接受明确责任', '形成专业判断与方法', '用专业能力承接并化解压力'],
      detail: '适合通过资格、知识和方法把外部压力转化为专业地位。',
    });
  }
  if (pair.includes('食伤') && pair.includes('官杀')) {
    candidateNames.push({
      title: '用创新解决高约束问题', name: '食伤制官杀候选',
      steps: ['识别规则与压力来源', '提出可验证的新方法', '以效果和风险控制获得组织接受'],
      detail: '适合复杂问题解决，但必须把表达转成可执行、可审计方案。',
    });
  }

  if (!candidateNames.length) {
    candidateNames.push({
      title: `${primary.shortName}向${secondary.shortName}的双轴发展`, name: '',
      steps: [`先稳定${primary.shortName}主轴`, `补足${secondary.shortName}能力`, '建立两种机制之间的可衡量闭环'],
      detail: `当前最优路径不是频繁换行业，而是让${primary.shortName}与${secondary.shortName}在同一职责链中协同。`,
    });
  }

  candidateNames.forEach((candidate, index) => {
    const regulation = candidate.name
      ? input.currentDynamics.regulations.find((item) => item.name === candidate.name)
      : undefined;
    results.push({
      id: `career:pathway:${index}:${primary.family}:${secondary.family}`,
      title: candidate.title,
      status: candidate.name ? pathwayStatus(regulation) : '部分具备',
      explanation: `${candidate.detail}${regulation ? ` 当前规则引擎判定为${regulation.status}。` : ' 当前没有单一传统制化链覆盖这组组合，按双轴能力路径处理。'}`,
      steps: candidate.steps,
      evidence: regulation ? regulationRefs([regulation]) : [...primary.evidence.slice(0, 1), ...secondary.evidence.slice(0, 1)],
    });
  });

  const weakBridge = modes.slice().sort((a, b) => a.score - b.score)[0];
  results.push({
    id: `career:pathway:bridge:${weakBridge.family}`,
    title: `补足${weakBridge.shortName}桥梁`,
    status: weakBridge.score < 42 ? '待补桥梁' : '部分具备',
    explanation: `${weakBridge.shortName}当前得分${weakBridge.score.toFixed(2)}。它未必需要成为主职业方向，但可能是把优势转化为稳定职业结果的短板。`,
    steps: [
      `识别工作中缺失的${weakBridge.shortName}环节`,
      '用流程、合作伙伴或工具补足，而非强迫自己全面转型',
      '观察补桥后主轴产出是否更稳定',
    ],
    evidence: weakBridge.evidence.slice(0, 2),
  });

  return results.slice(0, 3);
}

function buildTemporalSignals(
  input: BuildCareerAssessmentInput,
  natalModes: CareerModeScore[],
  currentModes: CareerModeScore[],
): CareerTemporalSignal[] {
  const signals: CareerTemporalSignal[] = [];
  const natalMap = new Map(natalModes.map((item) => [item.family, item]));
  const deltas = currentModes.map((mode) => ({
    mode,
    scoreDelta: round(mode.score - natalMap.get(mode.family)!.score),
    percentageDelta: round(mode.percentage - natalMap.get(mode.family)!.percentage),
  })).sort((left, right) => Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta));

  const biggest = deltas[0];
  if (biggest && Math.abs(biggest.scoreDelta) >= 2) {
    const direction = biggest.scoreDelta > 0 ? '增强' : '减弱';
    signals.push({
      id: `career:temporal:mode:${biggest.mode.family}`,
      title: `${biggest.mode.shortName}在当前岁运中${direction}`,
      direction,
      explanation: `${biggest.mode.shortName}得分相对原局${biggest.scoreDelta > 0 ? '+' : ''}${biggest.scoreDelta.toFixed(2)}，能量占比变化${biggest.percentageDelta > 0 ? '+' : ''}${biggest.percentageDelta.toFixed(2)}个百分点。当前阶段更容易通过这一机制获得机会或承受压力。`,
      evidence: biggest.mode.evidence.filter((item) => item.kind === '能量' || item.kind === '制化').slice(0, 3),
    });
  }

  if (natalModes[0].family !== currentModes[0].family) {
    signals.push({
      id: 'career:temporal:ranking-shift',
      title: '职业能力主轴发生阶段性重排',
      direction: '重排',
      explanation: `原局以${natalModes[0].shortName}为第一主轴，当前岁运转为${currentModes[0].shortName}。这表示阶段任务变化，不代表永久改变职业本质。`,
      evidence: [...natalModes[0].evidence.slice(0, 1), ...currentModes[0].evidence.slice(0, 2)],
    });
  }

  const temporalNodes = input.contextNodes.filter((item) => item.layer !== '原局');
  if (temporalNodes.length) {
    const visibleFamilies = temporalNodes.map((item) => familyOfTenGod(item.tenGod));
    const counts = new Map<TenGodFamily, number>();
    visibleFamilies.forEach((family) => counts.set(family, (counts.get(family) ?? 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const mode = currentModes.find((item) => item.family === top[0])!;
      signals.push({
        id: `career:temporal:visible:${top[0]}`,
        title: `${mode.shortName}被岁运显干重复引动`,
        direction: '增强',
        explanation: `${temporalNodes.filter((item) => familyOfTenGod(item.tenGod) === top[0]).map((item) => `${item.layer}·${item.label}${item.stem}${item.tenGod}`).join('、')}直接进入当前上下文，因此该能力轴更容易被外部任务看见。`,
        evidence: [{
          id: `career:temporal-visible-ref:${top[0]}`,
          kind: '岁运',
          label: `${top[0]}显干引动${top[1]}处`,
          detail: temporalNodes.filter((item) => familyOfTenGod(item.tenGod) === top[0]).map((item) => `${item.layer}·${item.label}${item.ganZhi}`).join('；'),
          value: top[1],
        }],
      });
    }
  }

  return signals.slice(0, 3);
}

function overallConfidence(modes: CareerModeScore[], risks: CareerRisk[]): { score: number; confidence: CareerConfidence } {
  const gap = modes[0].score - modes[1].score;
  const evidence = modes[0].evidence.length;
  const highRisks = risks.filter((item) => item.level === '高').length;
  const score = clamp((modes[0].score * 0.55 + gap * 1.8 + evidence * 3 - highRisks * 7) / 100) * 100;
  return {
    score: round(score),
    confidence: confidenceFromScore(score, evidence, gap),
  };
}

export function buildCareerAssessment(input: BuildCareerAssessmentInput): CareerAssessment {
  const natalModes = rankModes(input, input.energy.natal);
  const currentModes = rankModes(input, input.energy.current);
  const primary = currentModes[0];
  const secondary = currentModes[1];
  if (!primary || !secondary) throw new Error('事业模型无法形成前两项职业能力模式。');
  const environments = environmentFits(primary, secondary);
  const risks = buildRisks(input, currentModes);
  const pathways = buildPathways(input, currentModes);
  const temporalSignals = buildTemporalSignals(input, natalModes, currentModes);
  const overall = overallConfidence(currentModes, risks);
  const pair = pairEnvironment(primary.family, secondary.family);

  return {
    version: CAREER_MODEL_VERSION,
    fingerprint: simpleHash([
      input.natalNodes.map((item) => item.ganZhi).join(''),
      input.contextNodes.map((item) => item.ganZhi).join(''),
      currentModes.map((item) => `${item.family}${item.score}`).join(''),
      input.interpretation.pattern.leading.name,
    ]),
    headline: `${primary.shortName}为第一职业主轴，${secondary.shortName}为第二协同轴`,
    summary: `当前最适合的不是某个固定行业名称，而是${pair.title}：以${primary.shortName}完成主要价值创造，再由${secondary.shortName}补足组织、输出或商业闭环。${CAREER_MODES[primary.family].contribution}`,
    confidence: overall.confidence,
    confidenceScore: overall.score,
    primaryMode: primary,
    secondaryMode: secondary,
    modes: currentModes,
    environments,
    risks,
    pathways,
    temporalSignals,
    notes: [
      `${CAREER_MODEL_VERSION} 只判断职业能力机制、环境匹配和阶段变化，不根据八字直接指定唯一行业、公司或职位。`,
      '能力模式得分由五行有效占比、显隐比例、原局深度、格局来源、制化链、日主承载和争议能量共同计算。',
      '高分表示该工作机制更容易被调用，不等于现实技能已经训练完成；教育、经验、机会和个人选择仍然决定实际职业表现。',
      '岁运变化描述当前任务环境和能力调用方式，不改写原局长期职业底盘。',
    ],
  };
}

export function isValidCareerAssessment(assessment: CareerAssessment): boolean {
  const modeFamilies = assessment.modes.map((item) => item.family);
  return (
    Boolean(assessment.headline && assessment.summary && assessment.fingerprint) &&
    assessment.modes.length === 5 &&
    new Set(modeFamilies).size === 5 &&
    assessment.modes.every((item, index) =>
      item.rank === index + 1 &&
      Number.isFinite(item.score) &&
      item.score >= 0 && item.score <= 100 &&
      item.evidence.length > 0,
    ) &&
    assessment.primaryMode.family === assessment.modes[0].family &&
    assessment.secondaryMode.family === assessment.modes[1].family &&
    assessment.environments.length >= 3 &&
    assessment.risks.length > 0 &&
    assessment.pathways.length > 0 &&
    assessment.confidenceScore >= 0 && assessment.confidenceScore <= 100
  );
}
