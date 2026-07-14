import { useMemo, useState, type FormEvent } from 'react';
import { buildAnalysisBundle, buildNatalAnalysisBundle } from '../lib/analysis-bundle';
import { compareCivilAndTrueSolar, type BaziChart, type BirthInput } from '../lib/bazi-audited';
import { buildCareerAssessment, type CareerAssessment } from '../lib/career';
import type { LuckContext } from '../lib/context';
import { buildContextForecast, buildLifeForecast, buildMonthlyForecast } from '../lib/forecast';
import {
  buildCompatibilityAssessment,
  buildRelationshipProfile,
  type CompatibilityAssessment,
} from '../lib/relationship';
import { buildWealthAssessment } from '../lib/wealth';

export type ProductTopic = 'wealth' | 'relationship' | 'timeline' | 'roles';

interface ProductSuiteProps {
  chart: BaziChart;
  context: LuckContext;
  cycleIndex: number;
  yearIndex: number;
  compact?: boolean;
}

const MODE_EXAMPLES: Record<string, string[]> = {
  专业研究: ['研究分析', '专业服务', '数据与策略', '教育培训', '标准与方法建设'],
  表达创造: ['产品设计', '技术开发', '内容与品牌', '咨询方案', '创新项目'],
  商业经营: ['业务拓展', '客户经营', '投资与资源配置', '供应链经营', '商业运营'],
  规则治理: ['项目管理', '合规风控', '组织治理', '公共管理', '复杂交付'],
  自主竞争: ['创业与开拓', '独立负责人', '销售谈判', '团队动员', '高不确定任务'],
};

function careerFor(chart: BaziChart, context: LuckContext, bundle: ReturnType<typeof buildAnalysisBundle>) {
  return buildCareerAssessment({
    natalNodes: chart.pillars,
    contextNodes: context.nodes,
    natalEvidence: bundle.natalEvidence,
    currentEvidence: bundle.currentEvidence,
    natalDynamics: bundle.natalDynamics,
    currentDynamics: bundle.currentDynamics,
    natalStrength: bundle.natalStrength,
    currentStrength: bundle.currentStrength,
    interpretation: bundle.interpretation,
    energy: bundle.energy,
  });
}

function RoleMap({ career }: { career: CareerAssessment }) {
  const primary = career.primaryMode;
  const secondary = career.secondaryMode;
  const authority = career.modes.find((item) => item.family === '官杀')!;
  const peers = career.modes.find((item) => item.family === '比劫')!;
  const wealth = career.modes.find((item) => item.family === '财星')!;
  const output = career.modes.find((item) => item.family === '食伤')!;
  const resource = career.modes.find((item) => item.family === '印星')!;
  const managerScore = (authority.score + wealth.score + peers.score) / 3;
  const frontScore = (wealth.score + output.score + peers.score) / 3;
  const structureScore = (authority.score + resource.score) / 2;
  const roleExamples = [...new Set([...(MODE_EXAMPLES[primary.shortName] ?? []), ...(MODE_EXAMPLES[secondary.shortName] ?? [])])].slice(0, 8);
  const dimensions = [
    {
      label: '个人贡献 / 管理责任',
      value: managerScore >= 68 ? '适合逐步承担管理与资源责任' : managerScore >= 52 ? '适合专业负责人或小团队带领' : '先以独立专业贡献建立位置',
      score: managerScore,
    },
    {
      label: '前台 / 中后台',
      value: frontScore >= 68 ? '更适合接近客户、市场与结果前台' : frontScore >= 50 ? '适合连接专业与业务的中台角色' : '更适合深度专业、研究或治理后台',
      score: frontScore,
    },
    {
      label: '大组织 / 小团队',
      value: structureScore >= 66 ? '制度成熟的大中型组织更易稳定发挥' : peers.score + output.score >= 130 ? '授权充分的小团队或自主业务更易发挥' : '组织规模不是核心，真实授权与评价机制更重要',
      score: structureScore,
    },
    {
      label: '项目制 / 稳定职能',
      value: output.score + peers.score >= authority.score + resource.score ? '更适合项目制、迭代和阶段性交付' : '更适合可积累、可复用的长期职能体系',
      score: (output.score + peers.score) / 2,
    },
    {
      label: '主要评价标准',
      value: primary.family === '财星' ? '收入、效率、客户与经营结果' : primary.family === '官杀' ? '责任、风险、秩序与可靠交付' : primary.family === '食伤' ? '产品、作品、方案与创新成果' : primary.family === '印星' ? '专业质量、判断深度与知识资产' : '开拓、动员、竞争位置与自主成果',
      score: primary.score,
    },
  ];
  return (
    <div className="role-map">
      <div className="role-map-head"><div><span>现实岗位映射</span><h3>{primary.shortName} × {secondary.shortName}</h3></div><p>下面是工作机制示例，不是命定职业清单。</p></div>
      <div className="role-dimensions">
        {dimensions.map((item) => <article key={item.label}><span>{item.label}</span><b>{item.value}</b><i><em style={{ width: `${Math.max(2, item.score)}%` }} /></i></article>)}
      </div>
      <div className="role-examples"><strong>可用于筛选职位描述的示例关键词</strong>{roleExamples.map((item) => <span key={item}>{item}</span>)}</div>
      <div className="role-checklist">
        <strong>看岗位时优先问</strong>
        <p>我真正负责什么结果？</p><p>我有多少真实权限和资源？</p><p>评价标准是专业质量、业务结果还是组织责任？</p><p>工作需要长期积累还是高频切换？</p>
      </div>
    </div>
  );
}

