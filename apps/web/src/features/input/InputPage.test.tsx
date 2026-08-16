import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InputPage from './InputPage';

import type { Region } from '@features/input/utils/region';
import type { ChartInput } from '@saju/chart';
import type { ProfileInfo } from '@shared/handoff';

// 카카오가 실제로 내는 값이다. 시도는 약칭으로 온다
const 서울: Region = { name: '서울', longitude: 126.978652258309 };
const 부산: Region = { name: '부산', longitude: 129.075087492149 };

const 검색결과를 = (regions: readonly Region[]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json(regions))),
  );
};

type 제출된 = { input: ChartInput; info: ProfileInfo };

/** 지면을 그리고 제출된 값을 담을 상자를 돌려준다 */
const 그린다 = () => {
  const 상자: 제출된[] = [];
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <InputPage
        onSubmit={(input, info) => {
          상자.push({ input, info });
        }}
      />
    </QueryClientProvider>,
  );

  return { 상자, user: userEvent.setup() };
};

/** 출생지를 시트에서 골라 채운다. 직접 칠 수 없는 칸이다 */
const 출생지를고른다 = async (
  user: ReturnType<typeof userEvent.setup>,
  region = 서울,
) => {
  검색결과를([region]);
  await user.click(screen.getByRole('button', { name: '출생지 검색' }));
  await user.type(
    screen.getByLabelText('출생지 검색어'),
    region.name.slice(0, 2),
  );
  await user.click(
    await screen.findByRole('button', { name: RegExp(region.name) }),
  );
};

const 기본입력 = async (
  user: ReturnType<typeof userEvent.setup>,
  date = '1995/01/27',
  time = '14:39',
) => {
  await user.type(screen.getByLabelText('이름'), '김하늘');
  await user.type(screen.getByLabelText('생년월일시'), date);
  await user.type(screen.getByLabelText('태어난 시각'), time);
  await 출생지를고른다(user);
};

