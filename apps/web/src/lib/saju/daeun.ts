/**
 * 대운과 세운.
 *
 * 규칙의 단일 진실 공급원은 docs/05-saju-domain-rules.md 9장이다.
 * 방향은 9.1, 대운수는 9.2, 간지 진행은 9.3, 나이 표기는 9.4, 세운은 9.5 다.
 *
 * 물리적 시각을 받는다. 대운수가 절입 순간과의 간격에서 나오고
 * 그 순간은 지구 전체에 하나이기 때문이다. 일주나 시주와 다른 입력이다.
 *
 * 벽시계에서 물리적 시각으로 가는 변환은 `time.ts` 가 한다. docs/05 7장.
 */

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

/** 대운 방향을 가르는 입력. 년간 음양과 짝지어 순행과 역행을 정한다. docs/05 9.1 */
export type Gender = 'M' | 'F';

/** 순행은 절기 순서대로, 역행은 거꾸로 60갑자를 진행한다. docs/05 9.1 */
export type DaeunDirection = 'forward' | 'backward';

/** 3일을 1년으로 환산한다. docs/05 9.2 */
const DAYS_PER_DAEUN_YEAR = 3;

const DAY_MS = 86_400_000;

/** 대운 하나가 덮는 햇수. */
const DAEUN_SPAN_YEARS = 10;

/** 내놓는 대운 개수. docs/05 9.3 */
const DAEUN_COUNT = 10;

/**
 * 대운 방향. docs/05 9.1.
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
 * 첫 대운이 열리는 지점. docs/05 9.2 와 9.4.
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

/** 첫 대운 나이와 그 근거. docs/05 9.2. */
export function daeunStart(utcMs: number, gender: Gender): DaeunStart {
  const direction = daeunDirection(utcMs, gender);
  const { previousUtcMs, nextUtcMs } = surroundingMonthTerms(utcMs);
  const termUtcMs = direction === 'forward' ? nextUtcMs : previousUtcMs;

  const gapMs = Math.abs(termUtcMs - utcMs);
  const years = gapMs / (DAYS_PER_DAEUN_YEAR * DAY_MS);

  return { direction, termUtcMs, gapMs, years, startAge: Math.floor(years) };
}

/** 대운 하나. 나이는 전부 만 나이다. docs/05 9.4 */
export interface Daeun {
  /** 첫 대운이 0 이다 */
  index: number;
  pillar: Pillar;
  startAge: number;
  /** 이 나이까지 이어진다. 다음 대운이 그 다음 해에 열린다 */
  endAge: number;
  /** 이 대운이 시작하는 사주 연도 */
  startYear: number;
}

/**
 * 대운 열 개. docs/05 9.3.
 *
 * 월주 자체는 원국이라 대운이 아니다. 첫 대운은 월주의 다음 간지다.
 */
export function daeunList(utcMs: number, gender: Gender): Daeun[] {
  const start = daeunStart(utcMs, gender);
  const step = start.direction === 'forward' ? 1 : -1;
  const month = indexFromPillar(monthPillar(utcMs));
  const birthYear = sajuYear(utcMs);

  return Array.from({ length: DAEUN_COUNT }, (_, index) => {
    const startAge = start.startAge + index * DAEUN_SPAN_YEARS;
    return {
      index,
      pillar: pillarFromIndex(month + step * (index + 1)),
      startAge,
      endAge: startAge + DAEUN_SPAN_YEARS - 1,
      startYear: birthYear + startAge,
    };
  });
}

/** 세운 한 해. docs/05 9.5 */
export interface Sewoon {
  /** 사주 연도. 경계가 입춘이라 양력 연도와 어긋나는 구간이 있다 */
  year: number;
  /** 그 해에 도달하는 만 나이 */
  age: number;
  pillar: Pillar;
}

/**
 * 한 대운이 덮는 열 해의 세운. docs/05 9.5.
 *
 * 세운 간지는 그 해의 년주와 같은 규칙이라 따로 정할 것이 없다.
 */
export function sewoonList(daeun: Daeun): Sewoon[] {
  return Array.from({ length: DAEUN_SPAN_YEARS }, (_, offset) => ({
    year: daeun.startYear + offset,
    age: daeun.startAge + offset,
    pillar: pillarOfSajuYear(daeun.startYear + offset),
  }));
}
