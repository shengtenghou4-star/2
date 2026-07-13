import type { DynamicsSnapshot } from './dynamics';
import type { EvidenceSnapshot } from './evidence';
import type { ChartRelation } from './relations';
import type { PillarLayer, TemporalPillar } from './timeline';

export type StrengthAxis = '扶身' | '耗泄克身' | '不确定';
export type StrengthConfidence = '高' | '中' | '低';
export type StrengthHypothesisName =
  | '身旺候选'
  | '偏强候选'
  | '中和候选'
  | '偏弱候选'
  | '身弱候选'
  | '从强候选'
  | '从弱候选';

export interface StrengthEvidenceItem {
  id: string;
  ruleId: string;
  axis: StrengthAxis;
  category: '月令' | '根气' | '显干' | '藏干' | '合冲修正' | '制化修正' | '重复引动';
  label: string;
  source: string;
  layer: PillarLayer | '原局总纲';
  baseWeight: number;
  factor: number;
  effectiveWeight: number;
  confidence: number;
  contested: boolean;
  explanation: string;
}

export interface StrengthHypothesis {
  id: string;
  name: StrengthHypothesisName;
  fit: number;
  supports: string[];
  objections: string[];
  blockers: string[];
  note: string;
}

export interface StrengthAdjudication {
  mode: '原局底盘' | '岁运叠加';
  supportTotal: number;
  oppositionTotal: number;
  uncertainTotal: number;
  supportRatio: number;
  balance: number;
  leading: StrengthHypothesis;
  confidence: StrengthConfidence;
  hypotheses: StrengthHypothesis[];
  evidence: StrengthEvidenceItem[];
  unresolved: string[];
  notes: string[];
}

interface AddEvidenceInput extends Omit<StrengthEvidenceItem, 'effectiveWeight'> {}

const ROUND = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const NATAL_POSITION_FACTOR: Record<string, number> = {
  年柱: 0.85,
  月柱: 1.2,
  日柱: 1.1,
  时柱: 0.95,
};

const TEMPORAL_POSITION_FACTOR: Record<PillarLayer, number> = {
  原局: 1,
  大运: 0.78,
  流年: 0.66,
  流月: 0.52,
};

const VISIBLE_FAMILY_WEIGHT: Record<string, number> = {
  比劫: 1.35,
  印星: 1.55,
  食伤: 1.05,
  财星: 0.95,
  官杀: 1.4,
};

const HIDDEN_FAMILY_WEIGHT: Record<string, number> = {
  比劫: 0,
  印星: 0.95,
  食伤: 0.68,
  财星: 0.62,
  官杀: 0.88,
};

const RANK_FACTOR: Record<string, number> = {
  本气: 1,
  中气: 0.62,
  余气: 0.38,
};

function familyOf(tenGod: string): '比劫' | '印星' | '食伤' | '财星' | '官杀' {
  if (tenGod === '日主' || tenGod === '比肩' || tenGod === '劫财') return '比劫';
  if (tenGod === '正印' || tenGod === '偏印') return '印星';
  if (tenGod === '食神' || tenGod === '伤官') return '食伤';
  if (tenGod === '正财' || tenGod === '偏财') return '财星';
  return '官杀';
}

function axisOfFamily(family: ReturnType<typeof familyOf>): StrengthAxis {
  return family === '比劫' || family === '印星' ? '扶身' : '耗泄克身';
}

function positionFactor(node: TemporalPillar): number {
  return node.layer === '原局'
    ? NATAL_POSITION_FACTOR[node.label] ?? 1
    : TEMPORAL_POSITION_FACTOR[node.layer];
}

function repetitionFactor(node: TemporalPillar, natalNodes: TemporalPillar[]): number {
  if (node.layer === '原局') return 1;
  const repeatsStem = natalNodes.some((item) => item.stem === node.stem);
  const repeatsBranch = natalNodes.some((item) => item.branch === node.branch);
  if (repeatsStem && repeatsBranch) return 1.2;
  if (repeatsStem || repeatsBranch) return 1.12;
  return 1;
}

