import { describe, expect, it } from 'vitest';

import {
  BRANCH_ELEMENT,
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  STEM_ELEMENT,
  STEM_POLARITY,
} from './index';

describe('60갑자 기본 테이블', () => {
  it('천간은 10개, 지지는 12개다', () => {
    expect(HEAVENLY_STEMS).toHaveLength(10);
    expect(EARTHLY_BRANCHES).toHaveLength(12);
  });

  it('모든 천간과 지지에 오행이 매핑되어 있다', () => {
    for (const stem of HEAVENLY_STEMS) {
      expect(STEM_ELEMENT[stem]).toBeDefined();
      expect(STEM_POLARITY[stem]).toBeDefined();
    }
    for (const branch of EARTHLY_BRANCHES) {
      expect(BRANCH_ELEMENT[branch]).toBeDefined();
    }
  });

  it('천간 음양은 홀수 번째가 양이다', () => {
    HEAVENLY_STEMS.forEach((stem, i) => {
      expect(STEM_POLARITY[stem]).toBe(i % 2 === 0 ? '양' : '음');
    });
  });

  it('진술축미는 토다', () => {
    for (const branch of ['진', '술', '축', '미'] as const) {
      expect(BRANCH_ELEMENT[branch]).toBe('토');
    }
  });
});
