import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';

import InputPage from './InputPage';

import type { Region } from '@features/input/utils/region';

/**
 * 엔진이 `RangeError` 가 아닌 것을 던졌을 때의 폼 전체 문구.
 *
 * `computeSaju` 를 모킹하므로 파일을 따로 둔다. `vi.mock` 이 파일 단위라
 * 나머지 테스트와 한 파일에 두면 그쪽까지 가짜 엔진을 보게 된다.
 */
vi.mock('@saju/chart', async (importOriginal) => {
  const real = await importOriginal<typeof import('@saju/chart')>();

  return {
    ...real,
    computeSaju: () => {
      throw new TypeError('엔진이 예상하지 못한 것을 던졌다');
    },
  };
});

const 서울: Region = { name: '서울', longitude: 126.978652258309 };

const 그린다 = () => {
  const 상자: unknown[] = [];
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

const 다채운다 = async (user: ReturnType<typeof userEvent.setup>) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json([서울]))),
  );
  await user.type(screen.getByLabelText('이름'), '김하늘');
  await user.type(screen.getByLabelText('생년월일시'), '1995/01/27');
  await user.type(screen.getByLabelText('태어난 시각'), '14:39');
  await user.click(screen.getByRole('button', { name: '출생지 검색' }));
  await user.type(screen.getByLabelText('출생지 검색어'), '서울');
  await user.click(await screen.findByRole('button', { name: /서울/ }));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

it('어느 칸인지 모르는 오류는 폼 문구로 낸다', async () => {
  // RangeError 는 열한 개가 전부 날짜를 지목하지만 그 밖의 것은 지목하지 못한다.
  // 멀쩡한 날짜 칸에 붙이면 거기를 고치라는 뜻으로 읽힌다
  const { 상자, user } = 그린다();
  await 다채운다(user);
  await user.click(screen.getByRole('button', { name: '사주보러가기' }));

  expect(상자).toHaveLength(0);
  expect(screen.getByRole('alert')).toHaveTextContent('계산하지 못했습니다');
  expect(screen.getByLabelText('생년월일시')).toHaveAttribute(
    'aria-invalid',
    'false',
  );
});

it('고치기 시작하면 폼 문구도 지워진다', async () => {
  // 이 갈래는 라이브러리가 지운다. 값이 바뀌면 그 칸의 오류와 폼 오류를 함께 비운다.
  // 폼 레벨 listeners.onChange 를 지워도 통과하므로 그쪽을 지키는 테스트가 아니다.
  // 그래도 두는 것은 사용자가 보는 동작이라 판올림에서 바뀌면 알아야 해서다
  const { user } = 그린다();
  await 다채운다(user);
  await user.click(screen.getByRole('button', { name: '사주보러가기' }));
  expect(screen.getByRole('alert')).toBeInTheDocument();

  await user.type(screen.getByLabelText('생년월일시'), '1');
  expect(screen.queryByRole('alert')).toBeNull();
});
