import { useMemo, useState } from 'react';
import type { BaziChart } from '../lib/bazi';
import type { LuckContext } from '../lib/context';
import { buildDynamicsSnapshot } from '../lib/dynamics';
import { buildEnergyAssessment } from '../lib/energy';
import { buildEvidenceSnapshot } from '../lib/evidence';
import { buildInterpretationAssessment } from '../lib/interpretation-audited';
import { readerFacingText } from '../lib/presentation';
import {
  buildCoreReport,
  type ReportFinding,
  type ReportVerdict,
} from '../lib/report-audited';
import { buildStrengthAdjudication } from '../lib/strength-audited';

function present(text: string, professional: boolean): string {
  return professional ? text : readerFacingText(text);
}

function VerdictCard({ title, verdict, professional }: { title: string; verdict: ReportVerdict; professional: boolean }) {
  return (
    <article className={`core-verdict confidence-${verdict.confidence}`}>
      <header><span>{title}</span><em>{professional ? `可信度 ${verdict.confidence}` : `判断把握 ${verdict.confidence}`}</em></header>
      <b>{present(verdict.label, professional)}</b>
      <p>{present(verdict.detail, professional)}</p>
      {professional && <div><i style={{ width: `${Math.max(2, verdict.score)}%` }} /><span>{verdict.score.toFixed(2)}</span></div>}
    </article>
  );
}

function FindingCard({ finding, professional }: { finding: ReportFinding; professional: boolean }) {
  return (
    <article className={`core-finding severity-${finding.severity}`}>
      <header>
        <span>{present(finding.kind, professional)}</span>
        <em>{professional ? `可信度 ${finding.confidence}` : `把握 ${finding.confidence}`}</em>
      </header>
      <b>{present(finding.title, professional)}</b>
      <p>{present(finding.summary, professional)}</p>
      {professional && (finding.evidence.length > 0 || finding.counterEvidence.length > 0) && (
        <details>
          <summary>查看依据与反证</summary>
          {finding.evidence.length > 0 && (
            <div className="finding-evidence-group">
              <strong>支持依据</strong>
              {finding.evidence.map((item) => (
                <section key={item.id}>
                  <span>{item.kind} · {item.layer}</span>
                  <b>{item.label}</b>
                  <p>{item.detail}</p>
                  {item.value !== undefined && <em>{item.value}</em>}
                </section>
              ))}
            </div>
          )}
          {finding.counterEvidence.length > 0 && (
            <div className="finding-evidence-group counter">
              <strong>反向证据</strong>
              {finding.counterEvidence.map((item) => (
                <section key={item.id}>
                  <span>{item.kind} · {item.layer}</span>
                  <b>{item.label}</b>
                  <p>{item.detail}</p>
                  {item.value !== undefined && <em>{item.value}</em>}
                </section>
              ))}
            </div>
          )}
        </details>
      )}
    </article>
  );
}

