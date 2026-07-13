import { useMemo } from 'react';
import type { BaziChart } from '../lib/bazi';
import type { LuckContext } from '../lib/context';
import { buildDynamicsSnapshot, type ConditionEvidence } from '../lib/dynamics';
import { buildEvidenceSnapshot } from '../lib/evidence';

function Conditions({ items }: { items: ConditionEvidence[] }) {
  return (
    <div className="condition-list">
      {items.map((item) => (
        <div key={item.id} className={`condition condition-${item.state}`} title={item.detail}>
          <span>{item.state}</span><b>{item.label}</b><small>{item.detail}</small>
        </div>
      ))}
    </div>
  );
}

export function DynamicsExplorer({ chart, context }: { chart: BaziChart; context: LuckContext }) {
  const evidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations),
    [chart.pillars, context.nodes, context.relations],
  );
  const dynamics = useMemo(
    () => buildDynamicsSnapshot(context.nodes, context.relations, evidence),
    [context.nodes, context.relations, evidence],
  );

  const viablePassages = dynamics.passages.filter((item) => item.status !== '通关元素未现').length;
  const completeRegulations = dynamics.regulations.filter((item) => item.status !== '材料不全').length;

  return (
    <section className="dynamics-explorer">
      <div className="evidence-heading">
        <div><span>STEP 05</span><h3>作用路径与制化条件</h3></div>
        <p>位置、显藏、月令、根气与冲突同时入场；只生成候选状态，不宣判成败。</p>
      </div>

      <div className="dynamics-stats">
        <b>天干五合 {dynamics.combines.length}</b>
        <b>地支六冲 {dynamics.clashes.length}</b>
        <b>通关材料 {viablePassages}/{dynamics.passages.length}</b>
        <b>制化链候选 {completeRegulations}/{dynamics.regulations.length}</b>
        <b>关系冲突点 {dynamics.conflicts.length}</b>
      </div>

      <section className="path-section">
        <div className="subheading"><h3>关系拓扑</h3><span>先看距离，再看条件</span></div>
        <div className="path-strip">
          {dynamics.relationPaths.length ? dynamics.relationPaths.map((path) => (
            <article key={path.id}>
              <header><span>{path.type}</span><b>{path.name}</b><em>{path.contact}</em></header>
              <p>{path.memberLabels.join(' ↔ ')}</p>
              {path.competingRelations.length > 0 && <small>并存：{path.competingRelations.join('、')}</small>}
            </article>
          )) : <p className="foundation-empty">当前七柱没有已收录的干支组合关系。</p>}
        </div>
      </section>

      <div className="dynamics-dual">
        <section>
          <div className="subheading"><h3>天干合绊／合化候选</h3><span>{dynamics.combines.length} 组</span></div>
          <div className="candidate-list">
            {dynamics.combines.length ? dynamics.combines.map((item) => (
              <article key={item.id}>
                <header><span>{item.candidate}</span><b>{item.name}</b><em>候选化{item.resultElement}</em></header>
                <p>{item.members.join(' ＋ ')} · {item.contact}</p>
                <Conditions items={item.conditions} />
                <small>{item.note}</small>
              </article>
            )) : <p className="foundation-empty">当前七柱没有天干五合。</p>}
          </div>
        </section>

        <section>
          <div className="subheading"><h3>地支冲动／冲开候选</h3><span>{dynamics.clashes.length} 组</span></div>
          <div className="candidate-list">
            {dynamics.clashes.length ? dynamics.clashes.map((item) => (
              <article key={item.id}>
                <header><span>{item.candidate}</span><b>{item.name}</b><em>{item.contact}</em></header>
                <p>{item.members.join(' ↔ ')} · 根气触及 {item.touchedRootCount} 条</p>
                <Conditions items={item.conditions} />
                <small>{item.note}</small>
              </article>
            )) : <p className="foundation-empty">当前七柱没有地支六冲。</p>}
          </div>
        </section>
      </div>

      <div className="dynamics-dual">
        <section>
          <div className="subheading"><h3>五行通关链</h3><span>克 → 生 → 生</span></div>
          <div className="chain-list">
            {dynamics.passages.map((item) => (
              <article key={item.id} className={item.status === '通关元素未现' ? 'chain-missing' : ''}>
                <header><span>{item.status}</span><b>{item.sourceElement} → {item.mediatorElement} → {item.targetElement}</b></header>
                <p>{item.sourceElement}克{item.targetElement}；以{item.mediatorElement}承接。显干{item.mediatorVisibleCount}处，藏干{item.mediatorHiddenCount}处。</p>
                <small>{item.examples.join('、')}</small>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="subheading"><h3>十神制化链</h3><span>材料审计</span></div>
          <div className="chain-list">
            {dynamics.regulations.map((item) => (
              <article key={item.id} className={item.status === '材料不全' ? 'chain-missing' : ''}>
                <header><span>{item.type} · {item.status}</span><b>{item.name}</b></header>
                <p>{item.chain.join(' → ')} · 已见 {item.presentLabels.join('、') || '无'}</p>
                <small>{item.hiddenOnlyLabels.length ? `仅藏干：${item.hiddenOnlyLabels.join('、')}。` : ''}{item.note}</small>
              </article>
            ))}
          </div>
        </section>
      </div>

      {dynamics.conflicts.length > 0 && (
        <section className="conflict-panel">
          <div className="subheading"><h3>证据冲突点</h3><span>不得静默覆盖</span></div>
          <div>
            {dynamics.conflicts.map((item) => (
              <article key={item.id}><b>{item.layer}·{item.label}</b><span>{item.relationNames.join('、')}</span><p>{item.note}</p></article>
            ))}
          </div>
        </section>
      )}

      <p className="foundation-boundary">本层的“条件齐备”只代表材料表面到位，不代表合化、冲开、通关或制化已经有效。下一层才处理距离折减、争合、合绊、重复引动与力量裁决。</p>
    </section>
  );
}