function stemRelationFactor(node: TemporalPillar, relations: ChartRelation[]): { factor: number; names: string[] } {
  const touches = relations.filter((relation) =>
    relation.category === '天干' && relation.members.some((member) => member.id === node.id),
  );
  let factor = 1;
  if (touches.some((item) => item.type === '五合')) factor *= 0.78;
  if (touches.some((item) => item.type === '相冲')) factor *= 0.82;
  if (touches.length > 1) factor *= 0.88;
  return { factor: Math.max(0.48, factor), names: touches.map((item) => item.name) };
}

function branchRelationFactor(node: TemporalPillar, relations: ChartRelation[]): { factor: number; names: string[] } {
  const touches = relations.filter((relation) =>
    relation.category !== '天干' && relation.members.some((member) => member.id === node.id),
  );
  let factor = 1;
  if (touches.some((item) => item.type === '六冲')) factor *= 0.66;
  if (touches.some((item) => ['六合', '三合', '三会', '半合', '拱合'].includes(item.type))) factor *= 0.8;
  if (touches.some((item) => ['相刑', '三刑', '自刑'].includes(item.type))) factor *= 0.84;
  if (touches.some((item) => ['六害', '六破'].includes(item.type))) factor *= 0.9;
  return { factor: Math.max(0.45, factor), names: touches.map((item) => item.name) };
}

function addEvidence(target: StrengthEvidenceItem[], input: AddEvidenceInput): void {
  target.push({
    ...input,
    baseWeight: ROUND(input.baseWeight),
    factor: ROUND(input.factor),
    confidence: ROUND(input.confidence),
    effectiveWeight: ROUND(input.baseWeight * input.factor * input.confidence),
  });
}

function addSeasonEvidence(items: StrengthEvidenceItem[], evidence: EvidenceSnapshot): void {
  const state = evidence.monthCommand.dayMasterSeasonalState;
  const table: Record<string, { axis: StrengthAxis; weight: number; confidence: number }> = {
    旺: { axis: '扶身', weight: 4, confidence: 0.95 },
    相: { axis: '扶身', weight: 2.7, confidence: 0.9 },
    休: { axis: '不确定', weight: 0.7, confidence: 0.7 },
    囚: { axis: '耗泄克身', weight: 2.7, confidence: 0.9 },
    死: { axis: '耗泄克身', weight: 4, confidence: 0.95 },
  };
  const rule = table[state];
  addEvidence(items, {
    id: `strength:season:${evidence.monthCommand.id}`,
    ruleId: `STR-SEASON-${state}`,
    axis: rule.axis,
    category: '月令',
    label: `日主在${evidence.monthCommand.phase}为${state}`,
    source: `${evidence.monthCommand.monthBranch}月 · 本气${evidence.monthCommand.mainQiStem}`,
    layer: '原局总纲',
    baseWeight: rule.weight,
    factor: 1,
    confidence: rule.confidence,
    contested: state === '休',
    explanation: `旺相休囚死只提供季节总纲。${state === '休' ? '“休”按中性偏弱处理，不直接落入扶抑任一侧。' : '最终仍需根气、透干与合冲修正共同裁决。'}`,
  });
}

function addRootEvidence(items: StrengthEvidenceItem[], evidence: EvidenceSnapshot, nodes: TemporalPillar[]): void {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  evidence.dayMasterRoots.forEach((root) => {
    const node = nodesById.get(root.branchId);
    if (!node) return;
    const baseByRank = root.kind === '同干根'
      ? { 本气: 2.7, 中气: 1.75, 余气: 1.05 }
      : { 本气: 1.75, 中气: 1.12, 余气: 0.68 };
    const touch = branchRelationFactor(node, []);
    let relationFactor = 1;
    if (root.relationTouches.some((item) => item.type === '六冲')) relationFactor *= 0.66;
    if (root.relationTouches.some((item) => ['六合', '三合', '三会', '半合', '拱合'].includes(item.type))) relationFactor *= 0.8;
    if (root.relationTouches.some((item) => ['相刑', '三刑', '自刑'].includes(item.type))) relationFactor *= 0.84;
    if (root.relationTouches.some((item) => ['六害', '六破'].includes(item.type))) relationFactor *= 0.9;
    relationFactor = Math.max(0.45, relationFactor);
    const factor = positionFactor(node) * relationFactor;
    const touchNames = root.relationTouches.map((item) => item.name);
    addEvidence(items, {
      id: `strength:${root.id}`,
      ruleId: `STR-ROOT-${root.kind}-${root.rank}`,
      axis: '扶身',
      category: '根气',
      label: `${root.kind} · ${root.rank}`,
      source: `${root.branchLayer}·${root.branchLabel}${root.branch}藏${root.hiddenStem}`,
      layer: root.branchLayer,
      baseWeight: baseByRank[root.rank],
      factor,
      confidence: root.kind === '同干根' ? 0.95 : 0.78,
      contested: touchNames.length > 0,
      explanation: touchNames.length
        ? `${root.note} 该支同时被${touchNames.join('、')}触及，因此只折减可用性，不直接判作拔根。`
        : `${root.note} 当前未见已收录关系触及该根。`,
    });
    void touch;
  });
}

