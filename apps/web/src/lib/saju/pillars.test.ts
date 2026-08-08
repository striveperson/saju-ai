import { describe, expect, it } from 'vitest';

import { VERIFIED_CASES } from './fixtures/cases';
import type { ZiPolicy as FixtureZiPolicy } from './fixtures/cases';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './index';
import type { CalendarDateTime, ZiPolicy } from './pillars';
import {
  dayPillar,
  indexFromPillar,
  julianDayNumber,
  pillarFromIndex,
} from './pillars';

/** 픽스처의 birth 문자열을 파싱한다. Date 는 문자열 해석이 실행 환경에 묶여 쓰지 않는다. */
function parseBirth(birth: string): CalendarDateTime {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(birth);
  if (!m) throw new Error(`birth 형식이 아니다: ${birth}`);

  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
}

/** 픽스처는 원본 JSON 의 어휘를 쓴다. 대응은 docs/05 6장에 있다. */
function toEnginePolicy(policy: FixtureZiPolicy): ZiPolicy {
  return policy === 'zheng' ? 'nextDay' : 'sameDay';
}

describe('율리우스 적일', () => {
  // KASI 음양력 API 가 solJd 로 함께 준 값이다. 앵커 케이스의 근거와 같은 출처다.
  const KNOWN: [number, number, number, number][] = [
    [1935, 6, 20, 2427974],
    [1984, 2, 17, 2445748],
    [1995, 1, 27, 2449745],
    [2000, 1, 1, 2451545],
  ];

  it('KASI 가 준 적일과 일치한다', () => {
    for (const [y, m, d, jdn] of KNOWN) {
      expect(julianDayNumber(y, m, d), `${y}-${m}-${d}`).toBe(jdn);
    }
  });

  it('하루 뒤는 적일이 정확히 1 늘어난다', () => {
    // 월말과 연말, 윤일 앞뒤를 지난다.
    const pairs: [CalendarDateTime, CalendarDateTime][] = [
      [
        { year: 2024, month: 2, day: 28, hour: 0, minute: 0 },
        { year: 2024, month: 2, day: 29, hour: 0, minute: 0 },
      ],
      [
        { year: 2024, month: 2, day: 29, hour: 0, minute: 0 },
        { year: 2024, month: 3, day: 1, hour: 0, minute: 0 },
      ],
      [
        { year: 1900, month: 2, day: 28, hour: 0, minute: 0 },
        { year: 1900, month: 3, day: 1, hour: 0, minute: 0 },
      ],
      [
        { year: 1999, month: 12, day: 31, hour: 0, minute: 0 },
        { year: 2000, month: 1, day: 1, hour: 0, minute: 0 },
      ],
    ];

    for (const [a, b] of pairs) {
      const diff =
        julianDayNumber(b.year, b.month, b.day) -
        julianDayNumber(a.year, a.month, a.day);
      expect(diff, `${a.year}-${a.month}-${a.day} 다음날`).toBe(1);
    }
  });

  it('1900년은 윤년이 아니다', () => {
    // 400 으로 나뉘지 않는 100 배수라 2월이 28일이다. 이걸 틀리면 그 이후 일주가 통째로 밀린다.
    const feb28 = julianDayNumber(1900, 2, 28);
    expect(julianDayNumber(1900, 3, 1) - feb28).toBe(1);
    expect(julianDayNumber(2000, 3, 1) - julianDayNumber(2000, 2, 28)).toBe(2);
  });
});

describe('60갑자 인덱스', () => {
  it('인덱스와 간지가 왕복한다', () => {
    for (let i = 0; i < 60; i++) {
      expect(indexFromPillar(pillarFromIndex(i)), `${i}`).toBe(i);
    }
  });

  it('갑자가 0 이고 계해가 59 다', () => {
    expect(pillarFromIndex(0)).toBe('갑자');
    expect(pillarFromIndex(59)).toBe('계해');
  });

  it('60 주기로 돌아온다', () => {
    expect(pillarFromIndex(60)).toBe('갑자');
    expect(pillarFromIndex(-1)).toBe('계해');
  });

  it('천간과 지지의 홀짝이 항상 같다', () => {
    // 갑축 같은 조합은 60갑자에 없다. 인덱스에서 만들면 이 성질이 깨지지 않아야 한다.
    for (let i = 0; i < 60; i++) {
      const p = pillarFromIndex(i);
      const stem = (HEAVENLY_STEMS as readonly string[]).indexOf(p[0]);
      const branch = (EARTHLY_BRANCHES as readonly string[]).indexOf(p[1]);
      expect(stem % 2, p).toBe(branch % 2);
    }
  });
});

