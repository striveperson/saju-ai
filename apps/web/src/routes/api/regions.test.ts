import { afterEach, describe, expect, it, vi } from 'vitest';

import { search } from './regions';

const 부른다 = (q: string) =>
  search(
    new Request(`http://localhost/api/regions?q=${encodeURIComponent(q)}`),
  );

const 카카오가 = (body: unknown, ok = true) => {
  const spy = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(Response.json(body, { status: ok ? 200 : 500 })),
  );
  vi.stubGlobal('fetch', spy);

  return spy;
};

const REGION = {
  address_type: 'REGION',
  x: '126.9784',
  y: '37.5666',
  address: {
    region_1depth_name: '서울특별시',
    region_2depth_name: '',
    region_3depth_name: '',
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.KAKAO_REST_API_KEY;
});

describe('GET /api/regions', () => {
  it('검색어가 비면 서버를 부르지 않는다', async () => {
    const spy = 카카오가({ documents: [] });
    process.env.KAKAO_REST_API_KEY = 'k';

    const res = await 부른다('   ');

    expect(await res.json()).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('키가 없으면 503 이고 검색어를 되돌려주지 않는다', async () => {
    const spy = 카카오가({ documents: [] });

    const res = await 부른다('서울');

    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain('서울');
    expect(spy).not.toHaveBeenCalled();
  });

  it('키를 헤더로만 보내고 응답에 담지 않는다', async () => {
    const spy = 카카오가({ documents: [REGION] });
    process.env.KAKAO_REST_API_KEY = 'secret-key';

    const res = await 부른다('서울');
    const [url, init] = spy.mock.calls[0];

    expect(init.headers).toEqual({ Authorization: 'KakaoAK secret-key' });
    expect(url).not.toContain('secret-key');
    expect(await res.text()).not.toContain('secret-key');
  });

  it('검색어를 이스케이프해 보낸다', async () => {
    const spy = 카카오가({ documents: [] });
    process.env.KAKAO_REST_API_KEY = 'k';

    await 부른다('전주 완산');

    // 날것으로 붙이면 공백과 & 가 쿼리스트링을 깬다
    expect(spy.mock.calls[0][0]).toBe(
      'https://dapi.kakao.com/v2/local/search/address.json?query=%EC%A0%84%EC%A3%BC%20%EC%99%84%EC%82%B0&size=30',
    );
  });

  it('키가 빈 문자열이어도 부르지 않는다', async () => {
    // 환경변수를 선언만 하고 값을 안 넣으면 이렇게 온다
    const spy = 카카오가({ documents: [] });
    process.env.KAKAO_REST_API_KEY = '';

    expect((await 부른다('서울')).status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });

  it('상류가 거부해도 502 다', async () => {
    // 오프라인이나 DNS 실패다. 안 잡으면 프레임워크 기본 500 이 나간다
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('getaddrinfo ENOTFOUND'))),
    );
    process.env.KAKAO_REST_API_KEY = 'k';

    const res = await 부른다('서울');

    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('ENOTFOUND');
  });

  it('걸러낸 결과만 낸다', async () => {
    카카오가({ documents: [REGION] });
    process.env.KAKAO_REST_API_KEY = 'k';

    const res = await 부른다('서울');

    // 위도 y 는 스키마가 버린다. 균시차를 안 쓰므로 들어갈 계산이 없다
    expect(await res.json()).toEqual([
      { name: '서울특별시', longitude: 126.9784 },
    ]);
  });

  it('상류가 실패하면 502 이고 그쪽 본문을 흘리지 않는다', async () => {
    카카오가({ errorType: 'AccessDeniedError', message: 'bad key' }, false);
    process.env.KAKAO_REST_API_KEY = 'k';

    const res = await 부른다('서울');

    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('AccessDeniedError');
  });

  it('상류 응답 모양이 다르면 502 다', async () => {
    // 카카오가 형식을 바꾸면 조용히 통과시키지 않는다
    카카오가({ documents: [{ address_type: 'REGION' }] });
    process.env.KAKAO_REST_API_KEY = 'k';

    expect((await 부른다('서울')).status).toBe(502);
  });
});
