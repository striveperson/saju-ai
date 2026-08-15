import { regionsSchema } from '@features/input/utils/region';
import { queryOptions } from '@tanstack/react-query';

/** 앱은 절대 URL 이 필요하고 웹은 비면 같은 오리진으로 간다(ADR 0004) */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 출생지 검색. 우리 서버가 카카오를 중계한다(ADR 0019).
 *
 * 응답은 우리 것이지만 화면에는 바깥이라 zod 로 좁힌다(docs/03 4장).
 * 검색어는 도나 시 이름이라 캐시 키에 들어가도 사람을 특정하지 않는다.
 */
export const regionSearchQuery = (query: string) =>
  queryOptions({
    queryKey: ['regions', query],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/regions?q=${encodeURIComponent(query)}`,
        { signal },
      );
      if (!res.ok) throw new Error('출생지를 찾지 못했습니다.');
      return regionsSchema.parse(await res.json());
    },
    enabled: query.trim() !== '',
    // 검색창에서는 다시 부르지 않는다. 기본 3회 재시도는 백오프까지 붙어
    // 오프라인이거나 키가 없을 때 "찾는 중" 이 몇 초씩 머문다.
    // 글자를 더 치면 어차피 새 요청이 나가므로 빨리 실패하는 쪽이 낫다.
    retry: false,
  });