describe('일주', () => {
  const withDay = VERIFIED_CASES.filter((c) => c.expected.day);

  it('검증 케이스가 넷 이상 있다', () => {
    // docs/05 4장이 앵커 확정에 요구하는 최소 조건이다.
    expect(withDay.length).toBeGreaterThanOrEqual(3);
  });

  it('모든 verified 케이스의 일주를 재현한다', () => {
    for (const c of withDay) {
      const at = parseBirth(c.input.birth);
      const policy = toEnginePolicy(c.input.options.ziPolicy);
      expect(dayPillar(at, policy), `${c.id} (${c.input.birth})`).toBe(
        c.expected.day,
      );
    }
  });

  it('하루가 지나면 간지가 하나 나아간다', () => {
    const a: CalendarDateTime = {
      year: 1995,
      month: 1,
      day: 27,
      hour: 12,
      minute: 0,
    };
    const b: CalendarDateTime = {
      year: 1995,
      month: 1,
      day: 28,
      hour: 12,
      minute: 0,
    };
    const diff =
      indexFromPillar(dayPillar(b, 'sameDay')) -
      indexFromPillar(dayPillar(a, 'sameDay'));
    expect(((diff % 60) + 60) % 60).toBe(1);
  });

  it('60일 뒤에 같은 간지로 돌아온다', () => {
    const base: CalendarDateTime = {
      year: 1995,
      month: 1,
      day: 27,
      hour: 12,
      minute: 0,
    };
    const after: CalendarDateTime = {
      year: 1995,
      month: 3,
      day: 28,
      hour: 12,
      minute: 0,
    };
    expect(julianDayNumber(after.year, after.month, after.day)).toBe(
      julianDayNumber(base.year, base.month, base.day) + 60,
    );
    expect(dayPillar(after, 'sameDay')).toBe(dayPillar(base, 'sameDay'));
  });
});

describe('야자시 정책', () => {
  const on = (hour: number, minute: number): CalendarDateTime => ({
    year: 1990,
    month: 3,
    day: 10,
    hour,
    minute,
  });

  it('22:59 는 두 정책이 같다', () => {
    expect(dayPillar(on(22, 59), 'sameDay')).toBe(
      dayPillar(on(22, 59), 'nextDay'),
    );
  });

  it('23:00 부터 정자시설이 다음날로 넘어간다', () => {
    // docs/05 10장의 필수 경계다.
    for (const [h, m] of [
      [23, 0],
      [23, 1],
      [23, 59],
    ] as const) {
      const same = dayPillar(on(h, m), 'sameDay');
      const next = dayPillar(on(h, m), 'nextDay');
      const diff = indexFromPillar(next) - indexFromPillar(same);
      expect(((diff % 60) + 60) % 60, `${h}:${m}`).toBe(1);
    }
  });

  it('자정을 넘기면 두 정책이 다시 같아진다', () => {
    const at: CalendarDateTime = {
      year: 1990,
      month: 3,
      day: 11,
      hour: 0,
      minute: 1,
    };
    expect(dayPillar(at, 'sameDay')).toBe(dayPillar(at, 'nextDay'));
  });

  it('정자시설의 23시 일주는 다음날 자정 이후와 같다', () => {
    // 23:30 (정자시설) 과 다음날 00:30 은 같은 자시 구간이므로 일주가 같아야 한다.
    const before: CalendarDateTime = {
      year: 1990,
      month: 3,
      day: 10,
      hour: 23,
      minute: 30,
    };
    const after: CalendarDateTime = {
      year: 1990,
      month: 3,
      day: 11,
      hour: 0,
      minute: 30,
    };
    expect(dayPillar(before, 'nextDay')).toBe(dayPillar(after, 'nextDay'));
  });

  it('야자시설의 23시 일주는 그날 낮과 같다', () => {
    const noon: CalendarDateTime = {
      year: 1990,
      month: 3,
      day: 10,
      hour: 12,
      minute: 0,
    };
    const night: CalendarDateTime = {
      year: 1990,
      month: 3,
      day: 10,
      hour: 23,
      minute: 30,
    };
    expect(dayPillar(night, 'sameDay')).toBe(dayPillar(noon, 'sameDay'));
  });
});
