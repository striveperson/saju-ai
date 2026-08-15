import { describe, expect, it } from 'vitest';

import { ELEMENTS } from '@saju/tables';
import { ELEMENT_CONTROLS, ELEMENT_GENERATES } from '@saju/tables';

import { shengRing } from './element';

describe('shengRing', () => {
  it('어느 오행에서 시작해도 다섯을 한 번씩 돈다', () => {
    for (const start of ELEMENTS) {
      const ring = shengRing(start);
      expect(ring[0]).toBe(start);
      expect(new Set(ring).size).toBe(5);
    }
  });

  it('이웃한 둘이 엔진의 상생 관계다', () => {
    // 화면이 순서 배열을 따로 들지 않는다는 것을 여기서 못 박는다.
    for (const start of ELEMENTS) {
      const ring = shengRing(start);
      for (const [i, element] of ring.entries()) {
        expect(ELEMENT_GENERATES[element]).toBe(ring[(i + 1) % 5]);
      }
    }
  });

  it('건너뛴 둘이 엔진의 상극 관계다', () => {
    // 관계도가 이 성질에 기대어 좌표를 잡는다. 깨지면 화살표가 엉뚱한 곳을 가리킨다.
    for (const start of ELEMENTS) {
      const ring = shengRing(start);
      for (const [i, element] of ring.entries()) {
        expect(ELEMENT_CONTROLS[element]).toBe(ring[(i + 2) % 5]);
      }
    }
  });
});
