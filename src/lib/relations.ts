import { elementRelation, type Element } from './foundations';
import type { PillarLayer, TemporalPillar } from './timeline';

export type RelationCategory = '天干' | '地支' | '组合';

export interface RelationNode {
  id: string;
  label: string;
  layer: PillarLayer;
  stem: string;
  branch: string;
  stemElement: Element;
  branchElement: Element;
}

export interface RelationMember {
  id: string;
  label: string;
  layer: PillarLayer;
  char: string;
}

export interface ChartRelation {
  id: string;
  category: RelationCategory;
  type: string;
  name: string;
  members: RelationMember[];
  resultElement?: string;
  note: string;
  level: 'pair' | 'triple' | 'self';
  scope: '原局' | '岁运介入';
}

export interface ElementComponent {
  id: string;
  pillarId: string;
  label: string;
  layer: PillarLayer;
  part: '天干' | '地支本气';
  char: string;
  element: Element;
}

export interface ElementInteraction {
  id: string;
  left: ElementComponent;
  right: ElementComponent;
  type: '同类' | '相生' | '相克';
  name: string;
  sourceId?: string;
  targetId?: string;
  note: string;
  scope: '原局' | '岁运介入';
}

const STEM_COMBINES: Record<string, { name: string; element: string }> = {
  '甲己': { name: '甲己合', element: '土' },
  '乙庚': { name: '乙庚合', element: '金' },
  '丙辛': { name: '丙辛合', element: '水' },
  '丁壬': { name: '丁壬合', element: '木' },
  '戊癸': { name: '戊癸合', element: '火' },
};

const STEM_CLASHES = ['甲庚', '乙辛', '丙壬', '丁癸'];

