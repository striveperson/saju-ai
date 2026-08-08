import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { utcMsFromWall } from '../calendar';
import {
  KOREA_OFFSET_PERIODS,
  KOREA_TIME_FIRST_YEAR,
  KOREA_TIME_LAST_YEAR,
} from './korea-time';

interface TypeInfo {
  offsetSeconds: number;
  dst: boolean;
  abbr: string;
}

interface AnswerKey {
  range: { firstYear: number; lastYear: number };
  initial: TypeInfo;
  transitionCount: number;
  anomalyCount: number;
  transitions: {
    utc: string;
    before: TypeInfo;
    after: TypeInfo;
    anomaly: { kind: string; fromLocal: string; seconds: number } | null;
  }[];
  samples: { utc: string; offsetSeconds: number; dst: boolean; abbr: string }[];
}

const key: AnswerKey = JSON.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../fixtures/tzdb-asia-seoul.json',
    ),
    'utf8',
  ),
);

/** 정답지의 'YYYY-MM-DDTHH:mm:ssZ' 를 밀리초로. Date 는 파싱이 실행 환경에 묶여 쓰지 않는다. */
function parseUtc(text: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(text);
  if (!m) throw new Error(`UTC 형식이 아니다: ${text}`);

  return (
    utcMsFromWall(
      {
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3]),
        hour: Number(m[4]),
        minute: Number(m[5]),
      },
      0,
    ) +
    Number(m[6]) * 1000
  );
}

/** 이 순간에 쓰이던 구간. 표를 뒤에서부터 훑는다. 테스트는 단순한 쪽이 낫다. */
function periodAt(utcMs: number) {
  for (let i = KOREA_OFFSET_PERIODS.length - 1; i >= 0; i--) {
    if (utcMs >= KOREA_OFFSET_PERIODS[i].fromUtcMs)
      return KOREA_OFFSET_PERIODS[i];
  }
  throw new Error(`구간을 찾지 못했다: ${utcMs}`);
}

const describeType = (p: (typeof KOREA_OFFSET_PERIODS)[number]) => ({
  offsetSeconds: p.offsetSeconds,
  dst: p.daylight,
  abbr: p.abbreviation,
});

describe('한국 표준시 전환표', () => {
  it('전환 건수가 정답지와 같다', () => {
    // 표는 첫 구간 하나에 전환마다 한 행씩이다.
    expect(KOREA_OFFSET_PERIODS).toHaveLength(key.transitionCount + 1);
  });

  it('첫 구간이 정답지의 초기 타입과 같다', () => {
    expect(KOREA_OFFSET_PERIODS[0].fromUtcMs).toBe(Number.NEGATIVE_INFINITY);
    expect(describeType(KOREA_OFFSET_PERIODS[0])).toEqual({
      offsetSeconds: key.initial.offsetSeconds,
      dst: key.initial.dst,
      abbr: key.initial.abbr,
    });
  });

  it('전환 순간과 그 이후 오프셋이 순서대로 일치한다', () => {
    const mismatches: string[] = [];

    for (const [i, t] of key.transitions.entries()) {
      const period = KOREA_OFFSET_PERIODS[i + 1];
      const expected = {
        utc: parseUtc(t.utc),
        offsetSeconds: t.after.offsetSeconds,
        dst: t.after.dst,
        abbr: t.after.abbr,
      };
      const actual = { utc: period.fromUtcMs, ...describeType(period) };

      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        mismatches.push(
          `${t.utc}: 표 ${JSON.stringify(actual)}, 정답지 ${JSON.stringify(expected)}`,
        );
      }
    }

    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it('전환 1밀리초 전은 아직 이전 오프셋이다', () => {
    // 경계 비교를 <= 와 < 로 뒤집으면 여기서 갈린다.
    for (const t of key.transitions) {
      const at = parseUtc(t.utc);
      expect(periodAt(at - 1).offsetSeconds, t.utc).toBe(
        t.before.offsetSeconds,
      );
      expect(periodAt(at).offsetSeconds, t.utc).toBe(t.after.offsetSeconds);
    }
  });

  it('정답지의 구간 표본과 일치한다', () => {
    for (const s of key.samples) {
      expect(describeType(periodAt(parseUtc(s.utc))), s.utc).toEqual({
        offsetSeconds: s.offsetSeconds,
        dst: s.dst,
        abbr: s.abbr,
      });
    }
  });

  it('시각 오름차순이고 이웃한 두 구간이 서로 다르다', () => {
    for (let i = 1; i < KOREA_OFFSET_PERIODS.length; i++) {
      const prev = KOREA_OFFSET_PERIODS[i - 1];
      const cur = KOREA_OFFSET_PERIODS[i];

      expect(cur.fromUtcMs, `${i}번째`).toBeGreaterThan(prev.fromUtcMs);
      expect(
        JSON.stringify(describeType(prev)) !==
          JSON.stringify(describeType(cur)),
        `${i}번째가 앞 구간과 같다`,
      ).toBe(true);
    }
  });

  it('서머타임 구간만 기준 오프셋과 다르다', () => {
    for (const p of KOREA_OFFSET_PERIODS) {
      expect(p.offsetSeconds !== p.baseOffsetSeconds, p.abbreviation).toBe(
        p.daylight,
      );
      if (p.daylight) {
        expect(p.offsetSeconds - p.baseOffsetSeconds, p.abbreviation).toBe(
          3600,
        );
      }
    }
  });

  it('지원 연도 범위가 정답지와 같다', () => {
    expect(KOREA_TIME_FIRST_YEAR).toBe(key.range.firstYear);
    expect(KOREA_TIME_LAST_YEAR).toBe(key.range.lastYear);
  });

  it('마지막 전환 이후로 바뀌는 것이 없다', () => {
    // 1988년 종료가 마지막이다. 새 전환이 생기면 정답지를 다시 뜨고 표를 고쳐야 한다.
    const last = KOREA_OFFSET_PERIODS[KOREA_OFFSET_PERIODS.length - 1];
    const y2100 = utcMsFromWall(
      { year: KOREA_TIME_LAST_YEAR, month: 12, day: 31, hour: 0, minute: 0 },
      0,
    );

    expect(periodAt(y2100)).toEqual(last);
    expect(last.offsetSeconds).toBe(32_400);
  });
});
