import {
  controlledElement,
  controllerElement,
  generatedElement,
  generatorElement,
  type Element,
  type HiddenStemRank,
} from './foundations';
import type { DynamicsSnapshot } from './dynamics';
import type { EvidenceSnapshot, SeasonalState, TenGodFamily } from './evidence';
import type { ChartRelation } from './relations';
import type { StrengthAdjudication, StrengthHypothesisName } from './strength';
import type { TemporalPillar } from './timeline';

export type PatternStatus = '月令名义候选' | '结构候选' | '透干条件较齐' | '冲突明显';
export type ConditionState = '具备' | '部分具备' | '未见' | '冲突';
export type ClimateAvailability = '显干可见' | '仅藏干' | '未见';
export type TrackRelation = '方向一致' | '方向冲突' | '彼此独立';

export interface InterpretationCondition {
  id: string;
  label: string;
  state: ConditionState;
  detail: string;
}

export interface PatternCandidate {
  id: string;
  name: string;
  tenGod: string;
  family: TenGodFamily;
  sourceStem: string;
  sourceRank: HiddenStemRank;
  sourceElement: Element;
  primary: boolean;
  seasonalState: SeasonalState;
  natalExactRevealCount: number;
  temporalExactRevealCount: number;
  sameFamilyVisibleCount: number;
  completeness: number;
  status: PatternStatus;
  supports: string[];
  objections: string[];
  conditions: InterpretationCondition[];
  note: string;
}

export interface PatternAssessment {
  monthBranch: string;
  leading: PatternCandidate;
  candidates: PatternCandidate[];
  notes: string[];
}

export interface ElementAvailability {
  element: Element;
  status: ClimateAvailability;
  visibleCount: number;
  hiddenCount: number;
  sources: string[];
}

export interface ClimateNeed {
  id: string;
  element: Element;
  issues: Array<'寒' | '热' | '燥' | '湿'>;
  role: string;
  priority: '主要' | '次要';
  natal: ElementAvailability;
  current: ElementAvailability;
  temporalAdded: boolean;
  note: string;
}

export interface ClimateAssessment {
  monthBranch: string;
  profile: string;
  issues: Array<'寒' | '热' | '燥' | '湿'>;
  needs: ClimateNeed[];
  notes: string[];
}

export interface SupportBalanceElement {
  element: Element;
  role: string;
  priority: '主要' | '次要' | '观察';
  direction: '扶身' | '泄身' | '耗身' | '制身';
  note: string;
}

export interface SupportBalanceTrack {
  mode: '原局底盘' | '岁运叠加';
  leading: StrengthHypothesisName;
  orientation: '宜扶候选' | '宜泄耗制候选' | '中和观察' | '从势审查';
  elements: SupportBalanceElement[];
  note: string;
}

export interface TrackComparison {
  id: string;
  climateElement: Element;
  climateRole: string;
  supportBalanceRelation: TrackRelation;
  detail: string;
}

export interface InterpretationAssessment {
  pattern: PatternAssessment;
  climate: ClimateAssessment;
  natalSupportBalance: SupportBalanceTrack;
  currentSupportBalance: SupportBalanceTrack;
  comparisons: TrackComparison[];
  notes: string[];
}

const STORAGE_BRANCHES = new Set(['辰', '戌', '丑', '未']);
const STRONG_NAMES = new Set<StrengthHypothesisName>(['身旺候选', '偏强候选', '从强候选']);
const WEAK_NAMES = new Set<StrengthHypothesisName>(['身弱候选', '偏弱候选', '从弱候选']);

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function familyOf(tenGod: string): TenGodFamily {
  if (tenGod === '比肩' || tenGod === '劫财' || tenGod === '日主') return '比劫';
  if (tenGod === '正印' || tenGod === '偏印') return '印星';
  if (tenGod === '食神' || tenGod === '伤官') return '食伤';
  if (tenGod === '正财' || tenGod === '偏财') return '财星';
  return '官杀';
}

function patternName(tenGod: string, monthBranch: string): string {
  const prefix = STORAGE_BRANCHES.has(monthBranch) ? '杂气' : '';
  if (tenGod === '比肩') return `${prefix}建禄格候选`;
  if (tenGod === '劫财') return `${prefix}月劫／月刃格候选`;
  return `${prefix}${tenGod}格候选`;
}

