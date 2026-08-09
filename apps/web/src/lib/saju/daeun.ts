/**
 * 대운과 세운.
 *
 * 규칙의 단일 진실 공급원은 docs/05-saju-domain-rules.md 9장이다.
 * 방향은 1항, 대운수는 2항, 간지 진행은 3항, 나이 표기는 4항, 세운은 5항이다.
 * 소절 9.6 과 9.7 이 두 결정의 경위를 담는다.
 *
 * 물리적 시각을 받는다. 대운수가 절입 순간과의 간격에서 나오고
 * 그 순간은 지구 전체에 하나이기 때문이다. 일주나 시주와 다른 입력이다.
 *
 * 벽시계에서 물리적 시각으로 가는 변환은 `time.ts` 가 한다. docs/05 7장.
 */

import { wallFromUtcMs, utcMsFromWall } from './calendar';
import type { CalendarDateTime } from './calendar';
import { STEM_POLARITY } from './index';
import type { HeavenlyStem, Pillar } from './index';
import {
  indexFromPillar,
  monthPillar,
  pillarFromIndex,
  pillarOfSajuYear,
  sajuYear,
  surroundingMonthTerms,
  yearPillar,
} from './pillars';

/** 대운 방향을 가르는 입력. 년간 음양과 짝지어 순행과 역행을 정한다. docs/05 9장 1항 */
export type Gender = 'M' | 'F';

/** 순행은 절기 순서대로, 역행은 거꾸로 60갑자를 진행한다. docs/05 9장 1항 */
export type DaeunDirection = 'forward' | 'backward';

/** 3일을 1년으로 환산한다. docs/05 9장 2항 */
const DAYS_PER_DAEUN_YEAR = 3;

const DAY_MS = 86_400_000;

/**
 * 입춘이 놓일 수 있는 날짜. 1900~2100 구간에서 KST 2월 3일부터 5일까지다.
 * daeun.test.ts 가 절기 데이터로 이 폭을 다시 확인한다.
 */
const IPCHUN_FIRST_DAY = 3;
const IPCHUN_LAST_DAY = 5;

/** 사주 연도를 판정할 때 쓰는 시간대. 절기 시각과 같은 프레임이면 된다. */
const KST_OFFSET_SECONDS = 32_400;

/** 대운 하나가 덮는 햇수. */
const DAEUN_SPAN_YEARS = 10;

/** 내놓는 대운 개수. docs/05 9장 3항 */
const DAEUN_COUNT = 10;

/**
 * 이 벽시계가 속한 사주 연도. docs/05 2장의 판정과 결과가 같다.
 *
 * 입춘 구간 밖이면 절기 데이터를 보지 않는다. 대운 열 개가 출생에서 100년 뒤까지 가는데
 * 절기 데이터는 2100년에서 끝나므로, 데이터를 항상 보면 현대 출생의 늦은 대운이 막힌다.
 * 2월 3일부터 5일 사이만 데이터를 보고 나머지는 달력만으로 답한다.
 */
function sajuYearOfWall(at: CalendarDateTime): number {
  if (at.month > 2 || (at.month === 2 && at.day > IPCHUN_LAST_DAY)) {
    return at.year;
  }
  if (at.month === 1 || (at.month === 2 && at.day < IPCHUN_FIRST_DAY)) {
    return at.year - 1;
  }
  return sajuYear(utcMsFromWall(at, KST_OFFSET_SECONDS));
}

/**
 * 대운 방향. docs/05 9장 1항.
 *
 * 년간 음양과 성별이 같은 편이면 순행이다.
 * 양간에 남자, 음간에 여자가 순행이고 엇갈리면 역행이다.
 */
export function daeunDirection(utcMs: number, gender: Gender): DaeunDirection {
  const stem = yearPillar(utcMs)[0] as HeavenlyStem;
  const yang = STEM_POLARITY[stem] === '양';
  return yang === (gender === 'M') ? 'forward' : 'backward';
}

/**
 * 첫 대운이 열리는 지점. docs/05 9장 2항과 4항.
 *
 * 화면이 근거를 보여줄 수 있도록 몫만이 아니라 기준 절입과 간격도 함께 담는다.
 */
