import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { computeSaju } from '@saju/chart';

import ResultPage from './ResultPage';

import type { ChartInput } from '@saju/chart';

/**
 * 검증 케이스 verified-19950127-1439-F-seoul.
 * 기대값은 docs/mockups/result-screen.html 에서 옮겼다.
 */
const 기준: ChartInput = {
  calendar: 'solar',
  birth: { year: 1995, month: 1, day: 27, hour: 14, minute: 39 },
  gender: 'F',
  longitude: 126.98,
  ziPolicy: 'nextDay',
};

const 절 = (제목: string): HTMLElement =>
  screen.getByRole('heading', { name: 제목 }).parentElement as HTMLElement;

describe('ResultPage', () => {
  it('목업의 절을 순서대로 낸다', () => {
    render(
      <ResultPage
        saju={computeSaju(기준)}
        info={{ name: '김하늘', gender: '여자', region: '서울' }}
      />,
    );

    const 제목들 = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(제목들).toEqual([
      '사주팔자',
      '신살과 길성',
      '오행과 십신',
      '신강/신약 지수',
      '용신',
      '대운',
      'AI 해석',
    ]);
  });

  it('프로필이 이름과 일주와 보정 전후를 낸다', () => {
    render(
      <ResultPage
        saju={computeSaju(기준)}
        info={{ name: '김하늘', gender: '여자', region: '서울' }}
      />,
    );

    expect(screen.getByText('김하늘')).toBeInTheDocument();
    expect(screen.getByText('무오 일주')).toBeInTheDocument();
    // 성별과 지역은 엔진이 모르는 값이라 info 로 받는다.
    expect(screen.getByText('1995-01-27 14:39 여자 서울')).toBeInTheDocument();
    expect(
      screen.getByText('1995-01-27 14:07 (진태양시 -32분)'),
    ).toBeInTheDocument();
  });

  it('info 가 없으면 일주만 낸다', () => {
    render(<ResultPage saju={computeSaju(기준)} />);

    expect(screen.getByText('무오 일주')).toBeInTheDocument();
    expect(screen.getByText('1995-01-27 14:39')).toBeInTheDocument();
  });

  it('적용한 유파 값을 표시하지 않는다', () => {
    // docs/01 5장. 옵션을 고를 수단이 없어 넷 다 기본값 고정이다.
    render(<ResultPage saju={computeSaju(기준)} />);

    expect(screen.queryByText('계산 근거')).toBeNull();
    for (const 문구 of ['정자시설', '야자시설', '비겁 + 인성', '이른 쪽']) {
      expect(screen.queryByText(문구)).toBeNull();
    }
  });

  it('오행 분포가 여덟 글자 기준이다', () => {
    render(<ResultPage saju={computeSaju(기준)} />);
    const 절내부 = within(절('오행과 십신'));

    // docs/05 11.6. 목업이 고친 값과 같다.
    expect(절내부.getAllByText('62.5%')).toHaveLength(2); // 막대와 관계도
    expect(절내부.getAllByText('25.0%')).toHaveLength(2);
    expect(절내부.getAllByText('12.5%')).toHaveLength(2);
    // 0퍼센트도 숫자가 나온다. `0 &&` 로 지우지 않는다.
    expect(절내부.getAllByText('0.0%')).toHaveLength(4);
  });

  it('관계도가 일간 오행을 열두시에 놓는다', () => {
    // 목업이 그렇게 그린다. 일간 무토라 토가 맨 위다.
    render(<ResultPage saju={computeSaju(기준)} />);
    const 그림 = screen.getByRole('img', { name: '오행 상생 상극 관계도' });

    // 노드 이름 텍스트가 그린 순서대로 나온다. 첫째가 열두시다.
    const 순서 = within(그림)
      .getAllByText(/^[목화토금수]\(/)
      .map((el) => el.textContent);
    // 십신도 함께 낸다. 목업이 "토(비겁)" 형태다.
    expect(순서).toEqual([
      '토(비겁)',
      '금(식상)',
      '수(재성)',
      '목(관성)',
      '화(인성)',
    ]);
  });

  it('관계도에 생과 극 범례가 있다', () => {
    // 실선과 점선이 무엇인지 눈으로 볼 단서가 화면에 있어야 한다.
    // aria-label 은 스크린 리더에만 간다.
    render(<ResultPage saju={computeSaju(기준)} />);
    const 절내부 = within(절('오행과 십신'));

    expect(절내부.getByText('생(生)')).toBeInTheDocument();
    expect(절내부.getByText('극(剋)')).toBeInTheDocument();
  });

  it('화살표가 엔진의 상생상극을 그대로 가리킨다', () => {
    // 링의 인접 관계로 유도하면 나열 순서를 바꿨을 때 조용히 틀린다.
    // 화살표마다 어느 관계인지 라벨을 달아 그 방향을 테스트가 잡는다.
    render(<ResultPage saju={computeSaju(기준)} />);
    const 그림 = screen.getByRole('img', { name: '오행 상생 상극 관계도' });

    const 관계 = within(그림)
      .getAllByRole('graphics-symbol')
      .map((el) => el.getAttribute('aria-label'));

    expect(관계.filter((each) => each?.includes('생'))).toEqual([
      '토생금',
      '금생수',
      '수생목',
      '목생화',
      '화생토',
    ]);
    expect(관계.filter((each) => each?.includes('극'))).toEqual([
      '토극수',
      '금극목',
      '수극화',
      '목극토',
      '화극금',
    ]);

    // 라벨만 맞는 것으로는 부족하다. 라벨이 to 와 같은 식에서 나오므로
    // 좌표가 엉뚱해도 라벨은 그대로다. 선이 실제로 그 두 노드를 잇는지 잰다.
    const 중심 = new Map(
      within(그림)
        .getAllByRole('graphics-symbol')
        .filter((el) => el.getAttribute('aria-label')?.endsWith('자리'))
        .map((el) => {
          const circle = el.querySelector('circle') as SVGCircleElement;
          return [
            el.getAttribute('aria-label')?.replace(' 자리', ''),
            {
              x: Number(circle.getAttribute('cx')),
              y: Number(circle.getAttribute('cy')),
            },
          ] as const;
        }),
    );

    /** 이 점에서 가장 가까운 노드 이름 */
    const 가까운노드 = (x: number, y: number): string => {
      let best = '';
      let min = Infinity;
      for (const [name, at] of 중심) {
        const d = (at.x - x) ** 2 + (at.y - y) ** 2;
        if (d < min) {
          min = d;
          best = name ?? '';
        }
      }
      return best;
    };

    for (const arrow of within(그림).getAllByRole('graphics-symbol')) {
      const label = arrow.getAttribute('aria-label') ?? '';
      if (label.endsWith('자리')) continue;

      const line = arrow.querySelector('line') as SVGLineElement;
      const [from, to] = label.split(/[생극]/);
      expect(
        가까운노드(
          Number(line.getAttribute('x1')),
          Number(line.getAttribute('y1')),
        ),
      ).toBe(from);
      expect(
        가까운노드(
          Number(line.getAttribute('x2')),
          Number(line.getAttribute('y2')),
        ),
      ).toBe(to);
    }
  });

  it('신강약이 등급과 근거를 낸다', () => {
    render(<ResultPage saju={computeSaju(기준)} />);
    const 절내부 = within(절('신강/신약 지수'));

    // 눈금 다섯 중 현재 등급만 aria-current 다.
    const 현재 = 절내부
      .getAllByText(/^(태약|신약|중화|신강|태강)$/)
      .filter((el) => el.getAttribute('aria-current') === 'true');
    expect(현재).toHaveLength(1);
    expect(현재[0]).toHaveTextContent('태강');

    // supportRatio(7/8) 가 아니라 득세 기준이다. docs/05 11.3.
    expect(절내부.getByText('득세 6 / 7글자')).toBeInTheDocument();
    for (const 요소 of ['득령', '득지', '득시', '득세']) {
      expect(절내부.getByText(요소)).toBeInTheDocument();
    }
  });

  it('용신과 희신을 낸다', () => {
    render(<ResultPage saju={computeSaju(기준)} />);
    const 절내부 = within(절('용신'));

    expect(절내부.getByText('금')).toBeInTheDocument();
    expect(절내부.getByText(/희신 수/)).toBeInTheDocument();
  });

  it('대운 열 개를 낸다', () => {
    render(<ResultPage saju={computeSaju(기준)} />);
    const 절내부 = within(절('대운'));

    expect(절내부.getByText('병자')).toBeInTheDocument();
    expect(절내부.getByText('7세')).toBeInTheDocument();
    expect(절내부.getAllByText(/세$/)).toHaveLength(10);
  });

  it('신살을 이름 단위로 접고 등급을 함께 낸다', () => {
    render(<ResultPage saju={computeSaju(기준)} />);
    const 절내부 = within(절('신살과 길성'));

    // docs/07 6장. 천을귀인은 월지와 시지 둘에 붙어 그리드에 두 번, 태그에 한 번 나온다.
    // 접기는 태그에만 걸린다. 그리드는 자리마다 보여야 하는 표다.
    expect(절내부.getAllByText('천을귀인')).toHaveLength(3);
    const 태그 = 절내부.getAllByRole('listitem');
    const 이름들 = 태그.map((li) => li.textContent);
    expect(new Set(이름들).size).toBe(이름들.length);
    // A 와 B 를 구분해 표시한다.
    expect(태그.some((li) => li.textContent.endsWith('A'))).toBe(true);
    expect(태그.some((li) => li.textContent.endsWith('B'))).toBe(true);
  });

  it('AI 해석은 빈 상태다', () => {
    render(<ResultPage saju={computeSaju(기준)} />);

    expect(
      within(절('AI 해석')).getByText(/아직 해석을 만들지 않았습니다/),
    ).toBeInTheDocument();
  });

  it('중화 사주에서 용신 자리가 깨지지 않는다', () => {
    // 중화는 억부용신이 없어 yongshin 이 null 이다. docs/05 11.5.
    const 중화 = computeSaju(기준);
    const 바꾼것 = {
      ...중화,
      reading: {
        ...중화.reading,
        strength: {
          ...중화.reading.strength,
          grade: '중화' as const,
          yongshin: null,
          huisin: null,
          flags2: { ...중화.reading.strength.flags2, needsJohuReview: true },
        },
      },
    };
    render(<ResultPage saju={바꾼것} />);

    expect(screen.getByText(/조후나 병약/)).toBeInTheDocument();
  });
});
