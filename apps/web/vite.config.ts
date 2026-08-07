import { devtools } from '@tanstack/devtools-vite';
import { defineConfig } from 'vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

// 빌드 타깃이 둘이다 (ADR 0003).
//   web    TanStack Start SSR. Vercel 에 배포한다.
//   spa    클라이언트 전용 정적 번들. Capacitor 가 webDir 로 쓴다.
// SAJU_BUILD_TARGET=spa 로 전환한다.
const isSpa = process.env.SAJU_BUILD_TARGET === 'spa';

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro(),
    tailwindcss(),
    tanstackStart(
      isSpa
        ? {
            spa: {
              enabled: true,
              // 앱은 어느 경로로 진입하든 이 셸을 받고 클라이언트에서 라우팅한다.
              maskPath: '/',
              prerender: { enabled: true, crawlLinks: false },
            },
          }
        : undefined,
    ),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

export default config;
