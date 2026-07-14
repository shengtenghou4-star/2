import {
  BRANCHES,
  STEM_META,
  controlledElement,
  controllerElement,
  generatedElement,
  generatorElement,
  type Element,
  type HiddenStemRank,
} from './foundations';
import type { EvidenceSnapshot, SeasonalState, TenGodFamily } from './evidence';
import type { ChartRelation } from './relations';
import type { PillarLayer, TemporalPillar } from './timeline';

export const ENERGY_MODEL_VERSION = 'MJ-E1.0.0';

export const ENERGY_MODEL = {
  pillarBaseUnits: 100,
  visibleStemShare: 0.4,
  branchReservoirShare: 0.6,
  hiddenShares: {
    1: [1],
    2: [0.7, 0.3],
    3: [0.6, 0.25, 0.15],
  } as Record<number, number[]>,
  natalPositionFactor: {
    年柱: 0.9,
    月柱: 1.15,
    日柱: 1.05,
    时柱: 0.9,
  } as Record<string, number>,
  layerFactor: {
    原局: 1,
    大运: 0.55,
    流年: 0.35,
    流月: 0.2,
  } as Record<PillarLayer, number>,
  seasonalFactor: {
    旺: 1.5,
    相: 1.25,
    休: 1,
    囚: 0.78,
    死: 0.6,
  } as Record<SeasonalState, number>,
  visibleRootActivation: {
    exactPerRoot: 0.06,
    sameElementPerRoot: 0.03,
    cap: 1.22,
  },
  hiddenRevealActivation: {
    exactStem: 1.12,
    sameElement: 1.05,
    none: 1,
  },
  stemRelationFactor: {
    五合: 0.88,
    相冲: 0.82,
    additionalTouch: 0.92,
    floor: 0.5,
  },
  branchRelationFactor: {
    六冲: 0.72,
    合会: 0.88,
    刑: 0.86,
    害破: 0.92,
    floor: 0.5,
  },
} as const;

export type EnergySourceType = '天干显能' | '地支藏能';
export type EnergyMode = '原局底盘' | '岁运叠加';

export interface EnergyFactorTrace {
  position: number;
  layer: number;
  season: number;
  activation: number;
  relation: number;
}

export interface EnergyContribution {
  id: string;
  nodeId: string;
  nodeLabel: string;
  layer: PillarLayer;
  sourceType: EnergySourceType;
  stem: string;
  branch?: string;
  rank?: HiddenStemRank;
  element: Element;
  tenGod: string;
  baseUnits: number;
  rawUnits: number;
  effectiveUnits: number;
  factors: EnergyFactorTrace;
  relationNames: string[];
  contested: boolean;
  formula: string;
  note: string;
}

export interface ElementEnergyRow {
  element: Element;
  family: TenGodFamily;
  rawUnits: number;
  effectiveUnits: number;
  percentage: number;
  visibleUnits: number;
  hiddenUnits: number;
  natalUnits: number;
  temporalUnits: number;
  contestedUnits: number;
}

export interface EnergyBalance {
  dayMasterElement: Element;
  sameElementUnits: number;
  resourceUnits: number;
  outputUnits: number;
  wealthUnits: number;
  officerUnits: number;
  supportUnits: number;
  oppositionUnits: number;
  supportPercent: number;
  oppositionPercent: number;
}

export interface EnergySnapshot {
  modelVersion: string;
  mode: EnergyMode;
  totalBaseUnits: number;
  totalRawUnits: number;
  totalEffectiveUnits: number;
  contestedUnits: number;
  contestedPercent: number;
  balanceScore: number;
  concentrationIndex: number;
  dominantElement: Element;
  weakestElement: Element;
  elements: ElementEnergyRow[];
  balance: EnergyBalance;
  contributions: EnergyContribution[];
  formula: string;
  notes: string[];
}

export interface EnergyDeltaRow {
  element: Element;
  natalPercentage: number;
  currentPercentage: number;
  percentagePointDelta: number;
  natalUnits: number;
  currentUnits: number;
  unitDelta: number;
}

export interface EnergyAssessment {
  modelVersion: string;
  natal: EnergySnapshot;
  current: EnergySnapshot;
  delta: EnergyDeltaRow[];
  notes: string[];
}

