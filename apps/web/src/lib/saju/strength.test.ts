import { describe, expect, it } from 'vitest';

import { VERIFIED_CASES } from './fixtures/cases';
import type { FourPillars } from './index';
import { computeStrength, DEFAULT_STRENGTH_CONFIG, hasRoot } from './strength';

/**
 * 규칙 검증용 합성 팔자.
 *
 * 강약은 만세력 계산과 분리된 순수 규칙 함수라(docs/05 11.1) 팔자를 직접 넣어도
 * 순환 논증이 되지 않는다. 대조가 필요한 것은 실제 사주의 등급이고 그것은
 * 아래 verified 케이스가 맡는다. 여기서는 11.3~11.5 의 분기를 훑는다.
 *
 * 전부 일간이 무토(토)다. 토 기준으로 비겁 토, 인성 화, 식상 금, 재성 수, 관성 목이다.
 */
const 태강_전왕: FourPillars = {
  year: '무술',
  month: '기미',
  day: '무오',
  hour: '정사',
};
const 신강_3점5: FourPillars = {
  year: '무술',
  month: '기미',
  day: '무인',
  hour: '을묘',
};
const 신강_임계3점0: FourPillars = {
  year: '갑자',
  month: '기미',
  day: '무오',
  hour: '을묘',
};
const 중화_2점0: FourPillars = {
  year: '갑자',
  month: '기미',
  day: '무인',
  hour: '을묘',
};
const 중화_임계1점5: FourPillars = {
  year: '무술',
  month: '기해',
  day: '무인',
  hour: '정묘',
};
const 신약_0점5: FourPillars = {
  year: '갑자',
  month: '을해',
  day: '무인',
  hour: '기미',
};
const 태약_0점: FourPillars = {
  year: '갑자',
  month: '을해',
  day: '무인',
  hour: '을묘',
};
const 신강_관성무근: FourPillars = {
  year: '무술',
  month: '기축',
  day: '무신',
  hour: '임자',
};

describe('기준 케이스 재현 (docs/05 11.7)', () => {
  const withStrength = VERIFIED_CASES.filter(
    (c) => c.expected.strengthGrade !== undefined,
  );

  it('강약 기대값이 있는 verified 케이스가 있다', () => {
    expect(withStrength.length).toBeGreaterThanOrEqual(1);
  });

  it('등급, 4요소, 용신이 픽스처와 맞는다', () => {
    for (const c of withStrength) {
      const { year, month, day, hour } = c.expected;
      if (!year || !month || !day || !hour) {
        throw new Error(
          `${c.id}: 강약 기대값이 있으면 네 기둥이 전부 있어야 한다`,
        );
      }

      const result = computeStrength({ year, month, day, hour });
      expect(result.grade, c.id).toBe(c.expected.strengthGrade);

      if (c.expected.flags) {
        expect(result.flags, c.id).toEqual(c.expected.flags);
      }
      if (c.expected.yongshin) {
        expect(result.yongshin?.element, c.id).toBe(
          c.expected.yongshin.element,
        );
        expect(result.yongshin?.method, c.id).toBe(c.expected.yongshin.method);
      }
    }
  });

  // 갑술 정축 무오 기미, 일간 무토. 토 5, 화 2, 목 1 이라 지원이 7/8 이다.
  it('supportRatio 와 오행 분포가 11.7 과 맞는다', () => {
    const result = computeStrength({
      year: '갑술',
      month: '정축',
      day: '무오',
      hour: '기미',
    });

    expect(result.supportRatio).toBe(0.875);
    expect(result.elementDistribution.토).toEqual({ count: 5, ratio: 0.625 });
    expect(result.elementDistribution.화).toEqual({ count: 2, ratio: 0.25 });
    expect(result.elementDistribution.목).toEqual({ count: 1, ratio: 0.125 });
    expect(result.elementDistribution.금.count).toBe(0);
    expect(result.elementDistribution.수.count).toBe(0);
    expect(result.score).toBe(5);
    expect(result.huisin).toBe('수');
    expect(result.flags2.considerJeonWangGyeok).toBe(false);
  });
});

