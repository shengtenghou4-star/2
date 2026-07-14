import { useMemo, useState } from 'react';
import type { BaziChart } from '../lib/bazi';
import {
  buildCareerAssessment,
  type CareerModeScore,
  type CareerRisk,
} from '../lib/career';
import type { LuckContext } from '../lib/context';
import { buildDynamicsSnapshot } from '../lib/dynamics';
import { buildEnergyAssessment } from '../lib/energy';
import { buildEvidenceSnapshot } from '../lib/evidence';
import { buildInterpretationAssessment } from '../lib/interpretation-audited';
import { buildStrengthAdjudication } from '../lib/strength-audited';

function ModeCard({ mode }: { mode: CareerModeScore }) {
  return (
    <article className={`career-mode-card rank-${mode.rank}`}>
      <header>
        <span>#{mode.rank} · {mode.family}</span>
        <em>可信度 {mode.confidence}</em>
      </header>
      <div className="career-mode-score">
        <div><b>{mode.shortName}</b><small>{mode.name}</small></div>
        <strong>{mode.score.toFixed(2)}</strong>
      </div>
      <p>{mode.explanation}</p>
      <div className="career-score-bar"><i style={{ width: `${Math.max(2, mode.score)}%` }} /></div>
      <dl>
        <div><dt>能量占比</dt><dd>{mode.percentage.toFixed(2)}%</dd></div>
        <div><dt>显性比例</dt><dd>{mode.visibleRatio.toFixed(2)}%</dd></div>
        <div><dt>原局深度</dt><dd>{mode.natalRatio.toFixed(2)}%</dd></div>
        <div><dt>争议比例</dt><dd>{mode.contestedRatio.toFixed(2)}%</dd></div>
        <div><dt>格局加成</dt><dd>{mode.patternBonus > 0 ? '+' : ''}{mode.patternBonus.toFixed(2)}</dd></div>
        <div><dt>制化加成</dt><dd>{mode.regulationBonus > 0 ? '+' : ''}{mode.regulationBonus.toFixed(2)}</dd></div>
      </dl>
      <details>
        <summary>查看评分依据</summary>
        <div className="career-evidence-list">
          {mode.evidence.map((item) => (
            <section key={item.id}>
              <span>{item.kind}</span>
              <b>{item.label}</b>
              <p>{item.detail}</p>
              {item.value !== undefined && <em>{item.value}</em>}
            </section>
          ))}
          {mode.counterEvidence.map((item) => (
            <section className="counter" key={item.id}>
              <span>反向证据 · {item.kind}</span>
              <b>{item.label}</b>
              <p>{item.detail}</p>
              {item.value !== undefined && <em>{item.value}</em>}
            </section>
          ))}
        </div>
      </details>
    </article>
  );
}

function RiskCard({ risk }: { risk: CareerRisk }) {
  return (
    <article className={`career-risk risk-${risk.level}`}>
      <header><span>风险等级 {risk.level}</span><b>{risk.title}</b></header>
      <p>{risk.explanation}</p>
      <div><strong>应对方式</strong><span>{risk.mitigation}</span></div>
      <details>
        <summary>查看证据</summary>
        {risk.evidence.map((item) => (
          <section key={item.id}>
            <b>{item.label}</b>
            <p>{item.detail}</p>
          </section>
        ))}
      </details>
    </article>
  );
}

