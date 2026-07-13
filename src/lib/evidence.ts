import { STEM_META, type Element, type HiddenStemRank } from './foundations';
import type { ChartRelation } from './relations';
import type { PillarLayer, TemporalPillar } from './timeline';

export type SeasonalState = '旺' | '相' | '休' | '囚' | '死';
export type SeasonalPhase = '春木' | '夏火' | '秋金' | '冬水' | '四季土';
export type TenGodFamily = '比劫' | '印星' | '食伤' | '财星' | '官杀';
export type EvidenceScope = '原局' | '岁运介入';

export interface SeasonalElementState {
  element: Element;
  state: SeasonalState;
  isDayMaster: boolean;
}

export interface MonthCommandEvidence {
  id: string;
  monthBranch: string;
  phase: SeasonalPhase;
  monthElement: Element;
  mainQiStem: string;
  mainQiTenGod: string;
  hiddenStems: TemporalPillar['hiddenStems'];
  dayMasterStem: string;
  dayMasterElement: Element;
  dayMasterSeasonalState: SeasonalState;
  dayMasterGrowthStage: string;
  elementStates: SeasonalElementState[];
  note: string;
}

export interface RelationTouch {
  id: string;
  type: string;
  name: string;
  scope: EvidenceScope;
}

export interface RootEvidence {
  id: string;
  visibleId: string;
  visibleLabel: string;
  visibleLayer: PillarLayer;
  stem: string;
  stemElement: Element;
  branchId: string;
  branchLabel: string;
  branchLayer: PillarLayer;
  branch: string;
  hiddenStem: string;
  hiddenTenGod: string;
  rank: HiddenStemRank;
  kind: '同干根' | '同类根';
  scope: EvidenceScope;
  isDayMaster: boolean;
  relationTouches: RelationTouch[];
  note: string;
}

export interface RootSummary {
  visibleId: string;
  visibleLabel: string;
  visibleLayer: PillarLayer;
  stem: string;
  exactRoots: number;
  sameElementRoots: number;
  natalRoots: number;
  temporalRoots: number;
}

export interface RevealEvidence {
  id: string;
  branchId: string;
  branchLabel: string;
  branchLayer: PillarLayer;
  branch: string;
  hiddenStem: string;
  hiddenTenGod: string;
  rank: HiddenStemRank;
  visibleId: string;
  visibleLabel: string;
  visibleLayer: PillarLayer;
  visibleStem: string;
  kind: '藏干透出' | '同类显干';
  scope: EvidenceScope;
  note: string;
}

export interface TenGodFamilyLedger {
  family: TenGodFamily;
  action: string;
  visibleNatal: number;
  hiddenNatal: number;
  visibleTemporal: number;
  hiddenTemporal: number;
  total: number;
}

export interface EvidenceSnapshot {
  monthCommand: MonthCommandEvidence;
  roots: RootEvidence[];
  dayMasterRoots: RootEvidence[];
  rootSummaries: RootSummary[];
  reveals: RevealEvidence[];
  exactReveals: RevealEvidence[];
  familyLedger: TenGodFamilyLedger[];
  notes: string[];
}

const ELEMENT_ORDER: Element[] = ['木', '火', '土', '金', '水'];

const MONTH_PHASE: Record<string, SeasonalPhase> = {
  寅: '春木', 卯: '春木',
  巳: '夏火', 午: '夏火',
  申: '秋金', 酉: '秋金',
  亥: '冬水', 子: '冬水',
  辰: '四季土', 未: '四季土', 戌: '四季土', 丑: '四季土',
};

const SEASONAL_STATE: Record<SeasonalPhase, Record<Element, SeasonalState>> = {
  春木: { 木: '旺', 火: '相', 水: '休', 金: '囚', 土: '死' },
  夏火: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
  秋金: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
  冬水: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
  四季土: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
};

const FAMILY_ORDER: TenGodFamily[] = ['比劫', '印星', '食伤', '财星', '官杀'];

