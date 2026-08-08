/**
 * 간지 기둥 계산.
 *
 * 규칙의 단일 진실 공급원은 docs/05-saju-domain-rules.md 다.
 * 년주는 2장, 월주는 3장, 일주는 4장, 야자시 정책은 6장이다.
 *
 * 입력 타입이 기둥마다 다르다.
 *
 * 일주는 벽시계 시각을 받는다. 자시 경계인 23시가 벽시계 개념이기 때문이다.
 * 년주와 월주는 물리적 시각을 받는다. 절입 순간과 비교해야 하고 그 순간은 지구 전체에 하나다.
 *
 * 벽시계에서 물리적 시각으로 가는 변환은 표준시 이력을 아는 파이프라인의 몫이다.
 * docs/05 7장이고 `time.ts` 가 한다. 여기서 그 순서를 다시 밟지 않는다.
 */

import { julianDayNumber } from './calendar';
import type { CalendarDateTime } from './calendar';
import {
  SOLAR_TERM_FIRST_YEAR,
  SOLAR_TERM_LAST_YEAR,
  solarTerms,
} from './data/solar-terms';
import type { SolarTermName } from './data/solar-terms';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from './index';
import type { EarthlyBranch, HeavenlyStem, Pillar } from './index';

/**
 * 야자시 정책. docs/05 6장.
 *
 * `nextDay` 는 정자시설이다. 23시부터 다음날로 보아 일주가 다음날 간지가 된다.
 * `sameDay` 는 야자시설이다. 자정까지 당일 일주를 유지하고 시주만 자시로 잡는다.
 *
 * 유파가 갈리는 지점이라 기본값을 이 모듈이 정하지 않는다. 호출부가 넘긴다.
 */
export type ZiPolicy = 'sameDay' | 'nextDay';

/** 자시가 시작하는 시각. */
const ZI_START_HOUR = 23;

/**
 * 일주 앵커. 율리우스 적일에 이 값을 더해 60으로 나눈 나머지가 60갑자 인덱스다.
 *
 * 근거 없이 박지 않는다는 규칙(docs/05 4장)에 따라 `verified: true` 케이스 넷으로 확정했다.
 * fixtures/cases.ts 의 앵커 셋과 기준 케이스이며 전부 KASI 음양력 API 의 일진 대조를 거쳤다.
 * pillars.test.ts 가 그 케이스들로 이 값을 다시 검증한다.
 */
const DAY_PILLAR_ANCHOR = 49;

/**
 * 년주 앵커. 1984년이 갑자년이다.
 *
 * 일주 앵커와 같은 규율을 따른다. `verified: true` 케이스 넷이 뒷받침하고
 * pillars.test.ts 가 그 케이스들로 이 값을 다시 검증한다.
 *
 * 근거는 KASI 음양력 API 의 세차다. 세차는 음력 설날 기준이라 사주의 입춘 기준과 다르지만,
 * 입춘과 설날 사이 구간을 벗어나면 두 기준이 같은 값을 낸다. 네 케이스가 전부 그 밖이다.
 */
const YEAR_PILLAR_ANCHOR_YEAR = 1984;

/**
 * 월 경계를 만드는 12절과 그 절이 여는 월지. docs/05 3장 표 그대로다.
 *
 * 24절기 중 나머지 12중기(우수, 춘분 등)는 월 경계와 무관하다.
 * 데이터의 절기 순서에서 짝수 인덱스가 이 12개와 일치하는데,
 * 그 성질에 기대지 않고 표를 명시한다. 일치 여부는 테스트가 확인한다.
 */
const MONTH_TERM_BRANCH: Partial<Record<SolarTermName, EarthlyBranch>> = {
  입춘: '인',
  경칩: '묘',
  청명: '진',
  입하: '사',
  망종: '오',
  소서: '미',
  입추: '신',
  백로: '유',
  한로: '술',
  입동: '해',
  대설: '자',
  소한: '축',
};

/**
 * 월두법(오호둔). 년간에서 인월의 월주를 정한다. docs/05 3.1 표 그대로다.
 *
 * 이후 월은 60갑자 순서로 진행한다.
 */
const FIRST_MONTH_PILLAR: Record<HeavenlyStem, Pillar> = {
  갑: '병인',
  기: '병인',
  을: '무인',
  경: '무인',
  병: '경인',
  신: '경인',
  정: '임인',
  임: '임인',
  무: '갑인',
  계: '갑인',
};

/** 인월을 0 으로 둔 월지 순서. 월주는 이 순서로 60갑자를 진행한다. */
const MONTH_BRANCH_ORDER: readonly EarthlyBranch[] = [
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
  '자',
  '축',
];

/** 60갑자 인덱스를 간지로 바꾼다. 갑자가 0 이고 계해가 59 다. */
export function pillarFromIndex(index: number): Pillar {
  const i = ((index % 60) + 60) % 60;
  return `${HEAVENLY_STEMS[i % 10]}${EARTHLY_BRANCHES[i % 12]}`;
}

/** 간지의 60갑자 인덱스. 실재하지 않는 조합이면 -1 이다. */
export function indexFromPillar(pillar: Pillar): number {
  const stem = (HEAVENLY_STEMS as readonly string[]).indexOf(pillar[0]);
  const branch = (EARTHLY_BRANCHES as readonly string[]).indexOf(pillar[1]);
  if (stem === -1 || branch === -1) return -1;

  // 천간은 10, 지지는 12 주기라 60 안에서 짝이 하나뿐이다.
  for (let n = 0; n < 60; n++) {
    if (n % 10 === stem && n % 12 === branch) return n;
  }
  return -1;
}

