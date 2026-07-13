import type { PillarDetail } from './bazi';

export type RelationCategory = '天干' | '地支' | '组合';

export interface RelationMember {
  pillar: PillarDetail['label'];
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
}

const STEM_COMBINES: Record<string, { name: string; element: string }> = {
  '甲己': { name: '甲己合', element: '土' },
  '乙庚': { name: '乙庚合', element: '金' },
  '丙辛': { name: '丙辛合', element: '水' },
  '丁壬': { name: '丁壬合', element: '木' },
  '戊癸': { name: '戊癸合', element: '火' },
};

const STEM_CLASHES = new Set(['甲庚', '乙辛', '丙壬', '丁癸']);

const BRANCH_PAIRS: Array<{ pairs: string[]; type: string; suffix: string; element?: string; note: string }> = [
  {
    type: '六合', suffix: '六合',
    pairs: ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'],
    note: '只确认六合结构；是否合化及化神能否成立，留给后续规则引擎判断。',
  },
  {
    type: '六冲', suffix: '相冲',
    pairs: ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'],
    note: '确认地支对冲关系，不直接推导吉凶。',
  },
  {
    type: '六害', suffix: '相害',
    pairs: ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'],
    note: '确认地支相害结构，不直接映射现实事件。',
  },
  {
    type: '六破', suffix: '相破',
    pairs: ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'],
    note: '确认地支相破结构；同一对子可同时满足其他关系，应并列保留。',
  },
];

const TRIPLES = [
  { chars: '申子辰', type: '三合', name: '申子辰三合水局', element: '水', note: '三支齐全，仅确认三合局候选；成局、化局强度尚未判断。' },
  { chars: '亥卯未', type: '三合', name: '亥卯未三合木局', element: '木', note: '三支齐全，仅确认三合局候选；成局、化局强度尚未判断。' },
  { chars: '寅午戌', type: '三合', name: '寅午戌三合火局', element: '火', note: '三支齐全，仅确认三合局候选；成局、化局强度尚未判断。' },
  { chars: '巳酉丑', type: '三合', name: '巳酉丑三合金局', element: '金', note: '三支齐全，仅确认三合局候选；成局、化局强度尚未判断。' },
  { chars: '亥子丑', type: '三会', name: '亥子丑三会水方', element: '水', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: '寅卯辰', type: '三会', name: '寅卯辰三会木方', element: '木', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: '巳午未', type: '三会', name: '巳午未三会火方', element: '火', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: '申酉戌', type: '三会', name: '申酉戌三会金方', element: '金', note: '三支齐全，仅确认三会方候选；是否成势留给旺衰层判断。' },
  { chars: '寅巳申', type: '三刑', name: '寅巳申无恩之刑', note: '三支齐全，确认三刑结构，不直接断应事。' },
  { chars: '丑未戌', type: '三刑', name: '丑未戌恃势之刑', note: '三支齐全，确认三刑结构，不直接断应事。' },
];

const PAIR_PUNISHMENTS = [
  { pair: '子卯', name: '子卯无礼之刑' },
  { pair: '寅巳', name: '寅巳相刑' },
  { pair: '巳申', name: '巳申相刑' },
  { pair: '寅申', name: '寅申相刑' },
  { pair: '丑未', name: '丑未相刑' },
  { pair: '未戌', name: '未戌相刑' },
  { pair: '丑戌', name: '丑戌相刑' },
];

const SELF_PUNISHMENTS = new Set(['辰', '午', '酉', '亥']);

function normalizePair(a: string, b: string): string {
  return [a, b].sort().join('');
}

function matchesPair(pair: string, a: string, b: string): boolean {
  return pair.includes(a) && pair.includes(b) && a !== b;
}

function relationId(prefix: string, members: RelationMember[]): string {
  return `${prefix}:${members.map((item) => `${item.pillar}-${item.char}`).join('|')}`;
}