function familyVisibleCount(nodes: TemporalPillar[], family: TenGodFamily): number {
  return nodes.filter((node) => familyOf(node.tenGod) === family).length;
}

function relationNamesForMonth(month: TemporalPillar, relations: ChartRelation[]): string[] {
  return relations
    .filter((relation) => relation.members.some((member) => member.id === month.id))
    .map((relation) => relation.name);
}

function hasRegulation(dynamics: DynamicsSnapshot, name: string): boolean {
  return dynamics.regulations.some((item) => item.name === name && item.status !== '材料不全');
}

function patternSupportsAndObjections(
  tenGod: string,
  evidence: EvidenceSnapshot,
  dynamics: DynamicsSnapshot,
): { supports: string[]; objections: string[] } {
  const ledger = new Map(evidence.familyLedger.map((item) => [item.family, item]));
  const visible = (family: TenGodFamily) => (ledger.get(family)?.visibleNatal ?? 0) > 0;
  const supports: string[] = [];
  const objections: string[] = [];

  if (tenGod === '正官') {
    if (hasRegulation(dynamics, '财生官杀候选')) supports.push('财星生官材料出现');
    if (hasRegulation(dynamics, '官杀生印、印生身候选')) supports.push('官印相生材料出现');
    if (visible('食伤')) objections.push('食伤透出，需核验伤官见官与制化');
    if ((ledger.get('官杀')?.visibleNatal ?? 0) > 1) objections.push('官杀多见，存在混杂审查');
  } else if (tenGod === '七杀') {
    if (hasRegulation(dynamics, '食伤制官杀候选')) supports.push('食伤制杀材料出现');
    if (hasRegulation(dynamics, '官杀生印、印生身候选')) supports.push('杀印相生材料出现');
    if ((ledger.get('官杀')?.visibleNatal ?? 0) > 1) objections.push('官杀多见，存在混杂审查');
    if (hasRegulation(dynamics, '财生官杀候选')) objections.push('财生杀材料同时存在，需核验是否助杀过度');
  } else if (tenGod === '正财' || tenGod === '偏财') {
    if (hasRegulation(dynamics, '食伤生财候选')) supports.push('食伤生财材料出现');
    if (visible('官杀')) supports.push('财官承接材料可见');
    if (visible('比劫')) objections.push('比劫透出，存在夺财或分财审查');
  } else if (tenGod === '食神') {
    if (hasRegulation(dynamics, '食伤生财候选')) supports.push('食神生财材料出现');
    if (visible('财星')) supports.push('财星承接泄秀材料可见');
    if (visible('印星')) objections.push('印星透出，需核验枭印夺食或护身');
  } else if (tenGod === '伤官') {
    if (hasRegulation(dynamics, '食伤生财候选')) supports.push('伤官生财材料出现');
    if (hasRegulation(dynamics, '印制食伤候选')) supports.push('伤官配印材料出现');
    if (visible('官杀')) objections.push('官杀透出，需核验伤官见官与制化');
  } else if (tenGod === '正印' || tenGod === '偏印') {
    if (hasRegulation(dynamics, '官杀生印、印生身候选')) supports.push('官杀生印材料出现');
    if (visible('比劫')) supports.push('印比承接材料可见');
    if (visible('财星')) objections.push('财星透出，需核验财坏印或财印两停');
    if (tenGod === '偏印' && visible('食伤')) objections.push('食伤透出，需核验枭印夺食');
  } else {
    if (visible('食伤')) supports.push('食伤泄秀材料可见');
    if (visible('官杀')) supports.push('官杀制比劫材料可见');
    if (visible('财星')) objections.push('财星透出时需核验比劫夺财');
  }

  return { supports, objections };
}

