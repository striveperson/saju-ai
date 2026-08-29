import { kakaoAddressSchema, pickRegions } from '@features/input/utils/region';
import { createFileRoute } from '@tanstack/react-router';

/**
 * 출생지 검색
 */
const KAKAO_ENDPOINT = 'https://dapi.kakao.com/v2/local/search/address.json';
const PAGE_SIZE = 10;

const failResponse = (status: number) =>
  Response.json({ message: '출생지를 찾지 못했습니다.' }, { status });

/** 라우트 껍데기 없이 부를 수 있게 뺐다. 분기 넷을 테스트가 잡는다 */
export const search = async (request: Request): Promise<Response> => {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query === '') return Response.json([]);

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return Response.json(
      { message: '출생지 검색을 아직 쓸 수 없습니다.' },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(
      `${KAKAO_ENDPOINT}?query=${encodeURIComponent(query)}&size=${PAGE_SIZE}`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    );
    if (!upstream.ok) return failResponse(502);

    const parsed = kakaoAddressSchema.safeParse(await upstream.json());
    if (!parsed.success) return failResponse(502);

    return Response.json(pickRegions(parsed.data));
  } catch {
    return failResponse(502);
  }
};

export const Route = createFileRoute('/api/regions')({
  server: { handlers: { GET: ({ request }) => search(request)}  },
});
