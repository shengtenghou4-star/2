import { JIA_ZI } from './foundations';
import type { DynamicsSnapshot } from './dynamics';
import type { EvidenceSnapshot } from './evidence';
import type { InterpretationAssessment } from './interpretation-audited';
import type { StrengthAdjudication } from './strength-audited';
import type { BaziChart } from './bazi';
import type { LuckContext } from './context';

export type IntegrityLevel = '通过' | '需复核' | '失败';

export interface IntegrityCheck {
  id: string;
  label: string;
  level: IntegrityLevel;
  detail: string;
}

export interface AnalysisIntegrityReport {
  level: IntegrityLevel;
  fingerprint: string;
  checks: IntegrityCheck[];
  failures: string[];
  warnings: string[];
  coverage: {
    natalPillars: number;
    temporalNodes: number;
    patternCandidates: number;
    strengthHypotheses: number;
    evidenceItems: number;
    relationItems: number;
  };
}

interface AnalysisIntegrityInput {
  chart: BaziChart;
  context: LuckContext;
  natalEvidence: EvidenceSnapshot;
  currentEvidence: EvidenceSnapshot;
  natalDynamics: DynamicsSnapshot;
  currentDynamics: DynamicsSnapshot;
  natalStrength: StrengthAdjudication;
  currentStrength: StrengthAdjudication;
  interpretation: InterpretationAssessment;
}

const FORBIDDEN_FINAL_KEYS = new Set([
  'usefulGod',
  'yongShen',
  'favorableElements',
  'unfavorableElements',
  'xiShen',
  'jiShen',
]);

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function finiteUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function hasForbiddenKey(value: unknown, seen = new WeakSet<object>()): boolean {
  if (!value || typeof value !== 'object') return false;
  const object = value as Record<string, unknown>;
  if (seen.has(object)) return false;
  seen.add(object);
  for (const [key, child] of Object.entries(object)) {
    if (FORBIDDEN_FINAL_KEYS.has(key)) return true;
    if (hasForbiddenKey(child, seen)) return true;
  }
  return false;
}