const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];
const ROUND = (value: number, digits = 4) => {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
};

function familyOfElement(dayMaster: Element, element: Element): TenGodFamily {
  if (element === dayMaster) return '比劫';
  if (element === generatorElement(dayMaster)) return '印星';
  if (element === generatedElement(dayMaster)) return '食伤';
  if (element === controlledElement(dayMaster)) return '财星';
  return '官杀';
}

function positionFactor(node: TemporalPillar): number {
  return node.layer === '原局' ? ENERGY_MODEL.natalPositionFactor[node.label] ?? 1 : 1;
}

function seasonalFactor(element: Element, evidence: EvidenceSnapshot): number {
  const state = evidence.monthCommand.elementStates.find((item) => item.element === element)?.state;
  if (!state) throw new Error(`能量模型无法取得${element}在月令中的旺相休囚死状态。`);
  return ENERGY_MODEL.seasonalFactor[state];
}

function hiddenShare(node: TemporalPillar, rankIndex: number): number {
  const shares = ENERGY_MODEL.hiddenShares[node.hiddenStems.length];
  if (!shares || shares.length !== node.hiddenStems.length) {
    throw new Error(`地支${node.branch}藏干数量异常：${node.hiddenStems.length}`);
  }
  return shares[rankIndex];
}

function stemRelation(node: TemporalPillar, relations: ChartRelation[]): { factor: number; names: string[] } {
  const touches = relations.filter((relation) =>
    relation.category === '天干' && relation.members.some((member) => member.id === node.id),
  );
  let factor = 1;
  if (touches.some((item) => item.type === '五合')) factor *= ENERGY_MODEL.stemRelationFactor.五合;
  if (touches.some((item) => item.type === '相冲')) factor *= ENERGY_MODEL.stemRelationFactor.相冲;
  if (touches.length > 1) factor *= ENERGY_MODEL.stemRelationFactor.additionalTouch;
  return {
    factor: Math.max(ENERGY_MODEL.stemRelationFactor.floor, factor),
    names: touches.map((item) => item.name),
  };
}

function branchRelation(node: TemporalPillar, relations: ChartRelation[]): { factor: number; names: string[] } {
  const touches = relations.filter((relation) =>
    relation.category !== '天干' && relation.members.some((member) => member.id === node.id),
  );
  let factor = 1;
  if (touches.some((item) => item.type === '六冲')) factor *= ENERGY_MODEL.branchRelationFactor.六冲;
  if (touches.some((item) => ['六合', '三合', '三会', '半合', '拱合'].includes(item.type))) {
    factor *= ENERGY_MODEL.branchRelationFactor.合会;
  }
  if (touches.some((item) => ['相刑', '三刑', '自刑'].includes(item.type))) {
    factor *= ENERGY_MODEL.branchRelationFactor.刑;
  }
  if (touches.some((item) => ['六害', '六破'].includes(item.type))) {
    factor *= ENERGY_MODEL.branchRelationFactor.害破;
  }
  return {
    factor: Math.max(ENERGY_MODEL.branchRelationFactor.floor, factor),
    names: touches.map((item) => item.name),
  };
}

function visibleActivation(node: TemporalPillar, evidence: EvidenceSnapshot): number {
  const summary = evidence.rootSummaries.find((item) => item.visibleId === node.id);
  if (!summary) return 1;
  return Math.min(
    ENERGY_MODEL.visibleRootActivation.cap,
    1 +
      summary.exactRoots * ENERGY_MODEL.visibleRootActivation.exactPerRoot +
      summary.sameElementRoots * ENERGY_MODEL.visibleRootActivation.sameElementPerRoot,
  );
}

function hiddenActivation(node: TemporalPillar, hiddenStem: string, hiddenElement: Element, nodes: TemporalPillar[]): number {
  const visibleNodes = nodes.filter((candidate) => candidate.id !== node.id || candidate.stem !== hiddenStem);
  if (visibleNodes.some((candidate) => candidate.stem === hiddenStem)) {
    return ENERGY_MODEL.hiddenRevealActivation.exactStem;
  }
  if (visibleNodes.some((candidate) => candidate.stemElement === hiddenElement)) {
    return ENERGY_MODEL.hiddenRevealActivation.sameElement;
  }
  return ENERGY_MODEL.hiddenRevealActivation.none;
}

