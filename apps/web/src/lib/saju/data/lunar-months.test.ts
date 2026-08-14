import { describe, expect, it } from 'vitest';

import { julianDayNumber } from '../calendar';
import {
  LUNAR_FIRST_YEAR,
  LUNAR_LAST_DAY,
  LUNAR_LAST_MONTH,
  LUNAR_LAST_YEAR,
  lunarMonths,
} from './lunar-months';

/**
 * 접힌 표가 펼쳐졌을 때 원본과 같은지는 build-lunar-table.mjs 가 굽기 전에 대조한다.
 * 여기서는 펼친 결과가 음력이 지켜야 할 성질을 만족하는지 본다.
 * 원본 JSON 은 scripts/ 의 중간 산출물이라 런타임 테스트가 읽지 않는다.
 */
describe('음력 달력표', () => {
  const months = lunarMonths();

  it('1867달을 담는다', () => {
    expect(months).toHaveLength(1867);
  });

  it('연도 범위가 상수와 맞는다', () => {
    expect(months[0].year).toBe(LUNAR_FIRST_YEAR);
    expect(months.at(-1)?.year).toBe(LUNAR_LAST_YEAR);
  });

  it('초하루 적일이 순단조로 는다', () => {
    for (let i = 1; i < months.length; i++) {
      expect(months[i].startJdn, `${i}번째`).toBeGreaterThan(
        months[i - 1].startJdn,
      );
    }
  });

  it('앞 해의 마지막 달에 크기를 더하면 다음 해 정월 초하루다', () => {
    // 한 해 안의 초하루는 lunarMonths 가 앞 달에 크기를 더해 만들므로 항상 맞는다.
    // 실효가 있는 것은 해 경계뿐이다. YEARS 는 해마다 정월 적일을 따로 담고 있어
    // 그 값이 앞 해의 달 크기 합과 어긋나면 변환이 그 해부터 조용히 밀린다.
    const boundaries: string[] = [];
    const broken: string[] = [];

    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1];
      if (prev.year === months[i].year) continue;

      boundaries.push(`${prev.year}`);
      if (prev.startJdn + prev.days !== months[i].startJdn) {
        broken.push(`${prev.year} 끝에서 ${months[i].year} 정월`);
      }
    }

    expect(broken).toEqual([]);
    expect(boundaries).toHaveLength(LUNAR_LAST_YEAR - LUNAR_FIRST_YEAR);
  });

  it('달 크기가 29 또는 30 이다', () => {
    expect(months.filter((m) => m.days !== 29 && m.days !== 30)).toEqual([]);
  });

  it('해마다 12달이거나 윤달이 낀 13달이다', () => {
    const perYear = new Map<number, number>();
    for (const m of months) perYear.set(m.year, (perYear.get(m.year) ?? 0) + 1);

    for (const [year, count] of perYear) {
      const leaps = months.filter((m) => m.year === year && m.leap).length;
      // 마지막 해는 11월에서 끊긴다. 윤3월이 있는데도 13달이 아니라 12달이다(docs/05 8.2)
      const expected = year === LUNAR_LAST_YEAR ? 12 : 12 + leaps;
      expect(count, `${year}년`).toBe(expected);
    }
  });

  it('윤달은 해마다 최대 하나이고 같은 번호 평달 바로 뒤에 온다', () => {
    const perYear = new Map<number, number>();

    for (const [i, m] of months.entries()) {
      if (!m.leap) continue;
      perYear.set(m.year, (perYear.get(m.year) ?? 0) + 1);

      const prev = months[i - 1];
      expect(prev.month, `${m.year}-${m.month}윤 앞`).toBe(m.month);
      expect(prev.leap, `${m.year}-${m.month}윤 앞`).toBe(false);
    }

    expect([...perYear.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });

  it('윤달이 든 해와 그 위치가 KASI 표와 같다', () => {
    // 윤달 배치는 관습 규칙이 정하므로 합삭 대조로도 확인되지 않는다.
    // 값을 못 박아 두지 않으면 윤5월을 윤6월로 옮겨도 나머지 단언이 전부 통과한다.
    // 56개는 19년 7윤법이 예측하는 55.6 과 맞는다.
    const placements = months
      .filter((m) => m.leap)
      .map((m) => `${m.year}윤${m.month}`);

    expect(placements).toEqual([
      '1900윤8',
      '1903윤5',
      '1906윤4',
      '1909윤2',
      '1911윤6',
      '1914윤5',
      '1917윤2',
      '1919윤7',
      '1922윤5',
      '1925윤4',
      '1928윤2',
      '1930윤6',
      '1933윤5',
      '1936윤3',
      '1938윤7',
      '1941윤6',
      '1944윤4',
      '1947윤2',
      '1949윤7',
      '1952윤5',
      '1955윤3',
      '1957윤8',
      '1960윤6',
      '1963윤4',
      '1966윤3',
      '1968윤7',
      '1971윤5',
      '1974윤4',
      '1976윤8',
      '1979윤6',
      '1982윤4',
      '1984윤10',
      '1987윤6',
      '1990윤5',
      '1993윤3',
      '1995윤8',
      '1998윤5',
      '2001윤4',
      '2004윤2',
      '2006윤7',
      '2009윤5',
      '2012윤3',
      '2014윤9',
      '2017윤5',
      '2020윤4',
      '2023윤2',
      '2025윤6',
      '2028윤5',
      '2031윤3',
      '2033윤11',
      '2036윤6',
      '2039윤5',
      '2042윤2',
      '2044윤7',
      '2047윤5',
      '2050윤3',
    ]);
  });

  it('첫 달이 1900년 정월이고 양력 1900-01-31 에서 시작한다', () => {
    expect(months[0]).toEqual({
      year: 1900,
      month: 1,
      leap: false,
      days: 29,
      startJdn: julianDayNumber(1900, 1, 31),
    });
  });

  it('마지막 달이 상수가 말하는 자리에서 끝난다', () => {
    // 상한이 해가 아니라 달이다. 연도만 보는 범위 검사가 뚫리는 자리다(docs/05 8.2)
    const last = months.at(-1);

    expect(last?.month).toBe(LUNAR_LAST_MONTH);
    expect(last?.leap).toBe(false);
    expect(last?.days).toBe(LUNAR_LAST_DAY);
    expect(last?.startJdn).toBe(julianDayNumber(2050, 12, 14));

    const lastCoveredJdn = last!.startJdn + last!.days - 1;
    expect(lastCoveredJdn).toBe(julianDayNumber(2051, 1, 12));
  });

  it('1993년 윤3월이 양력 1993-04-22 에서 시작하고 29일이다', () => {
    // 픽스처 lunar-leap-month 가 이 달에 걸린다
    const leap = months.find((m) => m.year === 1993 && m.month === 3 && m.leap);

    expect(leap?.startJdn).toBe(julianDayNumber(1993, 4, 22));
    expect(leap?.days).toBe(29);
  });
});