const BRANCH_PAIRS: Array<{ pairs: string[]; type: string; suffix: string; note: string }> = [
  { type: '六合', suffix: '六合', pairs: ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'], note: '只确认六合结构；是否合化及化神能否成立，留给后续规则引擎判断。' },
  { type: '六冲', suffix: '相冲', pairs: ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'], note: '确认地支对冲关系，不直接推导吉凶。' },
  { type: '六害', suffix: '相害', pairs: ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'], note: '确认地支相害结构，不直接映射现实事件。' },
  { type: '六破', suffix: '相破', pairs: ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'], note: '确认地支相破结构；同一对子可同时满足其他关系，应并列保留。' },
];

const THREE_COMBINES = [
  { chars: ['申', '子', '辰'], center: '子', name: '申子辰三合水局', element: '水' },
  { chars: ['亥', '卯', '未'], center: '卯', name: '亥卯未三合木局', element: '木' },
  { chars: ['寅', '午', '戌'], center: '午', name: '寅午戌三合火局', element: '火' },
  { chars: ['巳', '酉', '丑'], center: '酉', name: '巳酉丑三合金局', element: '金' },
];

const TRIPLES = [
  ...THREE_COMBINES.map((item) => ({ ...item, type: '三合', note: '三支齐全，仅确认三合局候选；成局、化局与强度尚未判断。' })),
  { chars: ['亥', '子', '丑'], type: '三会', name: '亥子丑三会水方', element: '水', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: ['寅', '卯', '辰'], type: '三会', name: '寅卯辰三会木方', element: '木', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: ['巳', '午', '未'], type: '三会', name: '巳午未三会火方', element: '火', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: ['申', '酉', '戌'], type: '三会', name: '申酉戌三会金方', element: '金', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: ['寅', '巳', '申'], type: '三刑', name: '寅巳申无恩之刑', note: '三支齐全，确认三刑结构，不直接断应事。' },
  { chars: ['丑', '未', '戌'], type: '三刑', name: '丑未戌恃势之刑', note: '三支齐全，确认三刑结构，不直接断应事。' },
];

const PAIR_PUNISHMENTS = [
  { pair: '子卯', name: '子卯无礼之刑' },
  { pair: '寅巳', name: '寅巳相刑' }, { pair: '巳申', name: '巳申相刑' }, { pair: '寅申', name: '寅申相刑' },
  { pair: '丑未', name: '丑未相刑' }, { pair: '未戌', name: '未戌相刑' }, { pair: '丑戌', name: '丑戌相刑' },
];

const SELF_PUNISHMENTS = new Set(['辰', '午', '酉', '亥']);

const pairMatches = (pair: string, a: string, b: string) => a !== b && pair.includes(a) && pair.includes(b);
const scopeOf = (members: Array<{ layer: PillarLayer }>): ChartRelation['scope'] => members.every((item) => item.layer === '原局') ? '原局' : '岁运介入';

function member(node: RelationNode, char: string): RelationMember {
  return { id: node.id, label: node.label, layer: node.layer, char };
}

function relationId(prefix: string, members: RelationMember[]): string {
  return `${prefix}:${members.map((item) => `${item.id}-${item.char}`).sort().join('|')}`;
}

function selectionsFor(nodes: RelationNode[], chars: string[], index = 0, used = new Set<string>()): RelationNode[][] {
  if (index >= chars.length) return [[]];
  const candidates = nodes.filter((node) => node.branch === chars[index] && !used.has(node.id));
  return candidates.flatMap((candidate) => {
    const nextUsed = new Set(used);
    nextUsed.add(candidate.id);
    return selectionsFor(nodes, chars, index + 1, nextUsed).map((rest) => [candidate, ...rest]);
  });
}

export function detectRelations(input: Array<RelationNode | TemporalPillar>): ChartRelation[] {
  const nodes: RelationNode[] = input.map((item) => ({
    id: item.id, label: item.label, layer: item.layer, stem: item.stem, branch: item.branch,
    stemElement: item.stemElement, branchElement: item.branchElement,
  }));
  const relations: ChartRelation[] = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const left = nodes[i];
      const right = nodes[j];
      const stemMembers = [member(left, left.stem), member(right, right.stem)];
      const combine = Object.entries(STEM_COMBINES).find(([pair]) => pairMatches(pair, left.stem, right.stem));
      if (combine) {
        relations.push({
          id: relationId('stem-combine', stemMembers), category: '天干', type: '五合',
          name: `${combine[1].name} · 候选化${combine[1].element}`, members: stemMembers,
          resultElement: combine[1].element, note: '只确认天干五合；能否合化需结合月令、通根、透干与制化另判。',
          level: 'pair', scope: scopeOf(stemMembers),
        });
      }
      if (STEM_CLASHES.some((pair) => pairMatches(pair, left.stem, right.stem))) {
        relations.push({
          id: relationId('stem-clash', stemMembers), category: '天干', type: '相冲',
          name: `${left.stem}${right.stem}相冲`, members: stemMembers,
          note: '确认天干对冲关系；一般五行相克由生克矩阵另行记录。',
          level: 'pair', scope: scopeOf(stemMembers),
        });
      }

      const branchMembers = [member(left, left.branch), member(right, right.branch)];
      BRANCH_PAIRS.forEach((definition) => {
        if (!definition.pairs.some((pair) => pairMatches(pair, left.branch, right.branch))) return;
        relations.push({
          id: relationId(`branch-${definition.type}`, branchMembers), category: '地支', type: definition.type,
          name: `${left.branch}${right.branch}${definition.suffix}`, members: branchMembers,
          note: definition.note, level: 'pair', scope: scopeOf(branchMembers),
        });
      });
      PAIR_PUNISHMENTS.forEach((definition) => {
        if (!pairMatches(definition.pair, left.branch, right.branch)) return;
        relations.push({
          id: relationId('branch-punishment', branchMembers), category: '地支', type: '相刑',
          name: definition.name, members: branchMembers,
          note: '确认成对刑象；若三支齐全，系统还会单列完整三刑。',
          level: 'pair', scope: scopeOf(branchMembers),
        });
      });
      if (left.branch === right.branch && SELF_PUNISHMENTS.has(left.branch)) {
        relations.push({
          id: relationId('self-punishment', branchMembers), category: '地支', type: '自刑',
          name: `${left.branch}${right.branch}自刑`, members: branchMembers,
          note: '同支重复形成自刑结构；强弱与应事另行判断。',
          level: 'self', scope: scopeOf(branchMembers),
        });
      }
    }
  }

  TRIPLES.forEach((definition) => {
    selectionsFor(nodes, definition.chars).forEach((selection) => {
      const members = selection.map((node) => member(node, node.branch));
      relations.push({
        id: relationId(`triple-${definition.type}`, members), category: '组合', type: definition.type,
        name: definition.name, members, resultElement: 'element' in definition ? definition.element : undefined,
        note: definition.note, level: 'triple', scope: scopeOf(members),
      });
    });
  });

  THREE_COMBINES.forEach((definition) => {
    const hasFull = selectionsFor(nodes, definition.chars).length > 0;
    if (hasFull) return;
    for (let i = 0; i < definition.chars.length; i += 1) {
      for (let j = i + 1; j < definition.chars.length; j += 1) {
        const pair = [definition.chars[i], definition.chars[j]];
        selectionsFor(nodes, pair).forEach((selection) => {
          const members = selection.map((node) => member(node, node.branch));
          const isHalf = pair.includes(definition.center);
          relations.push({
            id: relationId(isHalf ? 'half-combine' : 'arch-combine', members), category: '组合',
            type: isHalf ? '半合' : '拱合',
            name: `${pair.join('')}${isHalf ? '半合' : '拱合'}${definition.element}`,
            members, resultElement: definition.element,
            note: isHalf
              ? '三合局中含旺支的两支相见，记录为半合候选；是否成势另判。'
              : '三合局中缺旺支的两支相见，记录为拱合候选；是否得引另判。',
            level: 'pair', scope: scopeOf(members),
          });
        });
      }
    }
  });

  const seen = new Set<string>();
  return relations.filter((relation) => {
    if (seen.has(relation.id)) return false;
    seen.add(relation.id);
    return true;
  });
}

export function buildElementInteractions(input: Array<RelationNode | TemporalPillar>): ElementInteraction[] {
  const components: ElementComponent[] = input.flatMap((node) => [
    { id: `${node.id}-stem`, pillarId: node.id, label: node.label, layer: node.layer, part: '天干' as const, char: node.stem, element: node.stemElement },
    { id: `${node.id}-branch`, pillarId: node.id, label: node.label, layer: node.layer, part: '地支本气' as const, char: node.branch, element: node.branchElement },
  ]);
  const interactions: ElementInteraction[] = [];

  for (let i = 0; i < components.length; i += 1) {
    for (let j = i + 1; j < components.length; j += 1) {
      const left = components[i];
      const right = components[j];
      if (left.pillarId === right.pillarId) continue;
      const relation = elementRelation(left.element, right.element);
      let type: ElementInteraction['type'];
      let name: string;
      let sourceId: string | undefined;
      let targetId: string | undefined;
      if (left.element === right.element) {
        type = '同类';
        name = `${left.label}${left.char}与${right.label}${right.char}同属${left.element}`;
      } else if (relation.type === '生') {
        type = '相生';
        const leftGeneratesRight = relation.sourceElement === left.element;
        const source = leftGeneratesRight ? left : right;
        const target = leftGeneratesRight ? right : left;
        sourceId = source.id;
        targetId = target.id;
        name = `${source.label}${source.char}生${target.label}${target.char}`;
      } else {
        type = '相克';
        const leftControlsRight = relation.sourceElement === left.element;
        const source = leftControlsRight ? left : right;
        const target = leftControlsRight ? right : left;
        sourceId = source.id;
        targetId = target.id;
        name = `${source.label}${source.char}克${target.label}${target.char}`;
      }
      interactions.push({
        id: `${left.id}:${right.id}`, left, right, type, name, sourceId, targetId,
        note: '这里只记录五行方向；是否有力、能否制化、是否被合住或通关，留给后续规则层。',
        scope: left.layer === '原局' && right.layer === '原局' ? '原局' : '岁运介入',
      });
    }
  }
  return interactions;
}
