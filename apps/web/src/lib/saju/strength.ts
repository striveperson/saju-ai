/**
 * 신강약과 억부용신. docs/05-saju-domain-rules.md 11장, ADR 0007.
 *
 * 5단계 4요소 모델이다. 만세력 계산과 분리되어 있어 입력이 사주팔자 네 기둥뿐이고
 * 시각도 절기도 보지 않는다(11.1).
 *
 * 가중치와 임계값은 DEFAULT_STRENGTH_CONFIG 로 노출한다.
 * 지금 값은 11.7 의 기준 케이스를 재현하도록 잡은 것이고 verified 케이스가 늘면 재보정한다.
 */

import {
  BRANCH_ELEMENT,
  STEM_ELEMENT,
  branchOf,
  stemOf,
  type EarthlyBranch,
  type Element,
  type FourPillars,
} from './index';
import {
  ELEMENTS,
  elementOfGroup,
  hiddenElements,
  tenGodGroup,
  type TenGodGroup,
} from './tables';

/** 신강약 5등급. docs/05 §11.4 */
export type StrengthGrade = '태강' | '신강' | '중화' | '신약' | '태약';

/** 판정 4요소. docs/05 §11.3 */
export interface StrengthFlags {
  /** 득령. 월지 본기 오행이 지원 세력 */
  deukRyeong: boolean;
  /** 득지. 일지 본기 오행이 지원 세력 */
  deukJi: boolean;
  /** 득시. 시지 본기 오행이 지원 세력 */
  deukSi: boolean;
  /** 득세. 일간 제외 7글자 중 지원 세력이 기준 수 이상 */
  deukSe: boolean;
}

/** 억부 밖으로 넘기는 검토 플래그. docs/05 §11.5, §11.6 */
export interface StrengthReviewFlags {
  /** 중화라 억부가 불필요하다. 조후나 병약 등 다른 용신법 검토로 넘긴다 */
  needsJohuReview: boolean;
  /** 태약이다. 종격(從格) 검토 */
  considerJongGyeok: boolean;
  /** 태강이면서 식상, 재성, 관성이 모두 부재하다. 전왕격(從旺格) 검토 */
  considerJeonWangGyeok: boolean;
}

export interface Yongshin {
  element: Element;
  /** 억부 노선. 설기, 극제, 생조 */
  method: string;
  /** 1순위가 대체되었으면 그 사유 */
  fallbackReason?: string;
}

/** docs/05 §11.6 */
export interface StrengthResult {
  grade: StrengthGrade;
  flags: StrengthFlags;
  score: number;
  /** 일간 포함 8글자 균등(각 12.5퍼센트) 기준 지원 비율 */
  supportRatio: number;
  elementDistribution: Record<Element, { count: number; ratio: number }>;
  /** 중화는 억부용신이 없어 null 이다 */
  yongshin: Yongshin | null;
  /** 희신(2순위). 중화는 null 이다 */
  huisin: Element | null;
  flags2: StrengthReviewFlags;
  /** 적용한 유파 값. 결과 화면이 이것을 표시한다 */
  applied: { supportIncludesResource: boolean };
}

export interface StrengthConfig {
  /** 요소별 가중치. 합이 만점이다 */
  weights: {
    deukRyeong: number;
    deukJi: number;
    deukSi: number;
    deukSe: number;
  };
  /** score 임계. strong 이상은 신강, balanced 이상은 중화, 그 미만은 신약 */
  thresholds: { strong: number; balanced: number };
  /** 득세가 성립하는 최소 지원 글자 수. 일간을 제외한 7글자 기준 */
  deukSeMinCount: number;
  /** 네 요소가 전부 거짓일 때 지원 글자가 이 수 이하면 태약이다 */
  taeyakMaxSupportCount: number;
}

/** docs/05 §11.4 의 기본값. 월령 가중이 가장 크다는 원칙은 바꾸지 않는다. */
export const DEFAULT_STRENGTH_CONFIG: StrengthConfig = {
  weights: { deukRyeong: 2.0, deukJi: 1.0, deukSi: 0.5, deukSe: 1.5 },
  thresholds: { strong: 3.0, balanced: 1.5 },
  deukSeMinCount: 4,
  taeyakMaxSupportCount: 1,
};

export interface StrengthOptions {
  /**
   * 득령, 득지, 득시의 지원 세력에 인성을 포함하는가. docs/05 §11.3
   *
   * 그 세 요소에만 걸린다. 득세와 supportRatio 는 11.2 의 정의(비겁 + 인성)를 그대로 쓴다.
   */
  supportIncludesResource?: boolean;
  config?: StrengthConfig;
}

/** 11.2 의 지원 세력 */
const SUPPORT_GROUPS: readonly TenGodGroup[] = ['비겁', '인성'];

/**
 * 통근(通根). 해당 오행이 네 지지의 지장간 어디에든 있으면 유근이다. docs/05 §11.5
 *
 * 여기, 중기, 본기를 가리지 않는다.
 */
export function hasRoot(
  element: Element,
  branches: readonly EarthlyBranch[],
): boolean {
  return branches.some((branch) => hiddenElements(branch).includes(element));
}

function gradeFromScore(score: number, config: StrengthConfig): StrengthGrade {
  if (score >= config.thresholds.strong) return '신강';
  if (score >= config.thresholds.balanced) return '중화';
  return '신약';
}

/**
 * 용신과 희신. docs/05 §11.5
 *
 * 신강의 관성 무근 대체만 원국을 본다. 나머지는 등급만으로 갈린다.
 * 태강의 식상은 원국에 없어도 결핍 보충 관점에서 고른다.
 */
