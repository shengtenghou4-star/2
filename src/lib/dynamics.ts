import {
  controlledElement,
  controllerElement,
  generatedElement,
  generatorElement,
  type Element,
  type HiddenStemRank,
} from './foundations';
import type { EvidenceSnapshot, SeasonalState } from './evidence';
import type { ChartRelation } from './relations';
import type { PillarLayer, TemporalPillar } from './timeline';

export type ContactMode = '同柱' | '相邻柱' | '隔一柱' | '远隔' | '岁运跨层' | '多柱成组';
export type CandidateScope = '原局' | '岁运介入';

export interface ElementPresence {
  id: string;
  nodeId: string;
  label: string;
  layer: PillarLayer;
  part: '天干' | '藏干';
  char: string;
  element: Element;
  tenGod: string;
  visible: boolean;
  rank?: HiddenStemRank;
}

export interface RelationPathEvidence {
  id: string;
  relationId: string;
  type: string;
  name: string;
  scope: CandidateScope;
  contact: ContactMode;
  memberLabels: string[];
  competingRelations: string[];
  note: string;
}

export interface ConditionEvidence {
  id: string;
  label: string;
  state: '具备' | '部分具备' | '未见' | '冲突并存' | '仅记录';
  detail: string;
}

export interface CombineCandidate {
  id: string;
  relationId: string;
  name: string;
  members: string[];
  resultElement: Element;
  resultSeasonalState: SeasonalState;
  contact: ContactMode;
  resultVisibleCount: number;
  resultHiddenCount: number;
  rootedMembers: number;
  conflicts: string[];
  candidate: '合绊候选' | '合化条件候选' | '合绊与冲突并存';
  conditions: ConditionEvidence[];
  note: string;
}

export interface ClashCandidate {
  id: string;
  relationId: string;
  name: string;
  members: string[];
  contact: ContactMode;
  storehouseClash: boolean;
  natalTemporalContact: boolean;
  touchedRootCount: number;
  competingRelations: string[];
  candidate: '原局对冲候选' | '岁运冲动候选' | '冲库／冲开候选';
  conditions: ConditionEvidence[];
  note: string;
}

export interface PassageCandidate {
  id: string;
  sourceElement: Element;
  mediatorElement: Element;
  targetElement: Element;
  sourceCount: number;
  targetCount: number;
  mediatorVisibleCount: number;
  mediatorHiddenCount: number;
  scope: CandidateScope;
  status: '显干通关材料齐备' | '藏干通关候选' | '通关元素未现';
  examples: string[];
  note: string;
}

export interface RegulationCandidate {
  id: string;
  type: '制' | '化' | '生化';
  name: string;
  chain: Element[];
  requiredLabels: string[];
  presentLabels: string[];
  visibleLabels: string[];
  hiddenOnlyLabels: string[];
  scope: CandidateScope;
  status: '显干链条齐备' | '藏干链条候选' | '材料不全';
  note: string;
}

export interface ConflictEvidence {
  id: string;
  nodeId: string;
  label: string;
  layer: PillarLayer;
  relationNames: string[];
  note: string;
}

export interface DynamicsSnapshot {
  components: ElementPresence[];
  relationPaths: RelationPathEvidence[];
  combines: CombineCandidate[];
  clashes: ClashCandidate[];
  passages: PassageCandidate[];
  regulations: RegulationCandidate[];
  conflicts: ConflictEvidence[];
  notes: string[];
}

const NATAL_ORDER: Record<string, number> = { 年柱: 0, 月柱: 1, 日柱: 2, 时柱: 3 };
const TEMPORAL_ORDER: Record<PillarLayer, number> = { 原局: 0, 大运: 1, 流年: 2, 流月: 3 };
const STOREHOUSES = new Set(['辰', '戌', '丑', '未']);
const COMBINE_TYPES = new Set(['五合', '六合', '半合', '拱合', '三合', '三会']);
const DISRUPT_TYPES = new Set(['相冲', '六冲', '相刑', '三刑', '自刑', '六害', '六破']);
const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

