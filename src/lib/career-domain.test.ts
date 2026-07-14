import { describe, expect, it } from 'vitest';
import { buildCareerAssessment, isValidCareerAssessment } from './career';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEnergyAssessment } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { BRANCHES, JIA_ZI, STEMS } from './foundations';
import { buildInterpretationAssessment } from './interpretation-audited';
import { detectRelations } from './relations';
import { buildStrengthAdjudication } from './strength-audited';
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

function buildAssessment(natal: TemporalPillar[]) {
  const relations = detectRelations(natal);
  const evidence = buildEvidenceSnapshot(natal, natal, relations);
  const dynamics = buildDynamicsSnapshot(natal, relations, evidence);
  const strength = buildStrengthAdjudication(natal, natal, relations, evidence, dynamics);
  const interpretation = buildInterpretationAssessment(
    natal,
    natal,
    relations,
    relations,
    evidence,
    evidence,
    dynamics,
    dynamics,
    strength,
    strength,
  );
  const energy = buildEnergyAssessment(natal, natal, relations, relations, evidence, evidence);
  return buildCareerAssessment({
    natalNodes: natal,
    contextNodes: natal,
    natalEvidence: evidence,
    currentEvidence: evidence,
    natalDynamics: dynamics,
    currentDynamics: dynamics,
    natalStrength: strength,
    currentStrength: strength,
    interpretation,
    energy,
  });
}

describe('complete career-topic structural domain', () => {
  it('produces valid ranked career mechanisms for all 103,680 structural states', () => {
    const errors: string[] = [];
    const primaryFamilies = new Set<string>();
    const secondaryFamilies = new Set<string>();
    const environmentTitles = new Set<string>();
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
            const label = `${yearPillar} ${month} ${dayPillar} ${hour}`;
            cases += 1;
            try {
              const assessment = buildAssessment(natalNodes([yearPillar, month, dayPillar, hour]));
              primaryFamilies.add(assessment.primaryMode.family);
              secondaryFamilies.add(assessment.secondaryMode.family);
              assessment.environments.forEach((item) => environmentTitles.add(item.title));

              if (!isValidCareerAssessment(assessment)) errors.push(`${label}: invalid assessment`);
              if (assessment.modes.some((item, index) => index > 0 && assessment.modes[index - 1].score < item.score)) errors.push(`${label}: unsorted scores`);
              if (assessment.primaryMode.family === assessment.secondaryMode.family) errors.push(`${label}: duplicate top families`);
              if (!assessment.environments.length || !assessment.risks.length || !assessment.pathways.length) errors.push(`${label}: empty product section`);
              if (assessment.confidenceScore < 0 || assessment.confidenceScore > 100) errors.push(`${label}: confidence out of range`);
              if (assessment.modes.some((item) => item.score < 0 || item.score > 100 || !Number.isFinite(item.score))) errors.push(`${label}: invalid mode score`);
              if (/你必须从事|唯一职业|命中注定/.test(JSON.stringify(assessment))) errors.push(`${label}: deterministic career claim`);
            } catch (error) {
              errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
          });
        });
      });
    });

    expect(cases).toBe(103_680);
    expect(primaryFamilies).toEqual(new Set(['印星', '食伤', '财星', '官杀', '比劫']));
    expect(secondaryFamilies.size).toBe(5);
    expect(environmentTitles.size).toBeGreaterThanOrEqual(10);
    expect(errors.slice(0, 30)).toEqual([]);
  }, 240_000);
});