export function buildPatternAssessment(
  natalNodes: TemporalPillar[],
  contextNodes: TemporalPillar[],
  natalRelations: ChartRelation[],
  contextRelations: ChartRelation[],
  natalEvidence: EvidenceSnapshot,
  natalDynamics: DynamicsSnapshot,
): PatternAssessment {
  const month = natalNodes[1];
  if (!month) throw new Error('原局缺少月柱，无法建立格局候选。');
  const monthRelations = relationNamesForMonth(month, natalRelations);
  const currentMonthRelations = relationNamesForMonth(month, contextRelations);
  const newTemporalRelations = currentMonthRelations.filter((name) => !monthRelations.includes(name));

  const candidates = month.hiddenStems.map((hidden, index) => {
    const family = familyOf(hidden.tenGod);
    const natalExactRevealCount = natalNodes.filter((node) => node.id !== natalNodes[2]?.id && node.stem === hidden.stem).length;
    const temporalExactRevealCount = contextNodes.filter((node) => node.layer !== '原局' && node.stem === hidden.stem).length;
    const sameFamilyVisibleCount = familyVisibleCount(natalNodes.filter((node) => node.id !== natalNodes[2]?.id), family);
    const seasonalState = natalEvidence.monthCommand.elementStates.find((item) => item.element === hidden.element)?.state ?? '休';
    const structure = patternSupportsAndObjections(hidden.tenGod, natalEvidence, natalDynamics);
    const objections = [...structure.objections];
    if (monthRelations.length) objections.push(`月支同时参与${monthRelations.join('、')}`);
    if (newTemporalRelations.length) objections.push(`岁运新增触及月支：${newTemporalRelations.join('、')}`);

    const rankBase: Record<HiddenStemRank, number> = { 本气: 0.5, 中气: 0.31, 余气: 0.2 };
    let completeness = rankBase[hidden.rank];
    if (natalExactRevealCount > 0) completeness += 0.22;
    else if (sameFamilyVisibleCount > 0) completeness += 0.08;
    if (seasonalState === '旺' || seasonalState === '相') completeness += 0.1;
    if (structure.supports.length) completeness += Math.min(0.12, structure.supports.length * 0.06);
    completeness -= Math.min(0.24, objections.length * 0.06);
    completeness = round(clamp(completeness));

    const conflictCount = objections.length;
    const status: PatternStatus = conflictCount >= 3
      ? '冲突明显'
      : natalExactRevealCount > 0 && structure.supports.length > 0
        ? '透干条件较齐'
        : natalExactRevealCount > 0 || structure.supports.length > 0 || sameFamilyVisibleCount > 0
          ? '结构候选'
          : '月令名义候选';

    const conditions: InterpretationCondition[] = [
      {
        id: `pattern:${month.id}:${hidden.stem}:month`,
        label: '月令来源',
        state: hidden.rank === '本气' ? '具备' : '部分具备',
        detail: `${month.branch}月藏${hidden.stem}${hidden.tenGod}，位于${hidden.rank}。`,
      },
      {
        id: `pattern:${month.id}:${hidden.stem}:reveal`,
        label: '原局透干',
        state: natalExactRevealCount > 0 ? '具备' : sameFamilyVisibleCount > 0 ? '部分具备' : '未见',
        detail: natalExactRevealCount > 0
          ? `${hidden.stem}在原局非日干位置透出${natalExactRevealCount}处。`
          : sameFamilyVisibleCount > 0
            ? `同十神家族显干${sameFamilyVisibleCount}处，但不是月令藏干${hidden.stem}直接透出。`
            : `月令藏干${hidden.stem}未在原局非日干位置透出。`,
      },
      {
        id: `pattern:${month.id}:${hidden.stem}:season`,
        label: '格神得时',
        state: seasonalState === '旺' || seasonalState === '相' ? '具备' : seasonalState === '休' ? '部分具备' : '未见',
        detail: `${hidden.element}在${natalEvidence.monthCommand.phase}基础表中为${seasonalState}。`,
      },
      {
        id: `pattern:${month.id}:${hidden.stem}:support`,
        label: '成格辅助',
        state: structure.supports.length ? '具备' : '未见',
        detail: structure.supports.length ? structure.supports.join('；') : '当前未见本规则库覆盖的典型辅助链。',
      },
      {
        id: `pattern:${month.id}:${hidden.stem}:conflict`,
        label: '破格／混杂审查',
        state: objections.length ? '冲突' : '未见',
        detail: objections.length ? objections.join('；') : '当前未见本规则库覆盖的明显冲突。',
      },
      {
        id: `pattern:${month.id}:${hidden.stem}:temporal`,
        label: '岁运透出',
        state: temporalExactRevealCount > 0 ? '部分具备' : '未见',
        detail: temporalExactRevealCount > 0
          ? `${hidden.stem}在当前大运／流年／流月透出${temporalExactRevealCount}处，只作引动，不改写原局格局。`
          : '当前岁运未新增该月令藏干透出。',
      },
    ];

    return {
      id: `pattern:${month.id}:${hidden.stem}`,
      name: patternName(hidden.tenGod, month.branch),
      tenGod: hidden.tenGod,
      family,
      sourceStem: hidden.stem,
      sourceRank: hidden.rank,
      sourceElement: hidden.element,
      primary: index === 0,
      seasonalState,
      natalExactRevealCount,
      temporalExactRevealCount,
      sameFamilyVisibleCount,
      completeness,
      status,
      supports: structure.supports,
      objections,
      conditions,
      note: '完整度只用于同月令候选排序，不是成格概率；格局仍需旺衰、制化、清纯与岁运应验共同复核。',
    };
  }).sort((left, right) => right.completeness - left.completeness);

  const leading = candidates[0];
  if (!leading) throw new Error('月令没有可用藏干，无法生成格局候选。');
  return {
    monthBranch: month.branch,
    leading,
    candidates,
    notes: [
      '格局候选只由原局月令建立；大运、流年、流月只能引动、暴露或冲击，不改写出生格局来源。',
      '辰戌丑未按杂气月处理，本中余气候选并列保存，以透干、得时、辅助与冲突条件排序。',
      '建禄、月劫／月刃同样只是结构候选，不因月令同类就直接宣布成格。',
    ],
  };
}

