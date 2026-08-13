import { describe, expect, it } from 'vitest';

import { utcMsFromWall } from './calendar';
import { daeunDirection, daeunList, daeunStart, sewoonList } from './daeun';
import type { Gender } from './daeun';
import {
  VERIFIED_CASES,
  caseById,
  correctionOptions,
  parseBirth,
} from './fixtures/cases';
import { indexFromPillar, monthPillar, sajuYear, yearPillar } from './pillars';
import { NORMALIZED_OFFSET_SECONDS, correctBirthTime } from './time';
import type { CaseInput } from './fixtures/cases';

/** 케이스의 벽시계를 파이프라인에 태워 물리적 시각을 얻는다. docs/05 7장. */
function caseUtcMs(input: CaseInput): number {
  return correctBirthTime(parseBirth(input.birth), correctionOptions(input))
    .utcMs;
}

/** KST 벽시계 문자열을 물리적 시각으로. 파이프라인을 태우지 않는다. */
const kst = (text: string): number =>
  utcMsFromWall(parseBirth(text), NORMALIZED_OFFSET_SECONDS);

describe('대운 방향', () => {
  it('년간 음양과 성별 네 조합이 docs/05 9장 1항대로 갈린다', () => {
    // 픽스처 넷이 이 조합을 겨냥해 만들어져 있다. 1996년은 병(양), 1997년은 정(음)이다.
    const combos: [string, Gender, string][] = [
      ['daeun-yang-male', 'M', 'forward'],
      ['daeun-yang-female', 'F', 'backward'],
      ['daeun-yin-male', 'M', 'backward'],
      ['daeun-yin-female', 'F', 'forward'],
    ];

    for (const [id, gender, expected] of combos) {
      const at = caseUtcMs(caseById(id).input);
      expect(daeunDirection(at, gender), `${id} (${yearPillar(at)})`).toBe(
        expected,
      );
    }
  });

  it('픽스처가 주장하는 년간 음양이 실제와 맞는다', () => {
    // 케이스가 겨냥한 조합에 실제로 들어 있는지 본다. 입력이 밀리면 조용히 통과한다.
    expect(yearPillar(caseUtcMs(caseById('daeun-yang-male').input))).toBe(
      '병자',
    );
    expect(yearPillar(caseUtcMs(caseById('daeun-yin-male').input))).toBe(
      '정축',
    );
  });

  it('같은 출생에서 남녀가 반대 방향이다', () => {
    const at = kst('1990-05-15T14:30:00');
    expect(daeunDirection(at, 'M')).not.toBe(daeunDirection(at, 'F'));
  });
});

