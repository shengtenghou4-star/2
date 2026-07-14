import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      'src/lib/domain-coverage.test.ts',
      'src/lib/energy-domain.test.ts',
    ],
  },
});
