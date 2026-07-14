import type { BaziChart } from './bazi';
import type { LuckContext } from './context';
import { buildDynamicsSnapshot } from './dynamics';
import { buildEnergyAssessment } from './energy';
import { buildEvidenceSnapshot } from './evidence';
import { buildInterpretationAssessment } from './interpretation-audited';
import type { ChartRelation } from './relations';
import { buildStrengthAdjudication } from './strength-audited';
import type { TemporalPillar } from './timeline';

export function buildAnalysisForNodes(chart: BaziChart, nodes: TemporalPillar[], relations: ChartRelation[]) {
  const natalEvidence = buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations);
  const currentEvidence = buildEvidenceSnapshot(chart.pillars, nodes, relations);
  const natalDynamics = buildDynamicsSnapshot(chart.pillars, chart.relations, natalEvidence);
  const currentDynamics = buildDynamicsSnapshot(nodes, relations, currentEvidence);
  const natalStrength = buildStrengthAdjudication(
    chart.pillars,
    chart.pillars,
    chart.relations,
    natalEvidence,
    natalDynamics,
  );
  const currentStrength = buildStrengthAdjudication(
    chart.pillars,
    nodes,
    relations,
    currentEvidence,
    currentDynamics,
  );
  const interpretation = buildInterpretationAssessment(
    chart.pillars,
    nodes,
    chart.relations,
    relations,
    natalEvidence,
    currentEvidence,
    natalDynamics,
    currentDynamics,
    natalStrength,
    currentStrength,
  );
  const energy = buildEnergyAssessment(
    chart.pillars,
    nodes,
    chart.relations,
    relations,
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

export function buildAnalysisBundle(chart: BaziChart, context: LuckContext) {
  return buildAnalysisForNodes(chart, context.nodes, context.relations);
}

export function buildNatalAnalysisBundle(chart: BaziChart) {
  return buildAnalysisForNodes(chart, chart.pillars, chart.relations);
}

export type AnalysisBundle = ReturnType<typeof buildAnalysisForNodes>;