describe('대운수', () => {
  it('기준 케이스의 대운수를 재현한다', () => {
    // 갑술년 여자라 역행이고 직전 절입인 소한까지 21.42일이다. 3으로 나누면 7.14년이다.
    const c = caseById('verified-19950127-1439-F-seoul');
    if (!c.verified) throw new Error('기준 케이스가 verified 가 아니다');

    const start = daeunStart(caseUtcMs(c.input), c.input.gender);
    expect(start.direction).toBe(c.expected.daeun?.direction);
    expect(start.startAge).toBe(c.expected.daeun?.startAge);
  });

  it('나머지를 버린다', () => {
    // docs/05 9장 2항. 7.14년의 몫은 7이고 0.14년을 개월로 올려 8로 만들지 않는다.
    const c = caseById('verified-19950127-1439-F-seoul');
    const start = daeunStart(caseUtcMs(c.input), 'F');

    expect(start.years).toBeGreaterThan(7);
    expect(start.years).toBeLessThan(8);
    expect(start.startAge).toBe(7);

    // 소수부가 0.5 를 넘는 자리라야 반올림과 갈린다. 2024-04-20 순행이 4.96년이다.
    // 이 단언이 없으면 Math.round 로 바꿔도 테스트가 전부 통과한다.
    const half = daeunStart(kst('2024-04-20T12:00:00'), 'M');
    expect(half.years).toBeGreaterThan(4.5);
    expect(half.years).toBeLessThan(5);
    expect(half.startAge).toBe(4);
  });

  it('기준 절입이 방향에 따라 갈린다', () => {
    const at = kst('1990-05-15T14:30:00');

    // 순행은 다음 절입, 역행은 직전 절입을 본다. 둘 다 출생을 사이에 두고 반대편이다.
    expect(daeunStart(at, 'M').termUtcMs).toBeGreaterThan(at);
    expect(daeunStart(at, 'F').termUtcMs).toBeLessThanOrEqual(at);
  });

  it('중기는 기준이 아니다', () => {
    // 2024년 곡우(청명 04-04 와 입하 05-05 사이의 중기)는 04-19 23:00 이다.
    // 곡우를 사이에 두고 두 출생이 필요하다. 한 출생으로는 한쪽 방향만 갈린다.
    const day = 86_400_000;

    // 곡우 앞에서는 순행이 갈린다. 입하까지 24.88일인데 곡우를 세면 9.46일이다.
    const before = daeunStart(kst('2024-04-10T12:00:00'), 'M');
    expect(before.gapMs / day).toBeGreaterThan(15);

    // 곡우 뒤에서는 역행이 갈린다. 청명까지 20.83일인데 곡우를 세면 5.54일이다.
    const after = daeunStart(kst('2024-04-25T12:00:00'), 'F');
    expect(after.gapMs / day).toBeGreaterThan(15);
  });

  it('절입일 당일 출생은 역행 대운수가 0 이다', () => {
    // docs/05 10장의 절입일 당일 항목이다. 2024년 입하는 KST 05-05 09:10 이다.
    const at = caseUtcMs(caseById('daeun-on-term-day').input);

    expect(daeunStart(at, 'F').startAge).toBe(0);

    // 같은 출생이라도 순행은 다음 절입인 망종까지 31일 남아 10 이다.
    // 성별로 가장 크게 갈리는 자리이고 대운수 상한이기도 하다.
    expect(daeunStart(at, 'M').startAge).toBe(10);
  });

  it('절입 순간에 태어나면 간격이 정확히 0 이다', () => {
    // 절기 데이터가 분 단위라 같은 순간을 만들 수 있다. 등호가 어느 쪽에 붙는지 본다.
    const exact = kst('2024-05-05T09:10:00');

    expect(daeunStart(exact, 'F').gapMs).toBe(0);
    expect(daeunStart(exact, 'F').startAge).toBe(0);
  });

  it('지원 범위 밖은 던진다', () => {
    expect(() => daeunStart(kst('1899-06-01T12:00:00'), 'M')).toThrow(
      RangeError,
    );
    expect(() => daeunStart(kst('2101-06-01T12:00:00'), 'M')).toThrow(
      RangeError,
    );
  });
});

