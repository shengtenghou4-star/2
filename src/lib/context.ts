import type { BaziChart, LuckCycle, LuckYear } from './bazi';
import { buildElementInteractions, detectRelations, type ChartRelation, type ElementInteraction } from './relations';
import { buildFlowMonths, type FlowMonth, type TemporalPillar } from './timeline';

export interface LuckContext {
  cycle: LuckCycle;
  year: LuckYear;
  months: FlowMonth[];
  month: FlowMonth;
  nodes: TemporalPillar[];
  relations: ChartRelation[];
  elementInteractions: ElementInteraction[];
}

export function buildLuckContext(chart: BaziChart, cycleIndex = 0, yearIndex = 0, monthIndex = 0): LuckContext {
  const cycle = chart.luck.cycles[cycleIndex] ?? chart.luck.cycles[0];
  if (!cycle) throw new Error('命盘没有可用大运。');
  const year = cycle.years[yearIndex] ?? cycle.years[0];
  if (!year) throw new Error('大运没有可用流年。');
  const references = {
    dayStem: chart.pillars[2].stem,
    yearBranch: chart.pillars[0].branch,
    dayBranch: chart.pillars[2].branch,
  };
  const months = buildFlowMonths(year.year, year.ganZhi, references);
  const month = months[monthIndex] ?? months[0];
  const nodes: TemporalPillar[] = [...chart.pillars, cycle.pillar, year.pillar, month.pillar];
  return {
    cycle,
    year,
    months,
    month,
    nodes,
    relations: detectRelations(nodes),
    elementInteractions: buildElementInteractions(nodes),
  };
}
