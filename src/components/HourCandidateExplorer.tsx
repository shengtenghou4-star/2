import { useMemo } from 'react';
import { buildNatalAnalysisBundle } from '../lib/analysis-bundle';
import { compareCivilAndTrueSolar, type BirthInput } from '../lib/bazi-audited';
import { buildCareerAssessment } from '../lib/career';

const HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

interface Candidate {
  hour: number;
  branch: string;
  pillars: string;
  strength: string;
  pattern: string;
  dominant: string;
  career: string;
  chartInput: BirthInput;
}

function stripCandidate(value: string): string {
  return value.replace('候选', '').replace('结构', '');
}

function buildCandidate(input: BirthInput, hour: number, branch: string): Candidate {
  const chartInput: BirthInput = { ...input, hour, minute: 30 };
  const comparison = compareCivilAndTrueSolar(chartInput);
  const chart = chartInput.timeBasis === 'true-solar' ? comparison.trueSolar : comparison.civil;
  const bundle = buildNatalAnalysisBundle(chart);
  const career = buildCareerAssessment({
    natalNodes: chart.pillars,
    contextNodes: chart.pillars,
    natalEvidence: bundle.natalEvidence,
    currentEvidence: bundle.currentEvidence,
    natalDynamics: bundle.natalDynamics,
    currentDynamics: bundle.currentDynamics,
    natalStrength: bundle.natalStrength,
    currentStrength: bundle.currentStrength,
    interpretation: bundle.interpretation,
    energy: bundle.energy,
  });
  return {
    hour,
    branch,
    pillars: chart.pillars.map((item) => item.ganZhi).join(' '),
    strength: stripCandidate(bundle.currentStrength.leading.name),
    pattern: bundle.interpretation.pattern.leading.name,
    dominant: bundle.energy.current.dominantElement,
    career: career.primaryMode.shortName,
    chartInput,
  };
}

function frequency(candidates: Candidate[], key: keyof Pick<Candidate, 'strength' | 'pattern' | 'dominant' | 'career'>) {
  const map = new Map<string, number>();
  candidates.forEach((item) => map.set(item[key], (map.get(item[key]) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function HourCandidateExplorer({ input, onUse }: { input: BirthInput; onUse: (input: BirthInput) => void }) {
  const candidates = useMemo(() => HOURS.map((hour, index) => buildCandidate(input, hour, BRANCH_NAMES[index])), [input]);
  const dimensions = [
    { key: 'strength' as const, label: '旺衰' },
    { key: 'pattern' as const, label: '格局' },
    { key: 'dominant' as const, label: '主导五行' },
    { key: 'career' as const, label: '事业主轴' },
  ].map((item) => ({ ...item, values: frequency(candidates, item.key) }));
  const stable = dimensions.filter((item) => item.values[0]?.[1] >= 10);
  const volatile = dimensions.filter((item) => item.values.length >= 3 || (item.values[0]?.[1] ?? 0) <= 7);

  return (
    <section className="hour-candidate-explorer panel">
      <div className="section-heading compact"><span>07</span><div><h2>时辰候选校验</h2><p>比较十二时辰下哪些结论稳定，哪些高度依赖时柱；不自动声称反推出生时辰</p></div></div>
      <div className="hour-stability-summary">
        <article><span>跨时辰稳定</span><b>{stable.length ? stable.map((item) => `${item.label}：${item.values[0][0]}`).join('；') : '暂无绝对稳定项'}</b></article>
        <article><span>高度依赖时辰</span><b>{volatile.length ? volatile.map((item) => item.label).join('、') : '当前主要结论较稳定'}</b></article>
      </div>
      <div className="hour-dimension-grid">
        {dimensions.map((item) => <article key={item.key}><header><b>{item.label}</b><span>{item.values.length}种结果</span></header>{item.values.map(([value, count]) => <p key={value}><span>{value}</span><i><em style={{ width: `${count / 12 * 100}%` }} /></i><b>{count}/12</b></p>)}</article>)}
      </div>
      <div className="hour-candidate-grid">
        {candidates.map((candidate) => <article key={candidate.branch}><header><span>{candidate.branch}时</span><b>{String(candidate.hour).padStart(2, '0')}:30</b></header><p>{candidate.pillars}</p><dl><div><dt>旺衰</dt><dd>{candidate.strength}</dd></div><div><dt>格局</dt><dd>{candidate.pattern}</dd></div><div><dt>主导</dt><dd>{candidate.dominant}</dd></div><div><dt>事业</dt><dd>{candidate.career}</dd></div></dl><button type="button" onClick={() => onUse(candidate.chartInput)}>采用此候选</button></article>)}
      </div>
      <p className="hour-candidate-note">候选比较适合处理“只知道上午、下午或两个相邻时辰”的情况。农历输入会保持农历日期语义，只替换时刻。真正校时仍应使用可核验人生节点做盲测，并保留多个候选，不应根据喜欢哪份报告来选时辰。</p>
    </section>
  );
}