function WealthPanel({ chart, context }: { chart: BaziChart; context: LuckContext }) {
  const bundle = useMemo(() => buildAnalysisBundle(chart, context), [chart, context]);
  const wealth = useMemo(() => buildWealthAssessment(chart, context, bundle), [chart, context, bundle]);
  return (
    <div className="topic-panel wealth-topic">
      <div className="topic-hero"><div><span>{wealth.version} · {wealth.fingerprint}</span><h3>{wealth.headline}</h3><p>{wealth.summary}</p></div><aside><b>{wealth.confidence}</b><strong>{wealth.confidenceScore.toFixed(2)}</strong><small>综合可信度</small></aside></div>
      <div className="wealth-axis-grid">{wealth.axes.map((item) => <article key={item.id}><header><span>{item.confidence}</span><b>{item.name}</b><strong>{item.score.toFixed(2)}</strong></header><p>{item.summary}</p><i><em style={{ width: `${item.score}%` }} /></i><details><summary>查看依据</summary>{item.evidence.map((evidence) => <div key={evidence.id}><b>{evidence.label}</b><p>{evidence.detail}</p></div>)}</details></article>)}</div>
      <div className="topic-two-column"><section><div className="subheading"><h3>财富渠道</h3><span>收入来自什么机制</span></div>{wealth.channels.map((item) => <article className="simple-topic-card" key={item.id}><header><span>{item.fit}</span><b>{item.title}</b></header><p>{item.explanation}</p></article>)}</section><section><div className="subheading"><h3>财富风险</h3><span>重点看承载和现金流</span></div>{wealth.risks.map((item) => <article className={`simple-topic-card risk-${item.level}`} key={item.id}><header><span>{item.level}</span><b>{item.title}</b></header><p>{item.explanation}</p><small>{item.control}</small></article>)}</section></div>
      <div className="topic-signals"><strong>当前岁运财富变化</strong>{wealth.temporalSignals.map((item) => <p key={item}>{item}</p>)}</div>
      <div className="topic-notes">{wealth.notes.map((item) => <p key={item}>{item}</p>)}</div>
    </div>
  );
}

