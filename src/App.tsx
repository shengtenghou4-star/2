import { FormEvent, useMemo, useState } from 'react';
import { BaziChart, BirthInput, calculateBazi } from './lib/bazi';

const DEFAULT_INPUT: BirthInput = {
  year: 2003,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: 'male',
  dayBoundary: 'midnight',
};

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function App() {
  const [form, setForm] = useState<BirthInput>(DEFAULT_INPUT);
  const [chart, setChart] = useState<BaziChart>(() => calculateBazi(DEFAULT_INPUT));
  const [error, setError] = useState('');
  const [selectedCycle, setSelectedCycle] = useState(0);
  const [copied, setCopied] = useState(false);

  const cycle = chart.luck.cycles[selectedCycle] ?? chart.luck.cycles[0];
  const json = useMemo(() => JSON.stringify(chart, null, 2), [chart]);

  function update<K extends keyof BirthInput>(key: K, value: BirthInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const next = calculateBazi(form);
      setChart(next);
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
          <p className="eyebrow">MING MIRROR · CHART ENGINE 0.1</p>
          <h1>命镜</h1>
          <p className="subtitle">可核对、可导出、无大模型参与的八字排盘底座</p>
        </div>
        <div className="engine-badge"><i />确定性计算</div>
      </header>

      <section className="workspace">
        <aside className="input-panel panel">
          <div className="section-heading">
            <span>01</span>
            <div><h2>出生信息</h2><p>当前按输入地的标准民用时间排盘</p></div>
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

            <div className="scope-note">
              <strong>本版边界</strong>
              <p>已处理节气换年换月、晚子时流派差异；真太阳时、历史时区和夏令时将在地点模块加入。</p>
            </div>

            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit">重新排盘 <span>→</span></button>
          </form>
        </aside>

        <section className="chart-panel panel">
          <div className="chart-topline">
            <div>
              <p>{chart.solarText}</p>
              <h2>{chart.lunarText}</h2>
            </div>
            <div className="identity">
              <span>生肖 {chart.zodiac}</span>
              <strong>日主 {chart.dayMaster}</strong>
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

      <section className="lower-grid">
        <section className="panel luck-panel">
          <div className="section-heading compact">
            <span>02</span>
            <div><h2>大运</h2><p>{chart.luck.forward ? '顺排' : '逆排'} · 出生后 {chart.luck.startText} 起运 · {chart.luck.startSolar}</p></div>
          </div>

          <div className="cycle-tabs" role="tablist">
            {chart.luck.cycles.map((item, index) => (
              <button
                key={`${item.index}-${item.ganZhi}`}
                className={index === selectedCycle ? 'active' : ''}
                onClick={() => setSelectedCycle(index)}
                type="button"
              >
                <small>{item.startAge}—{item.endAge}岁</small>
                <b>{item.ganZhi}</b>
                <span>{item.startYear}—{item.endYear}</span>
              </button>
            ))}
          </div>

          {cycle && (
            <div className="annual-grid">
              {cycle.years.map((year) => (
                <div key={year.year}>
                  <span>{year.year}</span>
                  <b>{year.ganZhi}</b>
                  <small>{year.age}岁 · 空 {year.xunKong}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="panel audit-panel">
          <div className="section-heading compact">
            <span>03</span>
            <div><h2>辅助盘项</h2><p>原始结构信息，不做吉凶解释</p></div>
          </div>
          <dl className="aux-list">
            <div><dt>胎元</dt><dd>{chart.auxiliary.taiYuan}</dd></div>
            <div><dt>胎息</dt><dd>{chart.auxiliary.taiXi}</dd></div>
            <div><dt>命宫</dt><dd>{chart.auxiliary.mingGong}</dd></div>
            <div><dt>身宫</dt><dd>{chart.auxiliary.shenGong}</dd></div>
          </dl>
          <button className="secondary" type="button" onClick={copyJson}>{copied ? '已复制结构化数据' : '复制排盘 JSON'}</button>
          <p className="audit-footnote">后续旺衰、格局、用神和流年引擎只读取这份结构化结果，不回头重算。</p>
        </aside>
      </section>

      <footer>
        <span>命镜排盘内核 v0.1</span>
        <span>节气定月 · 立春定年 · 规则可审计</span>
      </footer>
    </main>
  );
}

export default App;
