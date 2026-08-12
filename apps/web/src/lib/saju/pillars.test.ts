import { describe, expect, it } from 'vitest';

import {
  calendarDateFromJdn,
  julianDayNumber,
  utcMsFromWall,
  wallFromUtcMs,
} from './calendar';
import type { CalendarDateTime } from './calendar';
import { SOLAR_TERM_NAMES, solarTerms } from './data/solar-terms';
import {
  VERIFIED_CASES,
  caseById,
  correctionOptions,
  engineZiPolicy,
  parseBirth,
} from './fixtures/cases';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './index';
import type { HeavenlyStem, Pillar } from './index';
import {
  dayPillar,
  hourBranch,
  hourPillar,
  indexFromPillar,
  monthBranchIndex,
  monthPillar,
  pillarFromIndex,
  pillarOfSajuYear,
  sajuYear,
  sajuYearOrNull,
  surroundingMonthTerms,
  yearPillar,
} from './pillars';
import { correctBirthTime } from './time';
import type { CaseInput } from './fixtures/cases';

/** 케이스의 벽시계를 파이프라인에 태워 물리적 시각을 얻는다. docs/05 7장. */
function caseUtcMs(input: CaseInput): number {
  return correctBirthTime(parseBirth(input.birth), correctionOptions(input))
    .utcMs;
}

