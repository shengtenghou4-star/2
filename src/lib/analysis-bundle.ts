import type { BaziChart } from './bazi';
import type { LuckContext } from './context';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEnergyAssessment } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { buildInterpretationAssessment } from './interpretation-audited';
import { buildStrengthAdjudication } from './strength-audited';

export function buildAnalysisBundle(chart: BaziChart, context: LuckContext) {
  const natalEvidence = buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations);
  const currentEvidence = buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations);
  const natalDynamics = buildDynamicsSnapshot(chart.pillars, chart.relations, natalEvidence);
  const currentDynamics = buildDynamicsSnapshot(context.nodes, context.relations, currentEvidence);
  const natalStrength = buildStrengthAdjudication(
    chart.pillars,
    chart.pillars,
    chart.relations,
    natalEvidence,
    natalDynamics,
  );
  const currentStrength = buildStrengthAdjudication(
    chart.pillars,
    context.nodes,
    context.relations,
    currentEvidence,
    currentDynamics,
  );
  const interpretation = buildInterpretationAssessment(
    chart.pillars,
    context.nodes,
    chart.relations,
    context.relations,
    natalEvidence,
    currentEvidence,
    natalDynamics,
    currentDynamics,
    natalStrength,
    currentStrength,
  );
  const energy = buildEnergyAssessment(
    chart.pillars,
    context.nodes,
    chart.relations,
    context.relations,
    natalEvidence,
    currentEvidence,
  );
  return {
    natalEvidence,
    currentEvidence,
    natalDynamics,
    currentDynamics,
    natalStrength,
    currentStrength,
    interpretation,
    energy,
  };
}

export type AnalysisBundle = ReturnType<typeof buildAnalysisBundle>;