const 제출 = () => screen.getByRole('button', { name: '사주보러가기' });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InputPage', () => {
  it('넷이 다 차야 제출할 수 있다', async () => {
    const { user } = 그린다();

    expect(제출()).toBeDisabled();

    await user.type(screen.getByLabelText('이름'), '김하늘');
    expect(제출()).toBeDisabled();

    await user.type(screen.getByLabelText('생년월일시'), '1995/01/27');
    expect(제출()).toBeDisabled();

    // 시각은 뺄 수 없다. ChartInput.birth 가 필수로 받는다(docs/05 12.1)
    await user.type(screen.getByLabelText('태어난 시각'), '14:39');
    expect(제출()).toBeDisabled();

    // 출생지도 뺄 수 없다. 없으면 서울 관례값이 답으로 나간다(ADR 0019 3항)
    await 출생지를고른다(user);
    expect(제출()).toBeEnabled();
  });

  it('엔진이 받는 모양 그대로 넘긴다', async () => {
    // 검증 케이스 verified-19950127-1439-F-seoul 이다. 목업 placeholder 가 그 값이다.
    const { 상자, user } = 그린다();
    await 기본입력(user);
    await user.click(제출());

    expect(상자).toHaveLength(1);
    expect(상자[0].input).toEqual({
      calendar: 'solar',
      birth: { year: 1995, month: 1, day: 27, hour: 14, minute: 39 },
      gender: 'F',
      ziPolicy: 'nextDay',
      longitude: 126.978652258309,
    });
    expect(상자[0].info).toEqual({
      name: '김하늘',
      gender: '여자',
      region: '서울',
    });
  });

  it('고른 곳의 경도가 그대로 실린다', async () => {
    // 서울 관례값 -30분이 아니라 고른 곳의 경도여야 한다.
    // 부산은 -24분이라 8분이 어긋나고 시지 경계에 걸리면 시주가 바뀐다.
    const { 상자, user } = 그린다();
    await user.type(screen.getByLabelText('이름'), '김하늘');
    await user.type(screen.getByLabelText('생년월일시'), '1995/01/27');
    await user.type(screen.getByLabelText('태어난 시각'), '14:39');
    await 출생지를고른다(user, 부산);

    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(제출());
    expect(상자[0].input.longitude).toBe(129.075087492149);
    expect(상자[0].info.region).toBe('부산');
  });

  it('남자를 고르면 성별이 따라간다', async () => {
    const { 상자, user } = 그린다();
    await 기본입력(user);
    await user.click(screen.getByLabelText('남자'));
    await user.click(제출());

    expect(상자[0].input.gender).toBe('M');
    expect(상자[0].info.gender).toBe('남자');
  });

  it('없는 날짜를 막는다', async () => {
    // calendar.ts 가 2월 30일을 던지지 않고 3월 2일로 굴린다. 폼이 막는 자리다.
    const { 상자, user } = 그린다();
    await 기본입력(user, '1995/02/30');
    await user.click(제출());

    expect(상자).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent('그런 날짜는 없습니다');
  });

  it('없는 시각을 막는다', async () => {
    const { 상자, user } = 그린다();
    await 기본입력(user, '1995/01/27', '25:00');
    await user.click(제출());

    expect(상자).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent('그런 시각은 없습니다');
  });

  it('틀린 칸만 잘못된 것으로 표시한다', async () => {
    const { user } = 그린다();
    await 기본입력(user, '1995/01/27', '25:00');
    await user.click(제출());

    expect(screen.getByLabelText('태어난 시각')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    // 날짜는 멀쩡하다. 둘 다에 표시하면 고칠 곳을 못 찾는다
    expect(screen.getByLabelText('생년월일시')).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  });

  // 지우는 경로가 셋이다. 하나만 물리면 나머지 둘이 조용히 빠진다
  describe('고치기 시작하면 지난 문구를 지운다', () => {
    const 고친다 = [
      {
        무엇: '생년월일',
        하기: async (user: ReturnType<typeof userEvent.setup>) => {
          await user.type(screen.getByLabelText('생년월일시'), '1');
        },
      },
      {
        무엇: '시각',
        하기: async (user: ReturnType<typeof userEvent.setup>) => {
          await user.type(screen.getByLabelText('태어난 시각'), '1');
        },
      },
      {
        무엇: '양력음력',
        하기: async (user: ReturnType<typeof userEvent.setup>) => {
          await user.selectOptions(screen.getByLabelText('양력 음력'), 'lunar');
        },
      },
    ];

    for (const { 무엇, 하기 } of 고친다) {
      it(무엇, async () => {
        // 남겨 두면 이미 고친 값에 대고 틀렸다고 말하게 된다
        const { user } = 그린다();
        await 기본입력(user, '1995/02/30');
        await user.click(제출());
        expect(screen.getByRole('alert')).toBeInTheDocument();

        await 하기(user);
        expect(screen.queryByRole('alert')).toBeNull();
      });
    }
  });

  it('지원 범위 밖은 엔진 문구를 그대로 낸다', async () => {
    // 여기서 두 벌로 판정하지 않는다. 엔진이 던지고 폼은 옮기기만 한다.
    const { 상자, user } = 그린다();
    await 기본입력(user, '1899/01/01');
    await user.click(제출());

    expect(상자).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '지원 범위 밖이다. 양력 1900년부터 2100년까지만 계산한다.',
    );
  });

  it('음력 범위 오류는 음력 표기로 나온다', async () => {
    // docs/05 12.4. 양력으로 옮긴 뒤에 던지면 음력으로 넣은 사람이 대조할 수 없다.
    // 상한이 음력 2050년 11월 30일이라 연도만 보는 검사로는 12월이 뚫린다.
    const { 상자, user } = 그린다();
    await user.selectOptions(screen.getByLabelText('양력 음력'), 'lunar');
    await 기본입력(user, '2050/12/01');
    await user.click(제출());

    expect(상자).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent('음력');
  });

  it('음력 월과 일의 범위는 엔진이 막는다', async () => {
    // 폼은 여덟 자리인지만 본다. 큰달이 30일인 것도 lunar.ts 의 표가 안다.
    // 월이 13 인 상태로 렌더가 도는 동안 아무것도 던지지 않는 것도 함께 걸린다.
    const { 상자, user } = 그린다();
    await user.selectOptions(screen.getByLabelText('양력 음력'), 'lunar');
    await 기본입력(user, '1995/13/01');
    await user.click(제출());

    expect(상자).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '음력 월은 1부터 12 다',
    );
  });

  it('윤달이 있는 달에서만 윤달을 묻는다', async () => {
    // 1995년의 윤달은 윤8월이다. leapMonthOf 가 그렇게 답한다.
    const { user } = 그린다();
    await user.selectOptions(screen.getByLabelText('양력 음력'), 'lunar');

    await user.type(screen.getByLabelText('생년월일시'), '1995/07/15');
    expect(screen.queryByLabelText('윤달')).toBeNull();

    await user.clear(screen.getByLabelText('생년월일시'));
    await user.type(screen.getByLabelText('생년월일시'), '1995/08/15');
    expect(screen.getByLabelText('윤달')).toBeInTheDocument();
  });

  it('양력에서는 윤달을 묻지 않는다', async () => {
    const { user } = 그린다();
    await user.type(screen.getByLabelText('생년월일시'), '1995/08/15');

    expect(screen.queryByLabelText('윤달')).toBeNull();
  });

  it('윤달을 체크하면 엔진에 그대로 간다', async () => {
    const { 상자, user } = 그린다();
    await user.selectOptions(screen.getByLabelText('양력 음력'), 'lunar');
    await 기본입력(user, '1995/08/15');
    await user.click(screen.getByLabelText('윤달'));
    await user.click(제출());

    expect(상자[0].input).toMatchObject({
      calendar: 'lunar',
      leapMonth: true,
    });
  });

  it('음력인데 윤달을 안 고르면 평달로 간다', async () => {
    const { 상자, user } = 그린다();
    await user.selectOptions(screen.getByLabelText('양력 음력'), 'lunar');
    await 기본입력(user, '1995/08/15');
    await user.click(제출());

    expect(상자[0].input).toMatchObject({
      calendar: 'lunar',
      leapMonth: false,
    });
  });

  it('검색이 실패하면 그 사실을 내고 제출은 막힌 채로 둔다', async () => {
    // 출생지가 필수라 오프라인에서는 사주를 낼 수 없다.
    // ADR 0003 3항의 오프라인 약속을 ADR 0019 3항이 그만큼 좁혔다.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    const { user } = 그린다();
    await user.type(screen.getByLabelText('이름'), '김하늘');
    await user.type(screen.getByLabelText('생년월일시'), '1995/01/27');
    await user.type(screen.getByLabelText('태어난 시각'), '14:39');

    await user.click(screen.getByRole('button', { name: '출생지 검색' }));
    await user.type(screen.getByLabelText('출생지 검색어'), '서울');
    expect(
      await screen.findByText(/출생지를 찾지 못했습니다/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(제출()).toBeDisabled();
  });

  it('아직 없는 것을 누를 수 없게 둔다', () => {
    // 사주 불러오기는 소셜 로그인과 Supabase 가 붙어야 열린다(ADR 0008, 0010).
    그린다();

    expect(
      screen.getByRole('button', { name: '사주 불러오기' }),
    ).toBeDisabled();
    // 시간 모름과 야자시 토글은 아직 자리 자체가 없다
    expect(screen.queryByLabelText('시간 모름')).toBeNull();
    expect(screen.queryByLabelText('야자시/조자시')).toBeNull();
  });
});