function fingerprint(parts: string[]): string {
  let hash = 2166136261;
  const text = parts.join('|');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `MJ-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

function check(
  checks: IntegrityCheck[],
  condition: boolean,
  id: string,
  label: string,
  passDetail: string,
  failDetail: string,
  failureLevel: Exclude<IntegrityLevel, '通过'> = '失败',
): void {
  checks.push({
    id,
    label,
    level: condition ? '通过' : failureLevel,
    detail: condition ? passDetail : failDetail,
  });
}

export function auditAnalysisIntegrity(input: AnalysisIntegrityInput): AnalysisIntegrityReport {
  const {
    chart,
    context,
    natalEvidence,
    currentEvidence,
    natalDynamics,
    currentDynamics,
    natalStrength,
    currentStrength,
    interpretation,
  } = input;
  const checks: IntegrityCheck[] = [];
  const allNodes = [...chart.pillars, context.cycle.pillar, context.year.pillar, context.month.pillar];

  check(
    checks,
    chart.pillars.length === 4 && chart.pillars.map((item) => item.label).join(',') === '年柱,月柱,日柱,时柱',
    'natal-four-pillars',
    '四柱完整',
    '年、月、日、时四柱齐全且顺序正确。',
    '四柱数量或顺序异常。',
  );
  check(
    checks,
    allNodes.every((node) => JIA_ZI.includes(node.ganZhi)),
    'valid-jiazi',
    '干支合法',
    `${allNodes.length} 个原局／岁运节点全部属于六十甲子。`,
    '存在不属于六十甲子的干支节点。',
  );
  check(
    checks,
    allNodes.every((node) => Boolean(node.tenGod && node.naYin && node.growthStage && node.xun && node.xunKong && node.hiddenStems.length)),
    'pillar-details',
    '柱项无空值',
    '十神、藏干、纳音、长生、旬与旬空均有值。',
    '至少一个柱项出现空十神、空藏干或空基础字段。',
  );
  check(
    checks,
    chart.luck.cycles.length >= 8 && chart.luck.cycles.every((cycle) => cycle.years.length > 0),
    'luck-timeline',
    '大运流年可用',
    `${chart.luck.cycles.length} 步大运均包含流年。`,
    '大运数量不足或存在空流年序列。',
  );
  check(
    checks,
    context.nodes.length === 7 && context.months.length === 12,
    'temporal-context',
    '岁运上下文完整',
    '四柱＋大运＋流年＋流月共七节点，十二流月齐全。',
    '当前岁运节点或十二流月不完整。',
  );
  check(
    checks,
    natalEvidence.monthCommand.hiddenStems.length === chart.pillars[1].hiddenStems.length && currentEvidence.familyLedger.length === 5,
    'evidence-ledger',
    '证据账完整',
    '月令藏干与证据账对应，五类十神家族齐全。',
    '月令证据或十神家族账缺项。',
  );
  check(
    checks,
    unique(currentEvidence.roots.map((item) => item.id)) && unique(currentEvidence.reveals.map((item) => item.id)),
    'evidence-ids',
    '证据唯一',
    '根气与透藏证据 ID 无重复。',
    '根气或透藏证据出现重复 ID。',
  );
  check(
    checks,
    unique(context.relations.map((item) => item.id)) && unique(currentDynamics.combines.map((item) => item.id)),
    'relation-ids',
    '关系唯一',
    '刑冲合害与动力候选 ID 无重复。',
    '关系或动力候选出现重复 ID。',
  );

  const strengthValid = (result: StrengthAdjudication) =>
    result.hypotheses.length >= 3 &&
    result.leading.id === result.hypotheses[0]?.id &&
    result.leading.blockers.length === 0 &&
    result.hypotheses.every((item) => finiteUnit(item.fit)) &&
    [result.supportTotal, result.oppositionTotal, result.uncertainTotal, result.supportRatio, result.balance]
      .every(Number.isFinite);
  check(
    checks,
    strengthValid(natalStrength) && strengthValid(currentStrength),
    'strength-adjudication',
    '力量裁决闭合',
    '原局与岁运候选均有序、数值有限，领先候选无阻断项。',
    '力量候选为空、数值异常、排序不一致或被阻断候选仍然领先。',
  );

  const monthHiddenCount = chart.pillars[1].hiddenStems.length;
  check(
    checks,
    interpretation.pattern.candidates.length === monthHiddenCount &&
      interpretation.pattern.leading.id === interpretation.pattern.candidates[0]?.id &&
      interpretation.pattern.candidates.every((item) => finiteUnit(item.completeness)),
    'pattern-candidates',
    '格局候选闭合',
    `月令 ${monthHiddenCount} 个藏干均生成候选，排序与完整度合法。`,
    '月令藏干与格局候选数量不一致，或候选排序／完整度异常。',
  );
  check(
    checks,
    interpretation.comparisons.length === interpretation.climate.needs.length,
    'track-comparison',
    '三轨对照完整',
    '每个气候材料都进入调候／扶抑方向对照。',
    '气候材料与三轨对照数量不一致。',
  );
  check(
    checks,
    !hasForbiddenKey(interpretation),
    'no-final-verdict',
    '未越层输出',
    '结果对象不含最终用神、喜神或忌神字段。',
    '结果对象出现被禁止的最终喜忌字段。',
  );

  const weakCoverage =
    natalEvidence.roots.length === 0 ||
    currentDynamics.regulations.length === 0 ||
    interpretation.climate.needs.length === 0;
  check(
    checks,
    !weakCoverage,
    'sparse-materials',
    '材料密度',
    '当前命盘在根气、制化与气候轨均有可展示材料。',
    '部分轨道材料天然为空；系统仍可分析，但应把空轨道理解为“未见材料”，不是遗漏。',
    '需复核',
  );

  const failures = checks.filter((item) => item.level === '失败').map((item) => `${item.label}：${item.detail}`);
  const warnings = checks.filter((item) => item.level === '需复核').map((item) => `${item.label}：${item.detail}`);
  const level: IntegrityLevel = failures.length ? '失败' : warnings.length ? '需复核' : '通过';

  return {
    level,
    fingerprint: fingerprint([
      chart.solarText,
      chart.pillars.map((item) => item.ganZhi).join(''),
      context.cycle.ganZhi,
      context.year.ganZhi,
      context.month.pillar.ganZhi,
      natalStrength.leading.name,
      currentStrength.leading.name,
      interpretation.pattern.leading.name,
    ]),
    checks,
    failures,
    warnings,
    coverage: {
      natalPillars: chart.pillars.length,
      temporalNodes: context.nodes.length,
      patternCandidates: interpretation.pattern.candidates.length,
      strengthHypotheses: currentStrength.hypotheses.length,
      evidenceItems: currentStrength.evidence.length,
      relationItems: context.relations.length,
    },
  };
}
