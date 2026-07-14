import { describe, expect, it } from 'vitest';
import { buildAnalysisForNodes } from './analysis-bundle';
import type { BaziChart } from './bazi';
import type { LuckContext } from './context';
import { BRANCHES, JIA_ZI, STEMS } from './foundations';
import { buildRelationshipProfile } from './relationship';
import { detectRelations } from './relations';
import { buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';
import { buildWealthAssessment, isValidWealthAssessment } from './wealth';

const MONTH_START_STEM: Record<string, string> = {
  甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲',
};
const HOUR_START_STEM: Record<string, string> = {
  甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊', 辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬',
};

function monthPillar(yearStem: string, monthBranch: string): string {
  const branchIndex = BRANCHES.indexOf(monthBranch as typeof BRANCHES[number]);
  const offset = (branchIndex - 2 + 12) % 12;
  const startIndex = STEMS.indexOf(MONTH_START_STEM[yearStem] as typeof STEMS[number]);
  return `${STEMS[(startIndex + offset) % 10]}${monthBranch}`;
}

function hourPillar(dayStem: string, hourBranch: string): string {
  const branchIndex = BRANCHES.indexOf(hourBranch as typeof BRANCHES[number]);
  const startIndex = STEMS.indexOf(HOUR_START_STEM[dayStem] as typeof STEMS[number]);
  return `${STEMS[(startIndex + branchIndex) % 10]}${hourBranch}`;
}

function natalNodes(ganZhi: [string, string, string, string]): TemporalPillar[] {
  const references: NatalReferences = { dayStem: ganZhi[2][0], yearBranch: ganZhi[0][1], dayBranch: ganZhi[2][1] };
  return ganZhi.map((item, index) => buildTemporalPillar(`natal-${index}`, ['年柱', '月柱', '日柱', '时柱'][index], '原局', item, references));
}

function fakeChart(nodes: TemporalPillar[]): BaziChart {
  const relations = detectRelations(nodes);
  return {
    input: {} as BaziChart['input'], civilSolarInput: {} as BaziChart['input'], effectiveInput: {} as BaziChart['input'], timeCorrection: {} as BaziChart['timeCorrection'],
    solarText: 'synthetic', lunarText: 'synthetic', zodiac: '', dayMaster: nodes[2].stem,
    pillars: nodes as BaziChart['pillars'], relations, elementInteractions: [],
    prevJie: { name: '', datetime: '' }, nextJie: { name: '', datetime: '' }, prevQi: { name: '', datetime: '' }, nextQi: { name: '', datetime: '' },
    auxiliary: { taiYuan: '', taiXi: '', mingGong: '', shenGong: '' },
    luck: { forward: true, startText: '', startSolar: '', cycles: [] },
  };
}

function fakeContext(nodes: TemporalPillar[], chart: BaziChart): LuckContext {
  return { cycle: {} as LuckContext['cycle'], year: {} as LuckContext['year'], months: [], month: {} as LuckContext['month'], nodes, relations: chart.relations, elementInteractions: [] };
}

describe('complete consumer single-chart topic domain', () => {
  it('produces valid wealth and relationship outputs for all 103,680 structural states', () => {
    const errors: string[] = [];
    const wealthLeaders = new Set<string>();
    const relationshipLeaders = new Set<string>();
    let cases = 0;

    JIA_ZI.forEach((dayPillar, dayIndex) => {
      BRANCHES.forEach((yearBranch, yearIndex) => {
        const yearVariants = JIA_ZI.filter((item) => item[1] === yearBranch);
        const yearPillar = yearVariants[(dayIndex + yearIndex) % yearVariants.length];
        BRANCHES.forEach((monthBranch) => {
          const month = monthPillar(yearPillar[0], monthBranch);
          BRANCHES.forEach((hourBranch) => {
            const hour = hourPillar(dayPillar[0], hourBranch);
            const label = `${yearPillar} ${month} ${dayPillar} ${hour}`;
            cases += 1;
            try {
              const nodes = natalNodes([yearPillar, month, dayPillar, hour]);
              const chart = fakeChart(nodes);
              const bundle = buildAnalysisForNodes(chart, nodes, chart.relations);
              const wealth = buildWealthAssessment(chart, fakeContext(nodes, chart), bundle);
              const relationship = buildRelationshipProfile(bundle);
              wealthLeaders.add(wealth.axes[0].id);
              relationshipLeaders.add(relationship.axes[0].id);
              if (!isValidWealthAssessment(wealth)) errors.push(`${label}: invalid wealth`);
              if (relationship.axes.length !== 5 || relationship.needs.length === 0 || relationship.risks.length === 0) errors.push(`${label}: invalid relationship`);
              const consumerText = JSON.stringify({
                wealth: {
                  headline: wealth.headline,
                  summary: wealth.summary,
                  axes: wealth.axes,
                  channels: wealth.channels,
                  risks: wealth.risks,
                  temporalSignals: wealth.temporalSignals,
                },
                relationship: {
                  headline: relationship.headline,
                  summary: relationship.summary,
                  axes: relationship.axes,
                  needs: relationship.needs,
                  risks: relationship.risks,
                },
              });
              if (/必然富有|保证赚钱|保证收益|你们天生一对|一定分手|生肖不合所以/.test(consumerText)) errors.push(`${label}: deterministic claim`);
              if (!wealth.notes.some((note) => note.includes('不预测具体财富金额'))) errors.push(`${label}: missing wealth boundary`);
              if (!relationship.notes.some((note) => note.includes('不能由生肖'))) errors.push(`${label}: missing relationship boundary`);
            } catch (error) {
              errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
          });
        });
      });
    });

    expect(cases).toBe(103_680);
    expect(wealthLeaders.size).toBeGreaterThanOrEqual(4);
    expect(relationshipLeaders.size).toBeGreaterThanOrEqual(4);
    expect(errors.slice(0, 30)).toEqual([]);
  }, 300_000);
});
