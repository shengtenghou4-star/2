import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { compareCivilAndTrueSolar } from './lib/bazi';
import type { BaziChart, BirthInput, ChartComparison } from './lib/bazi';
import { correctionLabel } from './lib/solar-time';

const DEFAULT_INPUT: BirthInput = {
  year: 2003,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: 'male',
  dayBoundary: 'midnight',
  timeBasis: 'true-solar',
  locationName: '北京',
  longitude: 116.4074,
  latitude: 39.9042,
  utcOffset: 8,
  dstMinutes: 0,
};

const LOCATION_PRESETS: Array<Pick<BirthInput, 'locationName' | 'longitude' | 'latitude' | 'utcOffset' | 'dstMinutes'>> = [
  { locationName: '北京', longitude: 116.4074, latitude: 39.9042, utcOffset: 8, dstMinutes: 0 },
  { locationName: '济宁', longitude: 116.5872, latitude: 35.4149, utcOffset: 8, dstMinutes: 0 },
  { locationName: '上海', longitude: 121.4737, latitude: 31.2304, utcOffset: 8, dstMinutes: 0 },
  { locationName: '东京', longitude: 139.6917, latitude: 35.6895, utcOffset: 9, dstMinutes: 0 },
  { locationName: '巴尔的摩', longitude: -76.6122, latitude: 39.2904, utcOffset: -5, dstMinutes: 0 },
];

const ELEMENT_CLASS: Record<string, string> = {
  木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water',
};