function buildContribution(
  node: TemporalPillar,
  sourceType: EnergySourceType,
  stem: string,
  element: Element,
  tenGod: string,
  baseUnits: number,
  evidence: EvidenceSnapshot,
  relationFactor: number,
  relationNames: string[],
  activation: number,
  rank?: HiddenStemRank,
): EnergyContribution {
  const factors: EnergyFactorTrace = {
    position: positionFactor(node),
    layer: ENERGY_MODEL.layerFactor[node.layer],
    season: seasonalFactor(element, evidence),
    activation,
    relation: relationFactor,
  };
  const rawUnits = baseUnits * factors.position * factors.layer * factors.season;
  const effectiveUnits = rawUnits * factors.activation * factors.relation;
  const contested = relationNames.length > 0 || factors.relation < 1;
  return {
    id: `energy:${node.id}:${sourceType}:${stem}:${rank ?? 'visible'}`,
    nodeId: node.id,
    nodeLabel: node.label,
    layer: node.layer,
    sourceType,
    stem,
    branch: sourceType === '地支藏能' ? node.branch : undefined,
    rank,
    element,
    tenGod,
    baseUnits: ROUND(baseUnits),
    rawUnits: ROUND(rawUnits),
    effectiveUnits: ROUND(effectiveUnits),
    factors: {
      position: ROUND(factors.position),
      layer: ROUND(factors.layer),
      season: ROUND(factors.season),
      activation: ROUND(factors.activation),
      relation: ROUND(factors.relation),
    },
    relationNames,
    contested,
    formula: `${ROUND(baseUnits)} × ${ROUND(factors.position)} × ${ROUND(factors.layer)} × ${ROUND(factors.season)} × ${ROUND(factors.activation)} × ${ROUND(factors.relation)} = ${ROUND(effectiveUnits)}`,
    note: `${sourceType}以固定结构份额起算；月令、柱位、时间层、根透激活与关系可用性依次乘算。${relationNames.length ? ` 当前受${relationNames.join('、')}触及。` : ''}`,
  };
}

function normalizePercentages(rows: Array<{ element: Element; units: number }>): Record<Element, number> {
  const total = rows.reduce((sum, item) => sum + item.units, 0);
  if (!(total > 0)) throw new Error('五行有效能量总量必须大于零。');
  const percentages = rows.map((item) => ({ element: item.element, value: ROUND((item.units / total) * 100, 2) }));
  const residual = ROUND(100 - percentages.reduce((sum, item) => sum + item.value, 0), 2);
  const largest = percentages.reduce((best, item, index, array) => item.value > array[best].value ? index : best, 0);
  percentages[largest].value = ROUND(percentages[largest].value + residual, 2);
  return Object.fromEntries(percentages.map((item) => [item.element, item.value])) as Record<Element, number>;
}

function buildBalance(dayMaster: Element, rows: ElementEnergyRow[]): EnergyBalance {
  const units = Object.fromEntries(rows.map((row) => [row.element, row.effectiveUnits])) as Record<Element, number>;
  const sameElementUnits = units[dayMaster];
  const resourceUnits = units[generatorElement(dayMaster)];
  const outputUnits = units[generatedElement(dayMaster)];
  const wealthUnits = units[controlledElement(dayMaster)];
  const officerUnits = units[controllerElement(dayMaster)];
  const supportUnits = sameElementUnits + resourceUnits;
  const oppositionUnits = outputUnits + wealthUnits + officerUnits;
  const total = supportUnits + oppositionUnits;
  return {
    dayMasterElement: dayMaster,
    sameElementUnits: ROUND(sameElementUnits),
    resourceUnits: ROUND(resourceUnits),
    outputUnits: ROUND(outputUnits),
    wealthUnits: ROUND(wealthUnits),
    officerUnits: ROUND(officerUnits),
    supportUnits: ROUND(supportUnits),
    oppositionUnits: ROUND(oppositionUnits),
    supportPercent: total > 0 ? ROUND((supportUnits / total) * 100, 2) : 0,
    oppositionPercent: total > 0 ? ROUND((oppositionUnits / total) * 100, 2) : 0,
  };
}