export interface DaeunStart {
  direction: DaeunDirection;
  /** 기준이 된 절입 시각. 순행이면 다음 절입, 역행이면 직전 절입이다 */
  termUtcMs: number;
  /** 출생과 그 절입 사이 간격 */
  gapMs: number;
  /** 3일을 1년으로 환산한 값. 몫을 내기 전의 정밀값이다 */
  years: number;
  /** 첫 대운 나이. 만 나이이고 정밀값의 연 단위 몫이다. 나머지는 버린다 */
  startAge: number;
}

/** 첫 대운 나이와 그 근거. docs/05 9장 2항. */
export function daeunStart(utcMs: number, gender: Gender): DaeunStart {
  const direction = daeunDirection(utcMs, gender);
  const { previousUtcMs, nextUtcMs } = surroundingMonthTerms(utcMs);
  const termUtcMs = direction === 'forward' ? nextUtcMs : previousUtcMs;

  const gapMs = Math.abs(termUtcMs - utcMs);
  const years = gapMs / (DAYS_PER_DAEUN_YEAR * DAY_MS);

  return { direction, termUtcMs, gapMs, years, startAge: Math.floor(years) };
}

/** 대운 하나. 나이는 전부 만 나이다. docs/05 9장 4항 */
export interface Daeun {
  /** 첫 대운이 0 이다 */
  index: number;
  /**
   * 순행인가 역행인가. 열 개가 모두 같은 값이다.
   *
   * 화면이 적용된 방식을 표시해야 하는데, 없으면 소비자가 `daeunStart` 를 다시 불러
   * 년주와 절기 탐색을 되풀이해야 한다.
   */
  direction: DaeunDirection;
  pillar: Pillar;
  startAge: number;
  /** 이 나이까지 이어진다. 다음 대운이 그 다음 해에 열린다 */
  endAge: number;
  /**
   * 이 대운이 시작하는 사주 연도. 만 `startAge` 세가 되는 생일이 속한 해다.
   *
   * 출생 사주 연도에 나이를 더하는 산술로 대신하지 않는다. docs/05 9.7.
   */
  startYear: number;
}

/**
 * 대운 열 개. docs/05 9장 3항.
 *
 * 월주 자체는 원국이라 대운이 아니다. 첫 대운은 월주의 다음 간지다.
 */
export function daeunList(utcMs: number, gender: Gender): Daeun[] {
  const start = daeunStart(utcMs, gender);
  const step = start.direction === 'forward' ? 1 : -1;
  const month = indexFromPillar(monthPillar(utcMs));
  const birth = wallFromUtcMs(utcMs, KST_OFFSET_SECONDS);

  return Array.from({ length: DAEUN_COUNT }, (_, index) => {
    const startAge = start.startAge + index * DAEUN_SPAN_YEARS;
    return {
      index,
      direction: start.direction,
      pillar: pillarFromIndex(month + step * (index + 1)),
      startAge,
      endAge: startAge + DAEUN_SPAN_YEARS - 1,
      startYear: sajuYearOfWall({ ...birth, year: birth.year + startAge }),
    };
  });
}

/** 세운 한 해. docs/05 9장 5항 */
export interface Sewoon {
  /** 사주 연도. 경계가 입춘이라 양력 연도와 어긋나는 구간이 있다 */
  year: number;
  /** 그 해에 도달하는 만 나이 */
  age: number;
  pillar: Pillar;
}

/**
 * 한 대운이 덮는 열 해의 세운. docs/05 9장 5항.
 *
 * 세운 간지는 그 해의 년주와 같은 규칙이라 따로 정할 것이 없다.
 * `pillarOfSajuYear` 는 60갑자 산술뿐이라 절기 데이터 범위와 무관하고,
 * 그래서 2100년을 넘는 대운의 세운도 값이 나온다.
 *
 * `age` 는 그 해의 이름값이다. 대운이 열 해를 덮으므로 시작 나이에서 하나씩 더한다.
 */
export function sewoonList(daeun: Daeun): Sewoon[] {
  return Array.from({ length: DAEUN_SPAN_YEARS }, (_, offset) => ({
    year: daeun.startYear + offset,
    age: daeun.startAge + offset,
    pillar: pillarOfSajuYear(daeun.startYear + offset),
  }));
}
