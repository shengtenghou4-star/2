const REPLACEMENTS: Array<[RegExp, string]> = [
  [/当前最优综合判断/g, '综合判断'],
  [/当前最优旺衰判断为/g, '旺衰判断为'],
  [/仍是排序最高的月令候选/g, '是当前主导格局'],
  [/为当前最优结构判断/g, '是当前主导格局'],
  [/为当前最优结构候选/g, '是当前主导格局'],
  [/当前最优结构候选/g, '当前主导格局'],
  [/月令名义候选/g, '月令格局'],
  [/结构候选/g, '结构'],
  [/旺衰候选/g, '旺衰判断'],
  [/待复核/g, '需留意'],
  [/候选/g, ''],
];

export function readerFacingText(text: string): string {
  const rewritten = REPLACEMENTS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
  return rewritten
    .replace(/，{2,}/g, '，')
    .replace(/。{2,}/g, '。')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
