/**
 * 공인 만세력 대조를 거친 검증 케이스.
 *
 * `verified: true` 인 케이스만 회귀 테스트가 기대값을 단언한다.
 * 나머지는 채워야 할 자리를 표시하는 골격이다. 기대값을 추측해 채우지 않는다.
 *
 * 채우는 방법과 앵커 확정 규칙은 README.md 에 있다.
 * 필수 경계 목록은 docs/05-saju-domain-rules.md 10장이다.
 */

import type { EarthlyBranch, Element, HeavenlyStem } from '../index';

/** 간지 한 기둥. 천간 1자 + 지지 1자. */
export type Pillar = `${HeavenlyStem}${EarthlyBranch}`;

/** 신강약 5등급. ADR 0007 */
export type StrengthGrade = '태강' | '신강' | '중화' | '신약' | '태약';

/** 신강약 판정 4요소. ADR 0007 */
export interface StrengthFlags {
  /** 득령. 월지 본기가 일간을 돕는가 */
  deukRyeong: boolean;
  /** 득지. 일지 본기가 일간을 돕는가 */
  deukJi: boolean;
  /** 득시. 시지 본기가 일간을 돕는가 */
  deukSi: boolean;
  /** 득세. 일간 제외 7글자 중 지원이 4개 이상인가 */
  deukSe: boolean;
}

/** 야자시 정책. zheng 은 정자시설(23시부터 익일), ye 는 야자시설(자정까지 당일). */
export type ZiPolicy = 'zheng' | 'ye';

export interface CaseInput {
  /** 출생 당시 벽시계 시각. 표준시와 서머타임 보정은 엔진이 한다 */
  birth: string;
  calendar: 'solar' | 'lunar';
  /** 음력 입력일 때만 의미가 있다 */
  leapMonth?: boolean;
  gender: 'M' | 'F';
  /** 진태양시 보정에 쓰는 경도 */
  longitude: number;
  options: {
    ziPolicy: ZiPolicy;
    trueSolarTime: boolean;
  };
}

export interface ExpectedDaeun {
  direction: 'forward' | 'backward';
  startAge: number;
  first: Pillar;
}

export interface ExpectedYongshin {
  element: Element;
  /** 억부 노선. ADR 0007 의 용신 분기 */
  method: string;
}

export interface CaseExpected {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  /** 음력 입력일 때 변환된 양력 날짜 */
  solarDate?: string;
  strengthGrade?: StrengthGrade;
  flags?: StrengthFlags;
  yongshin?: ExpectedYongshin;
  daeun?: ExpectedDaeun;
  /** 야자시 정책을 반대로 두었을 때 갈리는 값. 정책 분기 검증용 */
  underOppositeZiPolicy?: {
    day: Pillar;
    hour: Pillar;
  };
  /** 진태양시 보정 분(음수는 뒤로 당김) */
  trueSolarOffsetMin?: number;
}

/**
 * docs/05-saju-domain-rules.md 10장의 필수 경계 목록.
 * 이 열거의 모든 값에 케이스가 하나 이상 있어야 한다. cases.test.ts 가 검사한다.
 */
export type Requirement =
  | 'baseline'
  | 'anchor'
  | 'ipchun-boundary'
  | 'solar-term-boundary'
  | 'zi-hour-boundary'
  | 'timezone-transition'
  | 'dst'
  | 'true-solar-time'
  | 'lunar-leap-month'
  | 'daeun-direction'
  | 'daeun-on-term-day';

interface BaseCase {
  id: string;
  /** 이 케이스가 무엇을 검증하는가 */
  purpose: string;
  requirement: Requirement;
  input: CaseInput;
  /** 유파가 갈리거나 확정 전 확인할 것이 있으면 남긴다 */
  notes?: string;
}

/** 대조를 마친 케이스. 회귀 테스트가 기대값을 단언한다. */
export interface VerifiedCase extends BaseCase {
  verified: true;
  expected: CaseExpected;
  /** 대조한 만세력과 조회 일시. 비어 있으면 verified 를 붙이지 않는다 */
  sources: [string, ...string[]];
}

/** 아직 대조하지 않은 케이스. 기대값을 추측해 채우지 않는다. */
export interface PendingCase extends BaseCase {
  verified: false;
  expected: null;
  /** 이 케이스를 확정하려면 무엇이 필요한가 */
  blockedBy: string;
}

export type VerificationCase = VerifiedCase | PendingCase;