describe('등급 산출 (docs/05 11.4)', () => {
  it('네 요소가 전부 참이면 태강이다', () => {
    const result = computeStrength(태강_전왕);
    expect(result.flags).toEqual({
      deukRyeong: true,
      deukJi: true,
      deukSi: true,
      deukSe: true,
    });
    expect(result.grade).toBe('태강');
  });

  it('네 요소가 전부 거짓이고 지원이 1개 이하면 태약이다', () => {
    const result = computeStrength(태약_0점);
    expect(result.flags).toEqual({
      deukRyeong: false,
      deukJi: false,
      deukSi: false,
      deukSe: false,
    });
    expect(result.score).toBe(0);
    expect(result.grade).toBe('태약');
  });

  it('score 가 3.0 이상이면 신강이다', () => {
    expect(computeStrength(신강_3점5).score).toBe(3.5);
    expect(computeStrength(신강_3점5).grade).toBe('신강');
  });

  it('임계 3.0 은 신강에 포함된다', () => {
    const result = computeStrength(신강_임계3점0);
    expect(result.score).toBe(DEFAULT_STRENGTH_CONFIG.thresholds.strong);
    expect(result.grade).toBe('신강');
  });

  it('score 가 1.5 이상 3.0 미만이면 중화다', () => {
    expect(computeStrength(중화_2점0).score).toBe(2);
    expect(computeStrength(중화_2점0).grade).toBe('중화');
  });

  it('임계 1.5 는 중화에 포함된다', () => {
    const result = computeStrength(중화_임계1점5);
    expect(result.score).toBe(DEFAULT_STRENGTH_CONFIG.thresholds.balanced);
    expect(result.grade).toBe('중화');
  });

  it('score 가 1.5 미만이면 신약이다. 태약 특례에 걸리지 않는 경우다', () => {
    const result = computeStrength(신약_0점5);
    expect(result.score).toBe(0.5);
    expect(result.grade).toBe('신약');
  });

  it('가중치와 임계값을 설정으로 바꿀 수 있다', () => {
    const result = computeStrength(중화_2점0, {
      config: {
        ...DEFAULT_STRENGTH_CONFIG,
        thresholds: { strong: 2.0, balanced: 1.0 },
      },
    });
    expect(result.grade).toBe('신강');
  });
});

describe('supportIncludesResource 유파 옵션 (docs/05 11.3)', () => {
  // 기준 케이스의 일지는 오화이고 무토에게 인성이다.
  // 옵션을 끄면 득지만 꺼지고 득령(축토)과 득시(미토)는 비겁이라 그대로다.
  const baseline: FourPillars = {
    year: '갑술',
    month: '정축',
    day: '무오',
    hour: '기미',
  };

  it('기본값 true 는 인성을 지원 세력에 넣는다', () => {
    expect(computeStrength(baseline).flags.deukJi).toBe(true);
    expect(computeStrength(baseline).grade).toBe('태강');
  });

  it('false 면 득령·득지·득시를 비겁만으로 좁힌다', () => {
    const result = computeStrength(baseline, {
      supportIncludesResource: false,
    });
    expect(result.flags.deukJi).toBe(false);
    expect(result.flags.deukRyeong).toBe(true);
    expect(result.flags.deukSi).toBe(true);
    expect(result.grade).toBe('신강');
  });

  it('득세와 supportRatio 는 옵션과 무관하게 인성을 포함한다', () => {
    const result = computeStrength(baseline, {
      supportIncludesResource: false,
    });
    expect(result.flags.deukSe).toBe(true);
    expect(result.supportRatio).toBe(0.875);
  });

  // 유파가 갈리는 값이라 어느 쪽을 적용했는지 결과에 남아야 한다.
  it('적용한 값이 결과에 남는다', () => {
    expect(computeStrength(baseline).applied.supportIncludesResource).toBe(
      true,
    );
    const narrowed = computeStrength(baseline, {
      supportIncludesResource: false,
    });
    expect(narrowed.applied.supportIncludesResource).toBe(false);
  });
});

describe('통근 (docs/05 11.5)', () => {
  it('여기, 중기, 본기를 가리지 않는다', () => {
    // 해의 지장간은 무(토), 갑(목), 임(수) 이라 여기의 토도 유근으로 친다.
    expect(hasRoot('토', ['해'])).toBe(true);
    expect(hasRoot('목', ['해'])).toBe(true);
    expect(hasRoot('수', ['해'])).toBe(true);
    expect(hasRoot('금', ['해'])).toBe(false);
  });

  it('네 지지 중 하나에만 있어도 유근이다', () => {
    expect(hasRoot('금', ['자', '묘', '자', '유'])).toBe(true);
    expect(hasRoot('금', ['자', '묘', '자', '인'])).toBe(false);
  });
});