function tenGodFamily(tenGod: string): TenGodFamily {
  if (tenGod === '比肩' || tenGod === '劫财' || tenGod === '日主') return '比劫';
  if (tenGod === '正印' || tenGod === '偏印') return '印星';
  if (tenGod === '食神' || tenGod === '伤官') return '食伤';
  if (tenGod === '正财' || tenGod === '偏财') return '财星';
  return '官杀';
}

function familyAction(family: TenGodFamily): string {
  if (family === '比劫') return '与日主同类';
  if (family === '印星') return '生扶日主';
  if (family === '食伤') return '日主所生／泄出';
  if (family === '财星') return '日主所克／耗力';
  return '克制日主';
}

function scopeOf(...layers: PillarLayer[]): EvidenceScope {
  return layers.every((layer) => layer === '原局') ? '原局' : '岁运介入';
}

function relationTouches(node: TemporalPillar, relations: ChartRelation[]): RelationTouch[] {
  const seen = new Set<string>();
  return relations
    .filter((relation) => relation.category !== '天干' && relation.members.some((member) => member.id === node.id))
    .filter((relation) => {
      if (seen.has(relation.id)) return false;
      seen.add(relation.id);
      return true;
    })
    .map((relation) => ({ id: relation.id, type: relation.type, name: relation.name, scope: relation.scope }));
}

export function buildMonthCommandEvidence(natalNodes: TemporalPillar[]): MonthCommandEvidence {
  const month = natalNodes[1];
  const day = natalNodes[2];
  if (!month || !day) throw new Error('原局四柱不完整，无法建立月令证据。');

  const phase = MONTH_PHASE[month.branch];
  const states = SEASONAL_STATE[phase];
  const mainQi = month.hiddenStems[0];
  if (!phase || !states || !mainQi) throw new Error(`无法识别月支 ${month.branch} 的基础月令信息。`);

  return {
    id: `month-command:${month.id}`,
    monthBranch: month.branch,
    phase,
    monthElement: month.branchElement,
    mainQiStem: mainQi.stem,
    mainQiTenGod: mainQi.tenGod,
    hiddenStems: month.hiddenStems,
    dayMasterStem: day.stem,
    dayMasterElement: day.stemElement,
    dayMasterSeasonalState: states[day.stemElement],
    dayMasterGrowthStage: month.growthStage,
    elementStates: ELEMENT_ORDER.map((element) => ({
      element,
      state: states[element],
      isDayMaster: element === day.stemElement,
    })),
    note: '旺相休囚死采用季节基础表；辰戌丑未先归入四季土。此处只记录月令环境，不直接等同于最终身强身弱。',
  };
}

export function buildRootEvidence(nodes: TemporalPillar[], relations: ChartRelation[]): RootEvidence[] {
  const roots: RootEvidence[] = [];

  nodes.forEach((visible) => {
    nodes.forEach((branchNode) => {
      branchNode.hiddenStems.forEach((hidden) => {
        const exact = hidden.stem === visible.stem;
        const sameElement = hidden.element === visible.stemElement;
        if (!exact && !sameElement) return;

        const kind: RootEvidence['kind'] = exact ? '同干根' : '同类根';
        roots.push({
          id: `root:${visible.id}:${branchNode.id}:${hidden.stem}`,
          visibleId: visible.id,
          visibleLabel: visible.label,
          visibleLayer: visible.layer,
          stem: visible.stem,
          stemElement: visible.stemElement,
          branchId: branchNode.id,
          branchLabel: branchNode.label,
          branchLayer: branchNode.layer,
          branch: branchNode.branch,
          hiddenStem: hidden.stem,
          hiddenTenGod: hidden.tenGod,
          rank: hidden.rank,
          kind,
          scope: scopeOf(visible.layer, branchNode.layer),
          isDayMaster: visible.layer === '原局' && visible.label === '日柱',
          relationTouches: relationTouches(branchNode, relations),
          note: exact
            ? `${visible.stem}在${branchNode.branch}中见同干${hidden.stem}，按${hidden.rank}记录为同干根。`
            : `${visible.stem}与${branchNode.branch}中${hidden.stem}同属${visible.stemElement}，记录为同类根，不与同干根混同。`,
        });
      });
    });
  });

  return roots;
}

