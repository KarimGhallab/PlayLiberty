import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    isolate: false,
    maxWorkers: 3,
    /* The cover tests encode real multi-megapixel images. A shared runner does
     * that about five times slower than a dev machine, so 5s is under-provisioned. */
    testTimeout: 20_000
  }
});
