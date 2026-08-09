import { describe, expect, it } from 'vitest';

import {
  BRANCH_ELEMENT,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  STEM_ELEMENT,
  type Element,
} from './index';
import {
  BRANCH_HIDDEN_STEMS,
  ELEMENT_CONTROLS,
  ELEMENT_GENERATES,
  hiddenElements,
  tenGodGroup,
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