export function CareerExplorer({ chart, context }: { chart: BaziChart; context: LuckContext }) {
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
  const assessment = useMemo(
    () => buildCareerAssessment({
      natalNodes: chart.pillars,
      contextNodes: context.nodes,
      natalEvidence,
      currentEvidence,
      natalDynamics,
      currentDynamics,
      natalStrength,
      currentStrength,
      interpretation,
      energy,
    }),
    [
      chart.pillars,
      context.nodes,
      natalEvidence,
      currentEvidence,
      natalDynamics,
      currentDynamics,
      natalStrength,
      currentStrength,
      interpretation,
      energy,
    ],
  );
  const json = useMemo(() => JSON.stringify(assessment, null, 2), [assessment]);

  async function copyAssessment() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="career-explorer">
      <div className="career-heading">
        <div><span>TOPIC 01</span><h2>事业主题引擎</h2></div>
        <p>不直接指定唯一职业；分析你通过什么机制创造价值、什么环境更能发挥，以及当前岁运把哪条能力轴推到前台。</p>
      </div>

      <div className="career-hero">
        <div>
          <small>{assessment.version} · {assessment.fingerprint}</small>
          <h3>{assessment.headline}</h3>
          <p>{assessment.summary}</p>
        </div>
        <aside className={`career-confidence confidence-${assessment.confidence}`}>
          <span>综合可信度</span>
          <b>{assessment.confidence}</b>
          <strong>{assessment.confidenceScore.toFixed(2)}</strong>
          <i><em style={{ width: `${Math.max(2, assessment.confidenceScore)}%` }} /></i>
        </aside>
      </div>

      <section className="career-mode-section">
        <div className="subheading"><h3>五种职业能力模式</h3><span>不是职业名称，而是创造价值的方式</span></div>
        <div className="career-mode-grid">
          {assessment.modes.map((mode) => <ModeCard key={mode.family} mode={mode} />)}
        </div>
      </section>

      <div className="career-two-column">
        <section className="career-environment-section">
          <div className="subheading"><h3>适合的组织环境</h3><span>看真实机制，不看职位包装</span></div>
          <div className="career-environment-list">
            {assessment.environments.map((item) => (
              <article key={item.id}>
                <header><span>{item.fit}</span><b>{item.title}</b></header>
                <p>{item.explanation}</p>
                <details>
                  <summary>为什么</summary>
                  {item.evidence.map((evidence) => <div key={evidence.id}><b>{evidence.label}</b><p>{evidence.detail}</p></div>)}
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className="career-risk-section">
          <div className="subheading"><h3>职业风险模式</h3><span>优势过度使用时会变成风险</span></div>
          <div className="career-risk-list">
            {assessment.risks.map((risk) => <RiskCard key={risk.id} risk={risk} />)}
          </div>
        </section>
      </div>

      <section className="career-pathway-section">
        <div className="subheading"><h3>发展路径</h3><span>从优势到稳定职业结果的桥梁</span></div>
        <div className="career-pathway-grid">
          {assessment.pathways.map((pathway) => (
            <article key={pathway.id}>
              <header><span>{pathway.status}</span><b>{pathway.title}</b></header>
              <p>{pathway.explanation}</p>
              <ol>{pathway.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              <details>
                <summary>查看结构依据</summary>
                {pathway.evidence.map((item) => <div key={item.id}><b>{item.label}</b><p>{item.detail}</p></div>)}
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="career-temporal-section">
        <div className="subheading"><h3>当前岁运职业信号</h3><span>阶段任务变化，不改写长期底盘</span></div>
        <div className="career-temporal-list">
          {assessment.temporalSignals.length ? assessment.temporalSignals.map((signal) => (
            <article key={signal.id} className={`direction-${signal.direction}`}>
              <header><span>{signal.direction}</span><b>{signal.title}</b></header>
              <p>{signal.explanation}</p>
              <details><summary>查看岁运依据</summary>{signal.evidence.map((item) => <div key={item.id}><b>{item.label}</b><p>{item.detail}</p></div>)}</details>
            </article>
          )) : <p className="foundation-empty">当前岁运没有形成达到阈值的职业能力重排，仍以原局主轴为主。</p>}
        </div>
      </section>

      <div className="career-actions">
        <button type="button" onClick={copyAssessment}>{copied ? '已复制事业报告 JSON' : '复制完整事业报告 JSON'}</button>
        <p>报告只描述职业机制和环境条件，不声称某个八字天然等于某个行业，也不替代真实技能、教育、经验和就业市场判断。</p>
      </div>

      <div className="career-notes">{assessment.notes.map((note) => <p key={note}>{note}</p>)}</div>
    </section>
  );
}
