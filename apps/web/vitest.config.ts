import babel from '@rolldown/plugin-babel';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      // 계산 엔진은 순수 함수라 DOM 이 필요 없다. node 환경에서 빠르게 돈다.
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'saju',
          include: ['src/lib/saju/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: { tsconfigPaths: true },
        plugins: [viteReact(), babel({ presets: [reactCompilerPreset()] })],
        test: {
          name: 'web',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/lib/saju/**'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
