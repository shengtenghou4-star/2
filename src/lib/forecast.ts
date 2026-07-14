import type { BaziChart, LuckCycle, LuckYear } from './bazi';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEnergyAssessment } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { detectRelations } from './relations';
import { buildStrengthAdjudication } from './strength-audited';
import { buildFlowMonths, type FlowMonth, type TemporalPillar } from './timeline';

export const FORECAST_MODEL_VERSION = 'MJ-T1.0.0';

export interface ForecastPoint {
  id: string;
  year: number;
  age: number;
  ganZhi: string;
  cycleGanZhi: string;
  theme: string;
  dominantChange: string;
  opportunity: number;
  pressure: number;
  change: number;
  stability: number;
  supportPercent: number;
  relationCount: number;
  contestedPercent: number;
  note: string;
}

export interface ForecastMonthPoint {
  id: string;
  index: number;
  name: string;
  ganZhi: string;
  startText: string;
  endText: string;
  theme: string;
  opportunity: number;
  pressure: number;
  change: number;
  note: string;
}

export interface LifeForecast {
  version: string;
  points: ForecastPoint[];
  peaks: ForecastPoint[];
  pressureWindows: ForecastPoint[];
  transitionWindows: ForecastPoint[];
  notes: string[];
}

const round = (value: number, digits = 2) => {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
};
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function annualNodes(chart: BaziChart, cycle: LuckCycle, year: LuckYear): TemporalPillar[] {
  return [...chart.pillars, cycle.pillar, year.pillar];
}

function themeFromFamily(family: string, delta: number): string {
  const direction = delta >= 0 ? '增强' : '回落';
  const names: Record<string, string> = {
    印星: `学习、资质与支持系统${direction}`,
    食伤: `表达、产品与成果输出${direction}`,
    财星: `客户、资源与经营结果${direction}`,
    官杀: `责任、规则与组织压力${direction}`,
    比劫: `自主、竞争与同侪关系${direction}`,
  };
  return names[family] ?? `结构重心${direction}`;
}

function scoreNodes(chart: BaziChart, nodes: TemporalPillar[], cycleGanZhi: string, year: number, age: number, ganZhi: string): ForecastPoint {
  const relations = detectRelations(nodes);
  const natalEvidence = buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations);
  const currentEvidence = buildEvidenceSnapshot(chart.pillars, nodes, relations);
  const natalDynamics = buildDynamicsSnapshot(chart.pillars, chart.relations, natalEvidence);
  const currentDynamics = buildDynamicsSnapshot(nodes, relations, currentEvidence);
  const natalStrength = buildStrengthAdjudication(chart.pillars, chart.pillars, chart.relations, natalEvidence, natalDynamics);
  const currentStrength = buildStrengthAdjudication(chart.pillars, nodes, relations, currentEvidence, currentDynamics);
  const energy = buildEnergyAssessment(chart.pillars, nodes, chart.relations, relations, natalEvidence, currentEvidence);
  const deltas = energy.delta.slice().sort((a, b) => Math.abs(b.percentagePointDelta) - Math.abs(a.percentagePointDelta));
  const leading = deltas[0];
  const family = energy.current.elements.find((item) => item.element === leading.element)?.family ?? '结构';
  const wealth = energy.current.elements.find((item) => item.family === '财星')!.percentage;
  const output = energy.current.elements.find((item) => item.family === '食伤')!.percentage;
  const authority = energy.current.elements.find((item) => item.family === '官杀')!.percentage;
  const resource = energy.current.elements.find((item) => item.family === '印星')!.percentage;
  const positiveRelations = relations.filter((item) => ['五合', '六合', '三合', '三会', '半合', '拱合'].includes(item.type)).length;
  const conflictRelations = relations.filter((item) => ['相冲', '六冲', '六害', '六破', '相刑', '三刑', '自刑'].includes(item.type)).length;
  const support = currentStrength.supportRatio * 100;
  const opportunity = clamp(22 + output * 0.75 + wealth * 0.82 + resource * 0.28 + positiveRelations * 2.5 - conflictRelations * 1.5 - (support < 32 ? 6 : 0));
  const pressure = clamp(14 + authority * 1.05 + conflictRelations * 5.5 + energy.current.contestedPercent * 0.32 + Math.max(0, 38 - support) * 0.48);
  const change = clamp(12 + deltas.reduce((sum, item) => sum + Math.abs(item.percentagePointDelta), 0) * 1.75 + relations.filter((item) => item.scope === '岁运介入').length * 2.2);
  const stability = clamp(100 - change * 0.55 - pressure * 0.25 + energy.current.balanceScore * 0.35);
  const theme = themeFromFamily(family, leading.percentagePointDelta);
  const note = opportunity - pressure >= 15
    ? '机会信号高于压力信号，适合在资源和承载清楚的前提下主动推进。'
    : pressure - opportunity >= 15
      ? '压力信号高于机会信号，优先控制责任、关系冲突和现金流，不宜只看表面机会。'
      : change >= 65
        ? '机会与压力并存，但结构变化较大；适合分阶段决策并保留回撤空间。'
        : '整体信号较均衡，重点在持续积累和稳定执行。';

  void natalStrength;
  return {
    id: `forecast:${year}:${ganZhi}`,
    year,
    age,
    ganZhi,
    cycleGanZhi,
    theme,
    dominantChange: `${leading.element}${leading.percentagePointDelta >= 0 ? '+' : ''}${leading.percentagePointDelta.toFixed(2)}pp`,
    opportunity: round(opportunity),
    pressure: round(pressure),
    change: round(change),
    stability: round(stability),
    supportPercent: round(support),
    relationCount: relations.filter((item) => item.scope === '岁运介入').length,
    contestedPercent: energy.current.contestedPercent,
    note,
  };
}