export function buildEnergySnapshot(
  natalNodes: TemporalPillar[],
  nodes: TemporalPillar[],
  relations: ChartRelation[],
  evidence: EvidenceSnapshot,
): EnergySnapshot {
  const dayMaster = natalNodes[2];
  if (!dayMaster) throw new Error('原局缺少日柱，无法量化五行能量。');
  const contributions: EnergyContribution[] = [];

  nodes.forEach((node) => {
    const stemTouch = stemRelation(node, relations);
    contributions.push(buildContribution(
      node,
      '天干显能',
      node.stem,
      node.stemElement,
      node.tenGod,
      ENERGY_MODEL.pillarBaseUnits * ENERGY_MODEL.visibleStemShare,
      evidence,
      stemTouch.factor,
      stemTouch.names,
      visibleActivation(node, evidence),
    ));

    const branchTouch = branchRelation(node, relations);
    node.hiddenStems.forEach((hidden, index) => {
      const baseUnits = ENERGY_MODEL.pillarBaseUnits * ENERGY_MODEL.branchReservoirShare * hiddenShare(node, index);
      contributions.push(buildContribution(
        node,
        '地支藏能',
        hidden.stem,
        hidden.element,
        hidden.tenGod,
        baseUnits,
        evidence,
        branchTouch.factor,
        branchTouch.names,
        hiddenActivation(node, hidden.stem, hidden.element, nodes),
        hidden.rank,
      ));
    });
  });

  const grouped = ELEMENTS.map((element) => {
    const items = contributions.filter((item) => item.element === element);
    return {
      element,
      units: items.reduce((sum, item) => sum + item.effectiveUnits, 0),
      raw: items.reduce((sum, item) => sum + item.rawUnits, 0),
      visible: items.filter((item) => item.sourceType === '天干显能').reduce((sum, item) => sum + item.effectiveUnits, 0),
      hidden: items.filter((item) => item.sourceType === '地支藏能').reduce((sum, item) => sum + item.effectiveUnits, 0),
      natal: items.filter((item) => item.layer === '原局').reduce((sum, item) => sum + item.effectiveUnits, 0),
      temporal: items.filter((item) => item.layer !== '原局').reduce((sum, item) => sum + item.effectiveUnits, 0),
      contested: items.filter((item) => item.contested).reduce((sum, item) => sum + item.effectiveUnits, 0),
    };
  });
  const percentages = normalizePercentages(grouped.map((item) => ({ element: item.element, units: item.units })));
  const elements: ElementEnergyRow[] = grouped.map((item) => ({
    element: item.element,
    family: familyOfElement(dayMaster.stemElement, item.element),
    rawUnits: ROUND(item.raw),
    effectiveUnits: ROUND(item.units),
    percentage: percentages[item.element],
    visibleUnits: ROUND(item.visible),
    hiddenUnits: ROUND(item.hidden),
    natalUnits: ROUND(item.natal),
    temporalUnits: ROUND(item.temporal),
    contestedUnits: ROUND(item.contested),
  }));

  const totalBaseUnits = contributions.reduce((sum, item) => sum + item.baseUnits, 0);
  const totalRawUnits = contributions.reduce((sum, item) => sum + item.rawUnits, 0);
  const totalEffectiveUnits = contributions.reduce((sum, item) => sum + item.effectiveUnits, 0);
  const contestedUnits = contributions.filter((item) => item.contested).reduce((sum, item) => sum + item.effectiveUnits, 0);
  const shares = elements.map((item) => item.percentage / 100);
  const concentrationIndex = shares.reduce((sum, value) => sum + value ** 2, 0);
  const balanceScore = Math.max(0, Math.min(100, ((1 - concentrationIndex) / 0.8) * 100));
  const sorted = [...elements].sort((left, right) => right.effectiveUnits - left.effectiveUnits);

  return {
    modelVersion: ENERGY_MODEL_VERSION,
    mode: nodes.every((node) => node.layer === '原局') ? '原局底盘' : '岁运叠加',
    totalBaseUnits: ROUND(totalBaseUnits),
    totalRawUnits: ROUND(totalRawUnits),
    totalEffectiveUnits: ROUND(totalEffectiveUnits),
    contestedUnits: ROUND(contestedUnits),
    contestedPercent: totalEffectiveUnits > 0 ? ROUND((contestedUnits / totalEffectiveUnits) * 100, 2) : 0,
    balanceScore: ROUND(balanceScore, 2),
    concentrationIndex: ROUND(concentrationIndex, 4),
    dominantElement: sorted[0].element,
    weakestElement: sorted[sorted.length - 1].element,
    elements,
    balance: buildBalance(dayMaster.stemElement, elements),
    contributions: contributions.sort((left, right) => right.effectiveUnits - left.effectiveUnits),
    formula: '有效能量 = 每柱100结构单位 × 干支份额 × 柱位倍率 × 时间层倍率 × 月令倍率 × 根透激活倍率 × 关系可用倍率；五行百分比 = 该行有效能量 ÷ 全部有效能量。',
    notes: [
      `${ENERGY_MODEL_VERSION} 是命镜内部的可复算模型单位，不是物理能量，也不是传统命理各流派共同承认的唯一权重。`,
      '每柱固定100结构单位：天干40、地支60；地支藏干按一藏100%，二藏70/30，三藏60/25/15分仓。',
      '月令倍率采用旺1.50、相1.25、休1.00、囚0.78、死0.60；所有常数均版本化，改动必须触发回归测试。',
      '合冲刑害只折算“当前可用性”，不直接宣告合化、拔根或吉凶；受影响部分单列为争议能量。',
      '得根与透干只作用于对应显干或藏干的激活倍率，避免把同一份地支能量重复登记为独立能量。',
    ],
  };
}

