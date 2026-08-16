import { calendarDateFromJdn, julianDayNumber } from '@saju/calendar';

import type { ChartInput } from '@saju/chart';

/**
 * 파싱 결과. 실패하면 화면이 그대로 낼 문구를 든다.
 *
 * 예외로 던지지 않는 것은 입력할 때마다 부르는 자리라서다.
 */
export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

type YearMonthDay = { year: number; month: number; day: number };
type HourMinute = { hour: number; minute: number };

/** 구분자를 가리지 않는다. inputmode="numeric" 자판에는 슬래시가 없다 */
const digits = (text: string): string => text.replaceAll(/\D/gu, '');

/**
 * 치는 대로 `1995-01-27` 로 만든다. 숫자만 남기고 여덟 자리에서 끊는다.
 *
 * 뒤에 숫자가 있을 때만 구분자를 넣는다. `1995-` 로 끝나면 지우기가 구분자를
 * 먼저 먹어 한 번 더 눌러야 숫자가 지워진다.
 */
export const maskDate = (text: string): string => {
  const only = digits(text).slice(0, 8);

  return [only.slice(0, 4), only.slice(4, 6), only.slice(6, 8)]
    .filter((part) => part !== '')
    .join('-');
};

/** 치는 대로 `14:39` 로 만든다. 규칙은 maskDate 와 같다 */
export const maskTime = (text: string): string => {
  const only = digits(text).slice(0, 4);

  return [only.slice(0, 2), only.slice(2, 4)]
    .filter((part) => part !== '')
    .join(':');
};

/** 그 양력 날짜가 달력에 있는가. 왕복해서 같은 값이 나오면 있다 */
const existsInSolar = ({ year, month, day }: YearMonthDay): boolean => {
  const back = calendarDateFromJdn(julianDayNumber(year, month, day));

  return back.year === year && back.month === month && back.day === day;
};

/**
 * 생년월일. `1995-01-27` 과 `19950127` 을 같게 읽는다.
 *
 * 지원 범위(1900~2100, 음력 상한, 1900년 입춘)는 보지 않는다.
 * 엔진이 `RangeError` 로 던지고 그 문구가 음력이면 음력 표기로 나온다(docs/05 12.4).
 * 여기서 다시 판정하면 두 벌이 되고 엔진이 범위를 넓혀도 폼이 계속 막는다.
 */
export const parseDate = (
  text: string,
  calendar: ChartInput['calendar'],
): Parsed<YearMonthDay> => {
  const only = digits(text);
  if (only.length !== 8) {
    return {
      ok: false,
      message: '생년월일을 1995-01-27 처럼 여덟 자리로 적어주세요.',
    };
  }

  const value = {
    year: Number(only.slice(0, 4)),
    month: Number(only.slice(4, 6)),
    day: Number(only.slice(6, 8)),
  };

  // 음력은 여기서 판정하지 않는다. 월과 일의 범위도, 그 달이 큰달인지도
  // lunar.ts 가 표를 보고 던진다. 양력 잣대를 대면 멀쩡한 음력 날짜가 막힌다.
  if (calendar === 'lunar') return { ok: true, value };

  return existsInSolar(value)
    ? { ok: true, value }
    : { ok: false, message: '올바르지 않은 날짜입니다. 다시 확인해 주세요.' };
};

/** 태어난 시각. `14:39` 와 `1439` 를 같게 읽는다 */
export const parseTime = (text: string): Parsed<HourMinute> => {
  const only = digits(text);
  if (only.length !== 4) {
    return {
      ok: false,
      message: '태어난 시각을 14:39 처럼 네 자리로 적어주세요.',
    };
  }

  const value = {
    hour: Number(only.slice(0, 2)),
    minute: Number(only.slice(2, 4)),
  };

  return value.hour > 23 || value.minute > 59
    ? {
        ok: false,
        message: '0시부터 23시까지로 적어주세요.',
      }
    : { ok: true, value };
};
