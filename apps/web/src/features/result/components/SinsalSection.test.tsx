import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { computeSinsal } from '@saju/sinsal';

import SinsalSection from './SinsalSection';

import type { Sinsal } from '@saju/sinsal';

/**
 * 도화살이 두 기준으로 걸리는 팔자. 넷 다 실재하는 60갑자다.
 *
 * 년지 자는 신자진이라 도화가 유이고, 일지 오는 인오술이라 도화가 묘다.
 * 유와 묘가 둘 다 있어 `computeSinsal` 이 도화살을 삼합(년지)와 삼합(일지)로 두 번 낸다.
 * 그룹만 다르고 목표 지지가 없으면 중복이 생기지 않아 접기를 검사할 수 없다.
 */
const 중복나는팔자 = {
  year: '갑자',
  month: '계유',
  day: '무오',
  hour: '을묘',
} as const;

const 이름들 = (): string[] =>
  screen.getAllByRole('listitem').map((li) => li.textContent);

describe('SinsalSection', () => {
  it('같은 이름이 두 기준으로 걸려도 태그는 하나다', () => {
    const sinsal = computeSinsal(중복나는팔자);

    // 전제. 접기 전에는 같은 이름이 두 번 있어야 이 테스트가 의미를 갖는다.
    const 원본이름 = sinsal.map((each) => each.name);
    expect(원본이름.length).toBeGreaterThan(new Set(원본이름).size);

    render(<SinsalSection sinsal={sinsal} />);

    const 태그 = 이름들();
    const 접힌이름 = 태그.map((text) => text.replace(/[AB]$/, ''));
    expect(new Set(접힌이름).size).toBe(접힌이름.length);
  });

  it('접어도 붙은 자리는 다 남는다', () => {
    // 두 기준의 hits 가 겹치면 하나로, 다르면 둘 다 남아야 한다.
    const sinsal = computeSinsal(중복나는팔자);
    const 도화 = sinsal.filter((each) => each.name === '도화살');
    render(<SinsalSection sinsal={sinsal} />);

    if (도화.length > 0) {
      const 자리수 = new Set(
        도화.flatMap((each) =>
          each.hits.map((hit) => `${hit.pillar}:${hit.position}`),
        ),
      ).size;
      // 태그 하나 + 그리드에 자리 수만큼
      expect(screen.getAllByText('도화살')).toHaveLength(자리수 + 1);
    }
  });

  it('A 와 B 등급을 구분해 표시한다', () => {
    // docs/07 6장. grade 를 결과에 담은 이유가 이 표시다.
    // 중복나는팔자는 걸리는 것이 전부 B 라 등급이 섞인 기준 케이스를 쓴다.
    // verified-19950127-1439-F-seoul 은 천을귀인(A)과 양인(B)이 함께 붙는다.
    render(
      <SinsalSection
        sinsal={computeSinsal({
          year: '갑술',
          month: '정축',
          day: '무오',
          hour: '기미',
        })}
      />,
    );

    const 태그 = 이름들();
    expect(태그.every((text) => /[AB]$/.test(text))).toBe(true);
    expect(태그.some((text) => text.endsWith('A'))).toBe(true);
    expect(태그.some((text) => text.endsWith('B'))).toBe(true);
  });

  it('붙은 신살이 없으면 없다고 낸다', () => {
    render(<SinsalSection sinsal={[] as readonly Sinsal[]} />);

    expect(screen.getByText('붙은 신살이 없습니다.')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('안 붙은 자리는 빈 칸으로 낸다', () => {
    render(<SinsalSection sinsal={computeSinsal(중복나는팔자)} />);

    // 천간 행은 주 간지 기준(백호, 괴강)만 붙으므로 대개 비어 있다.
    expect(screen.getAllByText('×').length).toBeGreaterThan(0);
  });

  it('열을 시, 일, 월, 년 순으로 놓는다', () => {
    const { container } = render(
      <SinsalSection sinsal={computeSinsal(중복나는팔자)} />,
    );
    const grid = container.querySelector('.grid') as HTMLElement;

    const 머리 = within(grid)
      .getAllByText(/^[시일월년]$/)
      .map((el) => el.textContent);
    expect(머리).toEqual(['시', '일', '월', '년']);
  });
});