export function buildEnergyAssessment(
  natalNodes: TemporalPillar[],
  contextNodes: TemporalPillar[],
  natalRelations: ChartRelation[],
  contextRelations: ChartRelation[],
  natalEvidence: EvidenceSnapshot,
  currentEvidence: EvidenceSnapshot,
): EnergyAssessment {
  const natal = buildEnergySnapshot(natalNodes, natalNodes, natalRelations, natalEvidence);
  const current = buildEnergySnapshot(natalNodes, contextNodes, contextRelations, currentEvidence);
  const delta = ELEMENTS.map((element) => {
    const natalRow = natal.elements.find((item) => item.element === element)!;
    const currentRow = current.elements.find((item) => item.element === element)!;
    return {
      element,
      natalPercentage: natalRow.percentage,
      currentPercentage: currentRow.percentage,
      percentagePointDelta: ROUND(currentRow.percentage - natalRow.percentage, 2),
      natalUnits: natalRow.effectiveUnits,
      currentUnits: currentRow.effectiveUnits,
      unitDelta: ROUND(currentRow.effectiveUnits - natalRow.effectiveUnits),
    };
  });
  return {
    modelVersion: ENERGY_MODEL_VERSION,
    natal,
    current,
    delta,
    notes: [
      '原局百分比描述出生结构；当前百分比描述所选大运、流年、流月叠加后的模型快照。',
      '百分比用于结构比较，具体模型单位用于追踪“多了多少、从哪里来、被什么关系折减”。',
    ],
  };
}

export function isValidEnergySnapshot(snapshot: EnergySnapshot): boolean {
  const percentageSum = ROUND(snapshot.elements.reduce((sum, item) => sum + item.percentage, 0), 2);
  return (
    snapshot.elements.length === 5 &&
    percentageSum === 100 &&
    snapshot.totalEffectiveUnits > 0 &&
    snapshot.contributions.length > 0 &&
    snapshot.contributions.every((item) =>
      Number.isFinite(item.baseUnits) &&
      Number.isFinite(item.rawUnits) &&
      Number.isFinite(item.effectiveUnits) &&
      item.baseUnits >= 0 &&
      item.rawUnits >= 0 &&
      item.effectiveUnits >= 0,
    ) &&
    BRANCHES.includes(snapshot.contributions.find((item) => item.branch)?.branch as typeof BRANCHES[number] ?? '子')
  );
}
