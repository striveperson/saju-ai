import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { utcMsFromWall, wallFromUtcMs } from './calendar';
import type { CalendarDateTime } from './calendar';
import {
  caseById,
  correctionOptions,
  parseBirth,
  recordedWallClock,
} from './fixtures/cases';
import { FALLBACK_MERIDIAN, correctBirthTime, instantCandidates } from './time';
import type { DstAssumption } from './time';

interface AnswerKey {
  anomalies: {
    utc: string;
    kind: 'nonexistent' | 'ambiguous';
    fromLocal: string;
    untilLocal: string;
    seconds: number;
  }[];
}

const key: AnswerKey = JSON.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      'fixtures/tzdb-asia-seoul.json',
    ),
    'utf8',
  ),
);

/** 정답지의 'YYYY-MM-DDTHH:mm:ss' 를 벽시계로. 초는 버린다. */
function parseLocal(text: string): CalendarDateTime {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(text);
  if (!m) throw new Error(`형식이 아니다: ${text}`);

  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
}

/** 벽시계에 분을 더한다. 오프셋 0 으로 왕복하면 달력 넘김이 알아서 된다. */
function plusMinutes(at: CalendarDateTime, minutes: number): CalendarDateTime {
  return wallFromUtcMs(utcMsFromWall(at, 0) + minutes * 60_000, 0);
}

/**
 * 구간이 끝난 뒤 처음 오는 분.
 *
 * 1908년 전환만 구간이 128초라 끝이 00:02:08 이다. 초를 버리면 아직 구간 안이라
 * 한 분을 올려야 밖이 된다. 나머지 27개는 분 경계에 딱 떨어진다.
 */
function firstMinuteAfter(text: string): CalendarDateTime {
  const at = parseLocal(text);
  return text.endsWith(':00') ? at : plusMinutes(at, 1);
}

const seoul = 126.98;
const busan = 129.08;

describe('이상 구간 전수', () => {
  it('정답지의 이상 구간이 28개다', () => {
    expect(key.anomalies).toHaveLength(28);
  });

  it('구간 안에서는 정답지가 말한 종류로 판정한다', () => {
    const wrong: string[] = [];

    for (const a of key.anomalies) {
      const inside = plusMinutes(parseLocal(a.fromLocal), 1);
      const kind = correctBirthTime(inside, { longitude: seoul }).disclosure
        .resolution.kind;

      if (kind !== a.kind) wrong.push(`${a.fromLocal}: ${kind} 대 ${a.kind}`);
    }

    expect(wrong).toEqual([]);
  });

  it('구간 밖 1분에서는 해석이 하나다', () => {
    const wrong: string[] = [];

    for (const a of key.anomalies) {
      for (const at of [
        plusMinutes(parseLocal(a.fromLocal), -1),
        firstMinuteAfter(a.untilLocal),
      ]) {
        const kind = correctBirthTime(at, { longitude: seoul }).disclosure
          .resolution.kind;
        if (kind !== 'unique') wrong.push(`${a.fromLocal} 밖: ${kind}`);
      }
    }

    expect(wrong).toEqual([]);
  });

  it('후보 개수가 판정과 맞물린다', () => {
    for (const a of key.anomalies) {
      const inside = plusMinutes(parseLocal(a.fromLocal), 1);
      expect(instantCandidates(inside), a.fromLocal).toHaveLength(
        a.kind === 'ambiguous' ? 2 : 0,
      );
    }
  });

  it('기록이 표준시라면 서머타임이 만든 24개가 사라진다', () => {
    // 기준 오프셋 프레임으로 읽으면 서머타임 전환을 지나가지 않는다. docs/05 7.5
    const remaining = key.anomalies.filter((a) => {
      const inside = plusMinutes(parseLocal(a.fromLocal), 1);
      return (
        correctBirthTime(inside, {
          longitude: seoul,
          dstAssumption: 'standard',
        }).disclosure.resolution.kind !== 'unique'
      );
    });

    expect(remaining.map((a) => a.fromLocal)).toEqual([
      '1908-04-01T00:00:00',
      '1912-01-01T00:00:00',
      '1954-03-20T23:30:00',
      '1961-08-10T00:00:00',
    ]);
  });
});

