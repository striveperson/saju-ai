import { describe, expect, it } from 'vitest';

import { computeChart, computeReading, computeSaju } from './chart';

import type { ChartInput } from './chart';

/** 검증 케이스 verified-19950127-1439-F-seoul. 기대값은 fixtures/cases.ts 에 있다. */
const 기준: ChartInput = {
  calendar: 'solar',
  birth: { year: 1995, month: 1, day: 27, hour: 14, minute: 39 },
  gender: 'F',
  longitude: 126.98,
  ziPolicy: 'nextDay',
};

/** 검증 케이스 lunar-leap-month. 1993년 윤3월 15일이다. */
const 음력윤달: ChartInput = {
  calendar: 'lunar',
  leapMonth: true,
  birth: { year: 1993, month: 3, day: 15, hour: 10, minute: 0 },
  gender: 'M',
  longitude: 126.98,
  ziPolicy: 'nextDay',
};

describe('computeChart', () => {
  it('네 기둥이 픽스처와 같다', () => {
    expect(computeChart(기준).pillars).toEqual({
      year: '갑술',
      month: '정축',
      day: '무오',
      hour: '기미',
    });
  });

  it('음력 입력을 양력으로 옮긴 뒤 팔자를 뽑는다', () => {
    const chart = computeChart(음력윤달);

    expect(chart.solar).toEqual({
      year: 1993,
      month: 5,
      day: 6,
      hour: 10,
      minute: 0,
    });
    expect(chart.pillars).toEqual({
      year: '계유',
      month: '정사',
      day: '정해',
      hour: '을사',
    });
  });

  it('양력 입력의 solar 는 birth 그대로다', () => {
    expect(computeChart(기준).solar).toEqual(기준.birth);
  });

  it('보정 내역을 그대로 넘긴다', () => {
    const { correction } = computeChart(기준);

    expect(correction.disclosure.trueSolar.minutes).toBe(-32);
    expect(correction.disclosure.trueSolar.fallback).toBe(false);
    expect(correction.recorded).toEqual(기준.birth);
  });

  it('경도를 안 주면 폴백을 쓰고 그 사실을 남긴다', () => {
    const { longitude: _생략, ...경도없음 } = 기준;
    const { correction } = computeChart(경도없음);

    expect(correction.disclosure.trueSolar.fallback).toBe(true);
    expect(correction.disclosure.notices).toContain('true-solar-fallback');
  });

  it('대운 열 개를 내고 첫 대운이 픽스처와 같다', () => {
    const { daeun } = computeChart(기준);

    expect(daeun).toHaveLength(10);
    expect(daeun[0].direction).toBe('backward');
    expect(daeun[0].startAge).toBe(7);
    expect(daeun[0].pillar).toBe('병자');
  });

  it('적용한 유파 값을 담는다. 안 준 것은 기본값이다', () => {
    // docs/05 6장, 7장, CLAUDE.md 유파 표의 기본값이다.
    expect(computeChart(기준).applied).toEqual({
      ziPolicy: 'nextDay',
      dstAssumption: 'unknown',
      ambiguityChoice: 'earlier',
    });
  });

  it('준 유파 값을 그대로 담는다', () => {
    const chart = computeChart({
      ...기준,
      ziPolicy: 'sameDay',
      dstAssumption: 'standard',
      ambiguityChoice: 'later',
    });

    expect(chart.applied).toEqual({
      ziPolicy: 'sameDay',
      dstAssumption: 'standard',
      ambiguityChoice: 'later',
    });
  });

  it('일주와 시주는 보정된 벽시계를 쓴다. 기록 시계가 아니다', () => {
    // 검증 케이스 zi-2259. 기록 23:31 이 진태양시 -32분으로 22:59 가 된다.
    // 기록 시계로 판정하면 자시라 정자시설에서 일주가 을해, 시주가 병자로 넘어간다.
    // 보정된 22:59 는 해시라 갑술 을해다. docs/05 7장이 이 둘을 갈라 놓았다.
    const chart = computeChart({
      ...기준,
      birth: { year: 1990, month: 3, day: 10, hour: 23, minute: 31 },
      gender: 'M',
    });

    expect(chart.pillars.day).toBe('갑술');
    expect(chart.pillars.hour).toBe('을해');
  });

  it('년주와 월주는 물리적 시각을 쓴다. 절입 2분 사이로 갈린다', () => {
    // 검증 케이스 ipchun-2024-before 와 after. 2024년 입춘이 KST 17:27 이다.
    const 전 = { year: 2024, month: 2, day: 4, hour: 17, minute: 26 };
    const 후 = { ...전, minute: 28 };

    expect(computeChart({ ...기준, birth: 전 }).pillars).toMatchObject({
      year: '계묘',
      month: '을축',
    });
    expect(computeChart({ ...기준, birth: 후 }).pillars).toMatchObject({
      year: '갑진',
      month: '병인',
    });
  });

  it('야자시 정책이 일주를 가른다', () => {
    // 보정 후 23시대로 넘어가는 케이스. docs/05 6장.
    const 밤 = {
      ...기준,
      birth: { year: 1990, month: 3, day: 10, hour: 23, minute: 50 },
      gender: 'M',
    } as const;

    expect(computeChart({ ...밤, ziPolicy: 'nextDay' }).pillars.day).not.toBe(
      computeChart({ ...밤, ziPolicy: 'sameDay' }).pillars.day,
    );
  });

  it('기본값으로 고른 것을 사용자가 고른 것으로 표시하지 않는다', () => {
    // 검증 케이스 tz-19540321-before. 표준시가 9시간에서 8시간 30분으로 돌아가
    // 이 벽시계가 두 번 존재한다. docs/05 7.4 가 그 구분을 요구한다.
    const 모호 = {
      ...기준,
      birth: { year: 1954, month: 3, day: 20, hour: 23, minute: 30 },
    };

    const 안줌 = computeChart(모호).correction.disclosure.resolution;
    if (안줌.kind !== 'ambiguous') throw new Error('모호해야 한다');
    expect(안줌.chosen).toBe('earlier');
    expect(안줌.because).toBe('default');

    // 같은 쪽을 사용자가 직접 고르면 고른 쪽은 같고 사유만 갈린다.
    const 직접 = computeChart({ ...모호, ambiguityChoice: 'earlier' })
      .correction.disclosure.resolution;
    if (직접.kind !== 'ambiguous') throw new Error('모호해야 한다');
    expect(직접.chosen).toBe('earlier');
    expect(직접.because).toBe('option');
  });

  it('세운을 담지 않는다. 어느 대운의 것인지는 소비자가 고른다', () => {
    // docs/05 12.3. 대운을 고르는 기준이 현재 시각이고 엔진은 그것을 읽지 않는다.
    expect(computeChart(기준)).not.toHaveProperty('sewoon');
  });

  it('지원 범위 밖 양력은 던진다', () => {
    expect(() =>
      computeChart({ ...기준, birth: { ...기준.birth, year: 2101 } }),
    ).toThrow(RangeError);
  });

  it('음력 범위 밖은 음력 표기로 던진다', () => {
    // KASI 음력 데이터가 2050년 11월에서 끝난다. docs/05 8.2.
    expect(() =>
      computeChart({
        calendar: 'lunar',
        leapMonth: false,
        birth: { year: 2050, month: 12, day: 1, hour: 10, minute: 0 },
        gender: 'M',
        longitude: 126.98,
        ziPolicy: 'nextDay',
      }),
    ).toThrow(/음력/);
  });
});

