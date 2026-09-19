import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // happy-dom gives us a real browser-like DOM (window, document,
    // requestAnimationFrame, MouseEvent, etc.) so tests can drive the
    // scene-cleanup / quiz / death-screen code paths without a full
    // PlayCanvas renderer.
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    // PlayCanvas initialises GPU stuff on import — keep the worker pool
    // small so we don't run out of threads on heavy scenes.
    maxWorkers: 1,
    minWorkers: 1,
    // Scripts use the same tsconfig as the app, so we inherit paths and
    // strict-mode expectations.
  },
  resolve: {
    alias: {
      // Let tests import from the game's source tree with plain relative
      // paths (the app itself uses those everywhere).
      '@': path.resolve(__dirname, './src'),
    },
  },
});
