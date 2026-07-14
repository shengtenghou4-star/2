import { describe, expect, it } from 'vitest';
import { buildEnergySnapshot, isValidEnergySnapshot } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { BRANCHES, JIA_ZI, STEMS } from './foundations';
import { detectRelations } from './relations';
import { buildTemporalPillar, type NatalReferences, type TemporalPillar } from './timeline';

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
  const references: NatalReferences = {
    dayStem: ganZhi[2][0],
    yearBranch: ganZhi[0][1],
    dayBranch: ganZhi[2][1],
  };
  return ganZhi.map((item, index) => buildTemporalPillar(
    `natal-${index}`,
    ['年柱', '月柱', '日柱', '时柱'][index],
    '原局',
    item,
    references,
  ));
}

describe('complete quantified-energy structural domain', () => {
  it('produces finite conserved percentages for all 103,680 day-year-month-hour states', () => {
    const errors: string[] = [];
    const dominantSeen = new Set<string>();
    const weakestSeen = new Set<string>();
    let cases = 0;

    JIA_ZI.forEach((dayPillar, dayIndex) => {
      const dayStem = dayPillar[0];
      BRANCHES.forEach((yearBranch, yearIndex) => {
        const yearVariants = JIA_ZI.filter((item) => item[1] === yearBranch);
        const yearPillar = yearVariants[(dayIndex + yearIndex) % yearVariants.length];
        BRANCHES.forEach((monthBranch) => {
          const month = monthPillar(yearPillar[0], monthBranch);
          BRANCHES.forEach((hourBranch) => {
            const hour = hourPillar(dayStem, hourBranch);
            cases += 1;
            try {
              const natal = natalNodes([yearPillar, month, dayPillar, hour]);
              const relations = detectRelations(natal);
              const evidence = buildEvidenceSnapshot(natal, natal, relations);
              const energy = buildEnergySnapshot(natal, natal, relations, evidence);
              dominantSeen.add(energy.dominantElement);
              weakestSeen.add(energy.weakestElement);

              if (!isValidEnergySnapshot(energy)) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: invalid snapshot`);
              if (energy.totalBaseUnits !== 400) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: base ${energy.totalBaseUnits}`);
              if (energy.elements.reduce((sum, item) => sum + item.percentage, 0) !== 100) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: percentage sum`);
              if (Math.abs(energy.balance.supportPercent + energy.balance.oppositionPercent - 100) > 0.01) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: support sum`);
              if (energy.balanceScore < 0 || energy.balanceScore > 100) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: balance score`);
              if (energy.contestedPercent < 0 || energy.contestedPercent > 100) errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: contested percent`);
            } catch (error) {
              errors.push(`${yearPillar} ${month} ${dayPillar} ${hour}: ${error instanceof Error ? error.message : String(error)}`);
            }
          });
        });
      });
    });

    expect(cases).toBe(103_680);
    expect(dominantSeen).toEqual(new Set(['木', '火', '土', '金', '水']));
    expect(weakestSeen).toEqual(new Set(['木', '火', '土', '金', '水']));
    expect(errors.slice(0, 30)).toEqual([]);
  }, 180_000);
});