describe('표준시 이력 정규화', () => {
  it('UTC+9 구간은 벽시계가 그대로다', () => {
    const at = { year: 1995, month: 10, day: 1, hour: 13, minute: 10 };
    const r = correctBirthTime(at, { longitude: seoul });

    expect(r.normalized).toEqual(at);
    expect(r.disclosure.normalizeSeconds).toBe(0);
    expect(r.disclosure.notices).toEqual([]);
  });

  it('UTC+8:30 구간은 30분을 앞으로 옮긴다', () => {
    // 1958-03-05 는 서머타임 밖이라 순수한 UTC+8:30 이다.
    const r = correctBirthTime(
      { year: 1958, month: 3, day: 5, hour: 6, minute: 15 },
      { longitude: seoul },
    );

    expect(r.disclosure.offsetSeconds).toBe(30_600);
    expect(r.disclosure.abbreviation).toBe('KST');
    expect(r.normalized).toEqual({
      year: 1958,
      month: 3,
      day: 5,
      hour: 6,
      minute: 45,
    });
    expect(r.disclosure.notices).toEqual(['non-standard-offset']);
  });

  it('1908년 이전은 지방평균태양시로 읽고 알린다', () => {
    const r = correctBirthTime(
      { year: 1905, month: 3, day: 4, hour: 12, minute: 0 },
      { longitude: seoul },
    );

    expect(r.disclosure.offsetSeconds).toBe(30_472);
    expect(r.disclosure.localMeanTimeEra).toBe(true);
    expect(r.disclosure.notices).toEqual(['local-mean-time']);
  });

  it('진태양시를 켜면 1908년 이전 서울 출생이 기록 시각으로 되돌아온다', () => {
    // LMT 가 서울 지방평균태양시 그 자체라 정규화와 진태양시가 서로 상쇄한다.
    const at = { year: 1905, month: 3, day: 4, hour: 12, minute: 0 };
    const r = correctBirthTime(at, { longitude: seoul });

    expect(r.corrected).toEqual(at);
  });
});

describe('서머타임 해제', () => {
  it('1987년 기록에서 한 시간을 푼다', () => {
    const r = correctBirthTime(
      parseBirth('1987-07-15T13:20:00'),
      correctionOptions(caseById('dst-1987').input),
    );

    expect(r.disclosure.offsetSeconds).toBe(36_000);
    expect(r.disclosure.abbreviation).toBe('KDT');
    expect(r.disclosure.daylightUnwound).toBe(true);
    expect(r.normalized.hour).toBe(12);
    expect(r.normalized.minute).toBe(20);
    expect(r.disclosure.notices).toEqual([
      'daylight-unwound',
      'dst-assumption-unknown',
    ]);
  });

  it('1958년 서머타임은 UTC+9:30 이라 30분만 푼다', () => {
    // 기준이 UTC+8:30 이던 시기다. 한 시간을 일괄로 빼면 여기서 틀린다.
    const r = correctBirthTime(parseBirth('1958-05-05T06:15:00'), {
      longitude: seoul,
    });

    expect(r.disclosure.offsetSeconds).toBe(34_200);
    expect(r.disclosure.baseOffsetSeconds).toBe(30_600);
    expect(r.disclosure.normalizeSeconds).toBe(-1800);
    expect(r.normalized).toEqual({
      year: 1958,
      month: 5,
      day: 5,
      hour: 5,
      minute: 45,
    });
  });

  it('기록이 표준시라고 하면 풀지 않는다', () => {
    const at = parseBirth('1987-07-15T13:20:00');
    const r = correctBirthTime(at, {
      longitude: seoul,
      dstAssumption: 'standard',
    });

    expect(r.disclosure.daylightUnwound).toBe(false);
    expect(r.normalized).toEqual(at);
    expect(r.disclosure.notices).toEqual([]);
  });

  it('확인한 값과 가정한 값을 구분한다', () => {
    const at = parseBirth('1988-07-15T13:20:00');
    const forEach: [DstAssumption, boolean][] = [
      ['unknown', true],
      ['daylight', false],
    ];

    for (const [dstAssumption, warns] of forEach) {
      const r = correctBirthTime(at, { longitude: seoul, dstAssumption });
      expect(r.normalized.hour, dstAssumption).toBe(12);
      expect(
        r.disclosure.notices.includes('dst-assumption-unknown'),
        dstAssumption,
      ).toBe(warns);
    }
  });
});

