import { kakaoAddressSchema, pickRegions } from '@features/input/utils/region';
import { createFileRoute } from '@tanstack/react-router';

/**
 * 출생지 검색. 카카오 로컬 주소 검색을 중계한다(ADR 0019).
 *
 * REST 키를 여기서만 읽는다. `VITE_` 접두사가 없어 클라이언트 번들에 들어가지 않는다.
 * 검색어를 로그에 남기지 않고, 카카오가 낸 에러 본문도 그대로 흘리지 않는다.
 */
const KAKAO_ENDPOINT = 'https://dapi.kakao.com/v2/local/search/address.json';

/** 카카오 쪽 최대값이다. 도와 시만 남기면 이보다 훨씬 줄어든다 */
const PAGE_SIZE = 30;

const 실패 = (status: number) =>
  Response.json({ message: '출생지를 찾지 못했습니다.' }, { status });

/** 라우트 껍데기 없이 부를 수 있게 뺐다. 분기 넷을 테스트가 잡는다 */
export const search = async (request: Request): Promise<Response> => {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query === '') return Response.json([]);

  const key = process.env.KAKAO_REST_API_KEY;
  if (key === undefined || key === '') {
    return Response.json(
      { message: '출생지 검색을 아직 쓸 수 없습니다.' },
      { status: 503 },
    );
  }

  // 상류가 거부하는 경로도 502 로 모은다. 그냥 두면 프레임워크 기본 500 이 나가고
  // 그 본문에 우리 스택이 실릴 수 있다
  try {
    const upstream = await fetch(
      `${KAKAO_ENDPOINT}?query=${encodeURIComponent(query)}&size=${PAGE_SIZE}`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    );
    if (!upstream.ok) return 실패(502);

    const parsed = kakaoAddressSchema.safeParse(await upstream.json());
    if (!parsed.success) return 실패(502);

    return Response.json(pickRegions(parsed.data));
  } catch {
    return 실패(502);
  }
};

export const Route = createFileRoute('/api/regions')({
  server: { handlers: { GET: ({ request }) => search(request) } },
});
