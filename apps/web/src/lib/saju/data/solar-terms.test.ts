import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  SOLAR_TERM_FIRST_YEAR,
  SOLAR_TERM_LAST_YEAR,
  SOLAR_TERM_NAMES,
  SOLAR_TERM_PROVISIONAL_FROM_YEAR,
  solarTerms,
} from './solar-terms';

interface ReviewCopy {
  range: { firstYear: number; lastYear: number };
  provisionalFromYear: number;
  count: number;
  /** utcMinute 이 실제로 실리는 값이고 utcExact 는 반올림 전 계산값이다. */
  terms: { name: string; kst: string; utcMinute: string; utcExact: string }[];
}

const review: ReviewCopy = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), 'solar-terms.json'),
    'utf8',
  ),
);

describe('절기 데이터', () => {
  const terms = solarTerms();

  it('바이너리와 리뷰용 사본이 같은 건수를 담는다', () => {
    expect(terms).toHaveLength(review.count);
    expect(terms).toHaveLength(review.terms.length);
  });

  it('연도 범위와 잠정 시작 연도가 사본과 일치한다', () => {
    expect(SOLAR_TERM_FIRST_YEAR).toBe(review.range.firstYear);
    expect(SOLAR_TERM_LAST_YEAR).toBe(review.range.lastYear);
    expect(SOLAR_TERM_PROVISIONAL_FROM_YEAR).toBe(review.provisionalFromYear);
  });

  it('모든 항목의 이름과 시각이 사본과 일치한다', () => {
    // 바이너리를 손으로 고치거나 사본만 갱신하면 여기서 갈린다.
    const mismatches: string[] = [];

    for (const [i, t] of terms.entries()) {
      const r = review.terms[i];
      if (t.name !== r.name || t.utcMs !== Date.parse(r.utcMinute)) {
        mismatches.push(
          `${i}: ${t.name} ${new Date(t.utcMs).toISOString()} 대 ${r.name} ${r.utcMinute}`,
        );
      }
    }

    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it('시간순으로 정렬되어 있다', () => {
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i].utcMs, `${i}번째`).toBeGreaterThan(terms[i - 1].utcMs);
    }
  });

  it('절기 이름이 15도씩 순서대로 돈다', () => {
    for (let i = 1; i < terms.length; i++) {
      const prev = SOLAR_TERM_NAMES.indexOf(terms[i - 1].name);
      const cur = SOLAR_TERM_NAMES.indexOf(terms[i].name);
      expect(
        (cur - prev + 24) % 24,
        `${terms[i - 1].name} 다음이 ${terms[i].name}`,
      ).toBe(1);
    }
  });

  it('황경이 이름과 맞는다', () => {
    for (const t of terms) {
      const index = SOLAR_TERM_NAMES.indexOf(t.name);
      expect(t.sunLongitude, t.name).toBe((285 + index * 15) % 360);
    }
  });

  it('연도마다 24개가 있다', () => {
    const perYear = new Map<number, number>();
    for (const t of terms) {
      const year = new Date(t.utcMs + 9 * 3600 * 1000).getUTCFullYear();
      perYear.set(year, (perYear.get(year) ?? 0) + 1);
    }

    const years = [...perYear.keys()].sort((a, b) => a - b);
    expect(years[0]).toBe(SOLAR_TERM_FIRST_YEAR);
    expect(years[years.length - 1]).toBe(SOLAR_TERM_LAST_YEAR);
    expect([...perYear.entries()].filter(([, n]) => n !== 24)).toEqual([]);
  });

  it('인접 간격이 14.5일에서 15.9일 사이다', () => {
    // 태양은 근일점에서 가장 빠르고 원일점에서 가장 느리다. 그 밖으로 나가면 값이 튄 것이다.
    const outOfRange: string[] = [];

    for (let i = 1; i < terms.length; i++) {
      const days = (terms[i].utcMs - terms[i - 1].utcMs) / 86400000;
      if (days < 14.5 || days > 15.9) {
        outOfRange.push(
          `${terms[i].name} ${new Date(terms[i].utcMs).toISOString()} ${days}일`,
        );
      }
    }

    expect(outOfRange.slice(0, 5)).toEqual([]);
  });

  it('기준 케이스의 입춘 시각이 맞는다', () => {
    // 2024년 입춘은 KASI 발표 기준 02-04 17:27 KST 다. 픽스처의 경계 케이스가 이 값에 걸린다.
    const ipchun2024 = terms.find(
      (t) => t.name === '입춘' && new Date(t.utcMs).getUTCFullYear() === 2024,
    );

    const kst = new Date(ipchun2024!.utcMs + 9 * 3600 * 1000).toISOString();
    expect(kst.slice(0, 16)).toBe('2024-02-04T17:27');
  });
});