function RelationshipPanel({ chart, context }: { chart: BaziChart; context: LuckContext }) {
  const bundle = useMemo(() => buildAnalysisBundle(chart, context), [chart, context]);
  const profile = useMemo(() => buildRelationshipProfile(bundle), [bundle]);
  const [partnerInput, setPartnerInput] = useState<BirthInput>(() => ({ ...chart.input, calendarType: 'solar', leapMonth: false, year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: chart.input.gender === 'male' ? 'female' : 'male' }));
  const [compatibility, setCompatibility] = useState<CompatibilityAssessment | null>(null);
  const [partnerChart, setPartnerChart] = useState<BaziChart | null>(null);
  const [error, setError] = useState('');

  function update<K extends keyof BirthInput>(key: K, value: BirthInput[K]) {
    setPartnerInput((previous) => ({ ...previous, [key]: value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const comparison = compareCivilAndTrueSolar(partnerInput);
      const nextChart = partnerInput.timeBasis === 'true-solar' ? comparison.trueSolar : comparison.civil;
      const nextBundle = buildNatalAnalysisBundle(nextChart);
      const primaryNatal = buildNatalAnalysisBundle(chart);
      setPartnerChart(nextChart);
      setCompatibility(buildCompatibilityAssessment(chart, primaryNatal, nextChart, nextBundle));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '第二张命盘生成失败。');
    }
  }

  return (
    <div className="topic-panel relationship-topic">
      <div className="topic-hero"><div><span>{profile.version}</span><h3>{profile.headline}</h3><p>{profile.summary}</p></div><aside><b>{profile.confidence}</b><small>单人关系画像</small></aside></div>
      <div className="relationship-axis-grid">{profile.axes.map((item) => <article key={item.id}><header><b>{item.name}</b><strong>{item.score.toFixed(2)}</strong></header><p>{item.summary}</p><i><em style={{ width: `${item.score}%` }} /></i></article>)}</div>
      <div className="topic-two-column"><section><div className="subheading"><h3>关系需要</h3><span>要转成可执行约定</span></div>{profile.needs.map((item) => <p className="topic-line" key={item}>{item}</p>)}</section><section><div className="subheading"><h3>关系风险</h3><span>不是给具体伴侣贴标签</span></div>{profile.risks.map((item) => <p className="topic-line warning" key={item}>{item}</p>)}</section></div>
      <section className="compatibility-workbench">
        <div className="subheading"><h3>双人合盘</h3><span>输入第二张盘，跨盘识别合冲刑害与关系机制</span></div>
        <form onSubmit={submit}>
          <label><span>年</span><input type="number" min="1900" max="2100" value={partnerInput.year} onChange={(event) => update('year', Number(event.target.value))} /></label>
          <label><span>月</span><input type="number" min="1" max="12" value={partnerInput.month} onChange={(event) => update('month', Number(event.target.value))} /></label>
          <label><span>日</span><input type="number" min="1" max="31" value={partnerInput.day} onChange={(event) => update('day', Number(event.target.value))} /></label>
          <label><span>时</span><input type="number" min="0" max="23" value={partnerInput.hour} onChange={(event) => update('hour', Number(event.target.value))} /></label>
          <label><span>分</span><input type="number" min="0" max="59" value={partnerInput.minute} onChange={(event) => update('minute', Number(event.target.value))} /></label>
          <label><span>性别</span><select value={partnerInput.gender} onChange={(event) => update('gender', event.target.value as BirthInput['gender'])}><option value="male">男</option><option value="female">女</option></select></label>
          <label><span>口径</span><select value={partnerInput.timeBasis} onChange={(event) => update('timeBasis', event.target.value as BirthInput['timeBasis'])}><option value="true-solar">真太阳时</option><option value="civil">民用时</option></select></label>
          <button type="submit">生成合盘</button>
        </form>
        <p className="compatibility-location">默认继承当前命盘的地点、经纬度、时区和晚子时口径，可在基础输入区先切换。</p>
        {error && <p className="error">{error}</p>}
        {compatibility && partnerChart && <div className="compatibility-result"><div className="compatibility-head"><div><span>{compatibility.version} · {compatibility.fingerprint}</span><h3>{compatibility.headline}</h3><p>{compatibility.summary}</p></div><aside><b>{compatibility.confidence}</b><strong>{compatibility.confidenceScore.toFixed(2)}</strong><small>{partnerChart.pillars.map((item) => item.ganZhi).join(' ')}</small></aside></div><div className="compatibility-axis-grid">{compatibility.axes.map((item) => <article key={item.id}><header><b>{item.name}</b><strong>{item.score.toFixed(2)}</strong></header><p>{item.summary}</p><i><em style={{ width: `${item.score}%` }} /></i></article>)}</div><div className="topic-two-column"><section><div className="subheading"><h3>连接优势</h3></div>{compatibility.strengths.map((item) => <p className="topic-line" key={item}>{item}</p>)}</section><section><div className="subheading"><h3>经营课题</h3></div>{compatibility.tensions.map((item) => <p className="topic-line warning" key={item}>{item}</p>)}</section></div><div className="agreement-list"><strong>建议明确的关系协议</strong>{compatibility.agreements.map((item) => <p key={item}>{item}</p>)}</div><details><summary>查看跨盘关系 {compatibility.crossRelations.length} 条</summary>{compatibility.crossRelations.map((item) => <div key={item.id}><b>{item.name}</b><span>{item.members.map((member) => `${member.label}${member.char}`).join(' ↔ ')}</span><p>{item.note}</p></div>)}</details></div>}
      </section>
    </div>
  );
}

function TimelinePanel({ chart, cycleIndex, yearIndex }: { chart: BaziChart; cycleIndex: number; yearIndex: number }) {
  const forecast = useMemo(() => buildLifeForecast(chart), [chart]);
  const months = useMemo(() => buildMonthlyForecast(chart, cycleIndex, yearIndex), [chart, cycleIndex, yearIndex]);
  const selectedCycle = chart.luck.cycles[cycleIndex] ?? chart.luck.cycles[0];
  const selectedYear = selectedCycle.years[yearIndex] ?? selectedCycle.years[0];
  return (
    <div className="topic-panel timeline-topic">
      <div className="topic-hero"><div><span>{forecast.version}</span><h3>一生大运与流年结构时间轴</h3><p>机会、压力、变化和稳定是同一命盘内部的比较信号，不是事件概率。</p></div><aside><b>{forecast.points.length}</b><small>年度状态</small></aside></div>
      <div className="timeline-chart">{forecast.points.map((point) => <article key={point.id} title={`${point.year} ${point.ganZhi}\n${point.theme}\n${point.note}`}><span>{point.year}</span><div><i style={{ height: `${point.opportunity}%` }} /><em style={{ height: `${point.pressure}%` }} /></div><small>{point.change.toFixed(0)}</small></article>)}</div>
      <div className="timeline-legend"><span><i />机会</span><span><em />压力</span><span>底部数字：变化度</span></div>
      <div className="timeline-rank-grid"><section><div className="subheading"><h3>相对高机会窗口</h3></div>{forecast.peaks.slice(0, 5).map((point) => <p key={point.id}><b>{point.year} · {point.ganZhi}</b><span>{point.theme}</span><em>机{point.opportunity.toFixed(0)} 压{point.pressure.toFixed(0)}</em></p>)}</section><section><div className="subheading"><h3>高压力窗口</h3></div>{forecast.pressureWindows.slice(0, 5).map((point) => <p key={point.id}><b>{point.year} · {point.ganZhi}</b><span>{point.theme}</span><em>压力{point.pressure.toFixed(0)}</em></p>)}</section><section><div className="subheading"><h3>高变化窗口</h3></div>{forecast.transitionWindows.slice(0, 5).map((point) => <p key={point.id}><b>{point.year} · {point.ganZhi}</b><span>{point.theme}</span><em>变化{point.change.toFixed(0)}</em></p>)}</section></div>
      <section className="month-forecast"><div className="subheading"><h3>{selectedYear.year}年十二流月</h3><span>{selectedCycle.ganZhi}大运 · {selectedYear.ganZhi}流年</span></div><div>{months.map((month) => <article key={month.id}><header><span>{month.name}</span><b>{month.ganZhi}</b></header><p>{month.theme}</p><dl><div><dt>机会</dt><dd>{month.opportunity.toFixed(0)}</dd></div><div><dt>压力</dt><dd>{month.pressure.toFixed(0)}</dd></div><div><dt>变化</dt><dd>{month.change.toFixed(0)}</dd></div></dl><small>{month.startText.slice(5, 16)}—{month.endText.slice(5, 16)}</small></article>)}</div></section>
      <div className="topic-notes">{forecast.notes.map((item) => <p key={item}>{item}</p>)}</div>
    </div>
  );
}

export function ProductSuite({ chart, context, cycleIndex, yearIndex, compact = false }: ProductSuiteProps) {
  const [topic, setTopic] = useState<ProductTopic>('wealth');
  const bundle = useMemo(() => buildAnalysisBundle(chart, context), [chart, context]);
  const wealth = useMemo(() => buildWealthAssessment(chart, context, bundle), [chart, context, bundle]);
  const relationship = useMemo(() => buildRelationshipProfile(bundle), [bundle]);
  const career = useMemo(() => careerFor(chart, context, bundle), [chart, context, bundle]);
  const currentPoint = useMemo(() => buildContextForecast(chart, context), [chart, context]);

  if (compact) {
    return <section className="product-digest"><article><span>事业</span><b>{career.headline}</b><p>{career.summary}</p></article><article><span>财富</span><b>{wealth.headline}</b><p>{wealth.summary}</p></article><article><span>关系</span><b>{relationship.headline}</b><p>{relationship.summary}</p></article><article><span>当前年份</span><b>{currentPoint.year} · {currentPoint.theme}</b><p>机会 {currentPoint.opportunity.toFixed(0)} · 压力 {currentPoint.pressure.toFixed(0)} · 变化 {currentPoint.change.toFixed(0)}</p></article></section>;
  }

  return (
    <section className="product-suite">
      <div className="product-suite-head"><div><span>CONSUMER TOPICS</span><h2>主题报告与现实映射</h2></div><p>财富、关系、时间轴和岗位机制使用同一套底层证据，不重复发明命理事实。</p></div>
      <nav>{([['wealth', '财富'], ['relationship', '关系与合盘'], ['timeline', '年运时间轴'], ['roles', '岗位映射']] as Array<[ProductTopic, string]>).map(([id, label]) => <button type="button" className={topic === id ? 'active' : ''} onClick={() => setTopic(id)} key={id}>{label}</button>)}</nav>
      {topic === 'wealth' && <WealthPanel chart={chart} context={context} />}
      {topic === 'relationship' && <RelationshipPanel chart={chart} context={context} />}
      {topic === 'timeline' && <TimelinePanel chart={chart} cycleIndex={cycleIndex} yearIndex={yearIndex} />}
      {topic === 'roles' && <div className="topic-panel"><RoleMap career={career} /></div>}
    </section>
  );
}
