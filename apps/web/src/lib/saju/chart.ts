/**
 * 조립 진입점. docs/05 12장.
 *
 * 앞 모듈들이 낸 부품을 잇기만 하고 새 규칙을 정하지 않는다.
 * 층은 셋이다. 파이프라인(`computeChart`), 판정(`computeReading`), 조립(`computeSaju`).
 */

import { daeunList, type Daeun, type Gender } from './daeun';
import { lunarBirthToSolar } from './lunar';
import {
  dayPillar,
  hourPillar,
  monthPillar,
  yearPillar,
  type ZiPolicy,
} from './pillars';
import { computeSinsal, type Sinsal } from './sinsal';
import {
  computeStrength,
  type StrengthOptions,
  type StrengthResult,
} from './strength';
import { correctBirthTime, type TimeCorrection } from './time';

import type { CalendarDateTime } from './calendar';
import type { FourPillars, Pillar } from './index';
import type {
  AmbiguityChoice,
  AppliedTimeOptions,
  DstAssumption,
} from './time';

/** 달력 구분. 음력은 윤달 여부를 반드시 함께 받는다. docs/05 8장 */
export type ChartCalendar =
  | { calendar: 'solar' }
  | { calendar: 'lunar'; leapMonth: boolean }; // 윤달 여부

export type ChartInput = ChartCalendar & {
  birth: CalendarDateTime; // 기록된 생년월일시. 음력이면 음력 날짜
  gender: Gender; // 성별. 대운 방향이 쓴다
  ziPolicy: ZiPolicy; // 야자시 정책
  longitude?: number; // 출생지 경도
  dstAssumption?: DstAssumption; // 서머타임 기록 성격
  ambiguityChoice?: AmbiguityChoice; // 모호한 벽시계 해석
};

/**
 * 적용한 유파 값. 루트 CLAUDE.md 유파 표.
 *
 * 화면 표시용이 아니다. 같은 팔자라도 이 값이 다르면 판정이 갈리므로
 * 해석 캐시가 둘을 같은 것으로 보면 안 된다. 캐시 키가 계산 옵션을 포함한다.
 * 화면에 띄우지 않기로 한 근거는 docs/01 5장이다.
 *
 * 시간 쪽 둘은 `time.ts` 가 채운 것을 그대로 받는다. 여기서 다시 적지 않는다.
 */
export type AppliedChartOptions = AppliedTimeOptions & {
  ziPolicy: ZiPolicy; // 야자시 정책
};

export interface Chart {
  pillars: FourPillars; // 사주팔자 네 기둥
  solar: CalendarDateTime; // 양력 생년월일시. 음력 입력을 옮긴 값
  correction: TimeCorrection; // 시간 보정 내역과 표기 의무
  daeun: readonly Daeun[]; // 대운 열 개. 세운은 없다. docs/05 12.3
  applied: AppliedChartOptions; // 적용한 유파 값
  ziBoundary: Pillar | null; // 반대 야자시 정책의 일주. 경계가 아니면 null. docs/05 6장
}

/** 완성된 팔자를 받는 판정. docs/05 11장과 docs/07 */
export interface Reading {
  strength: StrengthResult; // 신강약 등급과 억부용신
  sinsal: readonly Sinsal[]; // 붙은 신살. 안 붙으면 빈 배열
}

export interface Saju {
  chart: Chart; // 파이프라인 결과
  reading: Reading; // 판정 결과
}

/**
 * 파이프라인. 입력 시각에서 팔자와 대운까지. docs/05 12.2
 *
 * 년월주는 물리적 시각을, 일시주는 보정된 벽시계를 쓴다. 7장이 정한 것이다.
 *
 * 시간 옵션은 받은 그대로 넘긴다. 기본값을 채우는 자리는 `time.ts` 하나이고
 * 채운 결과를 `disclosure.applied` 로 돌려받는다. 여기서 미리 채우면 두 벌이 되고,
 * 인자가 늘 정의된 값이 되어 `resolution.because` 가 기본값과 사용자 선택을
 * 구분하지 못한다. docs/05 7.4.
 */
export function computeChart(input: ChartInput): Chart {
  const timeOptions = {
    longitude: input.longitude,
    dstAssumption: input.dstAssumption,
    ambiguityChoice: input.ambiguityChoice,
  };

  const solar =
    input.calendar === 'solar'
      ? input.birth
      : lunarBirthToSolar(
          {
            year: input.birth.year,
            month: input.birth.month,
            day: input.birth.day,
            leap: input.leapMonth,
          },
          { hour: input.birth.hour, minute: input.birth.minute },
          timeOptions,
        );

  const correction = correctBirthTime(solar, timeOptions);
  const { utcMs, corrected } = correction;

  const day = dayPillar(corrected, input.ziPolicy);
  // 반대 정책으로 한 번 더 뽑는다. 같으면 경계가 아니다. 시각을 따로 보지 않는 이유는
  // 경계 규칙이 화면과 엔진 두 벌이 되는 것을 막기 위해서다. docs/05 6장.
  const opposite = dayPillar(
    corrected,
    input.ziPolicy === 'nextDay' ? 'sameDay' : 'nextDay',
  );

  return {
    pillars: {
      year: yearPillar(utcMs),
      month: monthPillar(utcMs),
      day,
      hour: hourPillar(corrected),
    },
    solar,
    correction,
    daeun: daeunList(utcMs, input.gender),
    applied: { ziPolicy: input.ziPolicy, ...correction.disclosure.applied },
    ziBoundary: opposite === day ? null : opposite,
  };
}

/** 판정. 완성된 팔자만 받는다. 시각도 절기도 보지 않는다. */
export function computeReading(
  pillars: FourPillars,
  options?: StrengthOptions,
): Reading {
  return {
    strength: computeStrength(pillars, options),
    sinsal: computeSinsal(pillars),
  };
}

/** 두 층을 이어 붙인 것. 순서 말고는 하는 일이 없다. */
export function computeSaju(
  input: ChartInput,
  options?: StrengthOptions,
): Saju {
  const chart = computeChart(input);
  return { chart, reading: computeReading(chart.pillars, options) };
}
