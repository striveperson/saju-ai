/**
 * 시간 보정 파이프라인. docs/05 7장.
 *
 * 기록된 벽시계를 받아 둘을 낸다.
 * 년주와 월주가 쓰는 물리적 시각과, 일주와 시지가 쓰는 보정된 벽시계다.
 * 절입은 지구 전체에 하나인 순간이라 진태양시를 적용하면 안 되고,
 * 시지는 그 지역의 태양 위치라 적용해야 한다. 두 값이 갈라지는 이유가 이것뿐이다.
 *
 * 이 모듈은 기둥을 모른다. 둘을 이어 붙이는 것은 호출부의 몫이다.
 */

import { utcMsFromWall, wallFromUtcMs } from './calendar';
import type { CalendarDateTime } from './calendar';
import {
  KOREA_OFFSET_PERIODS,
  KOREA_TIME_FIRST_YEAR,
  KOREA_TIME_LAST_YEAR,
} from './data/korea-time';
import type { OffsetAbbreviation, OffsetPeriod } from './data/korea-time';

/**
 * 정규화 기준 오프셋(초). UTC+9 다. docs/05 7.1.
 *
 * 표준시 이력 정규화와 서머타임 해제가 이 값 하나로 함께 끝난다.
 * 물리적 시각에 더하는 것이므로 당시 오프셋이 무엇이었든 결과가 UTC+9 벽시계다.
 */
export const NORMALIZED_OFFSET_SECONDS = 32_400;

/**
 * 진태양시 기준 자오선. UTC+9 의 자오선이다.
 *
 * 시대별 자오선 표를 두지 않는다. 정규화가 이미 오프셋을 옮겼으므로
 * UTC+8:30 시기에 자오선 127.5도를 다시 쓰면 30분이 두 번 들어간다. docs/05 7.1.
 */
export const STANDARD_MERIDIAN = 135;

/**
 * 경도를 모를 때 쓰는 자오선. 서울 관례값 -30분이 여기서 나온다. docs/05 7.3.
 *
 * 보정 자체는 끌 수 없으므로 경도를 모르면 이 값이 반드시 쓰인다.
 * 그래서 폴백을 썼다는 사실이 `notices` 에 남는다. ADR 0016.
 */
export const FALLBACK_MERIDIAN = 127.5;

/**
 * 출생 기록이 서머타임 시각인가. docs/05 7.5.
 *
 * `daylight` 기록이 서머타임 시계 그대로다. 당시 법적 오프셋으로 읽는다.
 * `standard` 기록자가 표준시로 환산해 적었다. 서머타임 구간이어도 기준 오프셋으로 읽는다.
 * `unknown` 모른다. `daylight` 와 같은 값을 내되 가정했다는 사실을 남긴다.
 */
export type DstAssumption = 'daylight' | 'standard' | 'unknown';

/** 벽시계가 두 번 존재할 때 어느 쪽을 고르는가. docs/05 7.4. */
export type AmbiguityChoice = 'earlier' | 'later';

export interface TimeCorrectionOptions {
  /** 출생지 경도. 동경이 양수다. 생략하면 폴백을 쓰고 그 사실을 남긴다 */
  longitude?: number;
  /** 기본값 `unknown` */
  dstAssumption?: DstAssumption;
  /** 기본값 `earlier` */
  ambiguityChoice?: AmbiguityChoice;
}

/** 벽시계 하나가 가리킬 수 있는 물리적 시각. */
export interface InstantCandidate {
  utcMs: number;
  period: OffsetPeriod;
}

/**
 * 벽시계를 어떻게 해석했는가.
 *
 * 답이 둘이거나 없을 때 조용히 하나를 고르지 않았다는 것을 타입으로 남긴다.
 */
export type WallClockResolution =
  | { kind: 'unique' }
  | {
      kind: 'ambiguous';
      chosen: AmbiguityChoice;
      /** `default` 면 사용자가 고른 것이 아니라 우리가 고른 것이다 */
      because: 'option' | 'default';
      /** 고르지 않은 쪽. 화면이 다시 계산하지 않고 대안을 보여줄 수 있다 */
      alternative: {
        offsetSeconds: number;
        utcMs: number;
        normalized: CalendarDateTime;
      };
    }
  | {
      kind: 'nonexistent';
      /** 벽시계가 건너뛴 초 */
      gapSeconds: number;
      /** 전환 직후로 밀면서 실제로 옮긴 초 */
      shiftedSeconds: number;
    };