describe('진태양시 보정', () => {
  it('기준 케이스의 서울 보정값을 재현한다', () => {
    // 픽스처의 trueSolarOffsetMin 은 공인 만세력 대조를 거친 값이다.
    const baseline = caseById('verified-19950127-1439-F-seoul');
    if (!baseline.verified) throw new Error('기준 케이스가 verified 가 아니다');

    const r = correctBirthTime(recordedWallClock(baseline.input), {
      longitude: baseline.input.longitude,
    });

    expect(r.disclosure.trueSolar.minutes).toBe(
      baseline.expected.trueSolarOffsetMin,
    );
  });

  it('부산은 24분을 뒤로 당긴다', () => {
    const r = correctBirthTime(parseBirth('1995-10-01T13:10:00'), {
      longitude: busan,
    });

    expect(r.disclosure.trueSolar.minutes).toBe(-24);
    expect(r.corrected).toEqual({
      year: 1995,
      month: 10,
      day: 1,
      hour: 12,
      minute: 46,
    });
  });

  it('보정은 끌 수 없다. corrected 가 normalized 에서 그만큼 밀린다', () => {
    // ADR 0016 으로 옵션이 사라졌다. 경도가 135도가 아닌 한 두 값이 같아지지 않는다.
    const r = correctBirthTime(parseBirth('1995-10-01T13:10:00'), {
      longitude: busan,
    });

    expect(r.disclosure.trueSolar.minutes).toBe(-24);
    expect(utcMsFromWall(r.corrected, 0)).toBe(
      utcMsFromWall(r.normalized, 0) - 24 * 60_000,
    );
    expect(r.disclosure.trueSolar.meridian).toBe(135);
  });

  it('경도를 모르면 시대와 무관하게 30분을 당기고 알린다', () => {
    // UTC+8:30 시기의 30분은 정규화가 이미 처리했다. 폴백을 시대별로 조정하지 않는다.
    for (const year of [1958, 1995]) {
      const r = correctBirthTime(
        { year, month: 3, day: 5, hour: 6, minute: 15 },
        {},
      );

      expect(r.disclosure.trueSolar.minutes, `${year}`).toBe(-30);
      expect(r.disclosure.trueSolar.fallback, `${year}`).toBe(true);
      expect(r.disclosure.trueSolar.longitude, `${year}`).toBe(
        FALLBACK_MERIDIAN,
      );
      expect(r.disclosure.notices, `${year}`).toContain('true-solar-fallback');
    }
  });

  it('물리적 시각은 경도에 영향받지 않는다', () => {
    // 절입 판정이 경도로 흔들리면 년주와 월주가 조용히 틀린다. docs/05 7.3
    const at = parseBirth('1995-10-01T13:10:00');
    const seoulBirth = correctBirthTime(at, { longitude: seoul });
    const busanBirth = correctBirthTime(at, { longitude: busan });

    expect(busanBirth.utcMs).toBe(seoulBirth.utcMs);
    expect(busanBirth.corrected).not.toEqual(seoulBirth.corrected);
  });
});

