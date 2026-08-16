import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { getRouter } from '../router';

import type { Handoff } from '@shared/handoff';

/**
 * 입력 지면이 스토어에 담고 결과 지면이 `beforeLoad` 에서 읽는다.
 *
 * 그리지 않고 라우터 상태만 본다. `__root` 의 devtools 가 jsdom 에서
 * 언마운트에 실패해 여기서 확인하려는 것과 무관한 오류를 낸다.
 */

/** 검증 케이스 verified-19950127-1439-F-seoul */
const 기준: Handoff = {
  input: {
    calendar: 'solar',
    birth: { year: 1995, month: 1, day: 27, hour: 14, minute: 39 },
    gender: 'F',
    longitude: 126.98,
    ziPolicy: 'nextDay',
  },
  info: { name: '김하늘', gender: '여자', region: '서울' },
};

const 결과로간다 = async (담을것?: Handoff) => {
  const router = getRouter();
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ['/result'] }),
  });
  if (담을것) router.options.context.sajuStore.getState().setHandoff(담을것);

  await router.load();
  return router;
};

describe('입력에서 결과로 넘기기', () => {
  it('스토어가 비면 입력 지면으로 되돌린다', async () => {
    const router = await 결과로간다();

    expect(router.state.location.pathname).toBe('/');
  });

  it('스토어에 담긴 것이 결과 지면의 컨텍스트로 간다', async () => {
    const router = await 결과로간다(기준);

    expect(router.state.location.pathname).toBe('/result');
    expect(router.state.matches.at(-1)?.context).toMatchObject({ saju: 기준 });
  });

  it('라우터를 새로 만들면 앞의 값이 따라오지 않는다', async () => {
    // 요청마다 스토어를 만드는 것의 확인이다. docs/03 5.1.
    await 결과로간다(기준);
    const 다음 = await 결과로간다();

    expect(다음.state.location.pathname).toBe('/');
  });
});
