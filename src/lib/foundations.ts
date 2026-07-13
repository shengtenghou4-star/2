export type Element = '木' | '火' | '土' | '金' | '水';
export type Polarity = '阳' | '阴';
export type HiddenStemRank = '本气' | '中气' | '余气';

export interface StemMeta {
  element: Element;
  polarity: Polarity;
}

export interface HiddenStemBase {
  stem: string;
  rank: HiddenStemRank;
}

export interface ElementRelation {
  type: '同类' | '生' | '克';
  sourceElement: Element;
  targetElement: Element;
  sourceAction: string;
  targetAction: string;
}

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const STEM_META: Record<string, StemMeta> = {
  甲: { element: '木', polarity: '阳' }, 乙: { element: '木', polarity: '阴' },
  丙: { element: '火', polarity: '阳' }, 丁: { element: '火', polarity: '阴' },
  戊: { element: '土', polarity: '阳' }, 己: { element: '土', polarity: '阴' },
  庚: { element: '金', polarity: '阳' }, 辛: { element: '金', polarity: '阴' },
  壬: { element: '水', polarity: '阳' }, 癸: { element: '水', polarity: '阴' },
};

export const BRANCH_ELEMENT: Record<string, Element> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const hidden = (stems: string[]): HiddenStemBase[] => stems.map((stem, index) => ({
  stem,
  rank: index === 0 ? '本气' : index === 1 ? '中气' : '余气',
}));

export const HIDDEN_STEMS: Record<string, HiddenStemBase[]> = {
  子: hidden(['癸']), 丑: hidden(['己', '癸', '辛']), 寅: hidden(['甲', '丙', '戊']),
  卯: hidden(['乙']), 辰: hidden(['戊', '乙', '癸']), 巳: hidden(['丙', '庚', '戊']),
  午: hidden(['丁', '己']), 未: hidden(['己', '丁', '乙']), 申: hidden(['庚', '壬', '戊']),
  酉: hidden(['辛']), 戌: hidden(['戊', '辛', '丁']), 亥: hidden(['壬', '甲']),
};

const GENERATES: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export function generatedElement(element: Element): Element {
  return GENERATES[element];
}

export function controlledElement(element: Element): Element {
  return CONTROLS[element];
}

export function generatorElement(element: Element): Element {
  return (Object.entries(GENERATES).find(([, target]) => target === element)?.[0] ?? element) as Element;
}

export function controllerElement(element: Element): Element {
  return (Object.entries(CONTROLS).find(([, target]) => target === element)?.[0] ?? element) as Element;
}

export function elementRelation(sourceElement: Element, targetElement: Element): ElementRelation {
  if (sourceElement === targetElement) {
    return { type: '同类', sourceElement, targetElement, sourceAction: '同类', targetAction: '同类' };
  }
  if (GENERATES[sourceElement] === targetElement) {
    return { type: '生', sourceElement, targetElement, sourceAction: '生出／泄', targetAction: '受生' };
  }
  if (GENERATES[targetElement] === sourceElement) {
    return { type: '生', sourceElement: targetElement, targetElement: sourceElement, sourceAction: '受生', targetAction: '生出／泄' };
  }
  if (CONTROLS[sourceElement] === targetElement) {
    return { type: '克', sourceElement, targetElement, sourceAction: '克制', targetAction: '受克／耗' };
  }
  return { type: '克', sourceElement: targetElement, targetElement: sourceElement, sourceAction: '受克／耗', targetAction: '克制' };
}

export function tenGod(dayStem: string, targetStem: string): string {
  if (dayStem === targetStem) return '比肩';
  const day = STEM_META[dayStem];
  const target = STEM_META[targetStem];
  if (!day || !target) return '';
  const samePolarity = day.polarity === target.polarity;

  if (day.element === target.element) return samePolarity ? '比肩' : '劫财';
  if (GENERATES[day.element] === target.element) return samePolarity ? '食神' : '伤官';
  if (GENERATES[target.element] === day.element) return samePolarity ? '偏印' : '正印';
  if (CONTROLS[day.element] === target.element) return samePolarity ? '偏财' : '正财';
  return samePolarity ? '七杀' : '正官';
}

const GROWTH_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const GROWTH_START: Record<string, string> = {
  甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅',
  己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯',
};

export function growthStage(dayStem: string, branch: string): string {
  const start = BRANCHES.indexOf(GROWTH_START[dayStem] as typeof BRANCHES[number]);
  const target = BRANCHES.indexOf(branch as typeof BRANCHES[number]);
  if (start < 0 || target < 0) return '';
  const forward = STEM_META[dayStem]?.polarity === '阳';
  const offset = forward ? (target - start + 12) % 12 : (start - target + 12) % 12;
  return GROWTH_STAGES[offset];
}

export const JIA_ZI: string[] = Array.from({ length: 60 }, (_, index) => `${STEMS[index % 10]}${BRANCHES[index % 12]}`);

const NAYIN = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

const XUN = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
const XUN_KONG = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'];

export function jiaZiIndex(ganZhi: string): number {
  return JIA_ZI.indexOf(ganZhi);
}

export function naYin(ganZhi: string): string {
  const index = jiaZiIndex(ganZhi);
  return index < 0 ? '' : NAYIN[Math.floor(index / 2)];
}

export function xun(ganZhi: string): string {
  const index = jiaZiIndex(ganZhi);
  return index < 0 ? '' : XUN[Math.floor(index / 10)];
}

export function xunKong(ganZhi: string): string {
  const index = jiaZiIndex(ganZhi);
  return index < 0 ? '' : XUN_KONG[Math.floor(index / 10)];
}