function PillarCard({ pillar, dayMaster }: { pillar: BaziChart['pillars'][number]; dayMaster: string }) {
  return (
    <article className={`pillar-card ${pillar.label === '日柱' ? 'is-day' : ''}`}>
      <div className="pillar-label">{pillar.label}</div>
      <div className="ten-god">{pillar.tenGod}</div>
      <div className={`stem ${ELEMENT_CLASS[pillar.stemElement] ?? ''}`}>
        {pillar.stem}
        <small>{pillar.stemElement}</small>
      </div>
      <div className={`branch ${ELEMENT_CLASS[pillar.branchElement] ?? ''}`}>
        {pillar.branch}
        <small>{pillar.branchElement}</small>
      </div>
      <div className="hidden-stems">
        <span>藏干</span>
        {pillar.hiddenStems.map((item) => (
          <b key={`${pillar.label}-${item.stem}-${item.tenGod}`}>
            {item.stem}<em>{item.stem === dayMaster ? '比肩' : item.tenGod}</em>
          </b>
        ))}
      </div>
      <dl className="pillar-meta">
        <div><dt>纳音</dt><dd>{pillar.naYin}</dd></div>
        <div><dt>十二长生</dt><dd>{pillar.growthStage}</dd></div>
        <div><dt>旬空</dt><dd>{pillar.xunKong}</dd></div>
      </dl>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function BasisToggle({ basis, onChange }: { basis: BirthInput['timeBasis']; onChange: (basis: BirthInput['timeBasis']) => void }) {
  return (
    <div className="basis-toggle" aria-label="排盘口径">
      <button type="button" className={basis === 'civil' ? 'active' : ''} onClick={() => onChange('civil')}>民用时盘</button>
      <button type="button" className={basis === 'true-solar' ? 'active' : ''} onClick={() => onChange('true-solar')}>真太阳时盘</button>
    </div>
  );
}

function ComparisonPanel({ comparison }: { comparison: ChartComparison }) {
  const correction = comparison.trueSolar.timeCorrection;
  return (
    <section className={`comparison-panel panel ${comparison.hasDifference ? 'has-change' : ''}`}>
      <div className="section-heading compact">
        <span>02</span>
        <div>
          <h2>时间校准与双盘审计</h2>
          <p>民用钟表时间与当地真太阳时并列保存</p>
        </div>
      </div>

      <div className="correction-ledger">
        <div><small>民用时间</small><b>{correction.civilText}</b><span>{comparison.civil.input.locationName} UTC{comparison.civil.input.utcOffset >= 0 ? '+' : ''}{comparison.civil.input.utcOffset}</span></div>
        <div><small>经度修正</small><b>{correctionLabel(correction.longitudeCorrectionMinutes)}</b><span>中央经线 {correction.standardMeridian.toFixed(1)}°</span></div>
        <div><small>均时差</small><b>{correctionLabel(correction.equationOfTimeMinutes)}</b><span>季节性太阳时差</span></div>
        <div><small>夏令时回退</small><b>{correctionLabel(correction.dstCorrectionMinutes)}</b><span>由用户明确输入</span></div>
        <div className="total"><small>真太阳时</small><b>{correction.trueSolarText}</b><span>总修正 {correctionLabel(correction.totalCorrectionMinutes)}</span></div>
      </div>

      <div className="dual-chart-table">
        <div className="dual-head"><span>柱位</span><span>民用时盘</span><span>真太阳时盘</span><span>结果</span></div>
        {comparison.civil.pillars.map((pillar, index) => {
          const corrected = comparison.trueSolar.pillars[index];
          const changed = pillar.ganZhi !== corrected.ganZhi;
          return (
            <div className={changed ? 'changed' : ''} key={pillar.label}>
              <span>{pillar.label}</span>
              <b>{pillar.ganZhi}</b>
              <b>{corrected.ganZhi}</b>
              <em>{changed ? '发生变化' : '一致'}</em>
            </div>
          );
        })}
      </div>

      <p className="comparison-verdict">
        {comparison.hasDifference
          ? `校准后有 ${comparison.differences.length} 柱变化。系统保留两盘，不自动替你裁定采用哪一种。`
          : '校准没有改变四柱，但修正时间仍写入审计数据，后续可复核。'}
      </p>
    </section>
  );
}

function App() {
  const [form, setForm] = useState<BirthInput>(DEFAULT_INPUT);
  const [comparison, setComparison] = useState<ChartComparison>(() => compareCivilAndTrueSolar(DEFAULT_INPUT));
  const [basis, setBasis] = useState<BirthInput['timeBasis']>('true-solar');
  const [error, setError] = useState('');
  const [selectedCycle, setSelectedCycle] = useState(0);
  const [copied, setCopied] = useState(false);

  const chart = basis === 'true-solar' ? comparison.trueSolar : comparison.civil;
  const cycle = chart.luck.cycles[selectedCycle] ?? chart.luck.cycles[0];
  const json = useMemo(() => JSON.stringify(comparison, null, 2), [comparison]);

  function update<K extends keyof BirthInput>(key: K, value: BirthInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function applyPreset(name: string) {
    const preset = LOCATION_PRESETS.find((item) => item.locationName === name);
    if (!preset) return;
    setForm((previous) => ({ ...previous, ...preset }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const next = compareCivilAndTrueSolar(form);
      setComparison(next);
      setBasis(form.timeBasis);
      setSelectedCycle(0);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '排盘失败，请检查输入。');
    }
  }

  async function copyJson() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main>
      <header className="masthead">
        <div>
          <p className="eyebrow">MING MIRROR · CHART ENGINE 0.2</p>
          <h1>命镜</h1>
          <p className="subtitle">真太阳时双盘审计 · 干支结构关系 · 无大模型参与</p>
        </div>
        <div className="engine-badge"><i />确定性计算</div>
      </header>

      <section className="workspace">
        <aside className="input-panel panel">
          <div className="section-heading">
            <span>01</span>
            <div><h2>出生信息</h2><p>经纬度、时区与夏令时全部显式输入</p></div>
          </div>

          <form onSubmit={submit}>
            <div className="field-grid three">
              <Field label="公历年"><input type="number" min="1900" max="2100" value={form.year} onChange={(e) => update('year', Number(e.target.value))} /></Field>
              <Field label="月"><input type="number" min="1" max="12" value={form.month} onChange={(e) => update('month', Number(e.target.value))} /></Field>
              <Field label="日"><input type="number" min="1" max="31" value={form.day} onChange={(e) => update('day', Number(e.target.value))} /></Field>
            </div>
            <div className="field-grid two">
              <Field label="小时"><input type="number" min="0" max="23" value={form.hour} onChange={(e) => update('hour', Number(e.target.value))} /></Field>
              <Field label="分钟"><input type="number" min="0" max="59" value={form.minute} onChange={(e) => update('minute', Number(e.target.value))} /></Field>
            </div>
            <div className="field-grid two">
              <Field label="性别">
                <select value={form.gender} onChange={(e) => update('gender', e.target.value as BirthInput['gender'])}>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </Field>
              <Field label="晚子时换日">
                <select value={form.dayBoundary} onChange={(e) => update('dayBoundary', e.target.value as BirthInput['dayBoundary'])}>
                  <option value="midnight">0:00 换日</option>
                  <option value="late-zi">23:00 换日</option>
                </select>
              </Field>
            </div>

            <div className="form-divider"><span>地点与时间制度</span></div>
            <Field label="常用地点">
              <select value={LOCATION_PRESETS.some((item) => item.locationName === form.locationName) ? form.locationName : ''} onChange={(e) => applyPreset(e.target.value)}>
                <option value="">手动输入</option>
                {LOCATION_PRESETS.map((item) => <option value={item.locationName} key={item.locationName}>{item.locationName}</option>)}
              </select>
            </Field>
            <Field label="地点名称"><input value={form.locationName} onChange={(e) => update('locationName', e.target.value)} /></Field>
            <div className="field-grid two">
              <Field label="经度（东正西负）"><input type="number" step="0.0001" value={form.longitude} onChange={(e) => update('longitude', Number(e.target.value))} /></Field>
              <Field label="纬度（北正南负）"><input type="number" step="0.0001" value={form.latitude} onChange={(e) => update('latitude', Number(e.target.value))} /></Field>
            </div>
            <div className="field-grid two">
              <Field label="标准 UTC 时差"><input type="number" step="0.5" value={form.utcOffset} onChange={(e) => update('utcOffset', Number(e.target.value))} /></Field>
              <Field label="当时夏令时（分钟）"><input type="number" step="30" value={form.dstMinutes} onChange={(e) => update('dstMinutes', Number(e.target.value))} /></Field>
            </div>
            <Field label="默认展示口径">
              <select value={form.timeBasis} onChange={(e) => update('timeBasis', e.target.value as BirthInput['timeBasis'])}>
                <option value="true-solar">真太阳时</option>
                <option value="civil">民用标准时间</option>
              </select>
            </Field>

            <div className="scope-note">
              <strong>时间制度说明</strong>
              <p>真太阳时 = 民用时间 − 夏令时 + 经度修正 + 均时差。历史时区由用户输入，系统不凭现代时区倒推旧年代。</p>
            </div>

            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit">生成双盘 <span>→</span></button>
          </form>
        </aside>

        <section className="chart-panel panel">
          <div className="chart-topline">
            <div>
              <p>{basis === 'true-solar' ? 'TRUE SOLAR TIME' : 'CIVIL TIME'} · {chart.solarText}</p>
              <h2>{chart.lunarText}</h2>
            </div>
            <div className="chart-controls">
              <BasisToggle basis={basis} onChange={setBasis} />
              <div className="identity"><span>生肖 {chart.zodiac}</span><strong>日主 {chart.dayMaster}</strong></div>
            </div>
          </div>

          <div className="pillars">
            {chart.pillars.map((pillar) => <PillarCard key={pillar.label} pillar={pillar} dayMaster={chart.dayMaster} />)}
          </div>

          <div className="term-strip">
            <div><small>前一节</small><b>{chart.prevJie.name}</b><span>{chart.prevJie.datetime}</span></div>
            <div><small>前一气</small><b>{chart.prevQi.name}</b><span>{chart.prevQi.datetime}</span></div>
            <div><small>后一节</small><b>{chart.nextJie.name}</b><span>{chart.nextJie.datetime}</span></div>
            <div><small>后一气</small><b>{chart.nextQi.name}</b><span>{chart.nextQi.datetime}</span></div>
          </div>
        </section>
      </section>

      <ComparisonPanel comparison={comparison} />

      <section className="panel relation-panel">
        <div className="section-heading compact">
          <span>03</span>
          <div><h2>干支结构关系</h2><p>当前展示 {basis === 'true-solar' ? '真太阳时盘' : '民用时盘'}；只确认结构，不判合化与吉凶</p></div>
        </div>
        {chart.relations.length ? (
          <div className="relation-grid">
            {chart.relations.map((relation) => (
              <article key={relation.id}>
                <div className="relation-title"><span>{relation.category} · {relation.type}</span><b>{relation.name}</b></div>
                <div className="relation-members">
                  {relation.members.map((member) => <i key={`${member.pillar}-${member.char}`}>{member.pillar} <strong>{member.char}</strong></i>)}
                </div>
                <p>{relation.note}</p>
              </article>
            ))}
          </div>
        ) : <div className="empty-relations">四柱之间未检测到当前规则库覆盖的合、冲、刑、害、破、三合或三会结构。</div>}
      </section>

      <section className="lower-grid">
        <section className="panel luck-panel">
          <div className="section-heading compact">
            <span>04</span>
            <div><h2>大运</h2><p>{chart.luck.forward ? '顺排' : '逆排'} · 出生后 {chart.luck.startText} 起运 · {chart.luck.startSolar}</p></div>
          </div>

          <div className="cycle-tabs" role="tablist">
            {chart.luck.cycles.map((item, index) => (
              <button key={`${item.index}-${item.ganZhi}`} className={index === selectedCycle ? 'active' : ''} onClick={() => setSelectedCycle(index)} type="button">
                <small>{item.startAge}—{item.endAge}岁</small>
                <b>{item.ganZhi}</b>
                <span>{item.startYear}—{item.endYear}</span>
              </button>
            ))}
          </div>

          {cycle && (
            <div className="annual-grid">
              {cycle.years.map((year) => (
                <div key={year.year}><span>{year.year}</span><b>{year.ganZhi}</b><small>{year.age}岁 · 空 {year.xunKong}</small></div>
              ))}
            </div>
          )}
        </section>

        <aside className="panel audit-panel">
          <div className="section-heading compact">
            <span>05</span>
            <div><h2>辅助盘项</h2><p>原始结构信息，不做吉凶解释</p></div>
          </div>
          <dl className="aux-list">
            <div><dt>胎元</dt><dd>{chart.auxiliary.taiYuan}</dd></div>
            <div><dt>胎息</dt><dd>{chart.auxiliary.taiXi}</dd></div>
            <div><dt>命宫</dt><dd>{chart.auxiliary.mingGong}</dd></div>
            <div><dt>身宫</dt><dd>{chart.auxiliary.shenGong}</dd></div>
          </dl>
          <button className="secondary" type="button" onClick={copyJson}>{copied ? '已复制双盘数据' : '复制双盘 JSON'}</button>
          <p className="audit-footnote">民用盘、真太阳时盘、时间修正明细和结构关系都在同一份审计对象里。</p>
        </aside>
      </section>

      <footer><span>命镜排盘内核 v0.2</span><span>双盘并存 · 时间可追溯 · 结构不越权</span></footer>
    </main>
  );
}

export default App;
