import {
  buildCoreReport as buildBaseCoreReport,
  isValidCoreReport as isBaseValidCoreReport,
  type BuildCoreReportInput,
  type CoreReport,
  type ReportEvidenceRef,
  type ReportFinding,
} from './report';

export type {
  BuildCoreReportInput,
  CoreReport,
  EvidenceKind,
  ReportConfidence,
  ReportEvidenceRef,
  ReportFinding,
  ReportFindingKind,
  ReportSeverity,
  ReportVerdict,
} from './report';
export { CORE_REPORT_VERSION } from './report';

function quietStructureFinding(input: BuildCoreReportInput): ReportFinding {
  const current = input.energy.current;
  const leadingAxis = current.balance.supportPercent >= current.balance.oppositionPercent ? '扶身' : '耗泄克身';
  const evidence: ReportEvidenceRef[] = input.currentStrength.evidence
    .filter((item) => item.axis === leadingAxis)
    .sort((left, right) => right.effectiveWeight - left.effectiveWeight)
    .slice(0, 2)
    .map((item) => ({
      id: `report:${item.id}:quiet`,
      kind: item.category === '月令' ? '月令证据' : '力量证据',
      label: item.label,
      detail: `${item.source}；${item.explanation}`,
      layer: item.layer,
      value: item.effectiveWeight,
    }));
  return {
    id: 'finding:tension:distributed',
    kind: '核心矛盾',
    severity: '中性',
    title: '当前未见单一压倒性的结构矛盾',
    summary: `五行均衡度为${current.balanceScore.toFixed(2)}，格局与调候轨暂未形成达到高风险阈值的集中冲突。后续重点不是机械补最弱五行，而是观察岁运如何打破当前平衡。`,
    confidence: '中',
    evidence,
    counterEvidence: [],
  };
}

export function buildCoreReport(input: BuildCoreReportInput): CoreReport {
  const base = buildBaseCoreReport(input);
  if (base.tensions.length > 0) return base;
  const fallback = quietStructureFinding(input);
  const evidenceIndex = [...base.evidenceIndex];
  fallback.evidence.forEach((item) => {
    if (!evidenceIndex.some((existing) => existing.id === item.id)) evidenceIndex.push(item);
  });
  return {
    ...base,
    tensions: [fallback],
    evidenceIndex,
    notes: [
      ...base.notes,
      '完整性审计：当命盘没有达到阈值的集中冲突时，报告明确标记“矛盾分散”，而不是留下空白或虚构风险。',
    ],
  };
}

export function isValidCoreReport(report: CoreReport): boolean {
  return isBaseValidCoreReport(report) && report.tensions.length > 0;
}
