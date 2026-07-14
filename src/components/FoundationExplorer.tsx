import { useEffect, useMemo, useState } from 'react';
import type { BaziChart } from '../lib/bazi';
import { buildLuckContext } from '../lib/context';
import type { TemporalPillar } from '../lib/timeline';
import { CareerExplorer } from './CareerExplorer';
import { CoreReportExplorer } from './CoreReportExplorer';
import { DynamicsExplorer } from './DynamicsExplorer';
import { EnergyExplorer } from './EnergyExplorer';
import { EvidenceExplorer } from './EvidenceExplorer';
import { PatternClimateExplorer } from './PatternClimateExplorer';
import { ProductSuite } from './ProductSuite';
import { StrengthExplorer } from './StrengthExplorer';

type ReadingMode = 'brief' | 'topics' | 'professional';

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
  const [readingMode, setReadingMode] = useState<ReadingMode>('brief');

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
      <div className="section-heading compact"><span>04</span><div><h2>岁运推演与主题报告</h2><p>简报、主题和专业审计三级阅读；同一套底层结果，不同信息密度</p></div></div>

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

      <div className="reading-mode-bar">
        <div>
          <button type="button" className={readingMode === 'brief' ? 'active' : ''} onClick={() => setReadingMode('brief')}>一分钟简报</button>
          <button type="button" className={readingMode === 'topics' ? 'active' : ''} onClick={() => setReadingMode('topics')}>主题报告</button>
          <button type="button" className={readingMode === 'professional' ? 'active' : ''} onClick={() => setReadingMode('professional')}>专业审计</button>
        </div>
        <p>{readingMode === 'brief' ? '先看核心结论和四个生活主题摘要。' : readingMode === 'topics' ? '展开事业、财富、关系、时间轴和岗位映射。' : '查看全部事实、候选、公式、反证与审计账本。'}</p>
      </div>

      <CoreReportExplorer chart={chart} context={context} />
      {readingMode === 'brief' && <ProductSuite chart={chart} context={context} cycleIndex={cycleIndex} yearIndex={safeYearIndex} compact />}
      {(readingMode === 'topics' || readingMode === 'professional') && <>
        <CareerExplorer chart={chart} context={context} />
        <ProductSuite chart={chart} context={context} cycleIndex={cycleIndex} yearIndex={safeYearIndex} />
      </>}

      {readingMode === 'professional' ? <>
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

        <EvidenceExplorer chart={chart} context={context} />
        <DynamicsExplorer chart={chart} context={context} />
        <EnergyExplorer chart={chart} context={context} />
        <StrengthExplorer chart={chart} context={context} />
        <PatternClimateExplorer chart={chart} context={context} />
      </> : <div className="professional-gate">专业证据账已折叠。切换到“专业审计”可查看月令、根透、合冲、能量公式、旺衰候选、格局反证和完整性报告。</div>}

      <p className="foundation-boundary">主题报告描述结构机制和阶段信号，不预测具体财富金额、婚恋事件或升职结果；现实决策仍需结合真实信息。</p>
    </section>
  );
}