const CLIMATE_PROFILE: Record<string, { profile: string; issues: Array<'寒' | '热' | '燥' | '湿'> }> = {
  寅: { profile: '初春余寒，阳气初升', issues: ['寒'] },
  卯: { profile: '仲春温和，单一寒热矛盾不突出', issues: [] },
  辰: { profile: '暮春湿土，湿气渐重', issues: ['湿'] },
  巳: { profile: '初夏渐热', issues: ['热'] },
  午: { profile: '盛夏炎热偏燥', issues: ['热', '燥'] },
  未: { profile: '长夏燥热', issues: ['热', '燥'] },
  申: { profile: '初秋金燥', issues: ['燥'] },
  酉: { profile: '仲秋燥气明显', issues: ['燥'] },
  戌: { profile: '晚秋燥凉', issues: ['燥', '寒'] },
  亥: { profile: '初冬寒湿', issues: ['寒', '湿'] },
  子: { profile: '隆冬寒湿', issues: ['寒', '湿'] },
  丑: { profile: '季冬寒湿土', issues: ['寒', '湿'] },
};

function availability(nodes: TemporalPillar[], element: Element): ElementAvailability {
  const visible = nodes.filter((node) => node.stemElement === element);
  const hidden = nodes.flatMap((node) => node.hiddenStems
    .filter((item) => item.element === element)
    .map((item) => `${node.layer}·${node.label}${node.branch}藏${item.stem}${item.rank}`));
  const visibleSources = visible.map((node) => `${node.layer}·${node.label}${node.stem}`);
  return {
    element,
    status: visibleSources.length ? '显干可见' : hidden.length ? '仅藏干' : '未见',
    visibleCount: visibleSources.length,
    hiddenCount: hidden.length,
    sources: [...visibleSources, ...hidden].slice(0, 8),
  };
}

export function buildClimateAssessment(natalNodes: TemporalPillar[], contextNodes: TemporalPillar[]): ClimateAssessment {
  const month = natalNodes[1];
  if (!month) throw new Error('原局缺少月柱，无法建立气候评估。');
  const profile = CLIMATE_PROFILE[month.branch] ?? { profile: '当前月支气候表未覆盖', issues: [] };
  const needMap = new Map<Element, Array<'寒' | '热' | '燥' | '湿'>>();
  profile.issues.forEach((issue) => {
    const element: Element = issue === '寒' || issue === '湿' ? '火' : '水';
    needMap.set(element, [...(needMap.get(element) ?? []), issue]);
  });

  const needs = [...needMap.entries()].map(([element, issues], index) => {
    const natal = availability(natalNodes, element);
    const current = availability(contextNodes, element);
    const temporalAdded = contextNodes.some((node) => node.layer !== '原局' && (
      node.stemElement === element || node.hiddenStems.some((item) => item.element === element)
    ));
    const role = element === '火'
      ? issues.includes('寒') && issues.includes('湿') ? '温暖并燥湿' : issues.includes('寒') ? '温暖' : '燥湿'
      : issues.includes('热') && issues.includes('燥') ? '清热并润燥' : issues.includes('热') ? '清热' : '润燥';
    return {
      id: `climate:${month.branch}:${element}`,
      element,
      issues,
      role,
      priority: index === 0 ? '主要' as const : '次要' as const,
      natal,
      current,
      temporalAdded,
      note: `${element}只是基于月令寒暖燥湿生成的气候材料候选，不等于《穷通宝鉴》式日干专属调候用神。`,
    };
  });

  return {
    monthBranch: month.branch,
    profile: profile.profile,
    issues: profile.issues,
    needs,
    notes: [
      '本轨只处理寒暖燥湿，不参与身强身弱计分。',
      '岁运可以补充或加剧气候材料，但不能反向修改出生月令的气候基线。',
      '当前采用保守的月支气候表，尚未加入逐日干、逐节气深浅和地域气候校正。',
    ],
  };
}