export const CASES: readonly VerificationCase[] = [
  {
    id: 'verified-19950127-1439-F-seoul',
    purpose: '원국, 강약, 용신, 대운 전체의 기준 케이스',
    requirement: 'baseline',
    input: {
      birth: '1995-01-27T14:39:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: {
      year: '갑술',
      month: '정축',
      day: '무오',
      hour: '기미',
      strengthGrade: '태강',
      flags: { deukRyeong: true, deukJi: true, deukSi: true, deukSe: true },
      yongshin: { element: '금', method: '억부(설기)' },
      daeun: { direction: 'backward', startAge: 7, first: '병자' },
      trueSolarOffsetMin: -32,
    },
    verified: true,
    sources: [
      '포스텔러 만세력 pro.forceteller.com 실측 (2026-07-25, 서울/경기 2회 조회)',
      '수기 계산 교차 검증 (일주 앵커 2개 독립 대조, 월두법과 시두법 적용)',
    ],
    notes:
      '출처 2가 자체 계산이라 공인 만세력 한 곳 추가 대조가 필요하다. ' +
      '용신 금은 태강에서 설기로 가는 분기이고, 극제 노선(목)을 쓰는 유파와 갈린다. ' +
      '원본에 있던 support_ratio 0.875 는 옮기지 않았다. ADR 0007 이 대체한 8단계 방조 비율 모델의 필드다.',
  },

  // 일주 앵커. CLAUDE.md 가 verified 케이스 3개 이상을 요구한다.
  // 기준 케이스에서 60갑자를 돌려 역산하면 순환 논증이 된다. 독립 대조가 필요하다.
  {
    id: 'anchor-20000101',
    purpose: '일주 앵커 검증 1. 평범한 현대 날짜',
    requirement: 'anchor',
    input: {
      birth: '2000-01-01T12:00:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 2곳 대조',
  },
  {
    id: 'anchor-19840217',
    purpose: '일주 앵커 검증 2. 앵커 1과 60일 배수가 아닌 간격',
    requirement: 'anchor',
    input: {
      birth: '1984-02-17T12:00:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 2곳 대조',
  },
  {
    id: 'anchor-19350620',
    purpose: '일주 앵커 검증 3. 과거 연대',
    requirement: 'anchor',
    input: {
      birth: '1935-06-20T12:00:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 2곳 대조',
  },

  // 입춘 경계. 년주와 월주가 함께 갈린다.
  // docs/05 10장은 절입 1분 전과 1분 후를 요구한다. 절입 시각이 있어야 시각을 확정할 수 있다.
  {
    id: 'ipchun-2024-before',
    purpose: '입춘 절입 1분 전 출생. 전년도 년주와 축월이 유지되는가',
    requirement: 'ipchun-boundary',
    input: {
      birth: '2024-02-04T00:00:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy:
      'KASI 2024년 입춘 절입 시각. 확정 후 birth 를 절입 1분 전으로 고친다',
    notes: '년주는 계묘(전년), 월주는 축월이어야 한다',
  },
  {
    id: 'ipchun-2024-after',
    purpose: '입춘 절입 1분 후 출생. 새 년주와 인월로 전환되는가',
    requirement: 'ipchun-boundary',
    input: {
      birth: '2024-02-04T00:00:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy:
      'KASI 2024년 입춘 절입 시각. 확정 후 birth 를 절입 1분 후로 고친다',
    notes: '년주는 갑진, 월주는 인월이어야 한다',
  },

  // 입춘 외의 절기 경계. 월주만 갈린다.
  {
    id: 'ipha-2024-boundary',
    purpose: '입하 절입 전후. 입춘이 아닌 절기에서 월주만 갈리는가',
    requirement: 'solar-term-boundary',
    input: {
      birth: '2024-05-05T00:00:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: 'KASI 2024년 입하 절입 시각',
    notes: '년주는 갈리지 않고 월주만 사월로 넘어가야 한다',
  },

  // 자시 경계. docs/05 10장이 네 시각을 지정한다.
  {
    id: 'zi-2259',
    purpose: '22:59 출생. 자시 진입 전이라 두 정책이 같아야 한다',
    requirement: 'zi-hour-boundary',
    input: {
      birth: '1990-03-10T22:59:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },
  {
    id: 'zi-2301',
    purpose: '23:01 출생. 정자시설은 익일 일주, 야자시설은 당일 일주',
    requirement: 'zi-hour-boundary',
    input: {
      birth: '1990-03-10T23:01:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조. 두 정책의 값을 모두 받아야 한다',
    notes:
      '정책별로 일주가 갈리는 지점이다. expected 와 underOppositeZiPolicy 를 모두 채운다',
  },
  {
    id: 'zi-2359',
    purpose: '23:59 출생. 자정 직전에도 정책 분기가 유지되는가',
    requirement: 'zi-hour-boundary',
    input: {
      birth: '1990-03-10T23:59:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조. 두 정책의 값을 모두 받아야 한다',
  },
  {
    id: 'zi-0001',
    purpose: '00:01 출생. 자정을 넘겨 두 정책이 다시 같아지는가',
    requirement: 'zi-hour-boundary',
    input: {
      birth: '1990-03-11T00:01:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },

  // 표준시 전환일. docs/05 10장이 두 날짜를 지정한다.
  {
    id: 'tz-19540321-before',
    purpose: '1954-03-21 표준시 전환 직전 출생. UTC+9 기준으로 판정되는가',
    requirement: 'timezone-transition',
    input: {
      birth: '1954-03-20T23:30:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },
  {
    id: 'tz-19540321-after',
    purpose: '1954-03-21 표준시 전환 직후 출생. UTC+8:30 기준으로 판정되는가',
    requirement: 'timezone-transition',
    input: {
      birth: '1954-03-21T00:30:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },
  {
    id: 'tz-19610810-boundary',
    purpose:
      '1961-08-10 표준시 복귀 전후 출생. UTC+8:30 에서 UTC+9 로 돌아가는 경계',
    requirement: 'timezone-transition',
    input: {
      birth: '1961-08-10T00:30:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },
  {
    id: 'tz-utc830-era',
    purpose: 'UTC+8:30 시기 한가운데 출생. 구간 내부가 일관되게 처리되는가',
    requirement: 'timezone-transition',
    input: {
      birth: '1958-05-05T06:15:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },

  // 서머타임. docs/05 10장이 1987~1988년을 지목한다.
  {
    id: 'dst-1987',
    purpose: '1987년 서머타임 구간 출생. 1시간 해제 후 시지 판정',
    requirement: 'dst',
    input: {
      birth: '1987-07-15T13:20:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },
  {
    id: 'dst-1988',
    purpose: '1988년 서머타임 구간 출생. 시지가 미시에서 오시로 넘어오는가',
    requirement: 'dst',
    input: {
      birth: '1988-07-15T13:20:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
    notes: '서머타임을 풀면 12:20 이 되어 시지가 오시(11~13)로 넘어와야 한다',
  },

  // 진태양시.
  {
    id: 'true-solar-busan',
    purpose: '부산 출생의 진태양시 보정. 보정 전후로 시주가 갈리는 시각',
    requirement: 'true-solar-time',
    input: {
      birth: '1995-10-01T13:10:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 129.08,
      options: { ziPolicy: 'zheng', trueSolarTime: true },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
    notes: '부산은 129.08 도라 약 -24분이다. 보정을 끄면 시주가 달라져야 한다',
  },

  // 음력 윤달.
  {
    id: 'lunar-leap-month',
    purpose: '음력 윤달 입력의 양력 변환',
    requirement: 'lunar-leap-month',
    input: {
      birth: '1993-03-15T10:00:00',
      calendar: 'lunar',
      leapMonth: true,
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: 'KASI 음력 데이터로 1993년 윤3월 존재 여부부터 확인',
  },

  // 대운 방향. 년간 음양 곱하기 성별 네 조합이 필요하다.
  {
    id: 'daeun-yang-male',
    purpose: '대운 순행. 양간 년주 + 남자',
    requirement: 'daeun-direction',
    input: {
      birth: '1996-04-20T09:00:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
    notes: '1996년 년간은 병(양)이다. 순행이어야 한다',
  },
  {
    id: 'daeun-yang-female',
    purpose: '대운 역행. 양간 년주 + 여자',
    requirement: 'daeun-direction',
    input: {
      birth: '1996-04-20T09:00:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },
  {
    id: 'daeun-yin-male',
    purpose: '대운 역행. 음간 년주 + 남자',
    requirement: 'daeun-direction',
    input: {
      birth: '1997-04-20T09:00:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
    notes: '1997년 년간은 정(음)이다. 역행이어야 한다',
  },
  {
    id: 'daeun-yin-female',
    purpose: '대운 순행. 음간 년주 + 여자',
    requirement: 'daeun-direction',
    input: {
      birth: '1997-04-20T09:00:00',
      calendar: 'solar',
      gender: 'F',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: '공인 만세력 대조',
  },
  {
    id: 'daeun-on-term-day',
    purpose: '절입일 당일 출생의 대운수. 나머지 처리 규칙이 걸리는 지점',
    requirement: 'daeun-on-term-day',
    input: {
      birth: '2024-05-05T12:00:00',
      calendar: 'solar',
      gender: 'M',
      longitude: 126.98,
      options: { ziPolicy: 'zheng', trueSolarTime: false },
    },
    expected: null,
    verified: false,
    blockedBy: 'KASI 절입 시각과 대운수 나머지 처리 상수 확정',
    notes:
      '대운수 나머지 처리는 유파가 갈리는 지점이다. 어느 규칙을 적용했는지 함께 기록한다',
  },
];

/** 회귀 테스트가 기대값을 단언할 케이스. */
export const VERIFIED_CASES: readonly VerifiedCase[] = CASES.filter(
  (c): c is VerifiedCase => c.verified,
);

/** 아직 대조가 남은 케이스. */
export const PENDING_CASES: readonly PendingCase[] = CASES.filter(
  (c): c is PendingCase => !c.verified,
);