export function CoreReportExplorer({ chart, context, professional = false }: { chart: BaziChart; context: LuckContext; professional?: boolean }) {
  const [copied, setCopied] = useState(false);
  const natalEvidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations),
    [chart.pillars, chart.relations],
  );
  const currentEvidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations),
    [chart.pillars, context.nodes, context.relations],
  );
  const natalDynamics = useMemo(
    () => buildDynamicsSnapshot(chart.pillars, chart.relations, natalEvidence),
    [chart.pillars, chart.relations, natalEvidence],
  );
  const currentDynamics = useMemo(
    () => buildDynamicsSnapshot(context.nodes, context.relations, currentEvidence),
    [context.nodes, context.relations, currentEvidence],
  );
  const natalStrength = useMemo(
    () => buildStrengthAdjudication(chart.pillars, chart.pillars, chart.relations, natalEvidence, natalDynamics),
    [chart.pillars, chart.relations, natalEvidence, natalDynamics],
  );
  const currentStrength = useMemo(
    () => buildStrengthAdjudication(chart.pillars, context.nodes, context.relations, currentEvidence, currentDynamics),
    [chart.pillars, context.nodes, context.relations, currentEvidence, currentDynamics],
  );
  const interpretation = useMemo(
    () => buildInterpretationAssessment(
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
    ),
    [
      chart.pillars,
      chart.relations,
      context.nodes,
      context.relations,
      natalEvidence,
      currentEvidence,
      natalDynamics,
      currentDynamics,
      natalStrength,
      currentStrength,
    ],
  );
  const energy = useMemo(
    () => buildEnergyAssessment(
      chart.pillars,
      context.nodes,
      chart.relations,
      context.relations,
      natalEvidence,
      currentEvidence,
    ),
    [chart.pillars, chart.relations, context.nodes, context.relations, natalEvidence, currentEvidence],
  );
  const report = useMemo(
    () => buildCoreReport({
      natalNodes: chart.pillars,
      contextNodes: context.nodes,
      natalStrength,
      currentStrength,
      interpretation,
      energy,
    }),
    [chart.pillars, context.nodes, natalStrength, currentStrength, interpretation, energy],
  );
  const json = useMemo(() => JSON.stringify(report, null, 2), [report]);

  async function copyReport() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className={`core-report-explorer ${professional ? 'is-professional' : 'is-reader'}`}>
      <div className="core-report-kicker">
        <span>{professional ? `命盘总报告 · ${report.version}` : '命盘总报告 · 直接结论'}</span>
        {professional && <code>{report.fingerprint}</code>}
      </div>

      <div className="core-report-hero">
        <div>
          <small>{professional ? '当前最优综合判断' : '综合判断'}</small>
          <h2>{present(report.headline, professional)}</h2>
          <p>{present(report.executiveSummary, professional)}</p>
        </div>
        <aside className={`overall-confidence confidence-${report.confidence}`}>
          <span>{professional ? '综合可信度' : '判断把握'}</span>
          <b>{report.confidence}</b>
          {professional && <><strong>{report.confidenceScore.toFixed(2)}</strong><i><em style={{ width: `${Math.max(2, report.confidenceScore)}%` }} /></i></>}
        </aside>
      </div>

      <div className="core-verdict-grid">
        <VerdictCard title="旺衰判断" verdict={report.verdicts.strength} professional={professional} />
        <VerdictCard title="格局判断" verdict={report.verdicts.pattern} professional={professional} />
        <VerdictCard title="调候判断" verdict={report.verdicts.climate} professional={professional} />
        <VerdictCard title="能量结构" verdict={report.verdicts.energy} professional={professional} />
      </div>

      <div className="core-report-sections">
        <section>
          <div className="subheading"><h3>结构优势</h3><span>更容易调用的能力</span></div>
          <div className="core-finding-list">
            {report.strengths.map((finding) => <FindingCard key={finding.id} finding={finding} professional={professional} />)}
          </div>
        </section>
        <section>
          <div className="subheading"><h3>核心矛盾</h3><span>最需要处理的牵制</span></div>
          <div className="core-finding-list">
            {report.tensions.map((finding) => <FindingCard key={finding.id} finding={finding} professional={professional} />)}
          </div>
        </section>
        <section>
          <div className="subheading"><h3>当前岁运变化</h3><span>现在正在加强或削弱什么</span></div>
          <div className="core-finding-list">
            {report.temporalChanges.length
              ? report.temporalChanges.map((finding) => <FindingCard key={finding.id} finding={finding} professional={professional} />)
              : <p className="foundation-empty">当前所选岁运没有形成足以改变主判断的显著变化。</p>}
          </div>
        </section>
        {professional && <section>
          <div className="subheading"><h3>什么会推翻当前判断</h3><span>结论的适用边界</span></div>
          <div className="core-finding-list">
            {report.overturnConditions.map((finding) => <FindingCard key={finding.id} finding={finding} professional />)}
          </div>
        </section>}
      </div>

      {professional ? <>
        <div className="core-report-actions">
          <button type="button" onClick={copyReport}>{copied ? '已复制完整总报告 JSON' : '复制完整总报告 JSON'}</button>
          <p>专业审计保留原始候选、支持依据、反向证据与精确分数，便于复核算法。</p>
        </div>
        <div className="core-report-notes">
          {report.notes.map((note) => <p key={note}>{note}</p>)}
        </div>
      </> : <p className="reader-report-note">这里直接给判断，不展示“候选”和公式。切换到“专业审计”后，才会看到完整证据、反证和计算分数。</p>}
    </section>
  );
}