export function buildLifeForecast(chart: BaziChart): LifeForecast {
  const points = chart.luck.cycles.flatMap((cycle) => cycle.years.map((year) =>
    scoreNodes(chart, annualNodes(chart, cycle, year), cycle.ganZhi, year.year, year.age, year.ganZhi),
  ));
  const peaks = points.slice().sort((a, b) => (b.opportunity - b.pressure * 0.35) - (a.opportunity - a.pressure * 0.35)).slice(0, 8);
  const pressureWindows = points.slice().sort((a, b) => b.pressure - a.pressure).slice(0, 8);
  const transitionWindows = points.slice().sort((a, b) => b.change - a.change).slice(0, 8);
  return {
    version: FORECAST_MODEL_VERSION,
    points,
    peaks,
    pressureWindows,
    transitionWindows,
    notes: [
      '机会、压力、变化和稳定是结构信号，不是事件概率，也不保证升职、结婚或破财。',
      '年度评分不加入流月，避免把某个月的材料误写成全年状态。',
      '时间轴用于比较同一命盘不同年份，不建议跨用户直接比较绝对分数。',
    ],
  };
}

function scoreMonth(chart: BaziChart, cycle: LuckCycle, year: LuckYear, month: FlowMonth): ForecastMonthPoint {
  const annual = scoreNodes(chart, [...chart.pillars, cycle.pillar, year.pillar, month.pillar], cycle.ganZhi, year.year, year.age, `${year.ganZhi}${month.pillar.ganZhi}`);
  return {
    id: `forecast-month:${year.year}:${month.index}`,
    index: month.index,
    name: month.name,
    ganZhi: month.pillar.ganZhi,
    startText: month.startText,
    endText: month.endText,
    theme: annual.theme,
    opportunity: annual.opportunity,
    pressure: annual.pressure,
    change: annual.change,
    note: annual.note,
  };
}

export function buildMonthlyForecast(chart: BaziChart, cycleIndex: number, yearIndex: number): ForecastMonthPoint[] {
  const cycle = chart.luck.cycles[cycleIndex] ?? chart.luck.cycles[0];
  const year = cycle.years[yearIndex] ?? cycle.years[0];
  const references = {
    dayStem: chart.pillars[2].stem,
    yearBranch: chart.pillars[0].branch,
    dayBranch: chart.pillars[2].branch,
  };
  const months = buildFlowMonths(year.year, year.ganZhi, references);
  return months.map((month) => scoreMonth(chart, cycle, year, month));
}

export function isValidLifeForecast(value: LifeForecast): boolean {
  return value.points.length >= 80 && value.points.every((item) => [item.opportunity, item.pressure, item.change, item.stability].every((score) => Number.isFinite(score) && score >= 0 && score <= 100));
}
