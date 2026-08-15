import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';

import type { ReactNode } from 'react';

/**
 * `Link` 를 쓰는 컴포넌트를 감싼다.
 *
 * 라우터 밖에서 렌더하면 `Link` 가 던진다. 실제 라우트 트리 대신
 * 이 노드만 그리는 최소 트리를 세우고 메모리 히스토리를 붙인다.
 * 주소창이 없으므로 이 헬퍼로는 URL 을 재지 못한다.
 *
 * `load` 를 기다린다. 그 전에는 라우터가 아무것도 그리지 않아
 * "없는 것을 확인" 하는 단언이 빈 화면을 보고 통과한다.
 */
export const renderWithRouter = async (node: ReactNode) => {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => node,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  await router.load();

  return render(<RouterProvider router={router} />);
};