/**
 * 일주가 귀속되는 날짜의 율리우스 적일.
 *
 * 정자시설에서 23시 이후 출생은 다음날로 넘어간다. docs/05 6장.
 */
export function dayPillarJdn(at: CalendarDateTime, ziPolicy: ZiPolicy): number {
  const jdn = julianDayNumber(at.year, at.month, at.day);
  return ziPolicy === 'nextDay' && at.hour >= ZI_START_HOUR ? jdn + 1 : jdn;
}

/**
 * 일주.
 *
 * 보정이 끝난 시각을 받는다. 절기와 무관하므로 절기 데이터를 쓰지 않는다.
 */
export function dayPillar(at: CalendarDateTime, ziPolicy: ZiPolicy): Pillar {
  return pillarFromIndex(dayPillarJdn(at, ziPolicy) + DAY_PILLAR_ANCHOR);
}

/**
 * 시지. docs/05 5.1.
 *
 * 자시가 23시에 시작해 두 시간씩 나간다. 23시를 0으로 당기면 지지 순서와 그대로 맞물린다.
 *
 * 보정이 끝난 벽시계를 받는다. 진태양시를 켰다면 그 보정까지 끝난 값이어야 한다.
 * 시간(時干)을 정하는 시두법은 아직 구현하지 않았다.
 */
export function hourBranch(at: CalendarDateTime): EarthlyBranch {
  return EARTHLY_BRANCHES[Math.floor(((at.hour + 1) % 24) / 2)];
}

/** 절기 데이터는 연도마다 24개가 소한부터 동지 순서로 들어 있다. */
const TERMS_PER_YEAR = 24;

/** 한 해 안에서 입춘이 놓이는 자리. 소한 0, 대한 1, 입춘 2 다. */
const IPCHUN_POSITION = 2;

/**
 * 이 순간 이전(같은 시각 포함)의 마지막 절기 인덱스.
 *
 * 범위를 벗어나면 던진다. 조용히 근사값을 내지 않는다. docs/05 머리말.
 */
function lastTermIndexAtOrBefore(utcMs: number): number {
  const terms = solarTerms();

  if (utcMs < terms[0].utcMs || utcMs > terms[terms.length - 1].utcMs) {
    throw new RangeError(
      `지원 범위 밖이다. 양력 ${SOLAR_TERM_FIRST_YEAR}년부터 ${SOLAR_TERM_LAST_YEAR}년까지만 계산한다.`,
    );
  }

  let lo = 0;
  let hi = terms.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (terms[mid].utcMs <= utcMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * 사주 연도. 입춘 절입 시각이 경계다. docs/05 2장.
 *
 * 양력 1월 1일도 아니고 음력 설날도 아니다.
 * 입춘 이전 출생이면 전년도가 된다.
 */
export function sajuYear(utcMs: number): number {
  const index = lastTermIndexAtOrBefore(utcMs);
  const year = SOLAR_TERM_FIRST_YEAR + Math.floor(index / TERMS_PER_YEAR);

  // 소한과 대한은 입춘보다 앞이라 아직 전년도다.
  const beforeIpchun = index % TERMS_PER_YEAR < IPCHUN_POSITION;
  if (!beforeIpchun) return year;

  if (year - 1 < SOLAR_TERM_FIRST_YEAR) {
    throw new RangeError(
      `${SOLAR_TERM_FIRST_YEAR}년 입춘 이전은 계산하지 않는다. 앞선 절입 시각이 데이터에 없다.`,
    );
  }
  return year - 1;
}

/** 년주. docs/05 2장. */
export function yearPillar(utcMs: number): Pillar {
  return pillarFromIndex(sajuYear(utcMs) - YEAR_PILLAR_ANCHOR_YEAR);
}

/**
 * 월지. 인월을 0 으로 둔 값이다. docs/05 3장.
 *
 * 월 경계를 만드는 것은 12절뿐이라, 마지막 절기가 중기면 그 앞의 절까지 물러난다.
 */
export function monthBranchIndex(utcMs: number): number {
  const terms = solarTerms();
  let index = lastTermIndexAtOrBefore(utcMs);

  // 중기는 월 경계가 아니다. 한 칸 앞이 반드시 절이다.
  while (index >= 0 && !(terms[index].name in MONTH_TERM_BRANCH)) index--;

  if (index < 0) {
    throw new RangeError(
      `${SOLAR_TERM_FIRST_YEAR}년 소한 이전은 계산하지 않는다. 앞선 절입 시각이 데이터에 없다.`,
    );
  }

  const branch = MONTH_TERM_BRANCH[terms[index].name];
  if (!branch) throw new Error(`월지를 모르는 절기다: ${terms[index].name}`);

  return MONTH_BRANCH_ORDER.indexOf(branch);
}

/**
 * 월주. docs/05 3장과 3.1.
 *
 * 년간이 인월의 월주를 정하고(월두법) 이후는 60갑자 순서로 진행한다.
 */
export function monthPillar(utcMs: number): Pillar {
  const yearStem = yearPillar(utcMs)[0] as HeavenlyStem;
  const firstMonth = indexFromPillar(FIRST_MONTH_PILLAR[yearStem]);
  return pillarFromIndex(firstMonth + monthBranchIndex(utcMs));
}
