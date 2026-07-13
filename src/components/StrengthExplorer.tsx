import { useMemo } from 'react';
import type { BaziChart } from '../lib/bazi';
import type { LuckContext } from '../lib/context';
import { buildDynamicsSnapshot } from '../lib/dynamics';
import { buildEvidenceSnapshot } from '../lib/evidence';
import {
  buildStrengthAdjudication,
  type StrengthAdjudication,
  type StrengthAxis,
  type StrengthEvidenceItem,
} from '../lib/strength';

function ratioPercent(value: number): string {
  return `${Math.max(2, Math.min(98, Math.round(value * 100)))}%`;
}

function VerdictCard({ result, title }: { result: StrengthAdjudication; title: string }) {
  const confidenceClass = result.confidence === '高' ? 'high' : result.confidence === '中' ? 'medium' : 'low';
  return (
    <article className="strength-verdict-card">
      <header><span>{title}</span><em className={`strength-confidence confidence-${confidenceClass}`}>置信度 {result.confidence}</em></header>
      <strong>{result.leading.name}</strong>
      <p>扶身 {result.supportTotal} · 耗泄克身 {result.oppositionTotal} · 未决 {result.uncertainTotal}</p>
      <div className="strength-balance" aria-label="扶身与耗泄克身相对证据">
        <i style={{ width: ratioPercent(result.supportRatio) }}><span>扶身 {Math.round(result.supportRatio * 100)}%</span></i>
        <b><span>耗泄克身 {Math.round((1 - result.supportRatio) * 100)}%</span></b>
      </div>
      <small>{result.leading.note}</small>
    </article>
  );
}

function EvidenceColumn({
  title,
  axis,
  items,
}: {
  title: string;
  axis: StrengthAxis;
  items: StrengthEvidenceItem[];
}) {
  const filtered = items.filter((item) => item.axis === axis).slice(0, 10);
  return (
    <section className={`strength-evidence-column axis-${axis}`}>
      <div className="subheading"><h3>{title}</h3><span>{filtered.length} 条主要证据</span></div>
      <div className="strength-evidence-list">
        {filtered.length ? filtered.map((item) => (
          <article key={item.id} className={item.contested ? 'is-contested' : ''}>
            <header><span>{item.category}</span><b>{item.label}</b><em>{item.effectiveWeight}</em></header>
            <p>{item.source} · 因子 {item.factor} · 置信 {Math.round(item.confidence * 100)}%</p>
            <small>{item.explanation}</small>
            <code>{item.ruleId}</code>
          </article>
        )) : <p className="foundation-empty">当前没有进入该方向的证据。</p>}
      </div>
    </section>
  );
}

export function StrengthExplorer({ chart, context }: { chart: BaziChart; context: LuckContext }) {
  const natalEvidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations),
    [chart.pillars, chart.relations],
  );
  const natalDynamics = useMemo(
    () => buildDynamicsSnapshot(chart.pillars, chart.relations, natalEvidence),
    [chart.pillars, chart.relations, natalEvidence],
  );
  const natalResult = useMemo(
    () => buildStrengthAdjudication(chart.pillars, chart.pillars, chart.relations, natalEvidence, natalDynamics),
    [chart.pillars, chart.relations, natalEvidence, natalDynamics],
  );

  const currentEvidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations),
    [chart.pillars, context.nodes, context.relations],
  );
  const currentDynamics = useMemo(
    () => buildDynamicsSnapshot(context.nodes, context.relations, currentEvidence),
    [context.nodes, context.relations, currentEvidence],
  );
  const currentResult = useMemo(
    () => buildStrengthAdjudication(chart.pillars, context.nodes, context.relations, currentEvidence, currentDynamics),
    [chart.pillars, context.nodes, context.relations, currentEvidence, currentDynamics],
  );

  const ratioDelta = Math.round((currentResult.supportRatio - natalResult.supportRatio) * 100);
  const leadingChanged = natalResult.leading.name !== currentResult.leading.name;

  return (
    <section className="strength-explorer">
      <div className="evidence-heading">
        <div><span>STEP 06</span><h3>力量裁决与候选竞争</h3></div>
        <p>第一次允许输出旺衰候选，但必须同时公开证据单位、反证、阻断条件和未决冲突。</p>
      </div>

      <div className="strength-verdict-grid">
        <VerdictCard result={natalResult} title="原局底盘" />
        <VerdictCard result={currentResult} title="当前岁运叠加" />
        <aside className="strength-delta">
          <span>岁运相对原局</span>
          <b>{ratioDelta > 0 ? '+' : ''}{ratioDelta}% 扶身占比</b>
          <p>{leadingChanged
            ? `领先候选由“${natalResult.leading.name}”变为“${currentResult.leading.name}”，只代表当前态改变。`
            : `领先候选仍为“${currentResult.leading.name}”，但证据结构已经发生变化。`}</p>
        </aside>
      </div>

      <section className="hypothesis-panel">
        <div className="subheading"><h3>当前候选竞争</h3><span>拟合度只用于排序，不是命理概率</span></div>
        <div className="hypothesis-list">
          {currentResult.hypotheses.map((item, index) => (
            <article key={item.id} className={index === 0 ? 'is-leading' : ''}>
              <header><span>#{index + 1}</span><b>{item.name}</b><em>{Math.round(item.fit * 100)}</em></header>
              <div className="hypothesis-fit"><i style={{ width: `${Math.max(2, Math.round(item.fit * 100))}%` }} /></div>
              <p>{item.supports.slice(0, 2).join('；') || '暂无主要支持证据。'}</p>
              {item.objections.length > 0 && <small>反证：{item.objections.slice(0, 2).join('；')}</small>}
              {item.blockers.length > 0 && <small className="hypothesis-blocker">阻断：{item.blockers.join('；')}</small>}
            </article>
          ))}
        </div>
      </section>

      <div className="strength-evidence-grid">
        <EvidenceColumn title="扶身证据账" axis="扶身" items={currentResult.evidence} />
        <EvidenceColumn title="耗泄克身证据账" axis="耗泄克身" items={currentResult.evidence} />
      </div>

      <div className="strength-lower-grid">
        <EvidenceColumn title="未决修正项" axis="不确定" items={currentResult.evidence} />
        <section className="strength-unresolved">
          <div className="subheading"><h3>裁决未决点</h3><span>{currentResult.unresolved.length} 项</span></div>
          <div>
            {currentResult.unresolved.length ? currentResult.unresolved.slice(0, 12).map((item, index) => (
              <p key={`${item}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></p>
            )) : <p className="foundation-empty">当前没有进入未决队列的合冲、通关或制化冲突。</p>}
          </div>
        </section>
      </div>

      <div className="strength-notes">
        {currentResult.notes.map((note) => <p key={note}>{note}</p>)}
      </div>
    </section>
  );
}