export function buildRevealEvidence(nodes: TemporalPillar[]): RevealEvidence[] {
  const reveals: RevealEvidence[] = [];

  nodes.forEach((branchNode) => {
    branchNode.hiddenStems.forEach((hidden) => {
      nodes.forEach((visible) => {
        const exact = hidden.stem === visible.stem;
        const sameElement = hidden.element === visible.stemElement;
        if (!exact && !sameElement) return;

        reveals.push({
          id: `reveal:${branchNode.id}:${hidden.stem}:${visible.id}`,
          branchId: branchNode.id,
          branchLabel: branchNode.label,
          branchLayer: branchNode.layer,
          branch: branchNode.branch,
          hiddenStem: hidden.stem,
          hiddenTenGod: hidden.tenGod,
          rank: hidden.rank,
          visibleId: visible.id,
          visibleLabel: visible.label,
          visibleLayer: visible.layer,
          visibleStem: visible.stem,
          kind: exact ? '藏干透出' : '同类显干',
          scope: scopeOf(branchNode.layer, visible.layer),
          note: exact
            ? `${branchNode.label}${branchNode.branch}所藏${hidden.stem}在${visible.layer}${visible.label}透出。`
            : `${branchNode.label}${branchNode.branch}所藏${hidden.stem}与${visible.layer}${visible.label}${visible.stem}同五行，但不是同一干。`,
        });
      });
    });
  });

  return reveals;
}

export function buildTenGodFamilyLedger(nodes: TemporalPillar[]): TenGodFamilyLedger[] {
  const ledger = Object.fromEntries(FAMILY_ORDER.map((family) => [family, {
    family,
    action: familyAction(family),
    visibleNatal: 0,
    hiddenNatal: 0,
    visibleTemporal: 0,
    hiddenTemporal: 0,
    total: 0,
  }])) as Record<TenGodFamily, TenGodFamilyLedger>;

  nodes.forEach((node) => {
    const visibleFamily = tenGodFamily(node.tenGod);
    if (node.layer === '原局') ledger[visibleFamily].visibleNatal += 1;
    else ledger[visibleFamily].visibleTemporal += 1;
    ledger[visibleFamily].total += 1;

    node.hiddenStems.forEach((hidden) => {
      const family = tenGodFamily(hidden.tenGod);
      if (node.layer === '原局') ledger[family].hiddenNatal += 1;
      else ledger[family].hiddenTemporal += 1;
      ledger[family].total += 1;
    });
  });

  return FAMILY_ORDER.map((family) => ledger[family]);
}

export function buildEvidenceSnapshot(
  natalNodes: TemporalPillar[],
  contextNodes: TemporalPillar[],
  relations: ChartRelation[],
): EvidenceSnapshot {
  const roots = buildRootEvidence(contextNodes, relations);
  const reveals = buildRevealEvidence(contextNodes);
  const dayMaster = natalNodes[2];
  if (!dayMaster) throw new Error('原局缺少日柱。');

  const rootSummaries = contextNodes.map((node) => {
    const matches = roots.filter((root) => root.visibleId === node.id);
    return {
      visibleId: node.id,
      visibleLabel: node.label,
      visibleLayer: node.layer,
      stem: node.stem,
      exactRoots: matches.filter((root) => root.kind === '同干根').length,
      sameElementRoots: matches.filter((root) => root.kind === '同类根').length,
      natalRoots: matches.filter((root) => root.branchLayer === '原局').length,
      temporalRoots: matches.filter((root) => root.branchLayer !== '原局').length,
    };
  });

  return {
    monthCommand: buildMonthCommandEvidence(natalNodes),
    roots,
    dayMasterRoots: roots.filter((root) => root.visibleId === dayMaster.id),
    rootSummaries,
    reveals,
    exactReveals: reveals.filter((reveal) => reveal.kind === '藏干透出'),
    familyLedger: buildTenGodFamilyLedger(contextNodes),
    notes: [
      '根气按同干根与同类根分开，本气／中气／余气只作为来源层级，不在本层折算分数。',
      '某根参与合冲刑害，只表示结构被触及，不等于根已经被拔除、冲散或合化。',
      '十神家族统计是出现次数，不是强弱权重，也不能单独推出身强身弱。',
    ],
  };
}
