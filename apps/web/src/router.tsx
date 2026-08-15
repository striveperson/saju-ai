import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { routeTree } from './routeTree.gen';

import type { Handoff } from '@shared/handoff';

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

/**
 * 지면 사이로 넘기는 값. URL 이 아니라 히스토리 항목에 실린다.
 *
 * 생년월일시가 주소창과 리퍼러와 서버 로그에 남지 않게 하는 것이다(docs/03 5.1).
 * 받는 쪽은 `handoffSchema` 로 좁힌다. 여기 타입이 붙어도 실제로 들어 있는 값은
 * 브라우저가 복원한 것이라 보장되지 않는다.
 */
declare module '@tanstack/history' {
  interface HistoryState {
    saju?: Handoff;
  }
}