function addVisibleAndHiddenEvidence(
  items: StrengthEvidenceItem[],
  natalNodes: TemporalPillar[],
  nodes: TemporalPillar[],
  relations: ChartRelation[],
): void {
  const dayMaster = natalNodes[2];
  if (!dayMaster) throw new Error('原局缺少日柱，无法裁决力量。');

  nodes.forEach((node) => {
    if (!(node.layer === '原局' && node.label === '日柱')) {
      const family = familyOf(node.tenGod);
      const stemTouch = stemRelationFactor(node, relations);
      const repeat = repetitionFactor(node, natalNodes);
      const factor = positionFactor(node) * stemTouch.factor * repeat;
      addEvidence(items, {
        id: `strength:visible:${node.id}`,
        ruleId: `STR-VISIBLE-${family}`,
        axis: axisOfFamily(family),
        category: repeat > 1 ? '重复引动' : '显干',
        label: `${node.tenGod}透干`,
        source: `${node.layer}·${node.label}${node.stem}`,
        layer: node.layer,
        baseWeight: VISIBLE_FAMILY_WEIGHT[family],
        factor,
        confidence: 0.88,
        contested: stemTouch.names.length > 0,
        explanation: `${node.stem}为${node.tenGod}，按${family}进入${axisOfFamily(family)}侧。${repeat > 1 ? '与原局干支重复，作为时间层引动小幅放大。' : ''}${stemTouch.names.length ? ` 同时参与${stemTouch.names.join('、')}，已折减直接作用。` : ''}`,
      });
    }

    const branchTouch = branchRelationFactor(node, relations);
    node.hiddenStems.forEach((hidden) => {
      const family = familyOf(hidden.tenGod);
      if (family === '比劫') return; // 与日主同类的藏干已由根气账本承载，避免重复计入。
      const factor = positionFactor(node) * (RANK_FACTOR[hidden.rank] ?? 0.4) * branchTouch.factor;
      addEvidence(items, {
        id: `strength:hidden:${node.id}:${hidden.stem}`,
        ruleId: `STR-HIDDEN-${family}-${hidden.rank}`,
        axis: axisOfFamily(family),
        category: '藏干',
        label: `${hidden.tenGod}藏于${hidden.rank}`,
        source: `${node.layer}·${node.label}${node.branch}藏${hidden.stem}`,
        layer: node.layer,
        baseWeight: HIDDEN_FAMILY_WEIGHT[family],
        factor,
        confidence: hidden.rank === '本气' ? 0.75 : hidden.rank === '中气' ? 0.62 : 0.5,
        contested: branchTouch.names.length > 0,
        explanation: `${hidden.stem}${hidden.tenGod}只在${hidden.rank}出现，低于显干证据。${branchTouch.names.length ? ` 所在支参与${branchTouch.names.join('、')}，已折减可用性。` : ''}`,
      });
    });
  });
}

