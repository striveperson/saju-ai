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
import { indexFromPillar, monthPillar, yearPillar } from './pillars';
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
  it('년간 음양과 성별 네 조합이 docs/05 9.1 표대로 갈린다', () => {
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
    // docs/05 9.2. 7.14년의 몫은 7이고 0.14년을 개월로 올려 8로 만들지 않는다.
    const c = caseById('verified-19950127-1439-F-seoul');
    const start = daeunStart(caseUtcMs(c.input), 'F');

    expect(start.years).toBeGreaterThan(7);
    expect(start.years).toBeLessThan(8);
    expect(start.startAge).toBe(7);
  });

  it('기준 절입이 방향에 따라 갈린다', () => {
    const at = kst('1990-05-15T14:30:00');

    // 순행은 다음 절입, 역행은 직전 절입을 본다. 둘 다 출생을 사이에 두고 반대편이다.
    expect(daeunStart(at, 'M').termUtcMs).toBeGreaterThan(at);
    expect(daeunStart(at, 'F').termUtcMs).toBeLessThanOrEqual(at);
  });

  it('중기는 기준이 아니다', () => {
    // 2024년 곡우(청명과 입하 사이의 중기)는 04-19 다. 그 앞뒤 어느 쪽도 기준이 되면 안 된다.
    const at = kst('2024-04-20T12:00:00');
    const forward = daeunStart(at, 'M');
    const backward = daeunStart(at, 'F');

    // 청명 04-04 와 입하 05-05 가 감싼다. 곡우가 걸리면 간격이 하루 남짓으로 줄어든다.
    expect(forward.gapMs / 86_400_000).toBeGreaterThan(10);
    expect(backward.gapMs / 86_400_000).toBeGreaterThan(10);
  });

  it('절입 순간에 태어나면 역행 대운수가 0 이다', () => {
    // docs/05 10장의 절입일 당일 항목이다. 2024년 입하는 KST 05-05 09:10 이다.
    const at = kst('2024-05-05T09:10:00');

    expect(daeunStart(at, 'F').gapMs).toBe(0);
    expect(daeunStart(at, 'F').startAge).toBe(0);

    // 같은 순간이라도 순행은 다음 절입까지 한 달 가까이 남는다.
    expect(daeunStart(at, 'M').startAge).toBeGreaterThan(8);
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
    // docs/05 9.3. 월주는 원국이므로 대운에 다시 나오지 않는다.
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
      expect(daeun.startAge).toBe(list[0].startAge + i * 10);
      expect(daeun.endAge).toBe(daeun.startAge + 9);
      // docs/05 9.5. 대운이 시작하는 사주 연도는 출생 연도에 시작 나이를 더한 값이다.
      expect(daeun.startYear).toBe(birthYear + daeun.startAge);
    }
  });

  it('다른 계보의 구현과 값이 같다', () => {
    // 선행 프로젝트(/Users/mychoi/f-lab/saju)는 대운을 lunar-typescript 에 맡겼고
    // 그 결과가 core/extended.test.ts 에 기준값으로 박혀 있다.
    // 우리 구현과 계보가 완전히 다르므로 산술을 독립적으로 확인해 준다.
    //
    // 그쪽 보정은 서울 관례 -30분이고 우리는 경도 126.98도에서 -32분이다.
    // 5월 중순이라 절입에서 멀어 2분 차이가 대운수를 흔들지 않는다.
    const at = correctBirthTime(parseBirth('1990-05-15T14:30:00'), {
      longitude: 126.98,
    }).utcMs;

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
    // docs/05 9.5. 세운은 년주와 같은 규칙이라 따로 정할 것이 없다.
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
