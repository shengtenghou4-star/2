import { describe, expect, it } from 'vitest';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEnergyAssessment } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { BRANCHES, JIA_ZI, STEMS } from './foundations';
import { buildInterpretationAssessment } from './interpretation-audited';
import { buildCoreReport, isValidCoreReport } from './report-audited';
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

function buildReport(natal: TemporalPillar[]) {
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
  return buildCoreReport({
    natalNodes: natal,
    contextNodes: natal,
    natalStrength: strength,
    currentStrength: strength,
    interpretation,
    energy,
  });
}

describe('complete core-report structural domain', () => {
  it('generates a valid non-empty evidence-backed report for all 103,680 structural states', () => {
    const errors: string[] = [];
    const strengthLabels = new Set<string>();
    const patternLabels = new Set<string>();
    const dominantElements = new Set<string>();
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
              const report = buildReport(natalNodes([yearPillar, month, dayPillar, hour]));
              strengthLabels.add(report.verdicts.strength.label);
              patternLabels.add(report.verdicts.pattern.label);
              dominantElements.add(report.verdicts.energy.label[0]);

              if (!isValidCoreReport(report)) errors.push(`${label}: invalid report`);
              if (!report.headline.includes(`${dayStem}`)) errors.push(`${label}: headline missing day master`);
              if (report.verdicts.strength.label.includes('候选')) errors.push(`${label}: raw candidate label exposed`);
              if (!report.strengths.length || !report.tensions.length || !report.overturnConditions.length) errors.push(`${label}: empty core section`);
              if (report.confidenceScore < 0 || report.confidenceScore > 100) errors.push(`${label}: confidence out of range`);
              if (new Set(report.evidenceIndex.map((item) => item.id)).size !== report.evidenceIndex.length) errors.push(`${label}: duplicate evidence ids`);
            } catch (error) {
              errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
            }
          });
        });
      });
    });

    expect(cases).toBe(103_680);
    expect(strengthLabels).toEqual(new Set(['身旺', '偏强', '中和', '偏弱', '身弱', '从强结构', '从弱结构']));
    expect(patternLabels.size).toBeGreaterThanOrEqual(10);
    expect(dominantElements).toEqual(new Set(['木', '火', '土', '金', '水']));
    expect(errors.slice(0, 30)).toEqual([]);
  }, 180_000);
});
