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

  // 카탈로그를 문서 표와 통째로 대조한다. 범위 검사만 두면
  // 괴강살을 흉살로, 삼합 다섯을 A 로 바꿔도 전부 통과한다.
  // 순서는 10장 표를 따르고 분류와 등급은 2장에서 5장까지의 표를 따른다.
  it('이름, 순서, 분류, 등급이 문서 표와 같다', () => {
    expect(SINSAL_CATALOG).toEqual([
      { name: '천을귀인', category: '길성', grade: 'A' },
      { name: '태극귀인', category: '길성', grade: 'B' },
      { name: '문창귀인', category: '길성', grade: 'A' },
      { name: '정록', category: '길성', grade: 'A' },
      { name: '학당귀인', category: '길성', grade: 'A' },
      { name: '관귀학관', category: '길성', grade: 'A' },
      { name: '금여성', category: '길성', grade: 'A' },
      { name: '양인', category: '흉살', grade: 'B' },
      { name: '고신살', category: '흉살', grade: 'A' },
      { name: '과숙살', category: '흉살', grade: 'A' },
      { name: '백호대살', category: '흉살', grade: 'B' },
      { name: '괴강살', category: '중립', grade: 'B' },
      { name: '도화살', category: '흉살', grade: 'B' },
      { name: '역마살', category: '중립', grade: 'B' },
      { name: '화개살', category: '중립', grade: 'B' },
      { name: '겁살', category: '흉살', grade: 'B' },
      { name: '망신살', category: '흉살', grade: 'B' },
    ]);
  });

  it('기준별 개수가 10장 표와 같다', () => {
    const 일간 = SINSAL_CATALOG.slice(0, 8).map((m) => m.name);
    expect(일간).toEqual([
      '천을귀인',
      '태극귀인',
      '문창귀인',
      '정록',
      '학당귀인',
      '관귀학관',
      '금여성',
      '양인',
    ]);
    expect(SINSAL_CATALOG.slice(8, 10).map((m) => m.name)).toEqual([
      '고신살',
      '과숙살',
    ]);
    expect(SINSAL_CATALOG.slice(10, 12).map((m) => m.name)).toEqual([
      '백호대살',
      '괴강살',
    ]);
    expect(SINSAL_CATALOG.slice(12).map((m) => m.name)).toEqual([
      '도화살',
      '역마살',
      '화개살',
      '겁살',
      '망신살',
    ]);
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

describe('년지 기준 판정 (docs/07 3장)', () => {
  it('자년생의 고신살이 인이고 과숙살이 술이다', () => {
    // 자는 해자축 그룹이다.
    const 팔자: FourPillars = {
      year: '갑자',
      month: '병인',
      day: '갑술',
      hour: '을해',
    };
    const 결과 = computeSinsal(팔자);

    expect(찾기(결과, '고신살').hits.map((h) => h.char)).toEqual(['인']);
    expect(찾기(결과, '과숙살').hits.map((h) => h.char)).toEqual(['술']);
    expect(찾기(결과, '고신살').basis).toBe('년지');
  });

  it('년지 자신은 고신살이나 과숙살로 걸리지 않는다', () => {
    // 표의 성질이라 제외 로직 없이 성립한다.
    for (const [year, day] of [
      ['갑자', '갑자'],
      ['병인', '병인'],
      ['무오', '무오'],
      ['경신', '경신'],
    ] as const) {
      const 결과 = computeSinsal({ year, month: year, day, hour: year });
      expect(이름들(결과), year).not.toContain('고신살');
      expect(이름들(결과), year).not.toContain('과숙살');
    }
  });
});

describe('주 간지 기준 판정 (docs/07 4장)', () => {
  it('백호대살은 그 기둥의 천간과 지지 양쪽에 붙는다', () => {
    const 팔자: FourPillars = {
      year: '갑진',
      month: '을사',
      day: '병자',
      hour: '기축',
    };
    const 백호 = 찾기(computeSinsal(팔자), '백호대살');

    expect(백호.basis).toBe('주 간지');
    expect(백호.hits).toHaveLength(2);
    expect(백호.hits.map((h) => h.position)).toEqual(['stem', 'branch']);
    expect(백호.hits.map((h) => h.char)).toEqual(['갑', '진']);
    expect(백호.hits.every((h) => h.pillar === 'year')).toBe(true);
  });

  it('일주가 아닌 기둥에서도 잡힌다', () => {
    // 문서 4장이 일주만 보면 월주 백호가 누락된다고 적었다.
    const 월주백호: FourPillars = {
      year: '병자',
      month: '갑진',
      day: '병자',
      hour: '기축',
    };
    expect(찾기(computeSinsal(월주백호), '백호대살').hits[0].pillar).toBe(
      'month',
    );
  });

  it('같은 간지가 두 기둥에 있으면 hits 가 넷이다', () => {
    const 팔자: FourPillars = {
      year: '갑진',
      month: '갑진',
      day: '병자',
      hour: '기축',
    };
    expect(찾기(computeSinsal(팔자), '백호대살').hits).toHaveLength(4);
  });

  it('임술과 무진은 괴강살이 아니라 백호대살이다', () => {
    for (const pillar of ['임술', '무진'] as const) {
      const 결과 = computeSinsal({
        year: pillar,
        month: '병자',
        day: '병자',
        hour: '병자',
      });
      expect(이름들(결과), pillar).toContain('백호대살');
      expect(이름들(결과), pillar).not.toContain('괴강살');
    }
  });

  it('무술은 괴강살이다', () => {
    const 결과 = computeSinsal({
      year: '무술',
      month: '병자',
      day: '병자',
      hour: '병자',
    });
    const 괴강 = 찾기(결과, '괴강살');

    expect(괴강.category).toBe('중립');
    expect(괴강.hits.map((h) => h.char)).toEqual(['무', '술']);
  });
});

describe('삼합 기준 판정 (docs/07 5장)', () => {
  /** 년지 자, 일지 오. 신자진과 인오술로 그룹이 갈린다. */
  const 그룹둘: FourPillars = {
    year: '갑자',
    month: '정묘',
    day: '병오',
    hour: '기유',
  };

  /** 년지 자, 일지 신. 둘 다 신자진이다. */
  const 그룹하나: FourPillars = {
    year: '갑자',
    month: '정묘',
    day: '갑신',
    hour: '기유',
  };

  it('년지와 일지가 같은 그룹이면 basis 가 년지 하나뿐이다', () => {
    const 삼합 = computeSinsal(그룹하나).filter((s) =>
      s.basis.startsWith('삼합'),
    );

    expect(삼합.length).toBeGreaterThan(0);
    for (const sinsal of 삼합) {
      expect(sinsal.basis, sinsal.name).toBe('삼합(년지)');
    }
  });

  it('그룹이 다르면 두 basis 가 다 나오고 년지가 앞이다', () => {
    const 도화 = computeSinsal(그룹둘).filter((s) => s.name === '도화살');

    expect(도화).toHaveLength(2);
    expect(도화.map((s) => s.basis)).toEqual(['삼합(년지)', '삼합(일지)']);
  });

  it('두 basis 의 hits 가 겹치지 않는다', () => {
    // 각 열이 단사라 다른 그룹이면 같은 지지를 가리키지 않는다.
    const 도화 = computeSinsal(그룹둘).filter((s) => s.name === '도화살');
    const 앞 = 도화[0].hits.map((h) => h.char);
    const 뒤 = 도화[1].hits.map((h) => h.char);

    expect(앞.some((c) => 뒤.includes(c))).toBe(false);
  });

  it('진년생의 화개살이 년지 자신에 붙는다', () => {
    // 화개만 그룹 안의 글자를 가리킨다. 년지를 스캔에서 빼면 사라지는 자리다.
    const 진년: FourPillars = {
      year: '갑진',
      month: '정묘',
      day: '갑진',
      hour: '기유',
    };
    const 화개 = computeSinsal(진년).filter((s) => s.name === '화개살');

    expect(화개).toHaveLength(1);
    expect(화개[0].hits.map((h) => h.pillar)).toContain('year');
    expect(화개[0].hits.map((h) => h.char)).toEqual(['진', '진']);
  });
});

describe('17종 전체 (docs/07 10장)', () => {
  it('computeSinsal 이 17종을 모두 낼 수 있다', () => {
    // 카탈로그의 모든 이름이 어떤 팔자에서든 한 번은 나오는지 본다.
    // 하나라도 안 나오면 그 신살의 판정이 연결되지 않은 것이다.
    const 나온것 = new Set<string>();
    for (const stem of [
      '갑',
      '을',
      '병',
      '정',
      '무',
      '기',
      '경',
      '신',
      '임',
      '계',
    ] as const) {
      for (const branch of [
        '자',
        '축',
        '인',
        '묘',
        '진',
        '사',
        '오',
        '미',
        '신',
        '유',
        '술',
        '해',
      ] as const) {
        const 일주 = `${stem}${branch}` as const;
        for (const year of ['갑진', '무술', '임술', '병인', '경신'] as const) {
          for (const sinsal of computeSinsal({
            year,
            month: 일주,
            day: 일주,
            hour: year,
          })) {
            나온것.add(sinsal.name);
          }
        }
      }
    }

    const 빠진것 = SINSAL_CATALOG.map((m) => m.name).filter(
      (name) => !나온것.has(name),
    );
    expect(빠진것).toEqual([]);
  });

  it('다섯 basis 가 전부 쓰인다', () => {
    const basis = new Set<string>();
    for (const year of ['갑자', '갑진'] as const) {
      for (const day of ['갑진', '병오', '무술'] as const) {
        for (const s of computeSinsal({
          year,
          month: '정묘',
          day,
          hour: '기유',
        })) {
          basis.add(s.basis);
        }
      }
    }
    expect([...basis].sort()).toEqual([
      '년지',
      '삼합(년지)',
      '삼합(일지)',
      '일간',
      '주 간지',
    ]);
  });
});