export function buildSupportBalanceTrack(
  dayMasterElement: Element,
  strength: StrengthAdjudication,
): SupportBalanceTrack {
  const leading = strength.leading.name;
  if (leading === '从强候选' || leading === '从弱候选') {
    return {
      mode: strength.mode,
      leading,
      orientation: '从势审查',
      elements: [],
      note: '从势候选必须先通过反向透干、根气和月令阻断审查，未通过前不套用普通扶抑元素。',
    };
  }
  if (STRONG_NAMES.has(leading)) {
    return {
      mode: strength.mode,
      leading,
      orientation: '宜泄耗制候选',
      elements: [
        { element: generatedElement(dayMasterElement), role: '食伤泄身', priority: '主要', direction: '泄身', note: '先记录泄秀方向，不保证食伤必可用。' },
        { element: controlledElement(dayMasterElement), role: '财星耗身', priority: '次要', direction: '耗身', note: '需核验财星是否有根、是否受比劫争夺。' },
        { element: controllerElement(dayMasterElement), role: '官杀制身', priority: '观察', direction: '制身', note: '需核验官杀清纯、制化与是否攻身过度。' },
      ],
      note: '旺衰轨只给出泄、耗、制的方向候选，不替代格局与调候。',
    };
  }
  if (WEAK_NAMES.has(leading)) {
    return {
      mode: strength.mode,
      leading,
      orientation: '宜扶候选',
      elements: [
        { element: generatorElement(dayMasterElement), role: '印星生身', priority: '主要', direction: '扶身', note: '需核验印星是否被财破、是否形成有效生扶。' },
        { element: dayMasterElement, role: '比劫帮身', priority: '次要', direction: '扶身', note: '需核验比劫是否引发财星争夺或结构副作用。' },
      ],
      note: '旺衰轨只给出印比扶身方向，不保证印比就是最终喜用。',
    };
  }
  return {
    mode: strength.mode,
    leading,
    orientation: '中和观察',
    elements: [],
    note: '中和候选下不预设单一扶抑方向，应优先看格局清纯、调候和具体病药。',
  };
}

function elementStrengthRole(dayMaster: Element, element: Element): '扶身' | '耗泄克身' {
  return element === dayMaster || element === generatorElement(dayMaster) ? '扶身' : '耗泄克身';
}

export function compareTracks(
  dayMasterElement: Element,
  climate: ClimateAssessment,
  supportBalance: SupportBalanceTrack,
): TrackComparison[] {
  return climate.needs.map((need) => {
    if (supportBalance.orientation === '中和观察' || supportBalance.orientation === '从势审查') {
      return {
        id: `track:${need.id}:${supportBalance.mode}`,
        climateElement: need.element,
        climateRole: need.role,
        supportBalanceRelation: '彼此独立',
        detail: `气候轨提出${need.element}${need.role}，但当前扶抑轨为${supportBalance.orientation}，不强行合并。`,
      };
    }
    const role = elementStrengthRole(dayMasterElement, need.element);
    const expectsSupport = supportBalance.orientation === '宜扶候选';
    const aligned = (expectsSupport && role === '扶身') || (!expectsSupport && role === '耗泄克身');
    return {
      id: `track:${need.id}:${supportBalance.mode}`,
      climateElement: need.element,
      climateRole: need.role,
      supportBalanceRelation: aligned ? '方向一致' : '方向冲突',
      detail: aligned
        ? `${need.element}在气候轨负责${need.role}，同时符合当前${supportBalance.orientation}。`
        : `${need.element}在气候轨负责${need.role}，但在扶抑轨属于${role}侧；两者必须并列保留，不得直接定为喜忌。`,
    };
  });
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
      '最终取用必须解释为什么某一轨优先，以及其他轨道的矛盾如何被制化或接受。',
    ],
  };
}
