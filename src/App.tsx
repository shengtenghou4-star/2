import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArchiveManager } from './components/ArchiveManager';
import { FoundationExplorer } from './components/FoundationExplorer';
import { HourCandidateExplorer } from './components/HourCandidateExplorer';
import { LocationSearch, type LocationPatch } from './components/LocationSearch';
import {
  compareCivilAndTrueSolar,
  type BaziChart,
  type BirthInput,
  type ChartComparison,
} from './lib/bazi-audited';
import { normalizeAutomaticTime } from './lib/location';
import { correctionLabel } from './lib/solar-time';

const DEFAULT_INPUT: BirthInput = {
  calendarType: 'solar',
  leapMonth: false,
  year: 2003,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: 'male',
  dayBoundary: 'midnight',
  timeBasis: 'true-solar',
  locationName: '山东省 · 济宁市 · 中国',
  longitude: 116.5872,
  latitude: 35.4149,
  utcOffset: 8,
  dstMinutes: 0,
};

const ELEMENT_CLASS: Record<string, string> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };

function clockValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function PillarCard({ pillar }: { pillar: BaziChart['pillars'][number] }) {
  return (
    <article className={`pillar-card ${pillar.label === '日柱' ? 'is-day' : ''}`}>
      <div className="pillar-label">{pillar.label}</div>
      <div className="ten-god">{pillar.tenGod}</div>
      <div className={`stem ${ELEMENT_CLASS[pillar.stemElement] ?? ''}`}>{pillar.stem}<small>{pillar.stemPolarity}{pillar.stemElement}</small></div>
      <div className={`branch ${ELEMENT_CLASS[pillar.branchElement] ?? ''}`}>{pillar.branch}<small>{pillar.branchElement}</small></div>
      <div className="hidden-stems">
        <span>藏干</span>
        {pillar.hiddenStems.map((item) => (
          <b key={`${pillar.label}-${item.stem}`}>
            {item.stem}<em>{item.tenGod}</em><small>{item.rank}</small>
          </b>
        ))}
      </div>
      <dl className="pillar-meta">
        <div><dt>纳音</dt><dd>{pillar.naYin}</dd></div>
        <div><dt>十二长生</dt><dd>{pillar.growthStage}</dd></div>
        <div><dt>旬空</dt><dd>{pillar.xunKong}</dd></div>
      </dl>
      <div className="pillar-stars">
        {pillar.shenSha.length ? pillar.shenSha.map((star) => <i title={star.note} key={`${pillar.id}-${star.name}`}>{star.name}</i>) : <span>无基础神煞命中</span>}
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function ComparisonPanel({ comparison }: { comparison: ChartComparison }) {
  const correction = comparison.trueSolar.timeCorrection;
  return (
    <section className={`comparison-panel panel ${comparison.hasDifference ? 'has-change' : ''}`}>
      <div className="section-heading compact"><span>02</span><div><h2>真太阳时自动校准</h2><p>系统自动识别地点、历史时区、夏令时、经度差和均时差</p></div></div>
      <div className="calendar-origin">
        <span>用户输入</span>
        <b>{comparison.civil.input.calendarType === 'lunar' ? `农历${comparison.civil.input.leapMonth ? '闰' : ''}` : '公历'} {comparison.civil.input.year}-{comparison.civil.input.month}-{comparison.civil.input.day} {clockValue(comparison.civil.input.hour, comparison.civil.input.minute)}</b>
        <em>换算民用公历 {comparison.civil.civilSolarInput.year}-{comparison.civil.civilSolarInput.month}-{comparison.civil.civilSolarInput.day}</em>
      </div>
      <div className="correction-ledger">
        <div><small>民用时间</small><b>{correction.civilText}</b><span>{comparison.civil.input.locationName}</span></div>
        <div><small>经度修正</small><b>{correctionLabel(correction.longitudeCorrectionMinutes)}</b><span>中央经线 {correction.standardMeridian.toFixed(1)}°</span></div>
        <div><small>均时差</small><b>{correctionLabel(correction.equationOfTimeMinutes)}</b><span>季节性太阳时差</span></div>
        <div><small>夏令时回退</small><b>{correctionLabel(correction.dstCorrectionMinutes)}</b><span>按出生日期自动识别</span></div>
        <div className="total"><small>最终采用</small><b>{correction.trueSolarText}</b><span>真太阳时 · 总修正 {correctionLabel(correction.totalCorrectionMinutes)}</span></div>
      </div>
      <div className="dual-chart-table">
        <div className="dual-head"><span>柱位</span><span>民用时盘</span><span>真太阳时盘</span><span>结果</span></div>
        {comparison.civil.pillars.map((pillar, index) => {
          const corrected = comparison.trueSolar.pillars[index];
          const changed = pillar.ganZhi !== corrected.ganZhi;
          return <div className={changed ? 'changed' : ''} key={pillar.label}><span>{pillar.label}</span><b>{pillar.ganZhi}</b><b>{corrected.ganZhi}</b><em>{changed ? '已校正' : '一致'}</em></div>;
        })}
      </div>
      <p className="comparison-verdict">{comparison.hasDifference ? `真太阳时校准改变了 ${comparison.differences.length} 柱，系统已经自动采用校准后的命盘。` : '真太阳时校准没有改变四柱；系统仍以校准后的精确时间作为后续计算口径。'}</p>
    </section>
  );
}

function App() {
  const [form, setForm] = useState<BirthInput>(DEFAULT_INPUT);
  const [comparison, setComparison] = useState<ChartComparison>(() => compareCivilAndTrueSolar(DEFAULT_INPUT));
  const [error, setError] = useState('');
  const [selectedCycle, setSelectedCycle] = useState(0);
  const [copied, setCopied] = useState(false);

  const chart = comparison.trueSolar;
  const cycle = chart.luck.cycles[selectedCycle] ?? chart.luck.cycles[0];
  const json = useMemo(() => JSON.stringify(comparison, null, 2), [comparison]);

  function update<K extends keyof BirthInput>(key: K, value: BirthInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function updateClock(value: string) {
    const [hour, minute] = value.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
    setForm((previous) => ({ ...previous, hour, minute }));
  }

  function applyLocation(patch: LocationPatch) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  function loadInput(input: BirthInput) {
    try {
      const normalized = normalizeAutomaticTime({ ...input, timeBasis: 'true-solar' });
      const next = compareCivilAndTrueSolar(normalized);
      setForm(normalized);
      setComparison(next);
      setSelectedCycle(0);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '命盘载入失败，请检查输入。');
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    loadInput(form);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main>
      <header className="masthead"><div><p className="eyebrow">MING MIRROR · EXPLAINABLE BAZI WORKSTATION</p><h1>命镜</h1><p className="subtitle">先给明确结论，再按需展开专业依据</p></div><div className="engine-badge"><i />自动校时 · 确定性计算</div></header>

      <section className="workspace">
        <aside className="input-panel panel">
          <div className="section-heading"><span>01</span><div><h2>出生信息</h2><p>只需填写日期、时间、出生地和性别</p></div></div>
          <form onSubmit={submit}>
            <div className="field-grid two">
              <Field label="输入历法"><select value={form.calendarType} onChange={(event) => update('calendarType', event.target.value as BirthInput['calendarType'])}><option value="solar">公历</option><option value="lunar">农历</option></select></Field>
              <Field label="农历闰月"><select disabled={form.calendarType !== 'lunar'} value={form.leapMonth ? 'yes' : 'no'} onChange={(event) => update('leapMonth', event.target.value === 'yes')}><option value="no">非闰月</option><option value="yes">闰月</option></select></Field>
            </div>
            <div className="field-grid three">
              <Field label={`${form.calendarType === 'lunar' ? '农历' : '公历'}年`}><input type="number" min="1900" max="2100" value={form.year} onChange={(event) => update('year', Number(event.target.value))} /></Field>
              <Field label="月"><input type="number" min="1" max="12" value={form.month} onChange={(event) => update('month', Number(event.target.value))} /></Field>
              <Field label="日"><input type="number" min="1" max={form.calendarType === 'lunar' ? 30 : 31} value={form.day} onChange={(event) => update('day', Number(event.target.value))} /></Field>
            </div>
            <div className="field-grid two">
              <Field label="出生时间"><input type="time" step="60" value={clockValue(form.hour, form.minute)} onChange={(event) => updateClock(event.target.value)} /></Field>
              <Field label="性别"><select value={form.gender} onChange={(event) => update('gender', event.target.value as BirthInput['gender'])}><option value="male">男</option><option value="female">女</option></select></Field>
            </div>

            <div className="form-divider"><span>出生地点</span></div>
            <LocationSearch input={form} onResolve={applyLocation} />

            <details className="advanced-inputs">
              <summary>专业设置</summary>
              <Field label="晚子时换日规则"><select value={form.dayBoundary} onChange={(event) => update('dayBoundary', event.target.value as BirthInput['dayBoundary'])}><option value="midnight">0:00 换日</option><option value="late-zi">23:00 换日</option></select></Field>
              <p>普通用户保持默认即可。地点坐标、历史时区、夏令时和真太阳时均由系统自动处理。</p>
            </details>

            <div className="scope-note"><strong>自动排盘口径</strong><p>系统根据出生地和出生日期自动识别经纬度、当地历史时区与夏令时，再计算真太阳时。用户不需要选择“民用时盘还是真太阳时盘”。</p></div>
            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit">按真太阳时生成命盘 <span>→</span></button>
          </form>
          <ArchiveManager currentInput={form} onLoad={loadInput} />
        </aside>

        <section className="chart-panel panel">
          <div className="chart-topline"><div><p>TRUE SOLAR TIME · {chart.solarText}</p><h2>{chart.lunarText}</h2></div><div className="chart-controls"><span className="auto-basis">已自动采用真太阳时</span><div className="identity"><span>生肖 {chart.zodiac}</span><strong>日主 {chart.dayMaster}</strong></div></div></div>
          <div className="pillars">{chart.pillars.map((pillar) => <PillarCard key={pillar.label} pillar={pillar} />)}</div>
          <div className="term-strip"><div><small>前一节</small><b>{chart.prevJie.name}</b><span>{chart.prevJie.datetime}</span></div><div><small>前一气</small><b>{chart.prevQi.name}</b><span>{chart.prevQi.datetime}</span></div><div><small>后一节</small><b>{chart.nextJie.name}</b><span>{chart.nextJie.datetime}</span></div><div><small>后一气</small><b>{chart.nextQi.name}</b><span>{chart.nextQi.datetime}</span></div></div>
        </section>
      </section>

      <details className="comparison-disclosure">
        <summary><span>已自动完成真太阳时校准</span><b>{comparison.civil.timeCorrection.civilText} → {comparison.trueSolar.timeCorrection.trueSolarText}</b><em>查看计算明细</em></summary>
        <ComparisonPanel comparison={comparison} />
      </details>

      <section className="panel relation-panel">
        <div className="section-heading compact"><span>03</span><div><h2>原局关键关系</h2><p>直接呈现合、冲、刑、害等主要结构；完整条件留在专业审计</p></div></div>
        <div className="relation-stats"><b>组合 {chart.relations.length}</b><b>五行关系 {chart.elementInteractions.length}</b><b>神煞落点 {chart.pillars.reduce((sum, pillar) => sum + pillar.shenSha.length, 0)}</b></div>
        {chart.relations.length ? <div className="relation-grid">{chart.relations.map((relation) => <article key={relation.id}><div className="relation-title"><span>{relation.category} · {relation.type}</span><b>{relation.name}</b></div><div className="relation-members">{relation.members.map((member) => <i key={`${relation.id}-${member.id}`}>{member.label} <strong>{member.char}</strong></i>)}</div><p>{relation.note}</p></article>)}</div> : <div className="empty-relations">原局没有形成当前规则库覆盖的显著合、冲、刑、害、破、三合或三会结构。</div>}
      </section>

      <FoundationExplorer chart={chart} />

      <details className="hour-tool-disclosure">
        <summary><span>出生时辰不确定？</span><b>打开十二时辰对比工具</b></summary>
        <HourCandidateExplorer input={form} onUse={loadInput} />
      </details>

      <section className="lower-grid">
        <section className="panel luck-panel">
          <div className="section-heading compact"><span>08</span><div><h2>九步大运总览</h2><p>{chart.luck.forward ? '顺排' : '逆排'} · 出生后 {chart.luck.startText} 起运 · {chart.luck.startSolar}</p></div></div>
          <div className="cycle-tabs" role="tablist">{chart.luck.cycles.map((item, index) => <button key={`${item.index}-${item.ganZhi}`} className={index === selectedCycle ? 'active' : ''} onClick={() => setSelectedCycle(index)} type="button"><small>{item.startAge}—{item.endAge}岁</small><b>{item.ganZhi}</b><span>{item.pillar.tenGod} · {item.pillar.growthStage}</span><span>{item.startYear}—{item.endYear}</span></button>)}</div>
          {cycle && <div className="annual-grid">{cycle.years.map((year) => <div key={year.year}><span>{year.year}</span><b>{year.ganZhi}</b><strong>{year.pillar.tenGod}</strong><small>{year.age}岁 · 空 {year.xunKong}</small></div>)}</div>}
        </section>
        <aside className="panel audit-panel">
          <div className="section-heading compact"><span>09</span><div><h2>辅助盘项</h2><p>原始结构信息，仅供专业复核</p></div></div>
          <dl className="aux-list"><div><dt>胎元</dt><dd>{chart.auxiliary.taiYuan}</dd></div><div><dt>胎息</dt><dd>{chart.auxiliary.taiXi}</dd></div><div><dt>命宫</dt><dd>{chart.auxiliary.mingGong}</dd></div><div><dt>身宫</dt><dd>{chart.auxiliary.shenGong}</dd></div></dl>
          <button className="secondary" type="button" onClick={copyJson}>{copied ? '已复制双盘数据' : '复制基础双盘 JSON'}</button>
          <p className="audit-footnote">原局、大运、流年、十神、藏干、神煞、时间修正与作用关系都进入同一审计结构；流月按选择即时生成。</p>
        </aside>
      </section>
      <footer><span>命镜可解释八字工作站</span><span>普通模式给判断 · 专业模式给证据 · 真太阳时自动完成</span></footer>
    </main>
  );
}

export default App;
