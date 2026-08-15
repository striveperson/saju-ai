import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FourPillars } from '@saju';

import PaljaTable from './PaljaTable';

/**
 * 검증 케이스 verified-19950127-1439-F-seoul 의 팔자.
 * 기대값은 docs/mockups/result-screen.html 의 사주팔자 표에서 그대로 옮겼다.
 */
const 기준팔자: FourPillars = {
  year: '갑술',
  month: '정축',
  day: '무오',
  hour: '기미',
};

/**
 * 행 머리가 `라벨` 인 행의 데이터 칸을 왼쪽부터 읽는다.
 * 목업이 시, 일, 월, 년 순으로 놓는다.
 *
 * 십신은 두 행이라 `번째` 로 고른다. 0 이 천간, 1 이 지지다.
 */
const 행의칸 = (라벨: string, 번째 = 0): (string | null)[] => {
  const rows = screen
    .getAllByRole('row')
    .filter(
      (row) => within(row).queryByRole('rowheader')?.textContent === 라벨,
    );
  return within(rows[번째])
    .getAllByRole('cell')
    .map((cell) => cell.textContent);
};

describe('PaljaTable', () => {
  it('열을 시, 일, 월, 년 순으로 놓는다', () => {
    render(<PaljaTable pillars={기준팔자} />);

    const headers = screen
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['', '시', '일', '월', '년']);
  });

  it('천간 네 글자를 음양과 오행과 함께 낸다', () => {
    render(<PaljaTable pillars={기준팔자} />);

    expect(행의칸('천간')).toEqual(['기-토', '무+토', '정-화', '갑+목']);
  });

  it('지지 네 글자를 오행과 함께 낸다. 음양은 붙이지 않는다', () => {
    render(<PaljaTable pillars={기준팔자} />);

    // docs/05 1장이 천간 음양만 정의하고 지지 음양은 정의하지 않는다.
    // 없는 규칙을 화면이 만들지 않는다.
    expect(행의칸('지지')).toEqual(['미토', '오화', '축토', '술토']);
  });

  it('천간의 십신을 내고 일간 자리는 일간이라고 적는다', () => {
    render(<PaljaTable pillars={기준팔자} />);

    expect(행의칸('십신', 0)).toEqual(['비겁', '일간', '인성', '관성']);
  });

  it('지지의 십신을 낸다', () => {
    render(<PaljaTable pillars={기준팔자} />);

    expect(행의칸('십신', 1)).toEqual(['비겁', '인성', '비겁', '비겁']);
  });

  it('지장간을 여기, 중기, 본기 순으로 낸다', () => {
    render(<PaljaTable pillars={기준팔자} />);

    expect(행의칸('지장간')).toEqual(['정을기', '병기정', '계신기', '신정무']);
  });

  it('중기가 없는 지지는 두 글자만 낸다', () => {
    // 자와 묘는 중기가 없어 두 글자다(docs/05 1.1).
    render(
      <PaljaTable
        pillars={{ year: '갑자', month: '을축', day: '병인', hour: '정묘' }}
      />,
    );

    expect(행의칸('지장간')).toEqual(['갑을', '무병갑', '계신기', '임계']);
  });

  it('일간이 바뀌면 십신이 전부 바뀐다', () => {
    // 일간을 무토에서 임수로 바꾼다. 같은 글자들이 다른 십신이 되어야 한다.
    render(
      <PaljaTable
        pillars={{ year: '갑술', month: '정축', day: '임오', hour: '기미' }}
      />,
    );

    expect(행의칸('십신', 0)).toEqual(['관성', '일간', '재성', '식상']);
  });
});
