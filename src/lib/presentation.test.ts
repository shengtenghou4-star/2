import { describe, expect, it } from 'vitest';
import { readerFacingText } from './presentation';

describe('reader-facing language', () => {
  it('turns audit candidate wording into a direct public verdict', () => {
    const text = readerFacingText('正官格为当前最优结构候选，仍是排序最高的月令候选。');
    expect(text).not.toContain('候选');
    expect(text).toContain('当前主导格局');
  });

  it('keeps uncertainty as confidence rather than research jargon', () => {
    expect(readerFacingText('此项待复核')).toBe('此项需留意');
  });
});
