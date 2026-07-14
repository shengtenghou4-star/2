import { useMemo } from 'react';
import type { BaziChart } from '../lib/bazi';
import type { LuckContext } from '../lib/context';
import { buildEnergyAssessment, type EnergyContribution, type ElementEnergyRow } from '../lib/energy';
import { buildEvidenceSnapshot } from '../lib/evidence';

const ELEMENT_CLASS: Record<string, string> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };

function units(value: number): string {
  return value.toFixed(2);
}

function ElementRow({
  row,
  natalPercentage,
  delta,
}: {
  row: ElementEnergyRow;
  natalPercentage: number;
  delta: number;
}) {
  return (
    <article className={`energy-element-row element-${ELEMENT_CLASS[row.element] ?? ''}`}>
      <header>
        <span className="energy-element-symbol">{row.element}</span>
        <div><b>{row.family}</b><small>原局 {natalPercentage.toFixed(2)}%</small></div>
        <strong>{row.percentage.toFixed(2)}%</strong>
        <em className={delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}>{delta > 0 ? '+' : ''}{delta.toFixed(2)}pp</em>
      </header>
      <div className="energy-bar"><i style={{ width: `${Math.max(1, row.percentage)}%` }} /></div>
      <div className="energy-row-ledger">
        <span>有效 {units(row.effectiveUnits)}</span>
        <span>原始 {units(row.rawUnits)}</span>
        <span>显干 {units(row.visibleUnits)}</span>
        <span>藏干 {units(row.hiddenUnits)}</span>
        <span>岁运 {units(row.temporalUnits)}</span>
        <span>争议 {units(row.contestedUnits)}</span>
      </div>
    </article>
  );
}

function ContributionRow({ item }: { item: EnergyContribution }) {
  return (
    <article className={item.contested ? 'is-contested' : ''}>
      <header>
        <span>{item.layer} · {item.nodeLabel}</span>
        <b>{item.stem}{item.element} · {item.tenGod}</b>
        <strong>{units(item.effectiveUnits)}</strong>
      </header>
      <p>{item.sourceType}{item.rank ? ` · ${item.rank}` : ''} · 基础 {units(item.baseUnits)} → 原始 {units(item.rawUnits)}</p>
      <code>{item.formula}</code>
      <small>{item.note}</small>
    </article>
  );
}

export function EnergyExplorer({ chart, context }: { chart: BaziChart; context: LuckContext }) {
  const natalEvidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, chart.pillars, chart.relations),
    [chart.pillars, chart.relations],
  );
  const currentEvidence = useMemo(
    () => buildEvidenceSnapshot(chart.pillars, context.nodes, context.relations),
    [chart.pillars, context.nodes, context.relations],
  );
  const assessment = useMemo(
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
  const deltaByElement = new Map(assessment.delta.map((item) => [item.element, item]));
  const current = assessment.current;
  const natal = assessment.natal;

  return (
    <section className="energy-explorer">
      <div className="evidence-heading">
        <div><span>STEP 06</span><h3>五行能量量化</h3></div>
        <p>固定结构单位、逐项乘算、百分比归一化；每一分均可追溯，不把模型单位冒充物理能量。</p>
      </div>

      <div className="energy-summary-grid">
        <article><span>当前有效总量</span><b>{units(current.totalEffectiveUnits)}</b><small>{assessment.modelVersion} 模型单位</small></article>
        <article><span>主导／最弱</span><b>{current.dominantElement} ／ {current.weakestElement}</b><small>按有效能量排序</small></article>
        <article><span>日主扶身占比</span><b>{current.balance.supportPercent.toFixed(2)}%</b><small>比劫＋印星 {units(current.balance.supportUnits)}</small></article>
        <article><span>耗泄克身占比</span><b>{current.balance.oppositionPercent.toFixed(2)}%</b><small>食伤＋财星＋官杀 {units(current.balance.oppositionUnits)}</small></article>
        <article><span>五行均衡度</span><b>{current.balanceScore.toFixed(2)}</b><small>0 极端集中 · 100 完全均分</small></article>
        <article><span>争议能量</span><b>{current.contestedPercent.toFixed(2)}%</b><small>受合冲刑害等关系触及</small></article>
      </div>

      <div className="energy-main-grid">
        <section className="energy-elements-panel">
          <div className="subheading"><h3>五行百分比与模型单位</h3><span>总百分比严格等于 100%</span></div>
          <div className="energy-element-list">
            {current.elements.map((row) => {
              const delta = deltaByElement.get(row.element)!;
              return <ElementRow key={row.element} row={row} natalPercentage={delta.natalPercentage} delta={delta.percentagePointDelta} />;
            })}
          </div>
        </section>

        <aside className="energy-balance-panel">
          <div className="subheading"><h3>日主关系分仓</h3><span>日主 {current.balance.dayMasterElement}</span></div>
          <div className="energy-family-ledger">
            <p><span>比劫 · 同类</span><b>{units(current.balance.sameElementUnits)}</b></p>
            <p><span>印星 · 生我</span><b>{units(current.balance.resourceUnits)}</b></p>
            <p><span>食伤 · 我生</span><b>{units(current.balance.outputUnits)}</b></p>
            <p><span>财星 · 我克</span><b>{units(current.balance.wealthUnits)}</b></p>
            <p><span>官杀 · 克我</span><b>{units(current.balance.officerUnits)}</b></p>
          </div>
          <div className="energy-support-bar">
            <i style={{ width: `${current.balance.supportPercent}%` }}><span>扶身 {current.balance.supportPercent.toFixed(2)}%</span></i>
            <b><span>耗泄克身 {current.balance.oppositionPercent.toFixed(2)}%</span></b>
          </div>
          <p className="energy-balance-note">这一比例只来自五行有效能量分仓；旺衰裁决仍需结合从格阻断、合化未决和格局轨，不用一个百分比替代全部判断。</p>
        </aside>
      </div>

      <section className="energy-contribution-panel">
        <div className="subheading"><h3>单项贡献账本</h3><span>当前前 18 项 · 全量保存在计算对象中</span></div>
        <div className="energy-contribution-list">
          {current.contributions.slice(0, 18).map((item) => <ContributionRow key={item.id} item={item} />)}
        </div>
      </section>

      <section className="energy-method-panel">
        <div className="subheading"><h3>计算方法</h3><span>{assessment.modelVersion}</span></div>
        <code>{current.formula}</code>
        <div className="energy-method-steps">
          <p><b>1</b><span>每柱 100 单位：天干 40，地支 60。</span></p>
          <p><b>2</b><span>藏干分仓：一藏 100%；二藏 70/30；三藏 60/25/15。</span></p>
          <p><b>3</b><span>乘柱位、时间层与月令旺相休囚死倍率，得到原始结构量。</span></p>
          <p><b>4</b><span>根气只激活对应显干，透干只激活对应藏干，避免重复记账。</span></p>
          <p><b>5</b><span>合冲刑害折算可用性；不满足合化条件时不转移元素归属。</span></p>
          <p><b>6</b><span>五行有效量归一化为 100%，并同时保留绝对模型单位。</span></p>
        </div>
        <div className="energy-notes">{current.notes.map((note) => <p key={note}>{note}</p>)}</div>
      </section>

      <p className="energy-delta-note">原局有效总量 {units(natal.totalEffectiveUnits)}；当前岁运叠加后 {units(current.totalEffectiveUnits)}。绝对增量与百分比变化必须同时看，避免“总量增加但占比下降”被误读。</p>
    </section>
  );
}
