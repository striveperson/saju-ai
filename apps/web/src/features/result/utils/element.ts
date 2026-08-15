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

/** 천간 음양의 화면 표기. docs/05 1장이 천간에만 음양을 정의한다. */
export const POLARITY_SIGN = {
  양: '+',
  음: '-',
} as const;