/** 같은 파이프라인의 보정된 벽시계. 일주와 시주가 쓰는 값이다. */
function caseWallClock(input: CaseInput): CalendarDateTime {
  return correctBirthTime(parseBirth(input.birth), correctionOptions(input))
    .corrected;
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
      // 일주는 보정이 끝난 벽시계를 받는다. docs/05 4장
      const at = correctBirthTime(
        parseBirth(c.input.birth),
        correctionOptions(c.input),
      ).corrected;
      const policy = engineZiPolicy(c.input.options.ziPolicy);
      expect(dayPillar(at, policy), `${c.id} (${c.input.birth})`).toBe(
        c.expected.day,
      );
    }
  });

  it('반대 정책의 일주도 재현한다', () => {
    // 정책 분기가 실제로 갈리는 케이스만 이 값을 갖는다.
    const cases = VERIFIED_CASES.filter(
      (c) => c.expected.underOppositeZiPolicy,
    );
    expect(cases.length).toBeGreaterThan(0);

    for (const c of cases) {
      const opposite = c.expected.underOppositeZiPolicy;
      if (!opposite) continue;

      const at = caseWallClock(c.input);
      const flipped =
        engineZiPolicy(c.input.options.ziPolicy) === 'nextDay'
          ? 'sameDay'
          : 'nextDay';
      expect(dayPillar(at, flipped), `${c.id} (${c.input.birth})`).toBe(
        opposite.day,
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

/**
 * KST 벽시계 문자열을 물리적 시각으로. 테스트 가독성용이다.
 *
 * 파이프라인을 태우지 않는다. 여기 쓰는 시각은 절기 경계를 겨냥해 지어낸 값이고
 * 1899년과 2101년처럼 파이프라인이 먼저 거부할 값도 있다.
 */
const kst = (text: string): number => utcMsFromWall(parseBirth(text), 32_400);

describe('년주', () => {
  const withYear = VERIFIED_CASES.filter((c) => c.expected.year);

  it('검증 케이스가 셋 이상 있다', () => {
    expect(withYear.length).toBeGreaterThanOrEqual(3);
  });

  it('모든 verified 케이스의 년주를 재현한다', () => {
    // 앵커 상수를 흔들면 여기가 깨진다.
    for (const c of withYear) {
      const at = caseUtcMs(c.input);
      expect(yearPillar(at), `${c.id} (${c.input.birth})`).toBe(
        c.expected.year,
      );
    }
  });

  it('경계가 양력 1월 1일이 아니다', () => {
    // 2024-01-01 은 아직 2023년 사주다. 입춘이 2월 4일이기 때문이다.
    expect(sajuYear(kst('2024-01-01T12:00:00'))).toBe(2023);
    expect(sajuYear(kst('2024-06-01T12:00:00'))).toBe(2024);
  });

  it('입춘 절입 1분 전후로 갈린다', () => {
    // 2024년 입춘은 KST 17:27 이다.
    expect(yearPillar(kst('2024-02-04T17:26:00'))).toBe('계묘');
    expect(yearPillar(kst('2024-02-04T17:28:00'))).toBe('갑진');
  });

  it('60년 주기로 돌아온다', () => {
    expect(yearPillar(kst('2044-06-01T12:00:00'))).toBe(
      yearPillar(kst('1984-06-01T12:00:00')),
    );
  });

  it('지원 범위 밖은 던진다', () => {
    expect(() => yearPillar(kst('1899-06-01T12:00:00'))).toThrow(RangeError);
    expect(() => yearPillar(kst('2101-06-01T12:00:00'))).toThrow(RangeError);
  });

  it('연도로 직접 년주를 낸다', () => {
    // 세운이 이 경로를 쓴다. docs/05 9장 5항.
    // 60갑자 산술뿐이라 절기 데이터 범위와 무관하게 값이 나온다.
    expect(pillarOfSajuYear(1984)).toBe('갑자');
    expect(pillarOfSajuYear(1900)).toBe('경자');
    expect(pillarOfSajuYear(2100)).toBe('경신');
    expect(pillarOfSajuYear(2160)).toBe(pillarOfSajuYear(2100));

    // 순간을 받는 쪽과 답이 같아야 한다. 입춘을 지난 시각으로 대조한다.
    expect(pillarOfSajuYear(2024)).toBe(yearPillar(kst('2024-06-01T12:00:00')));
  });
});

describe('판정할 수 없는 사주 연도', () => {
  // docs/05 9.3. 대운과 세운이 지원 범위를 넘는 순간을 만들어 이 경로를 쓴다.
  it('데이터 안에서는 sajuYear 와 같은 값이다', () => {
    expect(sajuYearOrNull(kst('2024-01-01T12:00:00'))).toBe(2023);
    expect(sajuYearOrNull(kst('2024-06-01T12:00:00'))).toBe(2024);
  });

  it('마지막 절기 이후는 비운다', () => {
    // 절기 데이터는 2100년 동지(KST 12-22 04:53)에서 끝난다.
    expect(sajuYearOrNull(kst('2100-12-22T04:53:00'))).toBe(2100);
    expect(sajuYearOrNull(kst('2100-12-22T04:54:00'))).toBeNull();
    expect(sajuYearOrNull(kst('2150-06-01T12:00:00'))).toBeNull();
  });

  it('1900년 입춘 이전도 비운다', () => {
    // 배열 안이지만 경계인 1899년 입춘이 없다. 1900년 입춘은 KST 02-04 14:51 이다.
    expect(sajuYearOrNull(kst('1900-02-04T14:51:00'))).toBe(1900);
    expect(sajuYearOrNull(kst('1900-02-04T14:50:00'))).toBeNull();
    expect(sajuYearOrNull(kst('1900-01-10T12:00:00'))).toBeNull();
  });

  it('던지지 않는다', () => {
    // sajuYear 는 같은 입력에 던진다. 둘의 계약이 다른 것이 이 함수의 존재 이유다.
    expect(() => sajuYearOrNull(kst('1900-01-10T12:00:00'))).not.toThrow();
    expect(() => sajuYear(kst('1900-01-10T12:00:00'))).toThrow(RangeError);
  });
});

describe('월 경계를 감싸는 두 절입', () => {
  // 대운수가 이 둘 중 하나와 출생 시각의 간격에서 나온다. docs/05 9장 2항.
  it('앞은 같은 시각을 포함하고 뒤는 포함하지 않는다', () => {
    // 2024년 입하는 KST 05-05 09:10 이다.
    const exact = kst('2024-05-05T09:10:00');
    const terms = surroundingMonthTerms(exact);

    expect(terms.previousUtcMs).toBe(exact);
    expect(terms.nextUtcMs).toBeGreaterThan(exact);
  });

  it('중기를 건너뛰고 12절만 낸다', () => {
    // 2024년 곡우는 04-19 23:00 이고 청명은 04-04 16:02, 입하는 05-05 09:10 이다.
    const terms = surroundingMonthTerms(kst('2024-04-25T12:00:00'));

    expect(wallFromUtcMs(terms.previousUtcMs, 32_400)).toMatchObject({
      month: 4,
      day: 4,
    });
    expect(wallFromUtcMs(terms.nextUtcMs, 32_400)).toMatchObject({
      month: 5,
      day: 5,
    });
  });

  it('뒤쪽 절입이 데이터에 없으면 던진다', () => {
    // 2100년 대설(12-07 10:42)과 동지(12-22 04:53) 사이다. 배열 안이라 탐색은 시작하고
    // 다음 절인 2101년 소한을 찾다가 끝에 부딪힌다. docs/05 9.3.
    expect(() => surroundingMonthTerms(kst('2100-12-10T12:00:00'))).toThrow(
      /앞뒤 절입 시각이 데이터에 없다/,
    );
  });

  it('배열 밖은 탐색에 들어가기 전에 던진다', () => {
    // 사유가 다르다. 이쪽은 지원 범위 밖이라 거부하는 것이다. docs/05 머리말.
    expect(() => surroundingMonthTerms(kst('2100-12-25T12:00:00'))).toThrow(
      /지원 범위 밖이다/,
    );
  });
});

describe('월주', () => {
  const withMonth = VERIFIED_CASES.filter((c) => c.expected.month);

  it('모든 verified 케이스의 월주를 재현한다', () => {
    for (const c of withMonth) {
      const at = caseUtcMs(c.input);
      expect(monthPillar(at), `${c.id} (${c.input.birth})`).toBe(
        c.expected.month,
      );
    }
  });

  it('입춘 전후로 축월에서 인월로 넘어간다', () => {
    expect(monthPillar(kst('2024-02-04T17:26:00'))).toBe('을축');
    expect(monthPillar(kst('2024-02-04T17:28:00'))).toBe('병인');
  });

  it('입하 전후로 월주만 갈리고 년주는 그대로다', () => {
    // 2024년 입하는 KST 09:10 이다.
    const before = kst('2024-05-05T09:09:00');
    const after = kst('2024-05-05T09:11:00');

    expect(monthPillar(before)).toBe('무진');
    expect(monthPillar(after)).toBe('기사');
    expect(yearPillar(before)).toBe(yearPillar(after));
  });

  it('중기는 월 경계가 아니다', () => {
    // 곡우는 청명과 입하 사이의 중기다. 앞뒤로 월주가 바뀌면 안 된다.
    expect(monthPillar(kst('2024-04-19T12:00:00'))).toBe(
      monthPillar(kst('2024-04-21T12:00:00')),
    );
  });

  it('월지가 한 해에 인묘진사오미신유술해자축 순서로 정확히 열두 번 바뀐다', () => {
    // 2024년 입춘 다음날부터 2025년 입춘 전날까지 훑는다.
    const seen: number[] = [];
    let cursor = kst('2024-02-05T12:00:00');
    const end = kst('2025-02-03T12:00:00');

    while (cursor <= end) {
      const branch = monthBranchIndex(cursor);
      if (seen[seen.length - 1] !== branch) seen.push(branch);
      cursor += 24 * 3600 * 1000;
    }

    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('월두법 표대로 인월 월주가 나온다', () => {
    // docs/05 3.1. 년간 다섯 묶음이 각각 병인, 무인, 경인, 임인, 갑인을 연다.
    const expected: [string, string][] = [
      ['2024', '병인'], // 갑진년
      ['2025', '무인'], // 을사년
      ['2026', '경인'], // 병오년
      ['2027', '임인'], // 정미년
      ['2028', '갑인'], // 무신년
      ['2029', '병인'], // 기유년. 갑과 같은 묶음이다
    ];

    for (const [year, pillar] of expected) {
      // 입춘 직후는 반드시 인월이다.
      const at = kst(`${year}-02-20T12:00:00`);
      expect(monthPillar(at), `${year} 인월`).toBe(pillar);
    }
  });

  it('지원 범위 밖은 던진다', () => {
    expect(() => monthPillar(kst('1899-06-01T12:00:00'))).toThrow(RangeError);
    expect(() => monthPillar(kst('2101-06-01T12:00:00'))).toThrow(RangeError);
  });
});

describe('절기 데이터와 월 경계', () => {
  it('절기 이름의 짝수 자리가 12절과 일치한다', () => {
    // 구현은 이름 표를 쓰지만 데이터 순서도 같은 성질을 갖는지 확인한다.
    // 어긋나면 데이터 생성 쪽이 바뀐 것이다.
    const 절 = [
      '소한',
      '입춘',
      '경칩',
      '청명',
      '입하',
      '망종',
      '소서',
      '입추',
      '백로',
      '한로',
      '입동',
      '대설',
    ];
    expect(SOLAR_TERM_NAMES.filter((_, i) => i % 2 === 0)).toEqual(절);
  });

  it('한 해의 절기가 24개이고 시간순이다', () => {
    const terms = solarTerms();
    expect(terms.length % 24).toBe(0);
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i].utcMs).toBeGreaterThan(terms[i - 1].utcMs);
    }
  });
});

describe('시지', () => {
  const on = (hour: number, minute = 0): CalendarDateTime => ({
    year: 1995,
    month: 10,
    day: 1,
    hour,
    minute,
  });

  it('자시가 23시에 열려 자정을 걸친다', () => {
    expect(hourBranch(on(22, 59))).toBe('해');
    expect(hourBranch(on(23, 0))).toBe('자');
    expect(hourBranch(on(23, 59))).toBe('자');
    expect(hourBranch(on(0, 1))).toBe('자');
    expect(hourBranch(on(1, 0))).toBe('축');
  });

  it('12지가 두 시간씩 순서대로 돈다', () => {
    // docs/05 5.1 의 구간표 그대로다.
    const expected = [
      '자',
      '축',
      '인',
      '묘',
      '진',
      '사',
      '오',
      '미',
      '신',
      '유',
      '술',
      '해',
    ];

    for (const [i, branch] of expected.entries()) {
      const start = (23 + i * 2) % 24;
      expect(hourBranch(on(start)), `${start}시`).toBe(branch);
      expect(hourBranch(on((start + 1) % 24)), `${start + 1}시`).toBe(branch);
    }
  });

  it('진태양시 보정이 시지를 넘긴다', () => {
    // 부산 129.08 도는 -24분이라 13:10 이 12:46 이 되어 미시에서 오시로 넘어온다.
    const busan = caseById('true-solar-busan').input;
    const at = parseBirth(busan.birth);

    // 보정을 넣지 않은 기록 시계로는 미시다. 보정이 항상 걸리므로 결과는 오시다. ADR 0016
    expect(hourBranch(at)).toBe('미');
    expect(
      hourBranch(
        correctBirthTime(at, { longitude: busan.longitude }).corrected,
      ),
    ).toBe('오');
  });

  it('서머타임을 풀면 시지가 넘어온다', () => {
    // dst-1988 의 notes 가 예고한 값이다. 13:20 을 풀면 12:20 이라 오시다.
    const at = parseBirth(caseById('dst-1988').input.birth);

    expect(hourBranch(at)).toBe('미');
    expect(
      hourBranch(correctBirthTime(at, { longitude: 126.98 }).corrected),
    ).toBe('오');
  });
});

describe('시주', () => {
  /** docs/05 5.2 오서둔 표. 구현의 상수를 그대로 가져오지 않고 문서에서 옮긴다. */
  const ZI_HOUR_PILLAR: Record<HeavenlyStem, Pillar> = {
    갑: '갑자',
    기: '갑자',
    을: '병자',
    경: '병자',
    병: '무자',
    신: '무자',
    정: '경자',
    임: '경자',
    무: '임자',
    계: '임자',
  };

  /** 기둥의 천간. 문자열 인덱싱 결과를 일간 타입으로 좁힌다. */
  const stemOf = (pillar: Pillar): HeavenlyStem => pillar[0] as HeavenlyStem;

  /** 적일에서 00:30 벽시계를 만든다. 자시이면서 정책 분기에 걸리지 않는 시각이다. */
  const ziAt = (jdn: number): CalendarDateTime => ({
    ...calendarDateFromJdn(jdn),
    hour: 0,
    minute: 30,
  });

  it('일간 열 개의 자시 시주가 오서둔 표와 같다', () => {
    // 60일을 훑으면 열 개 일간이 각각 여섯 번씩 나온다.
    const base = julianDayNumber(2024, 1, 1);
    const seen = new Set<string>();

    for (let i = 0; i < 60; i++) {
      const at = ziAt(base + i);
      const stem = stemOf(dayPillar(at, 'nextDay'));
      seen.add(stem);
      expect(hourPillar(at), `${stem} 일간의 자시`).toBe(ZI_HOUR_PILLAR[stem]);
    }

    expect(seen.size).toBe(10);
  });

  it('자시 시주의 60갑자 인덱스가 일간 인덱스의 12배다', () => {
    // 표를 대신하는 식이 아니라 표가 옳은지 교차 확인하는 항등식이다.
    for (const [i, stem] of HEAVENLY_STEMS.entries()) {
      expect(indexFromPillar(ZI_HOUR_PILLAR[stem]), stem).toBe((i * 12) % 60);
    }
  });

  it('모든 verified 케이스의 시주를 재현한다', () => {
    const withHour = VERIFIED_CASES.filter((c) => c.expected.hour);
    expect(withHour.length).toBeGreaterThanOrEqual(3);

    for (const c of withHour) {
      const at = caseWallClock(c.input);
      expect(hourPillar(at), `${c.id} (${c.input.birth})`).toBe(
        c.expected.hour,
      );
    }
  });

  it('야자시 정책을 뒤집어도 시주가 같다', () => {
    // docs/05 5.2. 시간은 자시가 속한 날의 일간에서 나오므로 정책이 개입하지 않는다.
    const cases = VERIFIED_CASES.filter(
      (c) => c.expected.underOppositeZiPolicy,
    );
    expect(cases.length).toBeGreaterThan(0);

    for (const c of cases) {
      const opposite = c.expected.underOppositeZiPolicy;
      if (!opposite) continue;

      // 일주는 정책에 따라 갈리는 자리다.
      const at = caseWallClock(c.input);
      expect(dayPillar(at, 'sameDay'), c.id).not.toBe(dayPillar(at, 'nextDay'));

      // 그런데 만세력은 두 정책에 같은 시주를 적었고 구현도 그 값 하나를 낸다.
      expect(opposite.hour, `${c.id} 픽스처`).toBe(c.expected.hour);
      expect(hourPillar(at), `${c.id} 구현`).toBe(c.expected.hour);
    }
  });

  it('열두 시진이 60갑자 순서로 이어진다', () => {
    // 자시부터 두 시간씩. 23:30 의 다음 시진은 날짜가 바뀐 01:30 이다.
    const base = julianDayNumber(1990, 3, 10);
    const start: CalendarDateTime = {
      ...calendarDateFromJdn(base),
      hour: 23,
      minute: 30,
    };

    let previous = indexFromPillar(hourPillar(start));
    expect(previous).toBe(indexFromPillar(hourPillar(ziAt(base + 1))));

    for (let i = 1; i < 12; i++) {
      const at: CalendarDateTime = {
        ...calendarDateFromJdn(base + 1),
        hour: i * 2 - 1,
        minute: 30,
      };
      const index = indexFromPillar(hourPillar(at));
      expect((index - previous + 60) % 60, `${at.hour}시`).toBe(1);
      previous = index;
    }
  });

  it('해시에서 자시로 넘어갈 때 일간이 다음날로 바뀐다', () => {
    const base = julianDayNumber(1990, 3, 10);
    const day = calendarDateFromJdn(base);
    const before: CalendarDateTime = { ...day, hour: 22, minute: 59 };
    const after: CalendarDateTime = { ...day, hour: 23, minute: 1 };

    // 자시 시주는 당일이 아니라 다음날 일간에서 나온다.
    expect(hourPillar(after)).toBe(
      ZI_HOUR_PILLAR[stemOf(dayPillar(after, 'nextDay'))],
    );
    expect(hourPillar(after)).not.toBe(
      ZI_HOUR_PILLAR[stemOf(dayPillar(after, 'sameDay'))],
    );

    // 해시와 자시는 60갑자에서 이웃이다. 날짜가 바뀌어도 흐름이 끊기지 않는다.
    const diff =
      indexFromPillar(hourPillar(after)) - indexFromPillar(hourPillar(before));
    expect(((diff % 60) + 60) % 60).toBe(1);
  });

  it('자정을 걸친 자시가 한 시진으로 이어진다', () => {
    // docs/05 10장의 "보정 후 22:59, 23:01, 23:59, 00:01" 중 자정을 넘는 자리다.
    // 네 기둥 값은 verified 재현이, 보정 후 시각은 cases.test.ts 가 잡는다.
    // 둘 다 놓치는 것이 날짜다. cases.test.ts 는 hh:mm 만 보고 날짜를 보지 않는다.
    const at = (id: string) => caseWallClock(caseById(id).input);
    const [t2301, t2359, t0001] = ['zi-2301', 'zi-2359', 'zi-0001'].map(at);

    // 셋째 케이스는 입력이 03-11 인데 보정이 03-10 으로 되돌린다.
    expect(t2359.day).toBe(t2301.day);
    expect(t0001.day).toBe(t2301.day + 1);

    // 날짜가 갈려도 같은 자시라 시주가 하나다. 시두법이 당일 일간을 쓰면 깨진다.
    // verified 재현과 겹치지만 이 테스트가 말하려는 것이 이 줄이라 남긴다.
    expect(hourPillar(t0001)).toBe(hourPillar(t2301));

    // zi-0001 은 underOppositeZiPolicy 가 없어 sameDay 분기를 여기서만 밟는다.
    expect(dayPillar(t0001, 'sameDay')).toBe(dayPillar(t0001, 'nextDay'));
  });

  it('야자시설에서는 일주 일간과 시주가 오서둔을 어긋난다', () => {
    // 구현 오류가 아니라 야자시설의 성질이다. docs/05 5.2.
    const c = caseById('verified-19880905-seoul');
    const at = caseWallClock(c.input);
    const day = dayPillar(at, 'sameDay');

    expect(day).toBe('임술');
    expect(hourPillar(at)).toBe('임자');

    // 임 일간의 자시는 경자다. 야자시설의 일주와 시주는 그 표를 만족하지 않는다.
    expect(hourPillar(at)).not.toBe(ZI_HOUR_PILLAR[stemOf(day)]);
  });
});
