import { describe, expect, it } from 'vitest';

import {
  BRANCH_ELEMENT,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  STEM_ELEMENT,
  STEM_POLARITY,
  type Element,
} from './index';
import {
  BAEKHO_DAESAL,
  BRANCH_HIDDEN_STEMS,
  CHEONEUL_GWIIN,
  DIRECTION_OF_BRANCH,
  DOHWA,
  ELEMENT_CONTROLS,
  ELEMENT_GENERATES,
  GEOPSAL,
  GEUMYEO_SEONG,
  GOEGANG_SAL,
  GOSIN,
  GWANGWI_HAKGWAN,
  GWASUK,
  HAKDANG_GWIIN,
  hiddenElements,
  HWAGAE,
  JEONGNOK,
  MANGSIN,
  MUNCHANG_GWIIN,
  TAEGEUK_GWIIN,
  tenGodGroup,
  TRIAD_OF_BRANCH,
  YANGIN,
  YEOKMA,
  type StemBranchTable,
} from './tables';

const ELEMENTS: readonly Element[] = ['목', '화', '토', '금', '수'];

describe('지장간 (docs/05 1.1)', () => {
  it('12지지가 전부 있고 각각 2개나 3개다', () => {
    for (const branch of EARTHLY_BRANCHES) {
      const hidden = BRANCH_HIDDEN_STEMS[branch];
      expect(hidden.length, branch).toBeGreaterThanOrEqual(2);
      expect(hidden.length, branch).toBeLessThanOrEqual(3);
    }
  });

  it('여기와 본기가 하나씩 있고 중기는 최대 하나다', () => {
    for (const branch of EARTHLY_BRANCHES) {
      const roles = BRANCH_HIDDEN_STEMS[branch].map((hidden) => hidden.role);
      expect(roles.filter((role) => role === '여기').length, branch).toBe(1);
      expect(roles.filter((role) => role === '본기').length, branch).toBe(1);
      expect(
        roles.filter((role) => role === '중기').length,
        branch,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('여기, 중기, 본기 순으로 놓인다', () => {
    for (const branch of EARTHLY_BRANCHES) {
      const roles = BRANCH_HIDDEN_STEMS[branch].map((hidden) => hidden.role);
      const expected = ['여기', '중기', '본기'].filter((role) =>
        roles.includes(role as never),
      );
      expect(roles, branch).toEqual(expected);
    }
  });

  it('지장간 천간이 전부 실재한다', () => {
    for (const branch of EARTHLY_BRANCHES) {
      for (const hidden of BRANCH_HIDDEN_STEMS[branch]) {
        expect(HEAVENLY_STEMS, `${branch} ${hidden.role}`).toContain(
          hidden.stem,
        );
      }
    }
  });

  // 1.1 이 "본기 오행은 지지 오행과 같다" 고 적은 것을 코드에서 다시 확인한다.
  // 어긋나면 표를 옮기다 틀린 것이다.
  it('본기 오행이 지지 오행과 같다', () => {
    for (const branch of EARTHLY_BRANCHES) {
      const primary = BRANCH_HIDDEN_STEMS[branch].find(
        (hidden) => hidden.role === '본기',
      );
      expect(primary, branch).toBeDefined();
      expect(STEM_ELEMENT[primary!.stem], branch).toBe(BRANCH_ELEMENT[branch]);
    }
  });

  it('hiddenElements 가 지장간을 오행으로 편다', () => {
    expect(hiddenElements('해')).toEqual(['토', '목', '수']);
    expect(hiddenElements('자')).toEqual(['수', '수']);
  });

  // 인원용사 계통과 갈리는 유일한 지점이다. 1.1 참고.
  // 자·묘·유·오는 어느 계통이든 오행 집합이 같지만 해는 토가 붙는다.
  it('해의 지장간에 토가 들어간다', () => {
    expect(hiddenElements('해')).toContain('토');
  });
});

describe('오행 상생상극 (docs/05 11.2)', () => {
  it('상생이 오행 다섯을 한 바퀴 도는 순환이다', () => {
    let current: Element = '목';
    const visited: Element[] = [current];
    for (let step = 0; step < 4; step += 1) {
      current = ELEMENT_GENERATES[current];
      visited.push(current);
    }
    expect(visited).toEqual(['목', '화', '토', '금', '수']);
    expect(ELEMENT_GENERATES[current]).toBe('목');
  });

  it('상극이 오행 다섯을 한 바퀴 도는 순환이다', () => {
    let current: Element = '목';
    const visited: Element[] = [current];
    for (let step = 0; step < 4; step += 1) {
      current = ELEMENT_CONTROLS[current];
      visited.push(current);
    }
    expect(visited).toEqual(['목', '토', '수', '화', '금']);
    expect(ELEMENT_CONTROLS[current]).toBe('목');
  });

  it('자기 자신을 생하거나 극하지 않는다', () => {
    for (const element of ELEMENTS) {
      expect(ELEMENT_GENERATES[element], element).not.toBe(element);
      expect(ELEMENT_CONTROLS[element], element).not.toBe(element);
    }
  });
});

describe('십성 5분류 (docs/05 11.2)', () => {
  it('오행 25쌍 전부에 분류가 나온다', () => {
    for (const day of ELEMENTS) {
      for (const target of ELEMENTS) {
        expect(tenGodGroup(day, target), `${day}->${target}`).toBeDefined();
      }
    }
  });

  it('일간 하나에 다섯 분류가 하나씩 배정된다', () => {
    for (const day of ELEMENTS) {
      const groups = ELEMENTS.map((target) => tenGodGroup(day, target));
      expect([...groups].sort(), day).toEqual([
        '관성',
        '비겁',
        '식상',
        '인성',
        '재성',
      ]);
    }
  });

  it('무토 기준 분류가 11.2 표와 맞는다', () => {
    expect(tenGodGroup('토', '토')).toBe('비겁');
    expect(tenGodGroup('토', '화')).toBe('인성');
    expect(tenGodGroup('토', '금')).toBe('식상');
    expect(tenGodGroup('토', '수')).toBe('재성');
    expect(tenGodGroup('토', '목')).toBe('관성');
  });
});

describe('일간 기준 신살 판정표 (docs/07 2장)', () => {
  // 표를 그대로 옮긴다. 문서의 표 한 행이 여기 한 줄에 대응해야 눈으로 대조된다.
  const 전사: readonly [string, StemBranchTable, Record<string, string>][] = [
    [
      '천을귀인',
      CHEONEUL_GWIIN,
      {
        갑: '축미',
        무: '축미',
        경: '축미',
        을: '자신',
        기: '자신',
        병: '해유',
        정: '해유',
        신: '인오',
        임: '묘사',
        계: '묘사',
      },
    ],
    [
      '문창귀인',
      MUNCHANG_GWIIN,
      {
        갑: '사',
        을: '오',
        병: '신',
        정: '유',
        무: '신',
        기: '유',
        경: '해',
        신: '자',
        임: '인',
        계: '묘',
      },
    ],
    [
      '정록',
      JEONGNOK,
      {
        갑: '인',
        을: '묘',
        병: '사',
        정: '오',
        무: '사',
        기: '오',
        경: '신',
        신: '유',
        임: '해',
        계: '자',
      },
    ],
    [
      '학당귀인',
      HAKDANG_GWIIN,
      {
        갑: '해',
        을: '오',
        병: '인',
        정: '유',
        무: '인',
        기: '유',
        경: '사',
        신: '자',
        임: '신',
        계: '묘',
      },
    ],
    [
      '관귀학관',
      GWANGWI_HAKGWAN,
      {
        갑: '사',
        을: '사',
        병: '신',
        정: '신',
        무: '해',
        기: '해',
        경: '인',
        신: '인',
        임: '인',
        계: '인',
      },
    ],
    [
      '태극귀인',
      TAEGEUK_GWIIN,
      {
        갑: '자오',
        을: '자오',
        병: '묘유',
        정: '묘유',
        무: '진술축미',
        기: '진술축미',
        경: '인해',
        신: '인해',
        임: '사신',
        계: '사신',
      },
    ],
    [
      '금여성',
      GEUMYEO_SEONG,
      {
        갑: '진',
        을: '사',
        병: '미',
        정: '신',
        무: '미',
        기: '신',
        경: '술',
        신: '해',
        임: '축',
        계: '인',
      },
    ],
    [
      '양인',
      YANGIN,
      {
        갑: '묘',
        을: '',
        병: '오',
        정: '',
        무: '오',
        기: '',
        경: '유',
        신: '',
        임: '자',
        계: '',
      },
    ],
  ];

  it.each(전사)('%s 이 문서 표와 같다', (_name, table, expected) => {
    for (const stem of HEAVENLY_STEMS) {
      expect(table[stem].join(''), stem).toBe(expected[stem]);
    }
  });

  it('여덟 표가 열 간을 남김없이 덮는다', () => {
    for (const [name, table] of 전사) {
      expect(Object.keys(table).sort(), name).toEqual(
        [...HEAVENLY_STEMS].sort(),
      );
    }
  });

  it('금여성이 정록에서 두 칸 뒤다', () => {
    // docs/07 2장이 두 표가 항상 이 관계를 만족해야 한다고 적었다.
    for (const stem of HEAVENLY_STEMS) {
      const 정록자리 = EARTHLY_BRANCHES.indexOf(JEONGNOK[stem][0]);
      const 기대 = EARTHLY_BRANCHES[(정록자리 + 2) % 12];
      expect(GEUMYEO_SEONG[stem][0], stem).toBe(기대);
    }
  });

  it('양인은 양간 다섯에만 있고 지지가 전부 왕지다', () => {
    const 왕지 = ['자', '묘', '오', '유'];
    for (const stem of HEAVENLY_STEMS) {
      const 양간 = STEM_POLARITY[stem] === '양';
      expect(YANGIN[stem].length, stem).toBe(양간 ? 1 : 0);
      if (양간) expect(왕지, stem).toContain(YANGIN[stem][0]);
    }
  });

  it('태극귀인만 지지가 넷인 일간을 갖는다', () => {
    expect(TAEGEUK_GWIIN.무).toHaveLength(4);
    expect(TAEGEUK_GWIIN.기).toHaveLength(4);
    expect(CHEONEUL_GWIIN.갑).toHaveLength(2);
    expect(MUNCHANG_GWIIN.갑).toHaveLength(1);
  });

  it('관귀학관은 오행이 같은 두 일간이 같은 값이고 천을귀인은 아니다', () => {
    // 표를 잘못 묶으면 이 차이가 사라진다.
    expect(GWANGWI_HAKGWAN.갑).toEqual(GWANGWI_HAKGWAN.을);
    expect(GWANGWI_HAKGWAN.임).toEqual(GWANGWI_HAKGWAN.계);
    expect(CHEONEUL_GWIIN.갑).not.toEqual(CHEONEUL_GWIIN.을);
  });
});

describe('지지 그룹 (docs/07 3장, 5장)', () => {
  it('방위 그룹과 삼합 그룹이 12지지를 셋씩 남김없이 덮는다', () => {
    for (const [name, table] of [
      ['방위', DIRECTION_OF_BRANCH],
      ['삼합', TRIAD_OF_BRANCH],
    ] as const) {
      const 묶음 = new Map<string, string[]>();
      for (const branch of EARTHLY_BRANCHES) {
        const group = table[branch];
        묶음.set(group, [...(묶음.get(group) ?? []), branch]);
      }
      expect([...묶음.keys()], name).toHaveLength(4);
      for (const [group, members] of 묶음) {
        expect(members, `${name} ${group}`).toHaveLength(3);
        expect(group.split('').sort(), `${name} ${group}`).toEqual(
          [...members].sort(),
        );
      }
    }
  });
});

describe('년지 기준 신살 판정표 (docs/07 3장)', () => {
  it('고신살과 과숙살이 문서 표와 같다', () => {
    expect(GOSIN).toEqual({
      해자축: '인',
      인묘진: '사',
      사오미: '신',
      신유술: '해',
    });
    expect(GWASUK).toEqual({
      해자축: '술',
      인묘진: '축',
      사오미: '진',
      신유술: '미',
    });
  });

  it('고신살이 다음 그룹 첫 글자이고 과숙살이 이전 그룹 끝 글자다', () => {
    // docs/07 11장의 방어선이다. 전사만으로는 네 값을 통째로 한 칸씩 돌려도 통과한다.
    // 그래서 관계를 여기서 다시 계산해 대조한다.
    const 순서 = ['해자축', '인묘진', '사오미', '신유술'] as const;

    for (const [i, group] of 순서.entries()) {
      const 다음 = 순서[(i + 1) % 4];
      const 이전 = 순서[(i + 3) % 4];

      expect(GOSIN[group], `${group} 의 다음은 ${다음}`).toBe(다음[0]);
      expect(GWASUK[group], `${group} 의 이전은 ${이전}`).toBe(이전[2]);
    }
  });

  it('고신살은 생지이고 과숙살은 고지다', () => {
    for (const group of Object.keys(GOSIN) as (keyof typeof GOSIN)[]) {
      expect(['인', '사', '신', '해'], group).toContain(GOSIN[group]);
      expect(['진', '술', '축', '미'], group).toContain(GWASUK[group]);
      expect(GOSIN[group]).not.toBe(GWASUK[group]);
    }
  });

  it('판정 지지가 년지 그룹 안에 들어오지 않는다', () => {
    // 그래서 년지 자신은 스캔에 넣어도 걸리지 않는다.
    for (const group of Object.keys(GOSIN) as (keyof typeof GOSIN)[]) {
      expect(group, group).not.toContain(GOSIN[group]);
      expect(group, group).not.toContain(GWASUK[group]);
    }
  });
});

describe('주 간지 기준 신살 판정표 (docs/07 4장)', () => {
  it('백호대살 일곱과 괴강살 넷이 문서 표와 같다', () => {
    expect(BAEKHO_DAESAL).toEqual([
      '갑진',
      '을미',
      '병술',
      '정축',
      '무진',
      '임술',
      '계축',
    ]);
    expect(GOEGANG_SAL).toEqual(['경진', '경술', '임진', '무술']);
  });

  it('괴강살에 임술과 무진이 없다', () => {
    // 문서 4장의 유파 선택이다. 둘 다 백호대살에는 있어 회귀가 나기 쉽다.
    expect(GOEGANG_SAL).not.toContain('임술');
    expect(GOEGANG_SAL).not.toContain('무진');
    expect(BAEKHO_DAESAL).toContain('임술');
    expect(BAEKHO_DAESAL).toContain('무진');
  });

  it('열한 간지가 전부 60갑자에 실재한다', () => {
    for (const pillar of [...BAEKHO_DAESAL, ...GOEGANG_SAL]) {
      const stem = HEAVENLY_STEMS.indexOf(pillar[0] as never);
      const branch = EARTHLY_BRANCHES.indexOf(pillar[1] as never);
      expect(stem, pillar).toBeGreaterThanOrEqual(0);
      expect(branch, pillar).toBeGreaterThanOrEqual(0);
      expect(stem % 2, pillar).toBe(branch % 2);
    }
  });
});

describe('삼합 기준 신살 판정표 (docs/07 5장)', () => {
  const 다섯 = [
    [
      '도화살',
      DOHWA,
      { 신자진: '유', 인오술: '묘', 사유축: '오', 해묘미: '자' },
    ],
    [
      '역마살',
      YEOKMA,
      { 신자진: '인', 인오술: '신', 사유축: '해', 해묘미: '사' },
    ],
    [
      '화개살',
      HWAGAE,
      { 신자진: '진', 인오술: '술', 사유축: '축', 해묘미: '미' },
    ],
    [
      '겁살',
      GEOPSAL,
      { 신자진: '사', 인오술: '해', 사유축: '인', 해묘미: '신' },
    ],
    [
      '망신살',
      MANGSIN,
      { 신자진: '해', 인오술: '사', 사유축: '신', 해묘미: '인' },
    ],
  ] as const;

  it.each(다섯)('%s 이 문서 표와 같다', (_name, table, expected) => {
    expect(table).toEqual(expected);
  });

  it('다섯 열이 각각 단사다', () => {
    for (const [name, table] of 다섯) {
      const values = Object.values(table);
      expect(new Set(values).size, name).toBe(values.length);
    }
  });

  it('화개살이 그룹의 셋째 글자다', () => {
    // docs/07 11장의 방어선이다. 그룹 안에 있는지만 보면 둘째 글자로 적어도 통과한다.
    for (const group of Object.keys(HWAGAE) as (keyof typeof HWAGAE)[]) {
      expect(HWAGAE[group], group).toBe(group[2]);
    }
  });

  it('화개살만 그룹 안의 글자를 가리킨다', () => {
    for (const [name, table] of 다섯) {
      for (const group of Object.keys(table) as (keyof typeof table)[]) {
        const 안에있다 = group.includes(table[group]);
        expect(안에있다, `${name} ${group}`).toBe(name === '화개살');
      }
    }
  });

  it('겁살과 망신살이 서로 교차한다', () => {
    // 신자진 겁살이 사이고 인오술 망신이 사다. 옮겨 적을 때 가장 틀리기 쉽다.
    expect(GEOPSAL.신자진).toBe(MANGSIN.인오술);
    expect(MANGSIN.신자진).toBe(GEOPSAL.인오술);
    expect(GEOPSAL.사유축).toBe(MANGSIN.해묘미);
    expect(MANGSIN.사유축).toBe(GEOPSAL.해묘미);
  });
});
