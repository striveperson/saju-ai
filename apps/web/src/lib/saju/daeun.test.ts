import { describe, expect, it } from 'vitest';

import { utcMsFromWall, wallFromUtcMs } from './calendar';
import { solarTerms } from './data/solar-terms';
import { daeunDirection, daeunList, daeunStart, sewoonList } from './daeun';
import type { Gender } from './daeun';
import {
  VERIFIED_CASES,
  caseById,
  correctionOptions,
  parseBirth,
} from './fixtures/cases';
import { indexFromPillar, monthPillar, sajuYear, yearPillar } from './pillars';
import { correctBirthTime } from './time';
import type { CaseInput } from './fixtures/cases';

/** 케이스의 벽시계를 파이프라인에 태워 물리적 시각을 얻는다. docs/05 7장. */
function caseUtcMs(input: CaseInput): number {
  return correctBirthTime(parseBirth(input.birth), correctionOptions(input))
    .utcMs;
}

/** KST 벽시계 문자열을 물리적 시각으로. 파이프라인을 태우지 않는다. */
const kst = (text: string): number => utcMsFromWall(parseBirth(text), 32_400);

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
    // 2024년 곡우(청명과 입하 사이의 중기)는 04-19 다.
    // 출생을 절과 중기 사이에 두어야 순행과 역행 양쪽에서 중기가 걸릴 수 있다.
    // 곡우 뒤에서 재면 순행 탐색이 애초에 곡우를 지나쳐 아무것도 잡지 못한다.
    const at = kst('2024-04-10T12:00:00');
    const forward = daeunStart(at, 'M');
    const backward = daeunStart(at, 'F');

    // 청명 04-04 와 입하 05-05 가 감싼다. 곡우가 섞이면 양쪽 다 열흘 아래로 줄어든다.
    expect(forward.gapMs / 86_400_000).toBeGreaterThan(10);
    expect(backward.gapMs / 86_400_000).toBeGreaterThan(5);
  });

  it('절입일 당일 출생은 역행 대운수가 0 이다', () => {
    // docs/05 10장의 절입일 당일 항목이다. 2024년 입하는 KST 05-05 09:10 이다.
    const at = caseUtcMs(caseById('daeun-on-term-day').input);

    expect(daeunStart(at, 'F').startAge).toBe(0);

    // 같은 출생이라도 순행은 다음 절입까지 한 달 가까이 남는다. 성별로 가장 크게 갈린다.
    expect(daeunStart(at, 'M').startAge).toBeGreaterThan(8);
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
    const at = caseUtcMs(caseById('verified-19950127-1439-F-seoul').input);
    const month = indexFromPillar(monthPillar(at));

    const backward = daeunList(at, 'F');
    const forward = daeunList(at, 'M');

    expect(indexFromPillar(backward[0].pillar)).toBe((month - 1 + 60) % 60);
    expect(indexFromPillar(forward[0].pillar)).toBe((month + 1) % 60);
  });

  it('열 개가 방향대로 한 칸씩 나아간다', () => {
    const at = kst('1990-05-15T14:30:00');

    for (const [gender, step] of [
      ['M', 1],
      ['F', -1],
    ] as const) {
      const list = daeunList(at, gender);
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
    const at = kst('1990-05-15T14:30:00');
    const list = daeunList(at, 'M');
    const birthYear = 1990;

    for (const [i, daeun] of list.entries()) {
      expect(daeun.index).toBe(i);
      expect(daeun.direction).toBe('forward');
      expect(daeun.startAge).toBe(list[0].startAge + i * 10);
      expect(daeun.endAge).toBe(daeun.startAge + 9);
      // 5월 출생은 생일이 입춘에서 멀어 산술값과 같다.
      expect(daeun.startYear).toBe(birthYear + daeun.startAge);
    }
  });

  it('절기 데이터 범위를 넘는 대운도 시작 연도를 낸다', () => {
    // 대운 열 개면 출생에서 100년 뒤까지 간다. 데이터는 2100년에서 끝난다.
    // 입춘 구간 밖 생일은 절기를 보지 않고 답하므로 여기서 막히면 안 된다.
    const list = daeunList(kst('2015-05-15T12:00:00'), 'M');
    expect(list[9].startYear).toBeGreaterThan(2100);
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
    expect(sewoonList(first)[0]).toEqual({
      year: 1997,
      age: 7,
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
  it('입춘이 2월 3일에서 5일 사이에만 놓인다', () => {
    // 구현이 그 폭 밖에서는 절기 데이터를 보지 않는다. 폭이 넓어지면 그 지름길이 틀린다.
    for (const term of solarTerms()) {
      if (term.name !== '입춘') continue;
      const w = wallFromUtcMs(term.utcMs, 32_400);
      expect(w.month, `${w.year}년 입춘`).toBe(2);
      expect(w.day, `${w.year}년 입춘`).toBeGreaterThanOrEqual(3);
      expect(w.day, `${w.year}년 입춘`).toBeLessThanOrEqual(5);
    }
  });

  it('산술로 더한 값과 갈리는 자리가 있다', () => {
    // docs/05 9.7. 1901년 입춘 1분 전 출생이라 사주 연도가 1900 이다.
    // 만 20세가 되는 1921-02-04 20:38 은 그 해 입춘을 이미 지났으므로 1921년이다.
    const at = kst('1901-02-04T20:38:00');
    expect(sajuYear(at)).toBe(1900);

    const twenty = daeunList(at, 'M').find((d) => d.startAge === 20);
    if (!twenty) throw new Error('만 20세에 시작하는 대운이 없다');

    // 산술이면 1900 + 20 = 1920 이다. 생일 기준이면 1921 이다.
    expect(twenty.startYear).toBe(1921);
    expect(twenty.startYear).not.toBe(sajuYear(at) + twenty.startAge);

    // 세운 열 해가 통째로 한 칸 밀린다. 조용히 틀리는 유형이라 간지까지 본다.
    expect(sewoonList(twenty)[0].pillar).toBe(
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
});

describe('세운', () => {
  it('열 해가 나이와 함께 이어진다', () => {
    const at = kst('1990-05-15T14:30:00');
    const first = daeunList(at, 'M')[0];
    const sewoon = sewoonList(first);

    expect(sewoon.length).toBe(10);
    expect(sewoon[0].year).toBe(first.startYear);
    expect(sewoon[0].age).toBe(first.startAge);
    expect(sewoon[9].year).toBe(first.startYear + 9);
    expect(sewoon[9].age).toBe(first.endAge);
  });

  it('세운 간지가 그 해의 년주와 같다', () => {
    // docs/05 9장 5항. 세운은 년주와 같은 규칙이라 따로 정할 것이 없다.
    const at = kst('1990-05-15T14:30:00');

    for (const s of sewoonList(daeunList(at, 'M')[0])) {
      // 입춘을 지난 시각으로 년주를 뽑아 대조한다.
      expect(s.pillar, `${s.year}년`).toBe(
        yearPillar(kst(`${s.year}-06-01T12:00:00`)),
      );
    }
  });

  it('60갑자 순서로 한 칸씩 나아간다', () => {
    const at = kst('1990-05-15T14:30:00');
    const sewoon = sewoonList(daeunList(at, 'M')[0]);

    for (let i = 1; i < sewoon.length; i++) {
      const diff =
        indexFromPillar(sewoon[i].pillar) -
        indexFromPillar(sewoon[i - 1].pillar);
      expect(((diff % 60) + 60) % 60).toBe(1);
    }
  });
});
