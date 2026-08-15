import { describe, expect, it } from 'vitest';

import { handoffSchema } from './handoff';

/**
 * `/result` 의 `beforeLoad` 가 이 스키마로 판정한다.
 * 통과하면 그리고, 아니면 `/` 로 되돌린다.
 */
const 온전한 = {
  input: {
    calendar: 'solar',
    birth: { year: 1995, month: 1, day: 27, hour: 14, minute: 39 },
    gender: 'F',
    ziPolicy: 'nextDay',
  },
  info: { name: '김하늘', gender: '여자' },
};

const 통과 = (state: unknown) => handoffSchema.safeParse(state).success;

describe('handoffSchema', () => {
  it('입력 지면이 넘긴 것을 받는다', () => {
    expect(통과(온전한)).toBe(true);
  });

  it('state 가 비면 거절한다', () => {
    // 서버에는 히스토리 state 가 없다. /result 를 직접 열면 이 경로로 온다
    for (const 없음 of [undefined, null, {}]) {
      expect(통과(없음)).toBe(false);
    }
  });

  it('앞 버전이 넣었을 법한 모양을 거절한다', () => {
    // 새로고침하면 브라우저가 예전 state 를 그대로 복원해 준다
    expect(통과({ input: 온전한.input })).toBe(false);
    expect(
      통과({ ...온전한, input: { ...온전한.input, ziPolicy: 'early' } }),
    ).toBe(false);
    expect(
      통과({ ...온전한, input: { ...온전한.input, gender: '여자' } }),
    ).toBe(false);
  });

  it('음력이면 윤달 여부를 반드시 들어야 한다', () => {
    const 음력 = { ...온전한.input, calendar: 'lunar' };

    expect(통과({ ...온전한, input: 음력 })).toBe(false);
    expect(통과({ ...온전한, input: { ...음력, leapMonth: false } })).toBe(
      true,
    );
  });

  it('출생지가 없는 것도 받는다', () => {
    // 입력 지면은 필수로 받지만(ADR 0019 3항) 스키마는 열어 둔다.
    // 저장한 사주와 공유 링크가 경도 없이 들어오는 경로가 아직 남아 있다(6항)
    expect(통과(온전한)).toBe(true);
    expect(
      통과({ ...온전한, input: { ...온전한.input, longitude: 126.98 } }),
    ).toBe(true);
  });

  it('시각이 없으면 거절한다', () => {
    const { hour: _hour, ...시각없이 } = 온전한.input.birth;

    expect(
      통과({ ...온전한, input: { ...온전한.input, birth: 시각없이 } }),
    ).toBe(false);
  });

  it('생년월일시는 정수여야 한다', () => {
    // 소수가 들어오면 엔진의 정수 산술이 조용히 다른 날로 굴린다
    const birth = { ...온전한.input.birth, day: 27.5 };

    expect(통과({ ...온전한, input: { ...온전한.input, birth } })).toBe(false);
  });

  it('표시용 값도 좁힌다', () => {
    // info 는 그대로 화면에 나간다. 임의의 문자열이 성별 자리에 오면 안 된다
    expect(통과({ ...온전한, info: { gender: '남성' } })).toBe(false);
    expect(통과({ ...온전한, info: { name: 42 } })).toBe(false);
    // 셋 다 없어도 된다. 이름을 안 적고 넘길 수 있다
    expect(통과({ ...온전한, info: {} })).toBe(true);
  });
});
