import type { Element } from '@saju';

/**
 * 오행별 셀 클래스. 목업 result-screen.html 의 `--el-*` 을 Tailwind 토큰으로 옮긴 것이다.
 *
 * 클래스 이름을 실행 시점에 조립하지 않는다. `bg-${element}` 로 쓰면 Tailwind 가
 * 빌드 때 스캔하지 못해 CSS 를 만들지 않는다. 색이 빠진 채로 렌더되고 오류는 나지 않는다.
 * 온전한 문자열을 오행마다 적어 둔다.
 *
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
