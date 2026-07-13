export type ShenShaCategory = '贵人' | '才学' | '行动' | '情缘' | '权势' | '孤高' | '风险' | '禄刃';

export interface ShenShaHit {
  name: string;
  category: ShenShaCategory;
  basis: string;
  reference: string;
  target: string;
  note: string;
}

const DAY_STEM_BRANCH_STARS: Array<{
  name: string;
  category: ShenShaCategory;
  map: Record<string, string[]>;
  note: string;
}> = [
  {
    name: '天乙贵人', category: '贵人',
    map: {
      甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
      乙: ['子', '申'], 己: ['子', '申'],
      丙: ['亥', '酉'], 丁: ['亥', '酉'],
      壬: ['卯', '巳'], 癸: ['卯', '巳'], 辛: ['寅', '午'],
    },
    note: '按日干查地支，只记录落点，不直接作吉凶判断。',
  },
  {
    name: '文昌贵人', category: '才学',
    map: { 甲: ['巳'], 乙: ['午'], 丙: ['申'], 丁: ['酉'], 戊: ['申'], 己: ['酉'], 庚: ['亥'], 辛: ['子'], 壬: ['寅'], 癸: ['卯'] },
    note: '按日干查文昌落支，仅作结构标记。',
  },
  {
    name: '禄神', category: '禄刃',
    map: { 甲: ['寅'], 乙: ['卯'], 丙: ['巳'], 丁: ['午'], 戊: ['巳'], 己: ['午'], 庚: ['申'], 辛: ['酉'], 壬: ['亥'], 癸: ['子'] },
    note: '按日干查临官禄位。',
  },
  {
    name: '羊刃', category: '禄刃',
    map: { 甲: ['卯'], 乙: ['寅'], 丙: ['午'], 丁: ['巳'], 戊: ['午'], 己: ['巳'], 庚: ['酉'], 辛: ['申'], 壬: ['子'], 癸: ['亥'] },
    note: '采用常见十干羊刃表；流派存在差异，故只标记不下断语。',
  },
];

const GROUPS: Array<{
  branches: string;
  stars: Array<{ name: string; branch: string; category: ShenShaCategory; note: string }>;
}> = [
  {
    branches: '申子辰',
    stars: [
      { name: '驿马', branch: '寅', category: '行动', note: '三合局取驿马。' },
      { name: '桃花', branch: '酉', category: '情缘', note: '三合局取咸池桃花。' },
      { name: '华盖', branch: '辰', category: '孤高', note: '三合局取墓库为华盖。' },
      { name: '将星', branch: '子', category: '权势', note: '三合局取旺支为将星。' },
      { name: '劫煞', branch: '巳', category: '风险', note: '按三合局查劫煞。' },
      { name: '亡神', branch: '亥', category: '风险', note: '按三合局查亡神。' },
    ],
  },
  {
    branches: '寅午戌',
    stars: [
      { name: '驿马', branch: '申', category: '行动', note: '三合局取驿马。' },
      { name: '桃花', branch: '卯', category: '情缘', note: '三合局取咸池桃花。' },
      { name: '华盖', branch: '戌', category: '孤高', note: '三合局取墓库为华盖。' },
      { name: '将星', branch: '午', category: '权势', note: '三合局取旺支为将星。' },
      { name: '劫煞', branch: '亥', category: '风险', note: '按三合局查劫煞。' },
      { name: '亡神', branch: '巳', category: '风险', note: '按三合局查亡神。' },
    ],
  },
  {
    branches: '巳酉丑',
    stars: [
      { name: '驿马', branch: '亥', category: '行动', note: '三合局取驿马。' },
      { name: '桃花', branch: '午', category: '情缘', note: '三合局取咸池桃花。' },
      { name: '华盖', branch: '丑', category: '孤高', note: '三合局取墓库为华盖。' },
      { name: '将星', branch: '酉', category: '权势', note: '三合局取旺支为将星。' },
      { name: '劫煞', branch: '寅', category: '风险', note: '按三合局查劫煞。' },
      { name: '亡神', branch: '申', category: '风险', note: '按三合局查亡神。' },
    ],
  },
  {
    branches: '亥卯未',
    stars: [
      { name: '驿马', branch: '巳', category: '行动', note: '三合局取驿马。' },
      { name: '桃花', branch: '子', category: '情缘', note: '三合局取咸池桃花。' },
      { name: '华盖', branch: '未', category: '孤高', note: '三合局取墓库为华盖。' },
      { name: '将星', branch: '卯', category: '权势', note: '三合局取旺支为将星。' },
      { name: '劫煞', branch: '申', category: '风险', note: '按三合局查劫煞。' },
      { name: '亡神', branch: '寅', category: '风险', note: '按三合局查亡神。' },
    ],
  },
];

const HONG_LUAN: Record<string, string> = { 子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌', 午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰' };
const TIAN_XI: Record<string, string> = { 子: '酉', 丑: '申', 寅: '未', 卯: '午', 辰: '巳', 巳: '辰', 午: '卯', 未: '寅', 申: '丑', 酉: '子', 戌: '亥', 亥: '戌' };

function addUnique(hits: ShenShaHit[], hit: ShenShaHit) {
  const existing = hits.find((item) => item.name === hit.name && item.target === hit.target);
  if (!existing) {
    hits.push(hit);
    return;
  }
  if (!existing.basis.includes(hit.basis)) {
    existing.basis = `${existing.basis}、${hit.basis}`;
    existing.reference = `${existing.reference}、${hit.reference}`;
  }
}

function addGroupStars(hits: ShenShaHit[], basis: string, referenceBranch: string, targetBranch: string) {
  const group = GROUPS.find((item) => item.branches.includes(referenceBranch));
  if (!group) return;
  group.stars.forEach((star) => {
    if (star.branch !== targetBranch) return;
    addUnique(hits, {
      name: star.name, category: star.category, basis, reference: referenceBranch, target: targetBranch,
      note: `${star.note} 仅记录命盘落点。`,
    });
  });
}

export function detectShenSha(dayStem: string, yearBranch: string, dayBranch: string, targetBranch: string): ShenShaHit[] {
  const hits: ShenShaHit[] = [];
  DAY_STEM_BRANCH_STARS.forEach((definition) => {
    if (!definition.map[dayStem]?.includes(targetBranch)) return;
    addUnique(hits, { name: definition.name, category: definition.category, basis: '日干', reference: dayStem, target: targetBranch, note: definition.note });
  });
  addGroupStars(hits, '年支', yearBranch, targetBranch);
  addGroupStars(hits, '日支', dayBranch, targetBranch);
  if (HONG_LUAN[yearBranch] === targetBranch) addUnique(hits, { name: '红鸾', category: '情缘', basis: '年支', reference: yearBranch, target: targetBranch, note: '按年支查红鸾落支，仅作结构标记。' });
  if (TIAN_XI[yearBranch] === targetBranch) addUnique(hits, { name: '天喜', category: '情缘', basis: '年支', reference: yearBranch, target: targetBranch, note: '按年支查天喜落支，仅作结构标记。' });
  return hits;
}