describe('대운 간지', () => {
  it('기준 케이스의 첫 대운을 재현한다', () => {
    const c = caseById('verified-19950127-1439-F-seoul');
    if (!c.verified) throw new Error('기준 케이스가 verified 가 아니다');

    const list = daeunList(caseUtcMs(c.input), c.input.gender);
    expect(list[0].pillar).toBe(c.expected.daeun?.first);
    expect(list[0].startAge).toBe(c.expected.daeun?.startAge);
  });

  it('첫 대운은 월주가 아니라 그 다음 간지다', () => {
    // docs/05 9장 3항. 월주는 원국이므로 대운에 다시 나오지 않는다.
    // 기준 케이스의 월주가 정축이라 역행은 앞의 병자, 순행은 뒤의 무인이다.
    const at = caseUtcMs(caseById('verified-19950127-1439-F-seoul').input);

    expect(monthPillar(at)).toBe('정축');
    expect(daeunList(at, 'F')[0].pillar).toBe('병자');
    expect(daeunList(at, 'M')[0].pillar).toBe('무인');
  });

  it('열 개가 방향대로 한 칸씩 나아간다', () => {
    const at = kst('1990-05-15T14:30:00');

    for (const [gender, step] of [
      ['M', 1],
      ['F', -1],
    ] as const) {
      const list = daeunList(at, gender);
      // docs/05 9장 3항의 "10개" 를 여기서 고정한다. 개수 단언은 이 한 곳뿐이다.
      expect(list.length).toBe(10);

      for (let i = 1; i < list.length; i++) {
        const diff =
          indexFromPillar(list[i].pillar) - indexFromPillar(list[i - 1].pillar);
        expect(((diff % 60) + 60) % 60, `${gender} ${i}번째`).toBe(
          ((step % 60) + 60) % 60,
        );
      }
    }
  });

  it('나이와 사주 연도가 십년씩 나아간다', () => {
    // 대운수 7 이라 나이가 7 에서 97 까지다. docs/05 9장 3항과 4항.
    // 구현의 산술을 다시 쓰지 않고 값을 적는다. 되풀이하면 어느 쪽이 틀려도 함께 틀린다.
    const list = daeunList(kst('1990-05-15T14:30:00'), 'M');

    expect(list.map((d) => d.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // 1990년은 경오년이고 경이 양간이라 남자는 순행이다. 열 개가 같은 값을 담는다.
    expect(list.every((d) => d.direction === 'forward')).toBe(true);
    expect(list.map((d) => d.startAge)).toEqual([
      7, 17, 27, 37, 47, 57, 67, 77, 87, 97,
    ]);
    expect(list.map((d) => d.endAge)).toEqual([
      16, 26, 36, 46, 56, 66, 76, 86, 96, 106,
    ]);
    // 5월 출생은 생일이 입춘에서 멀어 산술값과 같다.
    expect(list.map((d) => d.startYear)).toEqual([
      1997, 2007, 2017, 2027, 2037, 2047, 2057, 2067, 2077, 2087,
    ]);
  });

  it('절기 데이터 범위를 넘는 대운은 연도만 빈다', () => {
    // docs/05 9.3. 대운 열 개면 출생에서 100년 뒤까지 가고 데이터는 2100년에서 끝난다.
    // 그 해가 어느 사주 연도인지는 입춘 시각을 알아야 정해지므로 연도만 비운다.
    const list = daeunList(kst('2015-05-15T12:00:00'), 'M');

    // 2015년은 을미년이고 을이 음간이라 남자는 역행이다. 월주 신사에서 거꾸로 진행한다.
    expect(list.every((d) => d.direction === 'backward')).toBe(true);
    // 데이터 밖에서도 간지와 나이는 그대로 나온다. 비는 것은 연도뿐이다.
    expect(list[9].pillar).toBe('신미');
    expect(list[9].startAge).toBe(93);
    expect(list[9].startYear).toBeNull();

    // 이른 대운은 데이터 안이다. 과하게 비우면 여기서 걸린다.
    expect(list[0].startYear).toBe(2018);
  });

  it('입춘 부근 출생도 대운 열 개를 낸다', () => {
    // docs/05 9.3 과 10장. verified 픽스처 둘이 KST 2월 4일이고
    // 이 출생의 늦은 대운이 데이터 경계를 넘는다. 입력은 지원 범위 안이라 거부 대상이 아니다.
    for (const id of ['ipchun-2024-before', 'ipchun-2024-after']) {
      // 고치기 전에는 이 호출이 RangeError 로 끝났다.
      const list = daeunList(caseUtcMs(caseById(id).input), 'M');

      // 대운수 9 라 여덟째부터 2100년을 넘는다. 앞의 일곱은 값이 있어야 한다.
      expect(
        list.map((d) => d.startYear),
        id,
      ).toEqual([2033, 2043, 2053, 2063, 2073, 2083, 2093, null, null, null]);
    }

    // 두 케이스는 입춘을 사이에 두고 월주가 갈리므로 대운 간지도 갈린다.
    const before = daeunList(
      caseUtcMs(caseById('ipchun-2024-before').input),
      'M',
    );
    const after = daeunList(
      caseUtcMs(caseById('ipchun-2024-after').input),
      'M',
    );
    expect(before[0].pillar).toBe('갑자');
    expect(after[0].pillar).toBe('정묘');
  });

  it('다른 계보의 구현과 값이 같다', () => {
    // 선행 프로젝트(/Users/mychoi/f-lab/saju)는 대운을 lunar-typescript 에 맡겼고
    // 그 결과가 core/extended.test.ts 에 기준값으로 박혀 있다.
    // 우리 구현과 계보가 완전히 다르므로 산술을 독립적으로 확인해 준다.
    //
    // 그쪽은 벽시계를 서울 관례 -30분 옮긴 뒤 절기 비교까지 그 값으로 한다.
    // 우리는 진태양시를 시지 판정에만 쓰고 절기 비교에는 쓰지 않는다(docs/05 7.3).
    // 그래서 두 구현의 기준 시각이 30분 어긋나는데, 5월 중순이라 절입에서 멀어
    // 대운수가 흔들리지 않는다. 절입 근처 케이스를 더할 때는 이 여유가 없다.
    const at = kst('1990-05-15T14:30:00');

    const first = daeunList(at, 'M')[0];
    expect(first.pillar).toBe('임오');
    expect(first.startAge).toBe(7);
    expect(first.startYear).toBe(1997);
    expect(sewoonList(at, first)[0]).toEqual({
      age: 7,
      year: 1997,
      pillar: '정축',
    });
  });

  it('모든 verified 케이스의 대운을 재현한다', () => {
    const withDaeun = VERIFIED_CASES.filter((c) => c.expected.daeun);
    expect(withDaeun.length).toBeGreaterThan(0);

    for (const c of withDaeun) {
      const daeun = c.expected.daeun;
      if (!daeun) continue;

      const list = daeunList(caseUtcMs(c.input), c.input.gender);
      expect(list[0].pillar, `${c.id} 첫 대운`).toBe(daeun.first);
      expect(list[0].startAge, `${c.id} 대운수`).toBe(daeun.startAge);
      expect(
        daeunDirection(caseUtcMs(c.input), c.input.gender),
        `${c.id} 방향`,
      ).toBe(daeun.direction);
    }
  });
});

describe('입춘 직전 출생의 대운 시작 연도', () => {
  it('산술로 더한 값과 갈리는 자리가 있다', () => {
    // docs/05 9.2. 1901년 입춘 1분 전 출생이라 사주 연도가 1900 이다.
    // 만 20세가 되는 1921-02-04 20:38 은 그 해 입춘을 이미 지났으므로 1921년이다.
    const at = kst('1901-02-04T20:38:00');
    expect(sajuYear(at)).toBe(1900);

    const twenty = daeunList(at, 'M').find((d) => d.startAge === 20);
    if (!twenty) throw new Error('만 20세에 시작하는 대운이 없다');

    // 산술이면 1900 + 20 = 1920 이다. 생일 기준이면 1921 이다.
    expect(twenty.startYear).toBe(1921);
    expect(twenty.startYear).not.toBe(sajuYear(at) + twenty.startAge);

    // 세운 열 해가 통째로 한 칸 밀린다. 조용히 틀리는 유형이라 간지까지 본다.
    expect(sewoonList(at, twenty)[0].pillar).toBe(
      yearPillar(kst('1921-06-01T12:00:00')),
    );
  });

  it('입춘에서 먼 출생은 산술값과 같다', () => {
    // 지름길이 과하게 걸려 정상 케이스를 흔들지 않는지 본다.
    const at = kst('1901-08-15T12:00:00');
    for (const daeun of daeunList(at, 'F')) {
      expect(daeun.startYear).toBe(sajuYear(at) + daeun.startAge);
    }
  });

  it('표준시가 다르던 시기 출생도 세운이 입춘 경계에서 갈린다', () => {
    // 표준시가 UTC+8:30 이던 1955년의 현지 23:45 출생이다.
    // 정규화하면 다음날 00:15 이고 만 66세 생일이 2021 입춘(KST 02-03 23:59)을 16분 지난다.
    // 파이프라인의 30분 정규화가 빠지면 이 16분이 뒤집혀 2020년이 된다.
    //
    // 생일을 어느 프레임에서 읽는지는 이 값을 가르지 않는다. docs/05 9.2.
    // 읽을 때와 되돌릴 때 오프셋이 같아 날짜 라벨만 옮겨간다.
    const { utcMs, normalized } = correctBirthTime(
      parseBirth('1955-02-03T23:45:00'),
      { longitude: 126.98 },
    );

    expect(normalized).toEqual({
      year: 1955,
      month: 2,
      day: 4,
      hour: 0,
      minute: 15,
    });

    const daeun = daeunList(utcMs, 'M').find(
      (d) => d.startAge <= 66 && 66 <= d.endAge,
    );
    if (!daeun) throw new Error('만 66세를 덮는 대운이 없다');

    const sixtySix = sewoonList(utcMs, daeun).find((s) => s.age === 66);
    expect(sixtySix?.year).toBe(2021);
    expect(sixtySix?.pillar).toBe('신축');
  });
});

describe('세운', () => {
  it('연도를 나이별 생일로 판정한다', () => {
    // docs/05 9장 5항과 9.2. 1901년 입춘 1분 전 출생이라 사주 연도가 1900 이다.
    // 생일이 2월 4일이라 입춘과 엎치락뒤치락한다. 만 4세와 만 5세 생일이 모두
    // 1905년에 들고 1904년에는 생일이 없다. 산술이면 1900 에서 1909 로 고르게 는다.
    const at = kst('1901-02-04T20:38:00');
    const first = daeunList(at, 'M')[0];
    const sewoon = sewoonList(at, first);

    expect(sewoon.map((s) => s.age)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(sewoon.map((s) => s.year)).toEqual([
      1900, 1901, 1902, 1903, 1905, 1905, 1906, 1907, 1909, 1909,
    ]);
  });

  it('데이터 밖 해는 연도와 간지가 함께 빈다', () => {
    // docs/05 9.3. 마지막 세운 나이가 대운수 + 99 라 대운 시작 연도보다 먼저 걸린다.
    // 1992-04-05 출생 남자는 대운수가 10 이라 마지막 세운이 만 109세, 2101년이다.
    const at = kst('1992-04-05T12:00:00');
    const last = sewoonList(at, daeunList(at, 'M')[9]);

    expect(last.map((s) => s.age)).toEqual([
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
    ]);
    expect(last.map((s) => s.year)).toEqual([
      2092,
      2093,
      2094,
      2095,
      2096,
      2097,
      2098,
      2099,
      2100,
      null,
    ]);
    // 연도가 비는 해만 간지가 빈다. 나머지 아홉은 그 해의 년주 그대로다.
    expect(last.map((s) => s.pillar)).toEqual([
      '임자',
      '계축',
      '갑인',
      '을묘',
      '병진',
      '정사',
      '무오',
      '기미',
      '경신',
      null,
    ]);
  });

  it('대운 열 개의 나이가 빈틈없이 이어진다', () => {
    // 축이 나이라는 것이 여기서 고정된다. docs/05 9.2.
    // 연도를 축으로 삼으면 이 어긋남이 대운 사이로 옮겨가 겹치는 해나 빈 해가 생긴다.
    const at = kst('1901-02-04T20:38:00');
    const list = daeunList(at, 'M');
    const ages = list.flatMap((d) => sewoonList(at, d).map((s) => s.age));

    // 이 출생은 대운수가 0 이라 만 0세에서 99세까지 한 번씩 덮는다.
    expect(ages).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it('열 해가 나이와 함께 이어진다', () => {
    // 대운수 7 이고 1997년에 열린다. 열 해가 모두 절기 데이터 안이다.
    const at = kst('1990-05-15T14:30:00');
    const sewoon = sewoonList(at, daeunList(at, 'M')[0]);

    expect(sewoon.map((s) => s.age)).toEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    expect(sewoon.map((s) => s.year)).toEqual([
      1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006,
    ]);
    // 간지도 값으로 적는다. 년주와 세운이 같은 앵커에서 나오므로
    // 둘을 맞대면 앵커가 흔들릴 때 양쪽이 함께 흔들려 통과한다.
    expect(sewoon.map((s) => s.pillar)).toEqual([
      '정축',
      '무인',
      '기묘',
      '경진',
      '신사',
      '임오',
      '계미',
      '갑신',
      '을유',
      '병술',
    ]);
  });

  it('세운 간지가 그 해의 년주와 같다', () => {
    // docs/05 9장 5항. 세운은 년주와 같은 규칙이라 따로 정할 것이 없다.
    // 값 자체는 위 테스트가 리터럴로 잡는다. 여기는 두 경로가 같은 답을 내는지만 본다.
    const at = kst('1990-05-15T14:30:00');

    for (const s of sewoonList(at, daeunList(at, 'M')[0])) {
      // 입춘을 지난 시각으로 년주를 뽑아 대조한다.
      expect(s.pillar, `${s.year}년`).toBe(
        yearPillar(kst(`${s.year}-06-01T12:00:00`)),
      );
    }
  });

  it('60갑자 순서로 한 칸씩 나아간다', () => {
    const at = kst('1990-05-15T14:30:00');
    const sewoon = sewoonList(at, daeunList(at, 'M')[0]);

    // 5월 출생이라 열 해가 겹치거나 건너뛰지 않고 데이터 안이다.
    for (let i = 1; i < sewoon.length; i++) {
      const pillar = sewoon[i].pillar;
      const before = sewoon[i - 1].pillar;
      if (pillar === null || before === null) throw new Error('간지가 비었다');

      const diff = indexFromPillar(pillar) - indexFromPillar(before);
      expect(((diff % 60) + 60) % 60).toBe(1);
    }
  });
});
