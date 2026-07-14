import { describe, expect, it } from 'vitest';
import App from './App';
import { ArchiveManager } from './components/ArchiveManager';
import { FoundationExplorer } from './components/FoundationExplorer';
import { HourCandidateExplorer } from './components/HourCandidateExplorer';
import { ProductSuite } from './components/ProductSuite';

describe('consumer product UI module graph', () => {
  it('exports every top-level product surface as a renderable component', () => {
    expect(typeof App).toBe('function');
    expect(typeof FoundationExplorer).toBe('function');
    expect(typeof ProductSuite).toBe('function');
    expect(typeof ArchiveManager).toBe('function');
    expect(typeof HourCandidateExplorer).toBe('function');
  });
});
