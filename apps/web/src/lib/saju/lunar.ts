/**
 * 음력 입력을 양력으로 옮긴다. docs/05 8장.
 *
 * 사주 판정 자체는 절기 기준이므로 음력은 입력 편의 기능일 뿐이다.
 * 여기서 나온 양력 날짜가 시간 보정 파이프라인으로 들어간다.
 *
 * 변환표는 `data/lunar-months.ts` 이고 값은 KASI 에서 받은 그대로다.
 * 자체 음력 산출 알고리즘을 만들지 않는다. 근거는 ADR 0006 과 ADR 0014 10항.
 */

import { type CalendarDateTime, calendarDateFromJdn } from './calendar';
import {
  LUNAR_LAST_DAY,
  LUNAR_LAST_MONTH,
  LUNAR_LAST_YEAR,
  type LunarMonth,
  lunarMonths,
} from './data/lunar-months';
import { sajuYear } from './pillars';
import { type TimeCorrectionOptions, correctBirthTime } from './time';

export interface LunarDate {
  year: number;
  /** 1 부터 12 */
  month: number;
  /** 1 부터 30 */
  day: number;
  /**
   * 윤달이면 참. 같은 달 번호가 평달과 윤달로 두 번 있을 수 있다.
   *
   * 생략할 수 없다. 빠뜨린 것과 평달을 고른 것을 구분할 수 없고,
   * 윤달 출생이 조용히 한 달 앞 평달로 가면 여덟 글자가 통째로 갈린다. docs/05 8장.
   */
  leap: boolean;
}

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

/**
 * 계산되는 첫 순간. 표는 1900년 1월 1일부터 있지만 그 앞 나흘은 1900년 입춘 전이다.
 *
 * 닷샛날은 그날 안에서 갈린다. 입춘이 기록 시계로 02-04 14:18:52 다. docs/05 8.2 와 9.3.
 * 그래서 하한을 "6일부터" 로 적으면 계산되는 반나절이 안내에서 사라진다.
 */
const FIRST_COMPUTABLE = '음력 1900년 1월 5일의 입춘 이후';

/**
 * 계산되는 음력 범위. 표의 범위보다 하한이 나흘 반 좁다.
 *
 * 상한은 표가 끝나는 자리이고 하한은 1900년 입춘이 정한다. docs/05 8.2 와 9.3.
 */
const COMPUTABLE_RANGE =
  `${FIRST_COMPUTABLE}부터 ` +
  `${LUNAR_LAST_YEAR}년 ${LUNAR_LAST_MONTH}월 ${LUNAR_LAST_DAY}일까지만 계산한다.`;

let index: Map<string, LunarMonth> | null = null;

function monthKey(year: number, month: number, leap: boolean): string {
  return `${year}/${month}/${leap}`;
}

function findMonth(
  year: number,
  month: number,
  leap: boolean,
): LunarMonth | undefined {
  if (!index) {
    index = new Map(
      lunarMonths().map((m) => [monthKey(m.year, m.month, m.leap), m]),
    );
  }
  return index.get(monthKey(year, month, leap));
}

/** 그 해에 윤달이 있으면 그 달 번호, 없으면 `null`. */
export function leapMonthOf(year: number): number | null {
  for (let month = 1; month <= 12; month++) {
    if (findMonth(year, month, true)) return month;
  }
  return null;
}

/**
 * 음력 날짜를 양력으로. 표에 없는 날짜는 던진다.
 *
 * 조용히 근사값을 내지 않는다. 안내는 입력한 달력의 표기로 낸다. docs/05 8.2.
 */
export function lunarToSolar(date: LunarDate): SolarDate {
  const { year, month, day, leap } = date;

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`음력 월은 1부터 12 다: ${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    throw new RangeError(`음력 일은 1부터 30 이다: ${day}`);
  }

  const found = findMonth(year, month, leap);

  if (!found) {
    // 윤달을 물었는데 그 해에 없는 경우와 표 밖인 경우를 갈라 안내한다
    if (leap && findMonth(year, month, false)) {
      const actual = leapMonthOf(year);
      throw new RangeError(
        actual === null
          ? `음력 ${year}년에는 윤달이 없다.`
          : `음력 ${year}년의 윤달은 윤${actual}월이다.`,
      );
    }
    throw new RangeError(`지원 범위 밖이다. ${COMPUTABLE_RANGE}`);
  }

  if (day > found.days) {
    throw new RangeError(
      `음력 ${year}년 ${leap ? '윤' : ''}${month}월은 ${found.days}일까지다.`,
    );
  }

  return calendarDateFromJdn(found.startJdn + day - 1);
}

/** 안내에 쓰는 음력 날짜 표기. */
function describe(date: LunarDate): string {
  return `음력 ${date.year}년 ${date.leap ? '윤' : ''}${date.month}월 ${date.day}일`;
}

/**
 * 음력 출생 입력을 계산 가능한 양력 기록 시각으로 옮긴다.
 *
 * 변환만으로는 부족하다. 하한을 막는 것이 표가 아니라 사주 연도 판정이라
 * `lunarToSolar` 는 1900년 입춘 전 닷새를 통과시키고 그 뒤에서 거부가 나온다.
 * 그 거부는 절기와 양력 표기라 음력으로 넣은 사람이 자기 입력과 대조할 수 없다.
 * 여기서 받아 음력 표기로 다시 낸다. docs/05 8.2 와 9.3.
 */
export function lunarBirthToSolar(
  date: LunarDate,
  clock: { hour: number; minute: number },
  options: TimeCorrectionOptions,
): CalendarDateTime {
  const recorded = { ...lunarToSolar(date), ...clock };

  try {
    sajuYear(correctBirthTime(recorded, options).utcMs);
  } catch (error) {
    // 표 안에서 이 경로가 던지는 것은 1900년 입춘 하한 하나뿐이다
    if (error instanceof RangeError) {
      throw new RangeError(
        `${describe(date)}은 1900년 입춘 전이라 사주 연도를 정할 수 없다. ` +
          COMPUTABLE_RANGE,
      );
    }
    throw error;
  }

  return recorded;
}
