import { useMemo } from 'react';
import type { BaziChart } from '../lib/bazi';
import type { LuckContext } from '../lib/context';
import { buildEvidenceSnapshot, type SeasonalState } from '../lib/evidence';

const STATE_CLASS: Record<SeasonalState, string> = {
  旺: 'season-wang',
  相: 'season-xiang',
  休: 'season-xiu',
  囚: 'season-qiu',
  死: 'season-si',
};

export function EvidenceExplorer({ chart, context }: { chart: BaziChart; context: LuckContext }) {
  const evidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations),
    [chart.pillars, context.nodes, context.relations],
  );

  const month = evidence.monthCommand;
  const touchedRoots = evidence.dayMasterRoots.filter((root) => root.relationTouches.length > 0);
  const natalRoots = evidence.dayMasterRoots.filter((root) => root.branchLayer === '原局');
  const temporalRoots = evidence.dayMasterRoots.filter((root) => root.branchLayer !== '原局');
  const visibleSummaries = evidence.rootSummaries.filter((item) => item.exactRoots + item.sameElementRoots > 0);

  return (
    <section className="evidence-layer">
      <div className="evidence-heading">
        <div><span>04B</span><h3>月令与根气证据层</h3></div>
        <p>只展开证据，不计算“身强多少分”，也不提前裁定从格、喜忌或用神。</p>
      </div>

      <div className="month-command-grid">
        <article className="month-command-main">
          <small>月令</small>
          <b>{month.monthBranch}</b>
          <strong>{month.phase}</strong>
          <span>{month.monthElement}令环境</span>
        </article>
        <article><small>月支本气</small><b>{month.mainQiStem}</b><strong>{month.mainQiTenGod}</strong><span>本气不等同全月唯一力量</span></article>
        <article><small>日主季节态</small><b className={STATE_CLASS[month.dayMasterSeasonalState]}>{month.dayMasterSeasonalState}</b><strong>{month.dayMasterStem}{month.dayMasterElement}</strong><span>旺相休囚死基础表</span></article>
        <article><small>日主临月支</small><b>{month.dayMasterGrowthStage}</b><strong>十二长生</strong><span>作为独立证据，不替代月令表</span></article>
        <article><small>月支藏干</small><div className="month-hidden-list">{month.hiddenStems.map((item) => <i key={item.stem}><b>{item.stem}</b><span>{item.tenGod}</span><small>{item.rank}</small></i>)}</div></article>
      </div>

      <div className="season-state-strip">
        {month.elementStates.map((item) => (
          <div className={item.isDayMaster ? 'is-day-element' : ''} key={item.element}>
            <span>{item.element}</span>
            <b className={STATE_CLASS[item.state]}>{item.state}</b>
            <small>{item.isDayMaster ? '日主五行' : '季节状态'}</small>
          </div>
        ))}
      </div>
      <p className="evidence-note">{month.note}</p>

      <div className="evidence-columns">
        <section className="root-network">
          <div className="subheading"><h3>日主根气网络</h3><span>原局 {natalRoots.length} · 岁运新增 {temporalRoots.length}</span></div>
          <div className="root-cards">
            {evidence.dayMasterRoots.length ? evidence.dayMasterRoots.map((root) => (
              <article className={root.kind === '同干根' ? 'root-exact' : 'root-same'} key={root.id}>
                <header><span>{root.scope}</span><b>{root.kind}</b><em>{root.rank}</em></header>
                <div className="root-path"><strong>{root.stem}</strong><i>→</i><strong>{root.branch}</strong><i>藏</i><strong>{root.hiddenStem}</strong></div>
                <p>{root.branchLayer}·{root.branchLabel}｜{root.hiddenTenGod}</p>
                {root.relationTouches.length > 0 && <div className="root-touches">{root.relationTouches.map((touch) => <span title="只表示此根所在支参与关系，不表示根已被破坏" key={touch.id}>{touch.type} · {touch.name}</span>)}</div>}
              </article>
            )) : <p className="foundation-empty">当前原局与所选岁运中未发现日主的同干根或同类根。</p>}
          </div>
          {touchedRoots.length > 0 && <p className="root-warning">有 {touchedRoots.length} 个日主根所在支被合冲刑害等结构触及；本层不把“触及”直接解释成拔根、冲散或合化。</p>}
        </section>

        <aside className="reveal-network">
          <div className="subheading"><h3>藏干透出路径</h3><span>同干透出 {evidence.exactReveals.length}</span></div>
          <div className="reveal-list">
            {evidence.reveals.slice(0, 32).map((reveal) => (
              <div className={reveal.kind === '藏干透出' ? 'reveal-exact' : 'reveal-same'} key={reveal.id}>
                <span>{reveal.kind}</span>
                <b>{reveal.branchLayer}·{reveal.branchLabel}{reveal.branch}藏{reveal.hiddenStem}</b>
                <i>→</i>
                <strong>{reveal.visibleLayer}·{reveal.visibleLabel}{reveal.visibleStem}</strong>
                <small>{reveal.rank} · {reveal.hiddenTenGod}</small>
              </div>
            ))}
          </div>
          {evidence.reveals.length > 32 && <p className="interaction-more">其余 {evidence.reveals.length - 32} 条透出或同类显干路径保存在审计对象中。</p>}
        </aside>
      </div>

      <div className="evidence-columns lower-evidence">
        <section className="ten-god-ledger">
          <div className="subheading"><h3>十神家族出现账本</h3><span>出现次数，不是强弱权重</span></div>
          <div className="ledger-table">
            <div className="ledger-head"><span>家族</span><span>作用方向</span><span>原局显干</span><span>原局藏干</span><span>岁运显干</span><span>岁运藏干</span><span>合计</span></div>
            {evidence.familyLedger.map((item) => (
              <div key={item.family}><b>{item.family}</b><span>{item.action}</span><em>{item.visibleNatal}</em><em>{item.hiddenNatal}</em><em>{item.visibleTemporal}</em><em>{item.hiddenTemporal}</em><strong>{item.total}</strong></div>
            ))}
          </div>
        </section>

        <aside className="all-root-summary">
          <div className="subheading"><h3>各显干根气索引</h3><span>同干根与同类根分列</span></div>
          <div className="root-summary-list">
            {visibleSummaries.map((item) => (
              <div key={item.visibleId}>
                <span>{item.visibleLayer}·{item.visibleLabel}</span>
                <b>{item.stem}</b>
                <em>同干 {item.exactRoots}</em>
                <em>同类 {item.sameElementRoots}</em>
                <small>原局支 {item.natalRoots}｜岁运支 {item.temporalRoots}</small>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="evidence-boundaries">
        {evidence.notes.map((note) => <p key={note}>{note}</p>)}
      </div>
    </section>
  );
}