export interface TrueSolarDisclosure {
  /** 정규화된 시계에 더한 분. 음수가 서쪽이다 */
  minutes: number;
  /** 경도를 몰라 폴백을 썼는가. docs/05 7.3 이 화면 표기를 요구한다 */
  fallback: boolean;
  /** 폴백이면 `FALLBACK_MERIDIAN` 이 들어간다 */
  longitude: number;
  /** 항상 `STANDARD_MERIDIAN` 이다 */
  meridian: number;
}

/** 결과 화면에 반드시 띄워야 하는 항목. */
export type TimeNotice =
  | 'local-mean-time'
  | 'non-standard-offset'
  | 'daylight-unwound'
  | 'dst-assumption-unknown'
  | 'ambiguous-wall-clock'
  | 'nonexistent-wall-clock'
  | 'true-solar-fallback';

export interface TimeDisclosure {
  /** 기록을 읽을 때 쓴 오프셋(초) */
  offsetSeconds: number;
  /** 서머타임을 뺀 기준 오프셋(초) */
  baseOffsetSeconds: number;
  abbreviation: OffsetAbbreviation;
  daylightUnwound: boolean;
  localMeanTimeEra: boolean;
  /** 정규화가 벽시계를 옮긴 초. 서머타임 해제를 포함한다 */
  normalizeSeconds: number;
  trueSolar: TrueSolarDisclosure;
  resolution: WallClockResolution;
  /** 비어 있지 않으면 결과 화면에 표기 의무가 있다 */
  notices: readonly TimeNotice[];
}

export interface TimeCorrection {
  /** 년주와 월주가 쓰는 물리적 시각. 절입 순간과 비교한다 */
  utcMs: number;
  /** 일주와 시지가 쓰는 보정 완료 벽시계 */
  corrected: CalendarDateTime;
  /** 진태양시 보정 전의 UTC+9 벽시계. 화면이 보정 전후를 나란히 보여줄 때 쓴다 */
  normalized: CalendarDateTime;
  /** 입력 그대로 */
  recorded: CalendarDateTime;
  disclosure: TimeDisclosure;
}

/** 이 구간을 읽을 때 쓸 오프셋. 기록이 표준시로 적혔다면 서머타임을 지나가지 않는다. */
function frameOffset(period: OffsetPeriod, assumption: DstAssumption): number {
  return assumption === 'standard'
    ? period.baseOffsetSeconds
    : period.offsetSeconds;
}

