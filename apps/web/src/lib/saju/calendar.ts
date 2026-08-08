/**
 * 달력 산술.
 *
 * 기둥 계산과 시간 보정이 함께 쓰는 바닥이다. 도메인 규칙은 여기 없다.
 *
 * `Date` 를 쓰지 않는다. `Date.UTC` 는 벽시계에서 밀리초로 가는 한 방향뿐이고
 * 되돌아오려면 `new Date(ms)` 가 필요한데, 훅의 정규식이 인자 있는 `new Date` 를 통과시켜
 * 막히지 않는 자리가 생긴다. 정수 연산만 쓰면 그 자리가 아예 없다.
 */

/** 벽시계 시각. 어느 시간대의 값인지는 호출부가 정한다. */
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

/** 1970-01-01 의 율리우스 적일. 적일과 Unix 시각을 잇는 유일한 상수다. */
export const JDN_UNIX_EPOCH = 2440588;

const MS_PER_DAY = 86_400_000;
const SECONDS_PER_DAY = 86_400;

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

/** 율리우스 적일에서 그레고리력 날짜로. `julianDayNumber` 의 역함수다. */
export function calendarDateFromJdn(jdn: number): {
  year: number;
  month: number;
  day: number;
} {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

/**
 * 벽시계를 물리적 시각으로. `offsetSeconds` 는 그 벽시계가 UTC 보다 앞선 초다.
 *
 * 어느 오프셋을 넘길지는 표준시 이력을 아는 쪽이 정한다. 여기서 짐작하지 않는다.
 */
export function utcMsFromWall(
  at: CalendarDateTime,
  offsetSeconds: number,
): number {
  const days = julianDayNumber(at.year, at.month, at.day) - JDN_UNIX_EPOCH;

  return (
    days * MS_PER_DAY +
    (at.hour * 60 + at.minute) * 60_000 -
    offsetSeconds * 1000
  );
}

/**
 * 물리적 시각을 벽시계로. `utcMsFromWall` 의 역함수다.
 *
 * 초 미만과 초는 버린다. 1908년 이전 표준시의 52초와 진태양시의 소수 분이 여기서 정리된다.
 * 시지 구간이 반열린 구간이라 내림이 구간 판정과 일관된다.
 */
export function wallFromUtcMs(
  utcMs: number,
  offsetSeconds: number,
): CalendarDateTime {
  const seconds = Math.floor(utcMs / 1000) + offsetSeconds;
  const days = Math.floor(seconds / SECONDS_PER_DAY);
  const rest = seconds - days * SECONDS_PER_DAY;

  return {
    ...calendarDateFromJdn(JDN_UNIX_EPOCH + days),
    hour: Math.floor(rest / 3600),
    minute: Math.floor((rest % 3600) / 60),
  };
}
