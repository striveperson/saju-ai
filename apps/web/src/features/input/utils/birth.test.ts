import { describe, expect, it } from 'vitest';

import { parseDate, parseTime } from './birth';

describe('parseDate', () => {
  it('목업 표기를 읽는다', () => {
    expect(parseDate('1995/01/27', 'solar')).toEqual({
      ok: true,
      value: { year: 1995, month: 1, day: 27 },
    });
  });

  it('숫자만 쳐도 읽는다', () => {
    // 입력칸이 inputmode="numeric" 이라 모바일 자판에 구분자가 없다.
    for (const 입력 of ['19950127', '1995-01-27', '1995. 01. 27.']) {
      expect(parseDate(입력, 'solar')).toEqual({
        ok: true,
        value: { year: 1995, month: 1, day: 27 },
      });
    }
  });

  it('여덟 자리가 아니면 거절한다', () => {
    for (const 입력 of ['', '1995', '1995/1/27', '199501277']) {
      expect(parseDate(입력, 'solar').ok).toBe(false);
    }
  });

  it('양력에서 없는 날짜를 거절한다', () => {
    // calendar.ts 는 순수 정수 산술이라 2월 30일을 던지지 않고 3월 2일로 굴린다.
    // 엔진이 안 보는 자리라 폼이 막는다.
    for (const 입력 of ['19950230', '19950431', '19951301', '19950100']) {
      expect(parseDate(입력, 'solar').ok).toBe(false);
    }
  });

  it('양력 윤년 2월 29일은 받는다', () => {
    expect(parseDate('20000229', 'solar').ok).toBe(true);
    expect(parseDate('19000229', 'solar').ok).toBe(false); // 1900 은 윤년이 아니다
  });

  it('음력은 형식만 보고 넘긴다', () => {
    // 월과 일의 범위도, 그 달이 큰달인지도 lunar.ts 가 표를 보고 던진다.
    // 여기서 한 번 더 판정하면 두 벌이 되고 양력 잣대에 멀쩡한 음력 날짜가 막힌다.
    expect(parseDate('19950230', 'lunar').ok).toBe(true);
    expect(parseDate('19951301', 'lunar').ok).toBe(true);
    // 여덟 자리인지만 본다
    expect(parseDate('1995/13', 'lunar').ok).toBe(false);
  });

  it('지원 범위는 보지 않는다', () => {
    // 1900~2100 과 1900년 입춘 이전은 엔진이 던진다. 여기서 두 벌로 만들지 않는다.
    expect(parseDate('18990101', 'solar').ok).toBe(true);
  });
});

describe('parseTime', () => {
  it('목업 표기를 읽는다', () => {
    expect(parseTime('14:39')).toEqual({
      ok: true,
      value: { hour: 14, minute: 39 },
    });
  });

  it('숫자만 쳐도 읽는다', () => {
    expect(parseTime('1439')).toEqual({
      ok: true,
      value: { hour: 14, minute: 39 },
    });
  });

  it('자정을 받는다', () => {
    expect(parseTime('0000')).toEqual({
      ok: true,
      value: { hour: 0, minute: 0 },
    });
  });

  it('네 자리가 아니면 거절한다', () => {
    for (const 입력 of ['', '14', '143', '14395']) {
      expect(parseTime(입력).ok).toBe(false);
    }
  });

  it('범위 밖 시각을 거절한다', () => {
    // CalendarDateTime 이 hour 0..23, minute 0..59 인데 엔진이 검사하지 않는다.
    for (const 입력 of ['2400', '2500', '1260']) {
      expect(parseTime(입력).ok).toBe(false);
    }
  });
});