function addDynamicsModifiers(
  items: StrengthEvidenceItem[],
  natalNodes: TemporalPillar[],
  relations: ChartRelation[],
  dynamics: DynamicsSnapshot,
): void {
  const dayMaster = natalNodes[2];
  if (!dayMaster) return;

  dynamics.combines.forEach((candidate) => {
    const relation = relations.find((item) => item.id === candidate.relationId);
    if (!relation?.members.some((member) => member.id === dayMaster.id)) return;
    addEvidence(items, {
      id: `strength:combine:${candidate.id}`,
      ruleId: 'STR-MOD-DAYMASTER-COMBINE',
      axis: '不确定',
      category: '合冲修正',
      label: `日主参与${candidate.name}`,
      source: candidate.members.join(' ＋ '),
      layer: relation.scope === '原局' ? '原局' : '流年',
      baseWeight: candidate.candidate === '合化条件候选' ? 1.2 : 0.9,
      factor: candidate.candidate === '合绊与冲突并存' ? 0.75 : 1,
      confidence: 0.48,
      contested: true,
      explanation: `${candidate.candidate}只说明日主自身的独立作用可能被合绊或转化条件影响，当前不把它直接归入扶身或耗身。`,
    });
  });

  dynamics.clashes.forEach((candidate) => {
    const relation = relations.find((item) => item.id === candidate.relationId);
    if (!relation) return;
    const touchesDayBranch = relation.members.some((member) => member.id === dayMaster.id);
    if (!touchesDayBranch && candidate.touchedRootCount === 0) return;
    addEvidence(items, {
      id: `strength:clash:${candidate.id}`,
      ruleId: 'STR-MOD-ROOT-CLASH',
      axis: '不确定',
      category: '合冲修正',
      label: candidate.candidate,
      source: candidate.name,
      layer: relation.scope === '原局' ? '原局' : '流年',
      baseWeight: touchesDayBranch ? 1.1 : 0.75,
      factor: candidate.storehouseClash ? 1.05 : 1,
      confidence: 0.52,
      contested: true,
      explanation: `六冲触及日支或根气，只进入未决项；根气证据本身已经折减，此处不再次直接扣减扶身总量。`,
    });
  });

  const regulationAxis: Record<string, StrengthAxis> = {
    '官杀生印、印生身候选': '扶身',
    '食伤制官杀候选': '扶身',
    '印制食伤候选': '扶身',
    '食伤生财候选': '耗泄克身',
    '财生官杀候选': '耗泄克身',
  };
  const regulationWeight: Record<string, number> = {
    '官杀生印、印生身候选': 0.95,
    '食伤制官杀候选': 0.55,
    '印制食伤候选': 0.62,
    '食伤生财候选': 0.46,
    '财生官杀候选': 0.66,
  };

  dynamics.regulations.filter((item) => item.status !== '材料不全').forEach((item) => {
    addEvidence(items, {
      id: `strength:regulation:${item.id}`,
      ruleId: `STR-MOD-REGULATION-${item.type}`,
      axis: regulationAxis[item.name] ?? '不确定',
      category: '制化修正',
      label: item.name,
      source: `${item.chain.join(' → ')} · ${item.status}`,
      layer: item.scope === '原局' ? '原局' : '流年',
      baseWeight: regulationWeight[item.name] ?? 0.45,
      factor: item.status === '显干链条齐备' ? 1 : 0.72,
      confidence: item.status === '显干链条齐备' ? 0.52 : 0.34,
      contested: true,
      explanation: `${item.note} 本项属于二阶修正，权重和置信度均低于月令、根气与显干。`,
    });
  });

  dynamics.passages.filter((item) => item.status !== '通关元素未现').forEach((item) => {
    addEvidence(items, {
      id: `strength:passage:${item.id}`,
      ruleId: 'STR-MOD-PASSAGE-UNCERTAIN',
      axis: '不确定',
      category: '制化修正',
      label: `${item.sourceElement}→${item.mediatorElement}→${item.targetElement}通关候选`,
      source: item.status,
      layer: item.scope === '原局' ? '原局' : '流年',
      baseWeight: 0.38,
      factor: item.status === '显干通关材料齐备' ? 1 : 0.7,
      confidence: item.status === '显干通关材料齐备' ? 0.45 : 0.3,
      contested: true,
      explanation: `通关材料出现只增加未决性，不直接改变扶抑方向；需后续核验路径是否真正畅通。`,
    });
  });
}

