import { describe, expect, it } from 'vitest';

import {
  JDN_UNIX_EPOCH,
  calendarDateFromJdn,
  julianDayNumber,
  utcMsFromWall,
  wallFromUtcMs,
} from './calendar';
import type { CalendarDateTime } from './calendar';

const FIRST_JDN = julianDayNumber(1900, 1, 1);
const LAST_JDN = julianDayNumber(2100, 12, 31);

describe('율리우스 적일 역변환', () => {
  it('지원 구간 전체에서 왕복한다', () => {
    // 1900-01-01 부터 2100-12-31 까지 73,414일을 하나씩 본다.
    const broken: string[] = [];

    for (let jdn = FIRST_JDN; jdn <= LAST_JDN; jdn++) {
      const { year, month, day } = calendarDateFromJdn(jdn);
      if (julianDayNumber(year, month, day) !== jdn) {
        broken.push(`${jdn} -> ${year}-${month}-${day}`);
      }
    }

    expect(broken.slice(0, 5)).toEqual([]);
  });

  it('그레고리력 윤년 규칙을 지킨다', () => {
    // 1900년은 100으로 나뉘고 400으로 나뉘지 않아 평년이다. 2000년은 윤년이다.
    expect(calendarDateFromJdn(julianDayNumber(1900, 2, 28) + 1)).toEqual({
      year: 1900,
      month: 3,
      day: 1,
    });
    expect(calendarDateFromJdn(julianDayNumber(2000, 2, 28) + 1)).toEqual({
      year: 2000,
      month: 2,
      day: 29,
    });
  });
});

describe('Unix 시각 기준점', () => {
  it('1970-01-01 의 적일이다', () => {
    expect(julianDayNumber(1970, 1, 1)).toBe(JDN_UNIX_EPOCH);
  });

  it('KASI 가 준 적일과 밀리초가 맞물린다', () => {
    // 2000-01-01 의 적일 2451545 는 pillars.test.ts 가 KASI solJd 로 검증한 값이다.
    const utcMs = utcMsFromWall(
      { year: 2000, month: 1, day: 1, hour: 0, minute: 0 },
      0,
    );
    expect(utcMs / 86_400_000).toBe(2451545 - JDN_UNIX_EPOCH);
  });
});

describe('벽시계와 물리적 시각', () => {
  const seoul: CalendarDateTime = {
    year: 1995,
    month: 1,
    day: 27,
    hour: 14,
    minute: 39,
  };

  it('UTC+9 벽시계를 물리적 시각으로 옮긴다', () => {
    expect(utcMsFromWall(seoul, 32_400)).toBe(
      utcMsFromWall({ ...seoul, hour: 5 }, 0),
    );
  });

  it('오프셋을 그대로 돌려주면 왕복한다', () => {
    for (const offset of [0, 30_472, 30_600, 32_400, 34_200, 36_000]) {
      expect(wallFromUtcMs(utcMsFromWall(seoul, offset), offset)).toEqual(
        seoul,
      );
    }
  });

  it('1970년 이전에서도 왕복한다', () => {
    // 음수 밀리초에서 내림 방향이 어긋나면 여기서 하루가 밀린다.
    const early: CalendarDateTime = {
      year: 1905,
      month: 3,
      day: 4,
      hour: 0,
      minute: 5,
    };
    expect(wallFromUtcMs(utcMsFromWall(early, 30_472), 30_472)).toEqual(early);
  });

  it('초를 버리고 분까지만 남긴다', () => {
    // 1908년 이전 표준시가 52초를 달고 있어 벽시계로 옮길 때 반드시 걸린다.
    const at = utcMsFromWall(
      { year: 1905, month: 3, day: 4, hour: 12, minute: 0 },
      0,
    );
    expect(wallFromUtcMs(at + 59_999, 0)).toEqual({
      year: 1905,
      month: 3,
      day: 4,
      hour: 12,
      minute: 0,
    });
    expect(wallFromUtcMs(at + 60_000, 0)).toEqual({
      year: 1905,
      month: 3,
      day: 4,
      hour: 12,
      minute: 1,
    });
  });

  it('자정을 넘으면 날짜가 따라 넘어간다', () => {
    const at = utcMsFromWall(
      { year: 1961, month: 8, day: 9, hour: 23, minute: 59 },
      30_600,
    );
    expect(wallFromUtcMs(at + 60_000, 30_600)).toEqual({
      year: 1961,
      month: 8,
      day: 10,
      hour: 0,
      minute: 0,
    });
  });
});
