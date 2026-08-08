/**
 * 간지 기둥 계산.
 *
 * 규칙의 단일 진실 공급원은 docs/05-saju-domain-rules.md 다.
 * 일주는 4장, 야자시 정책은 6장이다.
 *
 * 이 모듈은 보정이 끝난 시각을 인자로 받는다.
 * 표준시 이력 정규화, 서머타임 해제, 진태양시 보정은 docs/05 7장의 파이프라인이 담당하며
 * 아직 구현하지 않았다. 여기서 그 순서를 추측해 넣지 않는다.
 */

import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './index';
import type { Pillar } from './index';

/** 보정이 끝난 벽시계 시각. 어느 시간대의 값인지는 호출부가 정한다. */
export interface CalendarDateTime {
  year: number;
  /** 1 부터 12 */
  month: number;
  /** 1 부터 31 */
  day: number;
  /** 0 부터 23 */
  hour: number;
  /** 0 부터 59 */
  minute: number;
}

/**
 * 야자시 정책. docs/05 6장.
 *
 * `nextDay` 는 정자시설이다. 23시부터 다음날로 보아 일주가 다음날 간지가 된다.
 * `sameDay` 는 야자시설이다. 자정까지 당일 일주를 유지하고 시주만 자시로 잡는다.
 *
 * 유파가 갈리는 지점이라 기본값을 이 모듈이 정하지 않는다. 호출부가 넘긴다.
 */
export type ZiPolicy = 'sameDay' | 'nextDay';

/** 자시가 시작하는 시각. */
const ZI_START_HOUR = 23;

/**
 * 일주 앵커. 율리우스 적일에 이 값을 더해 60으로 나눈 나머지가 60갑자 인덱스다.
 *
 * 근거 없이 박지 않는다는 규칙(docs/05 4장)에 따라 `verified: true` 케이스 넷으로 확정했다.
 * fixtures/cases.ts 의 앵커 셋과 기준 케이스이며 전부 KASI 음양력 API 의 일진 대조를 거쳤다.
 * pillars.test.ts 가 그 케이스들로 이 값을 다시 검증한다.
 */
const DAY_PILLAR_ANCHOR = 49;

/**
 * 그레고리력 날짜의 율리우스 적일.
 *
 * Fliegel 과 Van Flandern 의 정수 연산식이다. Date 를 쓰지 않으므로
 * 실행 환경 타임존과 무관하게 같은 값이 나온다.
 */
export function julianDayNumber(
  year: number,
  month: number,
  day: number,
): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** 60갑자 인덱스를 간지로 바꾼다. 갑자가 0 이고 계해가 59 다. */
export function pillarFromIndex(index: number): Pillar {
  const i = ((index % 60) + 60) % 60;
  return `${HEAVENLY_STEMS[i % 10]}${EARTHLY_BRANCHES[i % 12]}`;
}

/** 간지의 60갑자 인덱스. 실재하지 않는 조합이면 -1 이다. */
export function indexFromPillar(pillar: Pillar): number {
  const stem = (HEAVENLY_STEMS as readonly string[]).indexOf(pillar[0]);
  const branch = (EARTHLY_BRANCHES as readonly string[]).indexOf(pillar[1]);
  if (stem === -1 || branch === -1) return -1;

  // 천간은 10, 지지는 12 주기라 60 안에서 짝이 하나뿐이다.
  for (let n = 0; n < 60; n++) {
    if (n % 10 === stem && n % 12 === branch) return n;
  }
  return -1;
}

/**
 * 일주가 귀속되는 날짜의 율리우스 적일.
 *
 * 정자시설에서 23시 이후 출생은 다음날로 넘어간다. docs/05 6장.
 */
export function dayPillarJdn(at: CalendarDateTime, ziPolicy: ZiPolicy): number {
  const jdn = julianDayNumber(at.year, at.month, at.day);
  return ziPolicy === 'nextDay' && at.hour >= ZI_START_HOUR ? jdn + 1 : jdn;
}

/**
 * 일주.
 *
 * 보정이 끝난 시각을 받는다. 절기와 무관하므로 절기 데이터를 쓰지 않는다.
 */
export function dayPillar(at: CalendarDateTime, ziPolicy: ZiPolicy): Pillar {
  return pillarFromIndex(dayPillarJdn(at, ziPolicy) + DAY_PILLAR_ANCHOR);
}