/** 이 순간이 속한 구간의 인덱스. */
function offsetIndexAt(utcMs: number): number {
  let lo = 0;
  let hi = KOREA_OFFSET_PERIODS.length - 1;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (KOREA_OFFSET_PERIODS[mid].fromUtcMs <= utcMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** 이 물리적 시각에 한국에서 쓰던 오프셋 구간. */
export function offsetPeriodAt(utcMs: number): OffsetPeriod {
  return KOREA_OFFSET_PERIODS[offsetIndexAt(utcMs)];
}

/**
 * 이 벽시계가 가리킬 수 있는 물리적 시각. 이른 순서다.
 *
 * 0개면 존재하지 않는 시각이고 2개면 두 번 존재하는 시각이다. docs/05 7.4.
 */
export function instantCandidates(
  at: CalendarDateTime,
  dstAssumption: DstAssumption = 'unknown',
): readonly InstantCandidate[] {
  // 오프셋 0 으로 읽으면 벽시계 자체가 하나의 수가 된다. 여기서 오프셋을 빼면 후보다.
  const wallAsUtc = utcMsFromWall(at, 0);
  const found: InstantCandidate[] = [];

  for (const [i, period] of KOREA_OFFSET_PERIODS.entries()) {
    const utcMs = wallAsUtc - frameOffset(period, dstAssumption) * 1000;
    // 그 오프셋이 실제로 쓰이던 순간으로 떨어져야 후보가 된다.
    if (offsetIndexAt(utcMs) === i) found.push({ utcMs, period });
  }

  return found.sort((a, b) => a.utcMs - b.utcMs);
}

/** 이 벽시계를 삼킨 전환. 후보가 하나도 없을 때만 부른다. */
function gapAt(
  wallAsUtc: number,
  dstAssumption: DstAssumption,
): { firstWallAsUtc: number; transitionUtcMs: number; gapSeconds: number } {
  for (let i = 1; i < KOREA_OFFSET_PERIODS.length; i++) {
    const before = frameOffset(KOREA_OFFSET_PERIODS[i - 1], dstAssumption);
    const after = frameOffset(KOREA_OFFSET_PERIODS[i], dstAssumption);
    if (after <= before) continue;

    const transitionUtcMs = KOREA_OFFSET_PERIODS[i].fromUtcMs;
    const firstWallAsUtc = transitionUtcMs + after * 1000;

    if (
      wallAsUtc >= transitionUtcMs + before * 1000 &&
      wallAsUtc < firstWallAsUtc
    ) {
      return { firstWallAsUtc, transitionUtcMs, gapSeconds: after - before };
    }
  }

  throw new Error(`존재하지 않는 시각인데 전환을 찾지 못했다: ${wallAsUtc}`);
}

/** 벽시계 해석. 후보 개수에 따라 셋으로 갈린다. */
function resolve(
  at: CalendarDateTime,
  dstAssumption: DstAssumption,
  ambiguityChoice: AmbiguityChoice | undefined,
): { utcMs: number; period: OffsetPeriod; resolution: WallClockResolution } {
  const candidates = instantCandidates(at, dstAssumption);

  if (candidates.length === 1) {
    return { ...candidates[0], resolution: { kind: 'unique' } };
  }

  if (candidates.length === 0) {
    const gap = gapAt(utcMsFromWall(at, 0), dstAssumption);
    return {
      utcMs: gap.transitionUtcMs,
      period: offsetPeriodAt(gap.transitionUtcMs),
      resolution: {
        kind: 'nonexistent',
        gapSeconds: gap.gapSeconds,
        shiftedSeconds: (gap.firstWallAsUtc - utcMsFromWall(at, 0)) / 1000,
      },
    };
  }

  const chosen = ambiguityChoice ?? 'earlier';
  const [earlier, later] = candidates;
  const picked = chosen === 'earlier' ? earlier : later;
  const other = chosen === 'earlier' ? later : earlier;

  return {
    utcMs: picked.utcMs,
    period: picked.period,
    resolution: {
      kind: 'ambiguous',
      chosen,
      because: ambiguityChoice === undefined ? 'default' : 'option',
      alternative: {
        offsetSeconds: frameOffset(other.period, dstAssumption),
        utcMs: other.utcMs,
        normalized: wallFromUtcMs(other.utcMs, NORMALIZED_OFFSET_SECONDS),
      },
    },
  };
}

/**
 * 시간 보정 파이프라인.
 *
 * 지원 범위 밖이면 던진다. 조용히 근사값을 내지 않는다. docs/05 머리말.
 */
export function correctBirthTime(
  recorded: CalendarDateTime,
  options: TimeCorrectionOptions,
): TimeCorrection {
  if (
    recorded.year < KOREA_TIME_FIRST_YEAR ||
    recorded.year > KOREA_TIME_LAST_YEAR
  ) {
    throw new RangeError(
      `지원 범위 밖이다. 양력 ${KOREA_TIME_FIRST_YEAR}년부터 ${KOREA_TIME_LAST_YEAR}년까지만 계산한다.`,
    );
  }

  const dstAssumption = options.dstAssumption ?? 'unknown';
  const { utcMs, period, resolution } = resolve(
    recorded,
    dstAssumption,
    options.ambiguityChoice,
  );

  const offsetSeconds = frameOffset(period, dstAssumption);
  const daylightUnwound = period.daylight && dstAssumption !== 'standard';
  const localMeanTimeEra = period.abbreviation === 'LMT';

  const fallback = options.longitude === undefined;
  const longitude = options.longitude ?? FALLBACK_MERIDIAN;
  const trueSolarMinutes = Math.round((longitude - STANDARD_MERIDIAN) * 4);

  const notices: TimeNotice[] = [];
  if (localMeanTimeEra) notices.push('local-mean-time');
  else if (period.baseOffsetSeconds !== NORMALIZED_OFFSET_SECONDS) {
    notices.push('non-standard-offset');
  }
  if (daylightUnwound) notices.push('daylight-unwound');
  if (period.daylight && dstAssumption === 'unknown') {
    notices.push('dst-assumption-unknown');
  }
  if (resolution.kind === 'ambiguous') notices.push('ambiguous-wall-clock');
  if (resolution.kind === 'nonexistent') notices.push('nonexistent-wall-clock');
  if (fallback) notices.push('true-solar-fallback');

  return {
    utcMs,
    corrected: wallFromUtcMs(
      utcMs,
      NORMALIZED_OFFSET_SECONDS + trueSolarMinutes * 60,
    ),
    normalized: wallFromUtcMs(utcMs, NORMALIZED_OFFSET_SECONDS),
    recorded,
    disclosure: {
      offsetSeconds,
      baseOffsetSeconds: period.baseOffsetSeconds,
      abbreviation: period.abbreviation,
      daylightUnwound,
      localMeanTimeEra,
      normalizeSeconds: NORMALIZED_OFFSET_SECONDS - offsetSeconds,
      trueSolar: {
        minutes: trueSolarMinutes,
        fallback,
        longitude,
        meridian: STANDARD_MERIDIAN,
      },
      resolution,
      notices,
    },
  };
}
