import { describe, expect, it } from 'vitest';

import { lunarMonths } from './data/lunar-months';
import { leapMonthOf, lunarBirthToSolar, lunarToSolar } from './lunar';

/** 서울. 하한 경계는 진태양시 보정과 무관하지만 폴백 표기를 부르지 않으려고 넣는다. */
const SEOUL = 126.98;

/** 평달 입력. `leap` 은 생략할 수 없다. */
const plain = (year: number, month: number, day: number) => ({
  year,
  month,
  day,
  leap: false,
});

describe('음력 변환', () => {
  it('표의 첫 달을 옮긴다', () => {
    expect(lunarToSolar(plain(1900, 1, 1))).toEqual({
      year: 1900,
      month: 1,
      day: 31,
    });
  });

  it('같은 날짜가 평달과 윤달로 갈린다', () => {
    // 1993년은 윤3월이 있다. 픽스처 lunar-leap-month 가 뒤의 값에 걸린다
    expect(lunarToSolar(plain(1993, 3, 15))).toEqual({
      year: 1993,
      month: 4,
      day: 6,
    });
    expect(lunarToSolar({ year: 1993, month: 3, day: 15, leap: true })).toEqual(
      {
        year: 1993,
        month: 5,
        day: 6,
      },
    );
  });

  it('윤달이 있는 해와 없는 해를 구분한다', () => {
    expect(leapMonthOf(1993)).toBe(3);
    expect(leapMonthOf(1994)).toBeNull();
  });
});

describe('음력 입력 거부', () => {
  it('달과 일이 범위 밖이면 던진다', () => {
    expect(() => lunarToSolar(plain(1993, 13, 1))).toThrow(RangeError);
    expect(() => lunarToSolar(plain(1993, 0, 1))).toThrow(RangeError);
    expect(() => lunarToSolar(plain(1993, 1, 0))).toThrow(RangeError);
    expect(() => lunarToSolar(plain(1993, 1, 31))).toThrow(RangeError);
  });

  it('29일까지인 달에 30일을 넣으면 던진다', () => {
    // 1993년 윤3월은 29일까지다
    expect(() =>
      lunarToSolar({ year: 1993, month: 3, day: 30, leap: true }),
    ).toThrow(/29일까지다/);
  });

  it('윤달이 없는 해에 윤달을 물으면 그 사실을 알린다', () => {
    expect(() =>
      lunarToSolar({ year: 1994, month: 3, day: 1, leap: true }),
    ).toThrow(/윤달이 없다/);
  });

  it('윤달이 다른 달인 해에는 실제 윤달을 알린다', () => {
    // 1993년의 윤달은 윤3월이다. 윤5월을 물으면 그 값을 안내에 담는다
    expect(() =>
      lunarToSolar({ year: 1993, month: 5, day: 1, leap: true }),
    ).toThrow(/윤3월/);
  });
});

describe('음력 범위 경계', () => {
  // docs/05 8.2. 상한은 변환이 거부하고 하한은 사주 연도 판정이 거부한다

  it('표가 덮는 마지막 날이 통과한다', () => {
    expect(lunarToSolar(plain(2050, 11, 30))).toEqual({
      year: 2051,
      month: 1,
      day: 12,
    });
  });

  it('상한을 넘으면 던진다. 연도만으로는 걸리지 않는 자리다', () => {
    // 음력 2050년 12월은 표에 없다. lunYear <= 2050 만 보는 검사는 여기서 뚫린다
    expect(() => lunarToSolar(plain(2050, 12, 1))).toThrow(/지원 범위 밖/);
  });

  it('하한보다 앞이면 던진다', () => {
    expect(() => lunarToSolar(plain(1899, 12, 1))).toThrow(/지원 범위 밖/);
  });

  it('1900년 입춘 전은 변환을 지나 진입점에서 거부된다', () => {
    // 음력 1900년 1월 4일이 양력 02-03 이고 그 해 입춘은 기록 시계로 02-04 14:18:52 다
    expect(lunarToSolar(plain(1900, 1, 4))).toEqual({
      year: 1900,
      month: 2,
      day: 3,
    });

    expect(() => birth(plain(1900, 1, 4), 12, 0)).toThrow(RangeError);
  });

  it('하한 거부 안내가 음력 표기로 나간다', () => {
    // 이어받는 sajuYear 는 절기와 양력으로 답한다. 음력으로 넣은 사람이 대조할 수 없다
    expect(() => birth(plain(1900, 1, 4), 12, 0)).toThrow(
      /음력 1900년 1월 4일/,
    );
  });

  it('입춘 당일은 그날 안에서 갈린다', () => {
    expect(lunarToSolar(plain(1900, 1, 5))).toEqual({
      year: 1900,
      month: 2,
      day: 4,
    });

    expect(() => birth(plain(1900, 1, 5), 14, 18)).toThrow(RangeError);
    expect(birth(plain(1900, 1, 5), 14, 19)).toEqual({
      year: 1900,
      month: 2,
      day: 4,
      hour: 14,
      minute: 19,
    });
  });

  it('진입점이 거부하는 것은 표 전체에서 1900년 입춘 하한 하나뿐이다', () => {
    // 진입점의 catch 는 모든 RangeError 를 "1900년 입춘 전" 으로 덮는다.
    // 다른 사유가 그 문구로 나가면 틀린 안내가 조용히 나가므로 전제를 값으로 못 박는다.
    //
    // 달마다 초하루와 그믐을 함께 태운다. 초하루만 보면 표의 마지막 날에 30일 못 미쳐,
    // 상한이 양력 2051-01-12 아래로 좁아지는 회귀가 이 단언을 통과한다
    const probes = lunarMonths().flatMap((m) =>
      [1, m.days].map((day) => ({
        date: { year: m.year, month: m.month, day, leap: m.leap },
        label: `${m.year}-${m.month}${m.leap ? '윤' : ''}-${String(day).padStart(2, '0')}`,
      })),
    );

    const rejected = probes
      .filter(({ date }) => {
        try {
          birth(date, 12, 0);
          return false;
        } catch {
          return true;
        }
      })
      .map(({ label }) => label);

    expect(rejected).toEqual(['1900-1-01']);
  });

  it('입춘 다음 날부터는 온전히 계산된다', () => {
    expect(birth(plain(1900, 1, 6), 12, 0)).toEqual({
      year: 1900,
      month: 2,
      day: 5,
      hour: 12,
      minute: 0,
    });
  });
});

/** 음력 출생 입력을 진입점에 통과시킨다. */
function birth(
  date: { year: number; month: number; day: number; leap: boolean },
  hour: number,
  minute: number,
) {
  return lunarBirthToSolar(date, { hour, minute }, { longitude: SEOUL });
}
