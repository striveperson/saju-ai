import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { computeChart } from '@saju/chart';

import Profile from './Profile';

import type { ChartInput } from '@saju/chart';

const 기준: ChartInput = {
  calendar: 'solar',
  birth: { year: 1995, month: 1, day: 27, hour: 14, minute: 39 },
  gender: 'F',
  longitude: 126.98,
  ziPolicy: 'nextDay',
};

const 그린다 = (input: ChartInput) =>
  render(<Profile chart={computeChart(input)} />);

/** 접힌 곳에 있으면 잡지 못한다. 눌러야 보이는 경고는 표기 의무를 지킨 것이 아니다 */
const 바로보이나 = (문구: RegExp): boolean => {
  const found = screen.queryByText(문구);
  return found !== null && found.closest('details') === null;
};

describe('Profile', () => {
  it('경고가 없으면 경고 자리도 없다', () => {
    그린다(기준);

    expect(screen.queryByRole('list', { name: '계산이 세운 가정' })).toBeNull();
  });

  it('경고를 접지 않고 바로 낸다', () => {
    const { longitude: _생략, ...경도없음 } = 기준;
    그린다(경도없음);

    expect(바로보이나(/출생지를 몰라 서울 기준으로 보정했습니다/)).toBe(true);
  });

  it('두 번 존재하는 시각이면 고르지 않은 쪽 시각도 낸다', () => {
    // 검증 케이스 tz-19540321-before. docs/05 7.4 가 대안 표시를 요구한다.
    그린다({
      ...기준,
      birth: { year: 1954, month: 3, day: 20, hour: 23, minute: 30 },
    });

    const 문장 = screen.getByText(/이 시각은 두 번 존재합니다/);
    expect(문장).toHaveTextContent('이른 쪽인 23:30');
    expect(문장).toHaveTextContent('(기본값)');
    // 고르지 않은 쪽. resolution.alternative.normalized 다.
    expect(문장).toHaveTextContent('다른 해석은 1954-03-21 00:00');
  });

  it('사용자가 고른 것이면 기본값 표시를 안 붙인다', () => {
    그린다({
      ...기준,
      birth: { year: 1954, month: 3, day: 20, hour: 23, minute: 30 },
      ambiguityChoice: 'earlier',
    });

    expect(screen.getByText(/두 번 존재합니다/)).not.toHaveTextContent(
      '(기본값)',
    );
  });

  it('서머타임 구간이면 되돌린 것과 가정한 것을 함께 낸다', () => {
    그린다({
      ...기준,
      birth: { year: 1988, month: 7, day: 15, hour: 10, minute: 0 },
    });

    expect(바로보이나(/한 시간을 되돌렸습니다/)).toBe(true);
    expect(바로보이나(/그대로 가정했습니다/)).toBe(true);
  });

  it('야자시 경계면 두 일주와 판정 범위를 함께 낸다', () => {
    // 검증 케이스 zi-2301. docs/05 6장.
    그린다({
      ...기준,
      birth: { year: 1990, month: 3, day: 10, hour: 23, minute: 33 },
    });

    const 문장 = screen.getByText(/자시 경계라/);
    expect(문장).toHaveTextContent('을해과 갑술로 갈립니다');
    // 일주만 갈리는 것이 아니라는 것까지 말해야 한다.
    expect(문장).toHaveTextContent('신강약과 용신과 신살도 함께 달라집니다');
  });

  it('경계가 아니면 병기하지 않는다', () => {
    그린다(기준);

    expect(screen.queryByText(/자시 경계라/)).toBeNull();
  });

  it('성별과 지역은 받은 것만 낸다', () => {
    render(
      <Profile
        chart={computeChart(기준)}
        info={{ name: '김하늘', gender: '여자', region: '서울' }}
      />,
    );

    expect(screen.getByText('1995-01-27 14:39 여자 서울')).toBeInTheDocument();
  });
});