describe('용신 분기 (docs/05 11.5)', () => {
  it('태강은 식상으로 설기하고 희신이 재성이다', () => {
    const result = computeStrength(태강_전왕);
    expect(result.yongshin).toEqual({ element: '금', method: '억부(설기)' });
    expect(result.huisin).toBe('수');
  });

  it('신강은 관성으로 극제하고 희신이 재성이다', () => {
    const result = computeStrength(신강_3점5);
    expect(result.yongshin).toEqual({ element: '목', method: '억부(극제)' });
    expect(result.huisin).toBe('수');
  });

  it('신강에서 관성이 무근이고 식상이 유근이면 식상으로 대체하고 사유를 남긴다', () => {
    const result = computeStrength(신강_관성무근);
    expect(result.grade).toBe('신강');
    expect(hasRoot('목', ['술', '축', '신', '자'])).toBe(false);
    expect(hasRoot('금', ['술', '축', '신', '자'])).toBe(true);
    expect(result.yongshin?.element).toBe('금');
    expect(result.yongshin?.method).toBe('억부(설기)');
    expect(result.yongshin?.fallbackReason).toBeTruthy();
    expect(result.huisin).toBe('수');
  });

  it('중화는 억부용신이 없고 조후 검토로 넘어간다', () => {
    const result = computeStrength(중화_2점0);
    expect(result.yongshin).toBeNull();
    expect(result.huisin).toBeNull();
    expect(result.flags2.needsJohuReview).toBe(true);
  });

  it('신약과 태약은 인성으로 생조하고 희신이 비겁이다', () => {
    for (const pillars of [신약_0점5, 태약_0점]) {
      const result = computeStrength(pillars);
      expect(result.yongshin).toEqual({ element: '화', method: '억부(생조)' });
      expect(result.huisin).toBe('토');
    }
  });

  // 원국에 식상이 0퍼센트여도 결핍 보충 관점에서 고른다(11.5 태강 행).
  it('태강의 식상은 원국에 없어도 고른다', () => {
    const result = computeStrength(태강_전왕);
    expect(result.elementDistribution.금.count).toBe(0);
    expect(result.yongshin?.element).toBe('금');
  });
});

describe('검토 플래그 (docs/05 11.5)', () => {
  it('태약이면 종격 검토를 올린다', () => {
    expect(computeStrength(태약_0점).flags2.considerJongGyeok).toBe(true);
    expect(computeStrength(신약_0점5).flags2.considerJongGyeok).toBe(false);
  });

  it('태강이면서 식상·재성·관성이 모두 부재하면 전왕격 검토를 올린다', () => {
    const result = computeStrength(태강_전왕);
    expect(result.grade).toBe('태강');
    expect(result.elementDistribution.금.count).toBe(0);
    expect(result.elementDistribution.수.count).toBe(0);
    expect(result.elementDistribution.목.count).toBe(0);
    expect(result.flags2.considerJeonWangGyeok).toBe(true);
  });

  it('중화가 아니면 조후 검토를 올리지 않는다', () => {
    expect(computeStrength(태강_전왕).flags2.needsJohuReview).toBe(false);
    expect(computeStrength(신약_0점5).flags2.needsJohuReview).toBe(false);
  });
});

describe('입력 검증', () => {
  it('오행 분포의 비율 합이 1 이다', () => {
    const result = computeStrength(태강_전왕);
    const total = Object.values(result.elementDistribution).reduce(
      (sum, each) => sum + each.ratio,
      0,
    );
    expect(total).toBe(1);
    const count = Object.values(result.elementDistribution).reduce(
      (sum, each) => sum + each.count,
      0,
    );
    expect(count).toBe(8);
  });

  it('천간이나 지지가 아닌 글자를 받으면 던진다', () => {
    expect(() =>
      computeStrength({
        year: '갑술',
        month: '정축',
        day: 'XY' as never,
        hour: '기미',
      }),
    ).toThrow();
  });
});
