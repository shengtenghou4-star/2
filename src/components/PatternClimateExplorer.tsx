import { useMemo } from 'react';
import type { BaziChart } from '../lib/bazi';
import type { LuckContext } from '../lib/context';
import { auditAnalysisIntegrity } from '../lib/analysis-integrity';
import { buildDynamicsSnapshot } from '../lib/dynamics';
import { buildEvidenceSnapshot } from '../lib/evidence';
import { buildInterpretationAssessment, type InterpretationCondition } from '../lib/interpretation-audited';
import { buildStrengthAdjudication } from '../lib/strength-audited';

function Conditions({ items }: { items: InterpretationCondition[] }) {
  return (
    <div className="interpretation-conditions">
      {items.map((item) => (
        <div key={item.id} className={`interpretation-condition state-${item.state}`} title={item.detail}>
          <span>{item.state}</span><b>{item.label}</b><small>{item.detail}</small>
        </div>
      ))}
    </div>
  );
}

export function PatternClimateExplorer({ chart, context }: { chart: BaziChart; context: LuckContext }) {
  const natalEvidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations),
    [chart.pillars, chart.relations],
  );
  const natalDynamics = useMemo(
    () => buildDynamicsSnapshot(chart.pillars, chart.relations, natalEvidence),
    [chart.pillars, chart.relations, natalEvidence],
  );
  const natalStrength = useMemo(
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
  const currentStrength = useMemo(
    () => buildStrengthAdjudication(chart.pillars, context.nodes, context.relations, currentEvidence, currentDynamics),
    [chart.pillars, context.nodes, context.relations, currentEvidence, currentDynamics],
  );

  const result = useMemo(
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

  const integrity = useMemo(
    () => auditAnalysisIntegrity({
      chart,
      context,
      natalEvidence,
      currentEvidence,
      natalDynamics,
      currentDynamics,
      natalStrength,
      currentStrength,
      interpretation: result,
    }),
    [
      chart,
      context,
      natalEvidence,
      currentEvidence,
      natalDynamics,
      currentDynamics,
      natalStrength,
      currentStrength,
      result,
    ],
  );

  return (
    <section className="interpretation-explorer">
      <div className="evidence-heading">
        <div><span>STEP 07</span><h3>格局候选与调候／扶抑分轨</h3></div>
        <p>月令格局、寒暖燥湿、旺衰扶抑分别回答不同问题；方向冲突必须公开。</p>
      </div>

      <section className={`analysis-integrity level-${integrity.level}`}>
        <header>
          <div><span>当前命盘完整性审计</span><b>{integrity.level}</b></div>
          <code>{integrity.fingerprint}</code>
        </header>
        <div className="integrity-stats">
          <i>原局柱 {integrity.coverage.natalPillars}</i>
          <i>岁运节点 {integrity.coverage.temporalNodes}</i>
          <i>格局候选 {integrity.coverage.patternCandidates}</i>
          <i>旺衰候选 {integrity.coverage.strengthHypotheses}</i>
          <i>力量证据 {integrity.coverage.evidenceItems}</i>
          <i>关系结构 {integrity.coverage.relationItems}</i>
        </div>
        <div className="integrity-checks">
          {integrity.checks.map((item) => (
            <article key={item.id} className={`check-${item.level}`} title={item.detail}>
              <span>{item.level}</span><b>{item.label}</b><small>{item.detail}</small>
            </article>
          ))}
        </div>
        {integrity.failures.length > 0 && <p className="integrity-failure">硬失败：{integrity.failures.join('；')}</p>}
        {integrity.warnings.length > 0 && <p className="integrity-warning">提示：{integrity.warnings.join('；')}</p>}
      </section>

      <div className="interpretation-summary">
        <article>
          <span>原局格局领先候选</span>
          <b>{result.pattern.leading.name}</b>
          <small>{result.pattern.leading.status} · 完整度 {Math.round(result.pattern.leading.completeness * 100)}</small>
        </article>
        <article>
          <span>月令气候基线</span>
          <b>{result.climate.profile}</b>
          <small>{result.climate.issues.length ? `主要矛盾：${result.climate.issues.join('、')}` : '当前不预设单一寒热矛盾'}</small>
        </article>
        <article>
          <span>原局扶抑方向</span>
          <b>{result.natalSupportBalance.orientation}</b>
          <small>{result.natalSupportBalance.leading}</small>
        </article>
        <article>
          <span>当前岁运扶抑方向</span>
          <b>{result.currentSupportBalance.orientation}</b>
          <small>{result.currentSupportBalance.leading}</small>
        </article>
      </div>

      <section className="pattern-panel">
        <div className="subheading"><h3>月令格局候选竞争</h3><span>岁运只引动，不改写原局</span></div>
        <div className="pattern-list">
          {result.pattern.candidates.map((item, index) => (
            <article key={item.id} className={index === 0 ? 'is-leading' : ''}>
              <header>
                <span>#{index + 1} · {item.sourceRank}{item.sourceStem}</span>
                <b>{item.name}</b>
                <em>{Math.round(item.completeness * 100)}</em>
              </header>
              <div className="pattern-meta">
                <i>{item.status}</i><i>{item.sourceElement}在月令为{item.seasonalState}</i>
                <i>原局透干 {item.natalExactRevealCount}</i><i>岁运透出 {item.temporalExactRevealCount}</i>
              </div>
              <Conditions items={item.conditions} />
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="track-grid">
        <section className="climate-track">
          <div className="subheading"><h3>调候气候轨</h3><span>只管寒暖燥湿</span></div>
          <div className="climate-profile">
            <b>{result.climate.monthBranch}月 · {result.climate.profile}</b>
            <p>{result.climate.notes[0]}</p>
          </div>
          <div className="climate-needs">
            {result.climate.needs.length ? result.climate.needs.map((need) => (
              <article key={need.id}>
                <header><span>{need.priority}候选</span><b>{need.element} · {need.role}</b></header>
                <div>
                  <p><strong>原局</strong><em>{need.natal.status}</em><small>{need.natal.sources.join('、') || '没有可见来源'}</small></p>
                  <p><strong>当前岁运</strong><em>{need.current.status}</em><small>{need.current.sources.join('、') || '没有可见来源'}</small></p>
                </div>
                {need.temporalAdded && <i>岁运补入／加强{need.element}材料</i>}
                <small>{need.note}</small>
              </article>
            )) : <p className="foundation-empty">当前月支不预设单一气候元素；需要继续结合日干和节气深浅。</p>}
          </div>
        </section>

        <section className="support-track">
          <div className="subheading"><h3>扶抑旺衰轨</h3><span>只管扶、泄、耗、制</span></div>
          {[result.natalSupportBalance, result.currentSupportBalance].map((track) => (
            <article key={track.mode}>
              <header><span>{track.mode}</span><b>{track.orientation}</b><em>{track.leading}</em></header>
              <div className="support-elements">
                {track.elements.length ? track.elements.map((item) => (
                  <div key={`${track.mode}-${item.element}-${item.role}`}>
                    <span>{item.priority}</span><b>{item.element}</b><strong>{item.role}</strong><small>{item.note}</small>
                  </div>
                )) : <p className="foundation-empty">当前不生成普通扶抑元素队列。</p>}
              </div>
              <p>{track.note}</p>
            </article>
          ))}
        </section>
      </div>

      <section className="track-comparison-panel">
        <div className="subheading"><h3>调候与扶抑冲突审计</h3><span>不能静默合并</span></div>
        <div>
          {result.comparisons.length ? result.comparisons.map((item) => (
            <article key={item.id} className={`relation-${item.supportBalanceRelation}`}>
              <span>{item.supportBalanceRelation}</span><b>{item.climateElement} · {item.climateRole}</b><p>{item.detail}</p>
            </article>
          )) : <p className="foundation-empty">当前气候轨没有提出单一元素，因此没有可比较的方向冲突。</p>}
        </div>
      </section>

      <div className="interpretation-notes">
        {result.notes.map((note) => <p key={note}>{note}</p>)}
      </div>
    </section>
  );
}