export function detectRelations(pillars: PillarDetail[]): ChartRelation[] {
  const relations: ChartRelation[] = [];

  for (let i = 0; i < pillars.length; i += 1) {
    for (let j = i + 1; j < pillars.length; j += 1) {
      const left = pillars[i];
      const right = pillars[j];
      const stemMembers: RelationMember[] = [
        { pillar: left.label, char: left.stem },
        { pillar: right.label, char: right.stem },
      ];
      const stemKey = Object.keys(STEM_COMBINES).find((pair) => matchesPair(pair, left.stem, right.stem));
      if (stemKey) {
        const info = STEM_COMBINES[stemKey];
        relations.push({
          id: relationId('stem-combine', stemMembers),
          category: '天干',
          type: '五合',
          name: `${info.name} · 候选化${info.element}`,
          members: stemMembers,
          resultElement: info.element,
          note: '只确认天干五合；能否合化需结合月令、通根、透干与制化另判。',
          level: 'pair',
        });
      }

      const clashKey = [...STEM_CLASHES].find((pair) => matchesPair(pair, left.stem, right.stem));
      if (clashKey) {
        relations.push({
          id: relationId('stem-clash', stemMembers),
          category: '天干',
          type: '相冲',
          name: `${left.stem}${right.stem}相冲`,
          members: stemMembers,
          note: '确认天干对冲关系，不在结构层判断强弱与结果。',
          level: 'pair',
        });
      }

      const branchMembers: RelationMember[] = [
        { pillar: left.label, char: left.branch },
        { pillar: right.label, char: right.branch },
      ];

      BRANCH_PAIRS.forEach((definition) => {
        const matched = definition.pairs.find((pair) => matchesPair(pair, left.branch, right.branch));
        if (!matched) return;
        relations.push({
          id: relationId(`branch-${definition.type}`, branchMembers),
          category: '地支',
          type: definition.type,
          name: `${left.branch}${right.branch}${definition.suffix}`,
          members: branchMembers,
          resultElement: definition.element,
          note: definition.note,
          level: 'pair',
        });
      });

      PAIR_PUNISHMENTS.forEach((definition) => {
        if (!matchesPair(definition.pair, left.branch, right.branch)) return;
        relations.push({
          id: relationId('branch-punishment', branchMembers),
          category: '地支',
          type: '相刑',
          name: definition.name,
          members: branchMembers,
          note: '确认成对刑象；若三支齐全，系统还会单列完整三刑。',
          level: 'pair',
        });
      });
    }
  }

  TRIPLES.forEach((definition) => {
    const selected: RelationMember[] = [];
    const used = new Set<number>();
    for (const char of definition.chars) {
      const index = pillars.findIndex((pillar, pillarIndex) => pillar.branch === char && !used.has(pillarIndex));
      if (index < 0) return;
      used.add(index);
      selected.push({ pillar: pillars[index].label, char });
    }
    relations.push({
      id: relationId(`triple-${definition.type}`, selected),
      category: '组合',
      type: definition.type,
      name: definition.name,
      members: selected,
      resultElement: 'element' in definition ? definition.element : undefined,
      note: definition.note,
      level: 'triple',
    });
  });

  pillars.forEach((pillar, index) => {
    if (!SELF_PUNISHMENTS.has(pillar.branch)) return;
    const same = pillars.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.branch === pillar.branch);
    if (same < 0) return;
    const members: RelationMember[] = [
      { pillar: pillar.label, char: pillar.branch },
      { pillar: pillars[same].label, char: pillars[same].branch },
    ];
    relations.push({
      id: relationId('self-punishment', members),
      category: '地支',
      type: '自刑',
      name: `${pillar.branch}${pillar.branch}自刑`,
      members,
      note: '同支重复形成自刑结构；强弱与应事另行判断。',
      level: 'self',
    });
  });

  const seen = new Set<string>();
  return relations.filter((relation) => {
    const key = `${relation.type}:${relation.members.map((item) => normalizePair(item.pillar, item.char)).join('|')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
