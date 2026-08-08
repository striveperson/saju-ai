/**
 * 한국 표준시 전환 이력. tz database `Asia/Seoul` 을 손으로 옮긴 표다.
 *
 * 자동 생성이 아니다. 30행뿐이라 사람이 읽는 편이 낫고, 각 행에 그 전환이 무엇인지 적는다.
 * 정답지는 `fixtures/tzdb-asia-seoul.json` 이고 `korea-time.test.ts` 가 전 구간을 대조한다.
 * 근거는 docs/adr/0015-korea-time-history-bundled.md, 규칙은 docs/05 7장이다.
 *
 * 이 표를 고쳤으면 `node apps/web/scripts/dump-tzdb-seoul.mjs --check` 로 정답지를 먼저 확인한다.
 */

import { utcMsFromWall } from '../calendar';

/** 전환 순간을 UTC 벽시계로 적는다. 1908년 전환에만 초가 붙는다. */
const at = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): number =>
  utcMsFromWall({ year, month, day, hour, minute }, 0) + second * 1000;

/** tz database 의 약칭. 화면과 로그에 쓴다. */
export type OffsetAbbreviation = 'LMT' | 'KST' | 'JST' | 'KDT';

export interface OffsetPeriod {
  /** 이 오프셋이 시작하는 물리적 시각. 첫 항목만 `Number.NEGATIVE_INFINITY` 다 */
  fromUtcMs: number;
  /** 실제 UTC 오프셋(초). 서머타임을 포함한 값이다 */
  offsetSeconds: number;
  /** 서머타임을 뺀 기준 오프셋(초) */
  baseOffsetSeconds: number;
  daylight: boolean;
  abbreviation: OffsetAbbreviation;
}

/** 정답지로 검증한 구간. 밖의 입력은 계산하지 않고 거부한다. */
export const KOREA_TIME_FIRST_YEAR = 1900;
export const KOREA_TIME_LAST_YEAR = 2100;

const KST_830 = 30_600;
const KST_900 = 32_400;
const KDT_930 = 34_200;
const KDT_1000 = 36_000;

/**
 * 물리적 시각 오름차순. 1900~2100 구간의 전환 29건과 그 이전 구간 하나다.
 *
 * 오프셋이 바뀌는 전환은 다섯이고 나머지 24건은 서머타임 시작과 종료다.
 * 1945-09-07 은 약칭만 JST 에서 KST 로 바뀌고 오프셋이 같다.
 */
export const KOREA_OFFSET_PERIODS: readonly OffsetPeriod[] = [
  // 표준시 이전. 서울의 지방평균태양시다. tz database 가 126.9783도로 잡았다.
  {
    fromUtcMs: Number.NEGATIVE_INFINITY,
    offsetSeconds: 30_472,
    baseOffsetSeconds: 30_472,
    daylight: false,
    abbreviation: 'LMT',
  },
  // 표준시 도입. 03-31 24:00 다음이 04-01 00:02:08 이라 128초가 사라진다.
  {
    fromUtcMs: at(1908, 3, 31, 15, 32, 8),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },
  // 일본 표준시로 통합. 12-31 24:00 다음이 01-01 00:30 이라 30분이 사라진다.
  {
    fromUtcMs: at(1911, 12, 31, 15, 30),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'JST',
  },
  // 약칭만 바뀐다. 오프셋이 같아 판정에 영향이 없다.
  {
    fromUtcMs: at(1945, 9, 7, 15, 0),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },

  // 1948~1951 서머타임. 기준이 UTC+9 라 시행 중에는 UTC+10 이다.
  // 시작일은 벽시계 00:00~01:00 이 사라지고, 종료일은 23:00~24:00 이 두 번 온다.
  {
    fromUtcMs: at(1948, 5, 31, 15, 0),
    offsetSeconds: KDT_1000,
    baseOffsetSeconds: KST_900,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1948, 9, 12, 14, 0),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1949, 4, 2, 15, 0),
    offsetSeconds: KDT_1000,
    baseOffsetSeconds: KST_900,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1949, 9, 10, 14, 0),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1950, 3, 31, 15, 0),
    offsetSeconds: KDT_1000,
    baseOffsetSeconds: KST_900,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1950, 9, 9, 14, 0),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1951, 5, 5, 15, 0),
    offsetSeconds: KDT_1000,
    baseOffsetSeconds: KST_900,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1951, 9, 8, 14, 0),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },

  // UTC+8:30 으로 복귀. 시계를 30분 되돌려 03-20 23:30~24:00 이 두 번 온다.
  {
    fromUtcMs: at(1954, 3, 20, 15, 0),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },

  // 1955~1960 서머타임. 기준이 UTC+8:30 이라 시행 중에는 UTC+9:30 이다.
  // 다른 해와 오프셋이 달라 한 시간을 일괄로 빼면 틀린다.
  {
    fromUtcMs: at(1955, 5, 4, 15, 30),
    offsetSeconds: KDT_930,
    baseOffsetSeconds: KST_830,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1955, 9, 8, 14, 30),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1956, 5, 19, 15, 30),
    offsetSeconds: KDT_930,
    baseOffsetSeconds: KST_830,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1956, 9, 29, 14, 30),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1957, 5, 4, 15, 30),
    offsetSeconds: KDT_930,
    baseOffsetSeconds: KST_830,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1957, 9, 21, 14, 30),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1958, 5, 3, 15, 30),
    offsetSeconds: KDT_930,
    baseOffsetSeconds: KST_830,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1958, 9, 20, 14, 30),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1959, 5, 2, 15, 30),
    offsetSeconds: KDT_930,
    baseOffsetSeconds: KST_830,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1959, 9, 19, 14, 30),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1960, 4, 30, 15, 30),
    offsetSeconds: KDT_930,
    baseOffsetSeconds: KST_830,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1960, 9, 17, 14, 30),
    offsetSeconds: KST_830,
    baseOffsetSeconds: KST_830,
    daylight: false,
    abbreviation: 'KST',
  },

  // UTC+9 로 복귀. 시계를 30분 당겨 08-10 00:00~00:30 이 사라진다.
  {
    fromUtcMs: at(1961, 8, 9, 15, 30),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },

  // 1987~1988 서머타임. 앞선 해들과 달리 자정이 아니라 새벽 2시에 전환한다.
  {
    fromUtcMs: at(1987, 5, 9, 17, 0),
    offsetSeconds: KDT_1000,
    baseOffsetSeconds: KST_900,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1987, 10, 10, 17, 0),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },
  {
    fromUtcMs: at(1988, 5, 7, 17, 0),
    offsetSeconds: KDT_1000,
    baseOffsetSeconds: KST_900,
    daylight: true,
    abbreviation: 'KDT',
  },
  {
    fromUtcMs: at(1988, 10, 8, 17, 0),
    offsetSeconds: KST_900,
    baseOffsetSeconds: KST_900,
    daylight: false,
    abbreviation: 'KST',
  },
];
