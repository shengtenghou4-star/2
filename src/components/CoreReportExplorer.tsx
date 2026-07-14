import { useMemo, useState } from 'react';
import type { BaziChart } from '../lib/bazi';
import type { LuckContext } from '../lib/context';
import { buildDynamicsSnapshot } from '../lib/dynamics';
import { buildEnergyAssessment } from '../lib/energy';
import { buildEvidenceSnapshot } from '../lib/evidence';
import { buildInterpretationAssessment } from '../lib/interpretation-audited';
import {
  buildCoreReport,
  type ReportFinding,
  type ReportVerdict,
} from '../lib/report-audited';
import { buildStrengthAdjudication } from '../lib/strength-audited';

function VerdictCard({ title, verdict }: { title: string; verdict: ReportVerdict }) {
  return (
    <article className={`core-verdict confidence-${verdict.confidence}`}>
      <header><span>{title}</span><em>可信度 {verdict.confidence}</em></header>
      <b>{verdict.label}</b>
      <p>{verdict.detail}</p>
      <div><i style={{ width: `${Math.max(2, verdict.score)}%` }} /><span>{verdict.score.toFixed(2)}</span></div>
    </article>
  );
}

function FindingCard({ finding }: { finding: ReportFinding }) {
  return (
    <article className={`core-finding severity-${finding.severity}`}>
      <header>
        <span>{finding.kind}</span>
        <em>可信度 {finding.confidence}</em>
      </header>
      <b>{finding.title}</b>
      <p>{finding.summary}</p>
      {(finding.evidence.length > 0 || finding.counterEvidence.length > 0) && (
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

export function CoreReportExplorer({ chart, context }: { chart: BaziChart; context: LuckContext }) {
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
    <section className="core-report-explorer">
      <div className="core-report-kicker">
        <span>命盘总报告 · {report.version}</span>
        <code>{report.fingerprint}</code>
      </div>

      <div className="core-report-hero">
        <div>
          <small>当前最优综合判断</small>
          <h2>{report.headline}</h2>
          <p>{report.executiveSummary}</p>
        </div>
        <aside className={`overall-confidence confidence-${report.confidence}`}>
          <span>综合可信度</span>
          <b>{report.confidence}</b>
          <strong>{report.confidenceScore.toFixed(2)}</strong>
          <i><em style={{ width: `${Math.max(2, report.confidenceScore)}%` }} /></i>
        </aside>
      </div>

      <div className="core-verdict-grid">
        <VerdictCard title="旺衰裁决" verdict={report.verdicts.strength} />
        <VerdictCard title="格局判断" verdict={report.verdicts.pattern} />
        <VerdictCard title="调候判断" verdict={report.verdicts.climate} />
        <VerdictCard title="能量结构" verdict={report.verdicts.energy} />
      </div>

      <div className="core-report-sections">
        <section>
          <div className="subheading"><h3>结构优势</h3><span>更容易被调用的能力轴</span></div>
          <div className="core-finding-list">
            {report.strengths.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
          </div>
        </section>
        <section>
          <div className="subheading"><h3>核心矛盾</h3><span>不能被一句“喜用”抹平</span></div>
          <div className="core-finding-list">
            {report.tensions.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
          </div>
        </section>
        <section>
          <div className="subheading"><h3>当前岁运变化</h3><span>当前态不改写出生底盘</span></div>
          <div className="core-finding-list">
            {report.temporalChanges.length
              ? report.temporalChanges.map((finding) => <FindingCard key={finding.id} finding={finding} />)
              : <p className="foundation-empty">当前所选岁运没有形成达到报告阈值的显著结构变化。</p>}
          </div>
        </section>
        <section>
          <div className="subheading"><h3>什么会推翻当前判断</h3><span>结论的适用边界</span></div>
          <div className="core-finding-list">
            {report.overturnConditions.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
          </div>
        </section>
      </div>

      <div className="core-report-actions">
        <button type="button" onClick={copyReport}>{copied ? '已复制完整总报告 JSON' : '复制完整总报告 JSON'}</button>
        <p>总报告由既有规则结果确定性汇总，不调用大模型自由编写。展开卡片可查看每条结论的支持依据与反向证据。</p>
      </div>

      <div className="core-report-notes">
        {report.notes.map((note) => <p key={note}>{note}</p>)}
      </div>
    </section>
  );
}
