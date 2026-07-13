import type { BirthInput } from './bazi';

export interface TimeCorrection {
  civilText: string;
  standardText: string;
  trueSolarText: string;
  dstCorrectionMinutes: number;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  totalCorrectionMinutes: number;
  standardMeridian: number;
  crossedDate: boolean;
  crossedHourBranch: boolean;
}

const pad = (value: number) => String(value).padStart(2, '0');

function nominalDate(input: BirthInput): Date {
  return new Date(Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second ?? 0,
  ));
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

function formatNominal(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/**
 * 常用工程近似：E = 9.87 sin(2B) - 7.53 cos(B) - 1.5 sin(B)。
 * 在排盘场景中通常能把均时差控制到分钟级；后续可替换为高精度天文历算。
 */
export function equationOfTimeMinutes(date: Date): number {
  const n = dayOfYear(date);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

export function hourBranchIndex(date: Date): number {
  const hour = date.getUTCHours();
  return Math.floor(((hour + 1) % 24) / 2);
}

export function calculateTimeCorrection(input: BirthInput): TimeCorrection {
  const civil = nominalDate(input);
  const dstMinutes = input.dstMinutes ?? 0;
  const standard = new Date(civil.getTime() - dstMinutes * 60_000);
  const standardMeridian = input.utcOffset * 15;
  const longitudeCorrectionMinutes = 4 * (input.longitude - standardMeridian);
  const eot = equationOfTimeMinutes(standard);
  const totalCorrectionMinutes = -dstMinutes + longitudeCorrectionMinutes + eot;
  const trueSolar = new Date(civil.getTime() + totalCorrectionMinutes * 60_000);

  return {
    civilText: formatNominal(civil),
    standardText: formatNominal(standard),
    trueSolarText: formatNominal(trueSolar),
    dstCorrectionMinutes: -dstMinutes,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes: eot,
    totalCorrectionMinutes,
    standardMeridian,
    crossedDate:
      civil.getUTCFullYear() !== trueSolar.getUTCFullYear() ||
      civil.getUTCMonth() !== trueSolar.getUTCMonth() ||
      civil.getUTCDate() !== trueSolar.getUTCDate(),
    crossedHourBranch: hourBranchIndex(civil) !== hourBranchIndex(trueSolar),
  };
}

export function effectiveBirthInput(input: BirthInput): BirthInput {
  if (input.timeBasis !== 'true-solar') return input;

  const correction = calculateTimeCorrection(input);
  const [datePart, timePart] = correction.trueSolarText.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  return {
    ...input,
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

export function correctionLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '−';
  return `${sign}${Math.abs(minutes).toFixed(1)} 分钟`;
}