function evidenceText(items: StrengthEvidenceItem[], axis: StrengthAxis, limit = 4): string[] {
  return items
    .filter((item) => item.axis === axis)
    .sort((left, right) => right.effectiveWeight - left.effectiveWeight)
    .slice(0, limit)
    .map((item) => `${item.label}（${item.source}，${item.effectiveWeight}证据单位）`);
}

function buildHypotheses(
  supportRatio: number,
  supportTotal: number,
  oppositionTotal: number,
  items: StrengthEvidenceItem[],
  evidence: EvidenceSnapshot,
): StrengthHypothesis[] {
  const supportTexts = evidenceText(items, '扶身');
  const opposeTexts = evidenceText(items, '耗泄克身');
  const monthState = evidence.monthCommand.dayMasterSeasonalState;
  const rootWeight = items.filter((item) => item.category === '根气').reduce((sum, item) => sum + item.effectiveWeight, 0);
  const visibleSupport = items.filter((item) => item.category === '显干' && item.axis === '扶身').length;
  const visibleOpposition = items.filter((item) => item.category === '显干' && item.axis === '耗泄克身').length;

  const definitions: Array<{ name: StrengthHypothesisName; target: number; kind: 'strong' | 'balanced' | 'weak' | 'follow-strong' | 'follow-weak' }> = [
    { name: '身旺候选', target: 0.76, kind: 'strong' },
    { name: '偏强候选', target: 0.62, kind: 'strong' },
    { name: '中和候选', target: 0.5, kind: 'balanced' },
    { name: '偏弱候选', target: 0.38, kind: 'weak' },
    { name: '身弱候选', target: 0.24, kind: 'weak' },
    { name: '从强候选', target: 0.93, kind: 'follow-strong' },
    { name: '从弱候选', target: 0.07, kind: 'follow-weak' },
  ];

  return definitions.map((definition) => {
    let fit = 1 - Math.abs(supportRatio - definition.target) / 0.5;
    const blockers: string[] = [];

    if (definition.kind === 'strong') {
      if (monthState === '旺' || monthState === '相') fit += 0.06;
      if (rootWeight >= 2) fit += 0.06;
      if (rootWeight < 0.6) fit -= 0.08;
    }
    if (definition.kind === 'weak') {
      if (monthState === '囚' || monthState === '死') fit += 0.06;
      if (rootWeight < 0.6) fit += 0.06;
      if (rootWeight >= 2) fit -= 0.1;
    }
    if (definition.kind === 'balanced') {
      fit += Math.abs(supportTotal - oppositionTotal) <= 1.2 ? 0.08 : -0.05;
    }
    if (definition.kind === 'follow-strong') {
      if (oppositionTotal > 1.7) blockers.push('耗泄克身证据仍有实际分量');
      if (visibleOpposition > 0) blockers.push('仍见耗泄克身五行透干');
      if (supportRatio < 0.84) blockers.push('扶身占比尚未达到极端一边倒');
      if (blockers.length) fit *= 0.35;
    }
    if (definition.kind === 'follow-weak') {
      if (supportTotal > 1.7) blockers.push('扶身证据仍有实际分量');
      if (visibleSupport > 0) blockers.push('仍见比劫或印星透干');
      if (evidence.dayMasterRoots.length > 0) blockers.push('日主仍见同干根或同类根');
      if (supportRatio > 0.16) blockers.push('扶身占比尚未达到极端一边倒');
      if (blockers.length) fit *= 0.35;
    }

    const strongSide = definition.kind === 'strong' || definition.kind === 'follow-strong';
    const weakSide = definition.kind === 'weak' || definition.kind === 'follow-weak';
    const supports = strongSide
      ? supportTexts
      : weakSide
        ? opposeTexts
        : [...supportTexts.slice(0, 2), ...opposeTexts.slice(0, 2)];
    const objections = strongSide
      ? opposeTexts
      : weakSide
        ? supportTexts
        : Math.abs(supportTotal - oppositionTotal) > 1.2
          ? [supportTotal > oppositionTotal ? '扶身侧明显领先，中和解释受到挑战。' : '耗泄克身侧明显领先，中和解释受到挑战。']
          : [];

    return {
      id: `hypothesis:${definition.name}`,
      name: definition.name,
      fit: ROUND(clamp(fit)),
      supports,
      objections,
      blockers,
      note: definition.kind.startsWith('follow')
        ? '从格必须满足极端一边倒且反向证据近乎消失；本项默认从严。'
        : '这是证据竞争中的候选解释，不是命理结论终局。',
    };
  }).sort((left, right) => right.fit - left.fit);
}

