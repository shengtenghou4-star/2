import { Solar } from 'lunar-javascript';
import {
  BRANCH_ELEMENT,
  HIDDEN_STEMS,
  STEM_META,
  STEMS,
  BRANCHES,
  growthStage,
  naYin,
  tenGod,
  xun,
  xunKong,
  type Element,
  type Polarity,
} from './foundations';
import { detectShenSha, type ShenShaHit } from './shensha';

export type PillarLayer = '原局' | '大运' | '流年' | '流月';

export interface HiddenStemDetail {
  stem: string;
  element: Element;
  polarity: Polarity;
  tenGod: string;
  rank: '本气' | '中气' | '余气';
}

export interface TemporalPillar {
  id: string;
  label: string;
  layer: PillarLayer;
  ganZhi: string;
  stem: string;
  branch: string;
  stemElement: Element;
  stemPolarity: Polarity;
  branchElement: Element;
  tenGod: string;
  hiddenStems: HiddenStemDetail[];
  naYin: string;
  growthStage: string;
  xun: string;
  xunKong: string;
  shenSha: ShenShaHit[];
}

export interface NatalReferences {
  dayStem: string;
  yearBranch: string;
  dayBranch: string;
}

export interface FlowMonth {
  index: number;
  name: string;
  startTerm: string;
  startText: string;
  endTerm: string;
  endText: string;
  pillar: TemporalPillar;
}

const TERM_CACHE = new Map<string, any>();
const JIE_NAMES = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'] as const;
const YEAR_MONTH_START: Record<string, string> = {
  甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚',
  丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲',
};

export function buildTemporalPillar(id: string, label: string, layer: PillarLayer, ganZhi: string, references: NatalReferences): TemporalPillar {
  const stem = ganZhi[0];
  const branch = ganZhi[1];
  const stemMeta = STEM_META[stem];
  const branchElement = BRANCH_ELEMENT[branch];
  if (!stemMeta || !branchElement) throw new Error(`无法识别干支：${ganZhi}`);

  return {
    id, label, layer, ganZhi, stem, branch,
    stemElement: stemMeta.element,
    stemPolarity: stemMeta.polarity,
    branchElement,
    tenGod: stem === references.dayStem ? '比肩' : tenGod(references.dayStem, stem),
    hiddenStems: HIDDEN_STEMS[branch].map((item) => ({
      ...item,
      element: STEM_META[item.stem].element,
      polarity: STEM_META[item.stem].polarity,
      tenGod: tenGod(references.dayStem, item.stem),
    })),
    naYin: naYin(ganZhi),
    growthStage: growthStage(references.dayStem, branch),
    xun: xun(ganZhi),
    xunKong: xunKong(ganZhi),
    shenSha: detectShenSha(references.dayStem, references.yearBranch, references.dayBranch, branch),
  };
}

function solarTerm(year: number, name: string): any {
  const key = `${year}-${name}`;
  const cached = TERM_CACHE.get(key);
  if (cached) return cached;
  const table = Solar.fromYmd(year, 6, 15).getLunar().getJieQiTable();
  const term = table[name];
  if (!term || term.getYear() !== year) {
    const winterTable = Solar.fromYmd(year, 1, 15).getLunar().getJieQiTable();
    const winterTerm = winterTable[name];
    if (!winterTerm || winterTerm.getYear() !== year) throw new Error(`无法取得 ${year} 年${name}交节时间。`);
    TERM_CACHE.set(key, winterTerm);
    return winterTerm;
  }
  TERM_CACHE.set(key, term);
  return term;
}

export function buildFlowMonths(year: number, yearGanZhi: string, references: NatalReferences): FlowMonth[] {
  const startStemIndex = STEMS.indexOf(YEAR_MONTH_START[yearGanZhi[0]] as typeof STEMS[number]);
  if (startStemIndex < 0) throw new Error(`无法由流年 ${yearGanZhi} 推导流月。`);
  const names = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  return Array.from({ length: 12 }, (_, index) => {
    const startYear = index >= 11 ? year + 1 : year;
    const endYear = index >= 10 ? year + 1 : year;
    const startTerm = JIE_NAMES[index];
    const endTerm = index === 11 ? '立春' : JIE_NAMES[index + 1];
    const start = solarTerm(startYear, startTerm);
    const end = solarTerm(endYear, endTerm);
    const ganZhi = `${STEMS[(startStemIndex + index) % 10]}${BRANCHES[(2 + index) % 12]}`;
    return {
      index,
      name: `${names[index]}月`,
      startTerm,
      startText: start.toYmdHms(),
      endTerm,
      endText: end.toYmdHms(),
      pillar: buildTemporalPillar(`liuyue-${year}-${index}`, `${year} ${names[index]}月`, '流月', ganZhi, references),
    };
  });
}
