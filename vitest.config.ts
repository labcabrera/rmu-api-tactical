import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC (not esbuild) so decorator metadata is emitted, as in the build.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.module.ts'],
      reporter: ['text', 'lcov', 'html'],
      // Floor of the unit and e2e suites together: set when the e2e suite lands (spec 020, phase 4), never lowered.
      thresholds: {},
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['test/unit/**/*.spec.ts'] },
      },
      {
        extends: true,
        test: { name: 'e2e', include: ['test/e2e/**/*.e2e-spec.ts'], testTimeout: 60_000, hookTimeout: 120_000 },
      },
    ],
  },
});
