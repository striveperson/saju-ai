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
  BRANCH_HIDDEN_STEMS,
  CHEONEUL_GWIIN,
  ELEMENT_CONTROLS,
  ELEMENT_GENERATES,
  GEUMYEO_SEONG,
  GWANGWI_HAKGWAN,
  HAKDANG_GWIIN,
  hiddenElements,
  JEONGNOK,
  MUNCHANG_GWIIN,
  TAEGEUK_GWIIN,
  tenGodGroup,
  YANGIN,
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