describe('표준시 전환 경계', () => {
  it('1954-03-20 23:30 은 두 번 존재한다', () => {
    const r = correctBirthTime(
      recordedWallClock(caseById('tz-19540321-before').input),
      { longitude: seoul },
    );

    const { resolution } = r.disclosure;
    if (resolution.kind !== 'ambiguous') throw new Error('모호해야 한다');

    expect(resolution.chosen).toBe('earlier');
    expect(resolution.because).toBe('default');
    // 채운 값도 함께 낸다. 부르는 쪽이 같은 기본값을 다시 적지 않게 하려는 것이다.
    expect(r.disclosure.applied).toEqual({
      dstAssumption: 'unknown',
      ambiguityChoice: 'earlier',
    });
    expect(r.disclosure.offsetSeconds).toBe(32_400);
    expect(resolution.alternative.offsetSeconds).toBe(30_600);
    // 30분 차이가 정규화 뒤 벽시계에 그대로 나타난다.
    expect(r.normalized.minute).toBe(30);
    expect(resolution.alternative.normalized.hour).toBe(0);
  });

  it('뒤쪽 해석을 고르면 그 사실이 남는다', () => {
    const r = correctBirthTime(parseBirth('1954-03-20T23:30:00'), {
      longitude: seoul,
      ambiguityChoice: 'later',
    });

    const { resolution } = r.disclosure;
    if (resolution.kind !== 'ambiguous') throw new Error('모호해야 한다');

    expect(resolution.chosen).toBe('later');
    expect(resolution.because).toBe('option');
    expect(r.disclosure.offsetSeconds).toBe(30_600);
  });

  it('1954-03-21 00:30 은 UTC+8:30 하나다', () => {
    const r = correctBirthTime(
      recordedWallClock(caseById('tz-19540321-after').input),
      { longitude: seoul },
    );

    expect(r.disclosure.resolution.kind).toBe('unique');
    expect(r.disclosure.offsetSeconds).toBe(30_600);
    expect(r.normalized).toEqual({
      year: 1954,
      month: 3,
      day: 21,
      hour: 1,
      minute: 0,
    });
  });

  it('1961-08-10 00:30 은 존재하고 00:10 은 존재하지 않는다', () => {
    const exists = correctBirthTime(
      recordedWallClock(caseById('tz-19610810-boundary').input),
      { longitude: seoul },
    );
    expect(exists.disclosure.resolution.kind).toBe('unique');
    expect(exists.disclosure.offsetSeconds).toBe(32_400);

    const missing = correctBirthTime(
      { year: 1961, month: 8, day: 10, hour: 0, minute: 10 },
      { longitude: seoul },
    );
    const { resolution } = missing.disclosure;
    if (resolution.kind !== 'nonexistent') throw new Error('없어야 한다');

    expect(resolution.gapSeconds).toBe(1800);
    expect(resolution.shiftedSeconds).toBe(1200);
    // 전환 직후로 밀었으므로 존재하는 첫 벽시계가 된다.
    expect(missing.normalized).toEqual({
      year: 1961,
      month: 8,
      day: 10,
      hour: 0,
      minute: 30,
    });
  });

  it('두 해석이 갈리면 대안을 함께 돌려준다', () => {
    // 1958-09-20 23:15 은 시지와 일주가 함께 갈리는 자리다. docs/05 7.4
    const r = correctBirthTime(
      { year: 1958, month: 9, day: 20, hour: 23, minute: 15 },
      { longitude: seoul },
    );

    const { resolution } = r.disclosure;
    if (resolution.kind !== 'ambiguous') throw new Error('모호해야 한다');

    expect(r.normalized).toEqual({
      year: 1958,
      month: 9,
      day: 20,
      hour: 22,
      minute: 45,
    });
    expect(resolution.alternative.normalized).toEqual({
      year: 1958,
      month: 9,
      day: 20,
      hour: 23,
      minute: 45,
    });
  });
});

describe('지원 범위', () => {
  it('범위 밖은 던진다', () => {
    expect(() =>
      correctBirthTime(
        { year: 1899, month: 12, day: 31, hour: 12, minute: 0 },
        { longitude: seoul },
      ),
    ).toThrow(RangeError);
    expect(() =>
      correctBirthTime(
        { year: 2101, month: 1, day: 1, hour: 12, minute: 0 },
        { longitude: seoul },
      ),
    ).toThrow(RangeError);
  });

  it('recorded 는 입력을 그대로 돌려준다', () => {
    const at = parseBirth('1987-07-15T13:20:00');
    expect(correctBirthTime(at, { longitude: seoul }).recorded).toEqual(at);
  });
});
