import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/lib/domain-coverage.test.ts',
      'src/lib/energy-domain.test.ts',
      'src/lib/report-domain.test.ts',
      'src/lib/career-domain.test.ts',
    ],
    testTimeout: 240_000,
    hookTimeout: 240_000,
  },
});