export function buildStrengthAdjudication(
  natalNodes: TemporalPillar[],
  contextNodes: TemporalPillar[],
  relations: ChartRelation[],
  evidence: EvidenceSnapshot,
  dynamics: DynamicsSnapshot,
): StrengthAdjudication {
  const items: StrengthEvidenceItem[] = [];
  addSeasonEvidence(items, evidence);
  addRootEvidence(items, evidence, contextNodes);
  addVisibleAndHiddenEvidence(items, natalNodes, contextNodes, relations);
  addDynamicsModifiers(items, natalNodes, relations, dynamics);

  const supportTotal = ROUND(items.filter((item) => item.axis === '扶身').reduce((sum, item) => sum + item.effectiveWeight, 0));
  const oppositionTotal = ROUND(items.filter((item) => item.axis === '耗泄克身').reduce((sum, item) => sum + item.effectiveWeight, 0));
  const uncertainTotal = ROUND(items.filter((item) => item.axis === '不确定').reduce((sum, item) => sum + item.effectiveWeight, 0));
  const directionalTotal = supportTotal + oppositionTotal;
  const supportRatio = directionalTotal > 0 ? ROUND(supportTotal / directionalTotal) : 0.5;
  const balance = ROUND(supportTotal - oppositionTotal);
  const hypotheses = buildHypotheses(supportRatio, supportTotal, oppositionTotal, items, evidence);
  const leading = hypotheses[0];
  if (!leading) throw new Error('力量候选生成失败。');
  const second = hypotheses[1];
  const gap = second ? leading.fit - second.fit : leading.fit;

  const unresolved = [
    ...dynamics.conflicts.map((item) => `${item.layer}·${item.label}同时参与${item.relationNames.join('、')}`),
    ...dynamics.combines.filter((item) => item.candidate !== '合绊候选').map((item) => `${item.name}仍处于${item.candidate}`),
    ...dynamics.clashes.filter((item) => item.touchedRootCount > 0).map((item) => `${item.name}触及${item.touchedRootCount}条根气证据`),
    ...dynamics.passages.filter((item) => item.status !== '通关元素未现').map((item) => `${item.sourceElement}→${item.mediatorElement}→${item.targetElement}为${item.status}`),
  ].filter((item, index, array) => array.indexOf(item) === index);

  const uncertaintyRatio = directionalTotal + uncertainTotal > 0 ? uncertainTotal / (directionalTotal + uncertainTotal) : 1;
  const confidence: StrengthConfidence = gap >= 0.18 && unresolved.length <= 1 && uncertaintyRatio < 0.12
    ? '高'
    : gap >= 0.08 && unresolved.length <= 5 && uncertaintyRatio < 0.25
      ? '中'
      : '低';

  return {
    mode: contextNodes.every((node) => node.layer === '原局') ? '原局底盘' : '岁运叠加',
    supportTotal,
    oppositionTotal,
    uncertainTotal,
    supportRatio,
    balance,
    leading,
    confidence,
    hypotheses,
    evidence: items.sort((left, right) => right.effectiveWeight - left.effectiveWeight),
    unresolved,
    notes: [
      '证据单位是规则引擎内部的相对量，只用于同一张盘内比较，不是假装客观物理测量。',
      '原局底盘与岁运叠加必须分开：岁运只能改变当前态，不能改写出生原局。',
      '月令、根气和显干是一阶证据；通关、制化、合绊与冲开属于低置信度二阶修正。',
      '从强、从弱候选采用从严阻断规则，只要反向透干、根气或反证仍明显，就不能轻易领先。',
    ],
  };
}