function scopeOfPresences(presences: ElementPresence[]): CandidateScope {
  return presences.every((item) => item.layer === '原局') ? '原局' : '岁运介入';
}

function nodeMap(nodes: TemporalPillar[]): Map<string, TemporalPillar> {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function buildElementPresences(nodes: TemporalPillar[]): ElementPresence[] {
  return nodes.flatMap((node) => [
    {
      id: `${node.id}:stem`,
      nodeId: node.id,
      label: node.label,
      layer: node.layer,
      part: '天干' as const,
      char: node.stem,
      element: node.stemElement,
      tenGod: node.tenGod,
      visible: true,
    },
    ...node.hiddenStems.map((hidden) => ({
      id: `${node.id}:hidden:${hidden.stem}`,
      nodeId: node.id,
      label: node.label,
      layer: node.layer,
      part: '藏干' as const,
      char: hidden.stem,
      element: hidden.element,
      tenGod: hidden.tenGod,
      visible: false,
      rank: hidden.rank,
    })),
  ]);
}

export function contactMode(left: TemporalPillar, right: TemporalPillar): ContactMode {
  if (left.id === right.id) return '同柱';
  if (left.layer === '原局' && right.layer === '原局') {
    const distance = Math.abs((NATAL_ORDER[left.label] ?? 0) - (NATAL_ORDER[right.label] ?? 0));
    if (distance === 1) return '相邻柱';
    if (distance === 2) return '隔一柱';
    return '远隔';
  }
  if (left.layer !== '原局' && right.layer !== '原局') {
    const distance = Math.abs(TEMPORAL_ORDER[left.layer] - TEMPORAL_ORDER[right.layer]);
    return distance === 1 ? '相邻柱' : '隔一柱';
  }
  return '岁运跨层';
}

function relationContact(relation: ChartRelation, nodes: Map<string, TemporalPillar>): ContactMode {
  if (relation.members.length > 2) return '多柱成组';
  const left = nodes.get(relation.members[0]?.id ?? '');
  const right = nodes.get(relation.members[1]?.id ?? '');
  return left && right ? contactMode(left, right) : '岁运跨层';
}

function competingRelations(relation: ChartRelation, relations: ChartRelation[]): ChartRelation[] {
  const memberIds = new Set(relation.members.map((member) => member.id));
  return relations.filter((candidate) =>
    candidate.id !== relation.id && candidate.members.some((member) => memberIds.has(member.id)),
  );
}

export function buildRelationPaths(nodes: TemporalPillar[], relations: ChartRelation[]): RelationPathEvidence[] {
  const nodesById = nodeMap(nodes);
  return relations.map((relation) => {
    const competing = competingRelations(relation, relations);
    const contact = relationContact(relation, nodesById);
    return {
      id: `path:${relation.id}`,
      relationId: relation.id,
      type: relation.type,
      name: relation.name,
      scope: relation.scope,
      contact,
      memberLabels: relation.members.map((member) => `${member.layer}·${member.label}${member.char}`),
      competingRelations: competing.map((item) => item.name),
      note: `${contact}只表示盘面拓扑位置；距离近不自动等于作用成功，距离远也不自动等于无作用。`,
    };
  });
}

function stateForElement(evidence: EvidenceSnapshot, element: Element): SeasonalState {
  return evidence.monthCommand.elementStates.find((item) => item.element === element)?.state ?? '休';
}

export function buildCombineCandidates(
  nodes: TemporalPillar[],
  relations: ChartRelation[],
  evidence: EvidenceSnapshot,
  components: ElementPresence[],
): CombineCandidate[] {
  const nodesById = nodeMap(nodes);
  return relations.filter((relation) => relation.type === '五合' && relation.resultElement).map((relation) => {
    const resultElement = relation.resultElement as Element;
    const resultPresences = components.filter((item) => item.element === resultElement);
    const visible = resultPresences.filter((item) => item.visible).length;
    const hidden = resultPresences.filter((item) => !item.visible).length;
    const contact = relationContact(relation, nodesById);
    const competing = competingRelations(relation, relations);
    const conflictNames = competing
      .filter((item) => item.type === '相冲' || item.type === '五合')
      .map((item) => item.name);
    const memberIds = new Set(relation.members.map((member) => member.id));
    const rootedMembers = evidence.rootSummaries.filter((summary) =>
      memberIds.has(summary.visibleId) && summary.exactRoots + summary.sameElementRoots > 0,
    ).length;
    const seasonalState = stateForElement(evidence, resultElement);
    const seasonSupports = seasonalState === '旺' || seasonalState === '相';
    const contactSupports = contact === '相邻柱' || contact === '岁运跨层';
    const candidate: CombineCandidate['candidate'] = conflictNames.length
      ? '合绊与冲突并存'
      : seasonSupports && visible > 0 && contactSupports
        ? '合化条件候选'
        : '合绊候选';

    return {
      id: `combine:${relation.id}`,
      relationId: relation.id,
      name: relation.name,
      members: relation.members.map((member) => `${member.layer}·${member.label}${member.char}`),
      resultElement,
      resultSeasonalState: seasonalState,
      contact,
      resultVisibleCount: visible,
      resultHiddenCount: hidden,
      rootedMembers,
      conflicts: conflictNames,
      candidate,
      conditions: [
        {
          id: `${relation.id}:contact`,
          label: '位置接触',
          state: contactSupports ? '具备' : '部分具备',
          detail: `当前为${contact}。位置只作为条件，不折算为强度。`,
        },
        {
          id: `${relation.id}:season`,
          label: '化神得时',
          state: seasonSupports ? '具备' : '未见',
          detail: `${resultElement}在${evidence.monthCommand.phase}基础表中为${seasonalState}。`,
        },
        {
          id: `${relation.id}:presence`,
          label: '化神材料',
          state: visible > 0 ? '具备' : hidden > 0 ? '部分具备' : '未见',
          detail: `${resultElement}显干${visible}处、藏干${hidden}处。`,
        },
        {
          id: `${relation.id}:roots`,
          label: '合干各自根气',
          state: rootedMembers === relation.members.length ? '具备' : rootedMembers > 0 ? '部分具备' : '未见',
          detail: `${relation.members.length}个参与天干中，有${rootedMembers}个在当前七柱见根。此项只提示保留原性条件。`,
        },
        {
          id: `${relation.id}:conflict`,
          label: '争合或受冲',
          state: conflictNames.length ? '冲突并存' : '未见',
          detail: conflictNames.length ? conflictNames.join('、') : '当前未见参与天干同时被其他五合或天干冲占用。',
        },
      ],
      note: '“合化条件候选”不是合化结论；尚需流派口径、月令细分、透根强弱与去留裁决。',
    };
  });
}

export function buildClashCandidates(
  nodes: TemporalPillar[],
  relations: ChartRelation[],
  evidence: EvidenceSnapshot,
): ClashCandidate[] {
  const nodesById = nodeMap(nodes);
  return relations.filter((relation) => relation.type === '六冲').map((relation) => {
    const relationNodes = relation.members.map((member) => nodesById.get(member.id)).filter(Boolean) as TemporalPillar[];
    const storehouseClash = relationNodes.length === 2 && relationNodes.every((node) => STOREHOUSES.has(node.branch));
    const natalTemporalContact = relationNodes.some((node) => node.layer === '原局') && relationNodes.some((node) => node.layer !== '原局');
    const memberIds = new Set(relation.members.map((member) => member.id));
    const rootIds = new Set(evidence.roots.filter((root) => memberIds.has(root.branchId)).map((root) => root.id));
    const competing = competingRelations(relation, relations).map((item) => item.name);
    const candidate: ClashCandidate['candidate'] = storehouseClash
      ? '冲库／冲开候选'
      : natalTemporalContact
        ? '岁运冲动候选'
        : '原局对冲候选';

    return {
      id: `clash:${relation.id}`,
      relationId: relation.id,
      name: relation.name,
      members: relation.members.map((member) => `${member.layer}·${member.label}${member.char}`),
      contact: relationContact(relation, nodesById),
      storehouseClash,
      natalTemporalContact,
      touchedRootCount: rootIds.size,
      competingRelations: competing,
      candidate,
      conditions: [
        {
          id: `${relation.id}:temporal`,
          label: '岁运介入',
          state: natalTemporalContact ? '具备' : '未见',
          detail: natalTemporalContact ? '冲的两端分属原局与岁运，记录为外来时间层引动候选。' : '冲的两端均在原局或均在岁运层。',
        },
        {
          id: `${relation.id}:storehouse`,
          label: '墓库对冲',
          state: storehouseClash ? '具备' : '未见',
          detail: storehouseClash ? '两支均属辰戌丑未，记录为冲库／冲开候选。' : '不是两座墓库之间的六冲。',
        },
        {
          id: `${relation.id}:roots`,
          label: '根气触及',
          state: rootIds.size ? '部分具备' : '未见',
          detail: `冲的两支承载${rootIds.size}条当前根气证据；只记触及，不判拔根。`,
        },
        {
          id: `${relation.id}:competition`,
          label: '其他关系并存',
          state: competing.length ? '冲突并存' : '未见',
          detail: competing.length ? competing.join('、') : '当前未见同支同时参与其他已收录组合。',
        },
      ],
      note: '“冲动”“冲开”均为候选标签；没有得到力量、位置、重复与制化裁决前，不等于已经冲散或打开。',
    };
  });
}

function examplesFor(presences: ElementPresence[], limit = 4): string[] {
  return presences.slice(0, limit).map((item) => `${item.layer}·${item.label}${item.char}${item.visible ? '透' : `藏${item.rank ?? ''}`}`);
}

export function buildPassageCandidates(components: ElementPresence[]): PassageCandidate[] {
  return ELEMENTS.flatMap((sourceElement) => {
    const targetElement = controlledElement(sourceElement);
    const mediatorElement = generatedElement(sourceElement);
    const sources = components.filter((item) => item.element === sourceElement);
    const targets = components.filter((item) => item.element === targetElement);
    if (!sources.length || !targets.length) return [];
    const mediators = components.filter((item) => item.element === mediatorElement);
    const visible = mediators.filter((item) => item.visible).length;
    const hidden = mediators.filter((item) => !item.visible).length;
    const involved = [...sources, ...targets, ...mediators];
    const status: PassageCandidate['status'] = visible > 0
      ? '显干通关材料齐备'
      : hidden > 0
        ? '藏干通关候选'
        : '通关元素未现';
    return [{
      id: `passage:${sourceElement}-${mediatorElement}-${targetElement}`,
      sourceElement,
      mediatorElement,
      targetElement,
      sourceCount: sources.length,
      targetCount: targets.length,
      mediatorVisibleCount: visible,
      mediatorHiddenCount: hidden,
      scope: scopeOfPresences(involved),
      status,
      examples: examplesFor(involved),
      note: `${sourceElement}克${targetElement}时，以${mediatorElement}承接为五行通关候选：${sourceElement}生${mediatorElement}，${mediatorElement}生${targetElement}。材料出现不等于路径已有效。`,
    }];
  });
}

interface RegulationDefinition {
  id: string;
  type: RegulationCandidate['type'];
  name: string;
  chain: Element[];
  labels: string[];
  note: string;
}

function regulationDefinitions(dayMaster: Element): RegulationDefinition[] {
  const output = generatedElement(dayMaster);
  const wealth = controlledElement(dayMaster);
  const officer = controllerElement(dayMaster);
  const resource = generatorElement(dayMaster);
  return [
    { id: 'officer-resource-self', type: '化', name: '官杀生印、印生身候选', chain: [officer, resource, dayMaster], labels: ['官杀', '印星', '日主／比劫'], note: '只确认官杀→印→身的五行链材料，不区分正偏，也不直接认定杀印相生格。' },
    { id: 'output-controls-officer', type: '制', name: '食伤制官杀候选', chain: [output, officer], labels: ['食伤', '官杀'], note: '只确认食伤五行具备克制官杀五行的材料；是否制得住仍需位置、根气与合绊裁决。' },
    { id: 'resource-controls-output', type: '制', name: '印制食伤候选', chain: [resource, output], labels: ['印星', '食伤'], note: '只确认印星五行具备克制食伤五行的材料，不判断枭神夺食等具体结论。' },
    { id: 'output-generates-wealth', type: '生化', name: '食伤生财候选', chain: [output, wealth], labels: ['食伤', '财星'], note: '只确认食伤→财的相生链材料，不判断财是否可用。' },
    { id: 'wealth-generates-officer', type: '生化', name: '财生官杀候选', chain: [wealth, officer], labels: ['财星', '官杀'], note: '只确认财→官杀的相生链材料，不直接判断财滋杀或官星得用。' },
  ];
}

export function buildRegulationCandidates(dayMaster: Element, components: ElementPresence[]): RegulationCandidate[] {
  return regulationDefinitions(dayMaster).map((definition) => {
    const groups = definition.chain.map((element) => components.filter((item) => item.element === element));
    const presentLabels = definition.labels.filter((_, index) => groups[index].length > 0);
    const visibleLabels = definition.labels.filter((_, index) => groups[index].some((item) => item.visible));
    const hiddenOnlyLabels = definition.labels.filter((_, index) => groups[index].length > 0 && !groups[index].some((item) => item.visible));
    const allPresent = groups.every((group) => group.length > 0);
    const allVisible = groups.every((group) => group.some((item) => item.visible));
    const involved = groups.flat();
    return {
      id: `regulation:${definition.id}`,
      type: definition.type,
      name: definition.name,
      chain: definition.chain,
      requiredLabels: definition.labels,
      presentLabels,
      visibleLabels,
      hiddenOnlyLabels,
      scope: scopeOfPresences(involved),
      status: allVisible ? '显干链条齐备' : allPresent ? '藏干链条候选' : '材料不全',
      note: definition.note,
    };
  });
}

export function buildConflictEvidence(nodes: TemporalPillar[], relations: ChartRelation[]): ConflictEvidence[] {
  return nodes.flatMap((node) => {
    const touches = relations.filter((relation) => relation.members.some((member) => member.id === node.id));
    const hasCombine = touches.some((relation) => COMBINE_TYPES.has(relation.type));
    const hasDisrupt = touches.some((relation) => DISRUPT_TYPES.has(relation.type));
    const stemCompetition = touches.filter((relation) => relation.type === '五合' || relation.type === '相冲').length > 1;
    if ((!hasCombine || !hasDisrupt) && !stemCompetition) return [];
    return [{
      id: `conflict:${node.id}`,
      nodeId: node.id,
      label: node.label,
      layer: node.layer,
      relationNames: touches.map((relation) => relation.name),
      note: `${node.layer}${node.label}同时进入多种方向不同的作用关系；后续裁决不得只取其中一条。`,
    }];
  });
}

export function buildDynamicsSnapshot(
  nodes: TemporalPillar[],
  relations: ChartRelation[],
  evidence: EvidenceSnapshot,
): DynamicsSnapshot {
  const components = buildElementPresences(nodes);
  return {
    components,
    relationPaths: buildRelationPaths(nodes, relations),
    combines: buildCombineCandidates(nodes, relations, evidence, components),
    clashes: buildClashCandidates(nodes, relations, evidence),
    passages: buildPassageCandidates(components),
    regulations: buildRegulationCandidates(evidence.monthCommand.dayMasterElement, components),
    conflicts: buildConflictEvidence(nodes, relations),
    notes: [
      '位置邻接、显藏、得时和根气只作为条件字段，当前不折算成统一分数。',
      '合绊、合化、冲动、冲开、通关和制化均为候选状态，不是已发生的裁决结果。',
      '同一干支同时参与合与冲、刑、害、破时必须并列保存，后续规则不得静默覆盖。',
    ],
  };
}
