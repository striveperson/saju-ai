import { ELEMENT_GENERATES } from '@saju/tables';

import type { Element } from '@saju';

/**
 * 오행별 셀 클래스
 * `Record<Element, string>` 이라 오행이 빠지면 타입체크가 잡는다.
 */
export const ELEMENT_CELL: Record<Element, string> = {
  목: 'border-mok/25 bg-mok/10 text-mok',
  화: 'border-hwa/25 bg-hwa/10 text-hwa',
  토: 'border-to/25 bg-to/10 text-to',
  금: 'border-geum/25 bg-geum/10 text-geum',
  수: 'border-su/25 bg-su/10 text-su',
};

/** 오행별 글자색만 */
export const ELEMENT_TEXT: Record<Element, string> = {
  목: 'text-mok',
  화: 'text-hwa',
  토: 'text-to',
  금: 'text-geum',
  수: 'text-su',
};

/** 오행별 채움색만. 막대와 SVG 노드가 쓴다 */
export const ELEMENT_FILL: Record<Element, string> = {
  목: 'bg-mok',
  화: 'bg-hwa',
  토: 'bg-to',
  금: 'bg-geum',
  수: 'bg-su',
};

/** 천간 음양의 화면 표기. docs/05 1장이 천간에만 음양을 정의한다. */
export const POLARITY_SIGN = {
  양: '+',
  음: '-',
} as const;

/**
 * `from` 에서 상생을 따라 다섯을 도는 순서.
 *
 * 순서 배열을 화면이 따로 들지 않는다. 들면 상생 관계가 두 벌이 되고,
 * 나열 순서를 바꾸려고 배열을 재정렬하면 관계도가 조용히 틀린 상생을 주장한다.
 * `tables.ts` 가 "표를 따로 두지 않고 상생상극에서 유도한다" 로 정한 것과 같은 이유다.
 */
export const shengRing = (from: Element): readonly Element[] => {
  const ring: Element[] = [from];
  while (ring.length < 5) {
    ring.push(ELEMENT_GENERATES[ring[ring.length - 1]]);
  }
  return ring;
};

/** 백분율 표기. 목업이 소수 한 자리를 쓴다 */
export const percent = (ratio: number): string =>
  `${(ratio * 100).toFixed(1)}%`;
