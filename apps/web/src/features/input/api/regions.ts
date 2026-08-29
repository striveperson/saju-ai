import { regionsSchema } from '@features/input/utils/region';
import { queryOptions } from '@tanstack/react-query';

/** 앱은 절대 URL 이 필요하고 웹은 비면 같은 오리진으로 간다 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

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
    retry: false,
  });
