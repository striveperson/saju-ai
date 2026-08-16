import { describe, expect, it } from 'vitest';

import { createSajuStore } from './saju-store';

import type { Handoff } from './handoff';

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

describe('createSajuStore', () => {
  it('처음에는 비어 있다', () => {
    expect(createSajuStore().getState().handoff).toBeNull();
  });

  it('담은 것을 그대로 낸다', () => {
    const store = createSajuStore();
    store.getState().setHandoff(기준);

    expect(store.getState().handoff).toEqual(기준);
  });

  it('부를 때마다 다른 스토어다', () => {
    // SSR 에서 요청끼리 생년월일시가 섞이지 않는 근거다. docs/03 5장.
    const 앞 = createSajuStore();
    const 뒤 = createSajuStore();
    앞.getState().setHandoff(기준);

    expect(뒤.getState().handoff).toBeNull();
  });
});
