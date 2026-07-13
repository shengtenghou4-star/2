import { useEffect, useMemo, useState } from 'react';
import type { BaziChart } from '../lib/bazi';
import { buildLuckContext } from '../lib/context';
import type { TemporalPillar } from '../lib/timeline';

function TemporalCard({ pillar }: { pillar: TemporalPillar }) {
  return (
    <article className="temporal-card">
      <div className="temporal-head"><span>{pillar.layer}</span><small>{pillar.label}</small></div>
      <div className="temporal-ganzhi"><b>{pillar.stem}</b><b>{pillar.branch}</b></div>
      <div className="temporal-primary"><strong>{pillar.tenGod}</strong><span>{pillar.growthStage}</span></div>
      <div className="temporal-hidden">
        {pillar.hiddenStems.map((item) => (
          <i key={`${pillar.id}-${item.stem}`}><b>{item.stem}</b><span>{item.tenGod}</span><small>{item.rank}</small></i>
        ))}
      </div>
      <dl><div><dt>纳音</dt><dd>{pillar.naYin}</dd></div><div><dt>旬空</dt><dd>{pillar.xunKong}</dd></div></dl>
      <div className="shensha-list">
        {pillar.shenSha.length
          ? pillar.shenSha.map((star) => <em title={`${star.basis}${star.reference}查${star.target}：${star.note}`} key={`${pillar.id}-${star.name}`}>{star.name}</em>)
          : <span>无当前基础表命中</span>}
      </div>
    </article>
  );
}

export function FoundationExplorer({ chart }: { chart: BaziChart }) {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [yearIndex, setYearIndex] = useState(0);
  const [monthIndex, setMonthIndex] = useState(0);

  useEffect(() => {
    setCycleIndex(0);
    setYearIndex(0);
    setMonthIndex(0);
  }, [chart.solarText]);

  const cycle = chart.luck.cycles[cycleIndex] ?? chart.luck.cycles[0];
  const safeYearIndex = Math.min(yearIndex, Math.max(0, (cycle?.years.length ?? 1) - 1));
  const context = useMemo(
    () => buildLuckContext(chart, cycleIndex, safeYearIndex, monthIndex),
    [chart, cycleIndex, safeYearIndex, monthIndex],
  );

  const activeRelations = context.relations.filter((relation) => relation.scope === '岁运介入');
  const activeElementInteractions = context.elementInteractions.filter((interaction) => interaction.scope === '岁运介入');
  const interactionCounts = activeElementInteractions.reduce<Record<string, number>>((accumulator, interaction) => {
    accumulator[interaction.type] = (accumulator[interaction.type] ?? 0) + 1;
    return accumulator;
  }, {});

  function changeCycle(next: number) {
    setCycleIndex(next);
    setYearIndex(0);
    setMonthIndex(0);
  }

  function changeYear(next: number) {
    setYearIndex(next);
    setMonthIndex(0);
  }

  return (
    <section className="panel foundation-panel">
      <div className="section-heading compact"><span>04</span><div><h2>岁运基础作用台</h2><p>原局＋大运＋流年＋流月同时入场；只列事实，不做旺衰和吉凶裁决</p></div></div>

      <div className="timeline-selectors">
        <label><span>大运</span><select value={cycleIndex} onChange={(event) => changeCycle(Number(event.target.value))}>
          {chart.luck.cycles.map((item, index) => <option value={index} key={item.index}>{item.startAge}—{item.endAge}岁 · {item.ganZhi}</option>)}
        </select></label>
        <label><span>流年</span><select value={safeYearIndex} onChange={(event) => changeYear(Number(event.target.value))}>
          {context.cycle.years.map((item, index) => <option value={index} key={item.year}>{item.year} · {item.ganZhi} · {item.age}岁</option>)}
        </select></label>
        <label><span>流月（按节）</span><select value={monthIndex} onChange={(event) => setMonthIndex(Number(event.target.value))}>
          {context.months.map((item, index) => <option value={index} key={item.index}>{item.name} · {item.pillar.ganZhi}</option>)}
        </select></label>
      </div>

      <div className="month-boundary">
        <div><small>本流月起</small><b>{context.month.startTerm}</b><span>{context.month.startText}</span></div>
        <div><small>下流月起</small><b>{context.month.endTerm}</b><span>{context.month.endText}</span></div>
        <p>流月不是公历自然月：每月从“节”开始，到下一“节”结束。</p>
      </div>

      <div className="temporal-grid"><TemporalCard pillar={context.cycle.pillar} /><TemporalCard pillar={context.year.pillar} /><TemporalCard pillar={context.month.pillar} /></div>

      <div className="foundation-subgrid">
        <section>
          <div className="subheading"><h3>刑冲合害与组合</h3><span>{activeRelations.length} 条岁运关系</span></div>
          <div className="foundation-relations">
            {activeRelations.length ? activeRelations.map((relation) => (
              <article key={relation.id}>
                <header><span>{relation.category} · {relation.type}</span><b>{relation.name}</b></header>
                <div>{relation.members.map((member) => <i key={`${relation.id}-${member.id}`}>{member.layer}·{member.label} <strong>{member.char}</strong></i>)}</div>
                <p>{relation.note}</p>
              </article>
            )) : <p className="foundation-empty">当前所选大运、流年和流月没有新增已收录关系。</p>}
          </div>
        </section>

        <aside>
          <div className="subheading"><h3>五行生克矩阵</h3><span>显干＋地支本气</span></div>
          <div className="interaction-summary"><b>相生 {interactionCounts.相生 ?? 0}</b><b>相克 {interactionCounts.相克 ?? 0}</b><b>同类 {interactionCounts.同类 ?? 0}</b></div>
          <div className="interaction-list">
            {activeElementInteractions.slice(0, 36).map((interaction) => (
              <div key={interaction.id} className={`interaction-${interaction.type}`}><span>{interaction.type}</span><b>{interaction.name}</b><small>{interaction.left.part} ↔ {interaction.right.part}</small></div>
            ))}
          </div>
          {activeElementInteractions.length > 36 && <p className="interaction-more">其余 {activeElementInteractions.length - 36} 条已保存在审计 JSON 中。</p>}
        </aside>
      </div>

      <p className="foundation-boundary">本层不判断“合而化”“冲而动”“克而有力”或“神煞吉凶”。这些都必须等月令、根气、透藏和制化条件完整后再判。</p>
    </section>
  );
}