function pickYongshin(
  grade: StrengthGrade,
  dayElement: Element,
  branches: readonly EarthlyBranch[],
): { yongshin: Yongshin | null; huisin: Element | null } {
  const wealth = elementOfGroup(dayElement, '재성');

  if (grade === '태강') {
    return {
      yongshin: {
        element: elementOfGroup(dayElement, '식상'),
        method: '억부(설기)',
      },
      huisin: wealth,
    };
  }

  if (grade === '신강') {
    const officer = elementOfGroup(dayElement, '관성');
    const output = elementOfGroup(dayElement, '식상');
    if (!hasRoot(officer, branches) && hasRoot(output, branches)) {
      return {
        yongshin: {
          element: output,
          method: '억부(설기)',
          fallbackReason: `관성 ${officer}이 지장간 포함 무근이고 식상 ${output}이 유근이라 대체했다`,
        },
        huisin: wealth,
      };
    }
    return {
      yongshin: { element: officer, method: '억부(극제)' },
      huisin: wealth,
    };
  }

  if (grade === '중화') {
    return { yongshin: null, huisin: null };
  }

  return {
    yongshin: {
      element: elementOfGroup(dayElement, '인성'),
      method: '억부(생조)',
    },
    huisin: dayElement,
  };
}

/**
 * 신강약과 억부용신을 판정한다. docs/05 11장
 *
 * 입력은 네 기둥뿐이다. 일간은 일주의 천간이다.
 */
export function computeStrength(
  pillars: FourPillars,
  options: StrengthOptions = {},
): StrengthResult {
  const config = options.config ?? DEFAULT_STRENGTH_CONFIG;
  const supportIncludesResource = options.supportIncludesResource ?? true;

  const stems = [
    stemOf(pillars.year),
    stemOf(pillars.month),
    stemOf(pillars.day),
    stemOf(pillars.hour),
  ];
  const branches = [
    branchOf(pillars.year),
    branchOf(pillars.month),
    branchOf(pillars.day),
    branchOf(pillars.hour),
  ];

  const dayElement = STEM_ELEMENT[stemOf(pillars.day)];

  // 여덟 글자의 오행. 지지는 본기 오행이며 그 값이 지지 오행과 같다(1.1).
  const chartElements = [
    ...stems.map((stem) => STEM_ELEMENT[stem]),
    ...branches.map((branch) => BRANCH_ELEMENT[branch]),
  ];

  const isSupport = (element: Element): boolean =>
    SUPPORT_GROUPS.includes(tenGodGroup(dayElement, element));

  // 득령, 득지, 득시는 인성 포함 여부가 유파로 갈린다(11.3).
  const supportsPillar = (element: Element): boolean =>
    supportIncludesResource
      ? isSupport(element)
      : tenGodGroup(dayElement, element) === '비겁';

  // 일간을 뺀 7글자. 일간은 언제나 비겁이라 득세에서 제외한다(11.3).
  const dayStemPosition = 2;
  const others = [
    ...stems
      .filter((_, index) => index !== dayStemPosition)
      .map((stem) => STEM_ELEMENT[stem]),
    ...branches.map((branch) => BRANCH_ELEMENT[branch]),
  ];
  const supportCountExcludingDay = others.filter(isSupport).length;

  const flags: StrengthFlags = {
    deukRyeong: supportsPillar(BRANCH_ELEMENT[branches[1]]),
    deukJi: supportsPillar(BRANCH_ELEMENT[branches[2]]),
    deukSi: supportsPillar(BRANCH_ELEMENT[branches[3]]),
    deukSe: supportCountExcludingDay >= config.deukSeMinCount,
  };

  const score =
    (flags.deukRyeong ? config.weights.deukRyeong : 0) +
    (flags.deukJi ? config.weights.deukJi : 0) +
    (flags.deukSi ? config.weights.deukSi : 0) +
    (flags.deukSe ? config.weights.deukSe : 0);

  const allTrue =
    flags.deukRyeong && flags.deukJi && flags.deukSi && flags.deukSe;
  const allFalse =
    !flags.deukRyeong && !flags.deukJi && !flags.deukSi && !flags.deukSe;

  let grade: StrengthGrade;
  if (allTrue) {
    grade = '태강';
  } else if (
    allFalse &&
    supportCountExcludingDay <= config.taeyakMaxSupportCount
  ) {
    grade = '태약';
  } else {
    grade = gradeFromScore(score, config);
  }

  const elementDistribution = {} as Record<
    Element,
    { count: number; ratio: number }
  >;
  for (const element of ELEMENTS) {
    const count = chartElements.filter((each) => each === element).length;
    elementDistribution[element] = {
      count,
      ratio: count / chartElements.length,
    };
  }

  const { yongshin, huisin } = pickYongshin(grade, dayElement, branches);

  const drainingGroups: readonly TenGodGroup[] = ['식상', '재성', '관성'];
  const draining = drainingGroups.map((group) =>
    elementOfGroup(dayElement, group),
  );

  return {
    grade,
    flags,
    score,
    supportRatio: chartElements.filter(isSupport).length / chartElements.length,
    elementDistribution,
    yongshin,
    huisin,
    flags2: {
      needsJohuReview: grade === '중화',
      considerJongGyeok: grade === '태약',
      considerJeonWangGyeok:
        grade === '태강' &&
        draining.every((element) => elementDistribution[element].count === 0),
    },
    applied: { supportIncludesResource },
  };
}
