import { createStore } from 'zustand/vanilla';

import type { Handoff } from './handoff';

/**
 * 입력 지면이 채우고 결과 지면이 읽는 스토어.
 *
 * 생년월일시가 주소창과 리퍼러와 서버 로그에 남지 않게 URL 밖에 둔다(docs/03 5.1).
 * 값은 메모리에만 있고 어디에도 저장하지 않는다.
 */
export type SajuState = {
  handoff: Handoff | null;
  setHandoff: (handoff: Handoff) => void;
};

/**
 * 요청마다 새로 만든다. 모듈 스코프에 두지 않는 이유가 docs/03 5장에 있다.
 *
 * SSR 에서 한 벌을 나눠 쓰면 앞 요청의 생년월일시가 뒤 요청에 보인다.
 * `getRouter()` 가 이 함수를 불러 라우터 컨텍스트에 싣는다.
 */
export const createSajuStore = () =>
  createStore<SajuState>()((set) => ({
    handoff: null,
    setHandoff: (handoff) => set({ handoff }),
  }));

export type SajuStore = ReturnType<typeof createSajuStore>;
