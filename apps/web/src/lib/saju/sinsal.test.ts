import { describe, expect, it } from 'vitest';

import { branchOf, stemOf, type FourPillars } from './index';
import { computeSinsal, SINSAL_CATALOG, type Sinsal } from './sinsal';

/**
 * 규칙 검증용 합성 팔자.
 *
 * 신살은 완성된 팔자를 받아 목록을 낼 뿐이라(docs/07 머리말) 팔자를 직접 넣어도
 * 순환 논증이 되지 않는다. 만세력이 그 생년월일시에 그 팔자를 주는지는 별개 문제이고
 * 픽스처가 담당한다.
 */

/** 갑일간. 천을귀인 축미, 정록 인, 학당 해. 네 지지에 축, 인, 해, 미를 깐다. */
const 갑일간_귀인넷: FourPillars = {
  year: '을축',
  month: '무인',
  day: '갑해',
  hour: '신미',
};

/** 판정 지지가 하나도 없는 팔자. 갑일간의 표 어디에도 걸리지 않게 골랐다. */
const 갑일간_없음: FourPillars = {
  year: '경신',
  month: '경신',
  day: '갑신',
  hour: '경신',
};

/** 같은 지지가 둘이면 hits 도 둘이어야 한다. 갑일간 정록이 인이다. */
const 갑일간_인둘: FourPillars = {
  year: '병인',
  month: '경인',
  day: '갑자',
  hour: '을해',
};

function 이름들(list: readonly Sinsal[]): readonly string[] {
  return list.map((s) => s.name);
}

function 찾기(list: readonly Sinsal[], name: string): Sinsal {
  const found = list.find((s) => s.name === name);
  if (found === undefined) throw new Error(`결과에 없다: ${name}`);
  return found;
}

describe('카탈로그 (docs/07 10장)', () => {
  it('17종이다', () => {
    expect(SINSAL_CATALOG).toHaveLength(17);
  });

  it('이름이 중복되지 않는다', () => {
    const names = SINSAL_CATALOG.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('등급이 A 나 B 다. C 는 미채택이라 나오지 않는다', () => {
    for (const meta of SINSAL_CATALOG) {
      expect(['A', 'B'], meta.name).toContain(meta.grade);
    }
  });

  it('분류가 길성, 흉살, 중립 셋 안에 있다', () => {
    for (const meta of SINSAL_CATALOG) {
      expect(['길성', '흉살', '중립'], meta.name).toContain(meta.category);
    }
  });
});

describe('결과의 공통 불변조건 (docs/07 6장)', () => {
  const 팔자들 = [갑일간_귀인넷, 갑일간_없음, 갑일간_인둘];

  it('모든 hit 이 그 자리의 실제 글자를 가리킨다', () => {
    for (const pillars of 팔자들) {
      for (const sinsal of computeSinsal(pillars)) {
        for (const hit of sinsal.hits) {
          const 실제 =
            hit.position === 'stem'
              ? stemOf(pillars[hit.pillar])
              : branchOf(pillars[hit.pillar]);
          expect(hit.char, `${sinsal.name} ${hit.pillar}`).toBe(실제);
        }
      }
    }
  });

  it('hits 가 빈 판정은 결과에 없다', () => {
    for (const pillars of 팔자들) {
      for (const sinsal of computeSinsal(pillars)) {
        expect(sinsal.hits.length, sinsal.name).toBeGreaterThan(0);
      }
    }
  });

  it('결과의 분류와 등급이 카탈로그와 같다', () => {
    for (const pillars of 팔자들) {
      for (const sinsal of computeSinsal(pillars)) {
        const meta = SINSAL_CATALOG.find((m) => m.name === sinsal.name);
        expect(meta, sinsal.name).toBeDefined();
        expect(sinsal.category, sinsal.name).toBe(meta?.category);
        expect(sinsal.grade, sinsal.name).toBe(meta?.grade);
      }
    }
  });

  it('출력 순서가 결정적이고 카탈로그 순서를 벗어나지 않는다', () => {
    for (const pillars of 팔자들) {
      const 한번 = computeSinsal(pillars);
      expect(computeSinsal(pillars)).toEqual(한번);

      const 자리 = 한번.map((s) =>
        SINSAL_CATALOG.findIndex((m) => m.name === s.name),
      );
      expect(
        [...자리].sort((a, b) => a - b),
        '카탈로그 순서',
      ).toEqual(자리);
    }
  });

  it('천간이나 지지가 아닌 글자를 받으면 던진다', () => {
    expect(() =>
      computeSinsal({ ...갑일간_귀인넷, day: 'XY' as never }),
    ).toThrow();
  });
});

describe('일간 기준 판정 (docs/07 2장)', () => {
  it('갑일간의 천을귀인이 축과 미 둘 다 잡힌다', () => {
    const 천을 = 찾기(computeSinsal(갑일간_귀인넷), '천을귀인');

    expect(천을.basis).toBe('일간');
    expect(천을.category).toBe('길성');
    expect(천을.hits.map((h) => h.char)).toEqual(['축', '미']);
    expect(천을.hits.map((h) => h.pillar)).toEqual(['year', 'hour']);
  });

  it('판정이 네 기둥 어디에 있어도 잡힌다', () => {
    const 결과 = computeSinsal(갑일간_귀인넷);

    expect(찾기(결과, '정록').hits[0].pillar).toBe('month');
    expect(찾기(결과, '학당귀인').hits[0].pillar).toBe('day');
    expect(찾기(결과, '천을귀인').hits[0].pillar).toBe('year');
  });

  it('일간 기준의 position 은 전부 지지다', () => {
    for (const sinsal of computeSinsal(갑일간_귀인넷)) {
      for (const hit of sinsal.hits) {
        expect(hit.position, sinsal.name).toBe('branch');
      }
    }
  });

  it('같은 지지가 둘이면 hits 도 둘이다', () => {
    const 정록 = 찾기(computeSinsal(갑일간_인둘), '정록');

    expect(정록.hits).toHaveLength(2);
    expect(정록.hits.map((h) => h.pillar)).toEqual(['year', 'month']);
  });

  it('걸리는 것이 없으면 빈 목록이다', () => {
    expect(computeSinsal(갑일간_없음)).toEqual([]);
  });

  it('양인은 음간에 붙지 않는다', () => {
    // 을일간. 음간이라 양인 표가 비어 있다. 문서 2장의 유파 선택이다.
    const 을일간: FourPillars = {
      year: '을묘',
      month: '을묘',
      day: '을묘',
      hour: '을묘',
    };
    expect(이름들(computeSinsal(을일간))).not.toContain('양인');
  });

  it('갑일간 묘는 양인으로 잡힌다', () => {
    const 갑일간_묘: FourPillars = {
      year: '을묘',
      month: '을묘',
      day: '갑자',
      hour: '을묘',
    };
    const 양인 = 찾기(computeSinsal(갑일간_묘), '양인');

    expect(양인.category).toBe('흉살');
    expect(양인.grade).toBe('B');
    expect(양인.hits).toHaveLength(3);
  });
});