describe('computeReading', () => {
  const 팔자 = computeChart(기준).pillars;

  it('강약과 용신을 낸다', () => {
    const { strength } = computeReading(팔자);

    expect(strength.grade).toBe('태강');
    expect(strength.yongshin?.element).toBe('금');
    expect(strength.supportCount).toBe(6);
  });

  it('신살을 낸다', () => {
    const { sinsal } = computeReading(팔자);

    expect(sinsal.map((each) => each.name)).toContain('양인');
  });

  it('유파 옵션을 강약으로 넘긴다', () => {
    // docs/05 11.3. 인성을 빼면 이 케이스는 태강에서 내려온다.
    const 좁힘 = computeReading(팔자, { supportIncludesResource: false });

    expect(좁힘.strength.applied.supportIncludesResource).toBe(false);
    expect(좁힘.strength.grade).not.toBe('태강');
  });
});

describe('computeSaju', () => {
  it('파이프라인과 판정을 이어 붙인다', () => {
    const saju = computeSaju(기준);

    expect(saju.chart.pillars.day).toBe('무오');
    expect(saju.reading.strength.grade).toBe('태강');
    expect(saju.reading.sinsal.length).toBeGreaterThan(0);
  });

  it('각 층을 따로 부른 것과 같은 값을 낸다', () => {
    const saju = computeSaju(기준);
    const chart = computeChart(기준);

    expect(saju.chart).toEqual(chart);
    expect(saju.reading).toEqual(computeReading(chart.pillars));
  });
});
