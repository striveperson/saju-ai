/**
 * 판정용 관계 테이블. 지장간, 오행 상생상극, 십성 5분류.
 *
 * index.ts 가 담는 것은 간지 자체의 속성(오행, 음양)이고 여기는 그 사이의 관계다.
 * 규칙의 출처는 docs/05-saju-domain-rules.md 1.1 과 11.2 다.
 */

import type { EarthlyBranch, Element, HeavenlyStem } from './index';
import { STEM_ELEMENT } from './index';

/** 오행 다섯. index.ts 의 Element 를 순회할 때 쓴다. */
export const ELEMENTS = [
  '목',
  '화',
  '토',
  '금',
  '수',
] as const satisfies readonly Element[];

/** 지장간의 자리. 여기, 중기, 본기 순으로 놓는다. docs/05 §1.1 */
export type HiddenStemRole = '여기' | '중기' | '본기';

export interface HiddenStem {
  stem: HeavenlyStem;
  role: HiddenStemRole;
}

/**
 * 지장간. 월률분야(月律分野) 계통이다. docs/05 §1.1
 *
 * 인원용사 계통은 왕지(자·묘·오·유)와 해에서 여기를 뺀다.
 * 오행으로 환산하면 두 계통이 갈리는 곳은 해의 무토 하나뿐이다.
 *
 * 일수는 담지 않는다. ADR 0007 이 지장간 가중 세력 계산을 기각해 쓰이지 않는다.
 */
export const BRANCH_HIDDEN_STEMS: Record<EarthlyBranch, readonly HiddenStem[]> =
  {
    자: [
      { stem: '임', role: '여기' },
      { stem: '계', role: '본기' },
    ],
    축: [
      { stem: '계', role: '여기' },
      { stem: '신', role: '중기' },
      { stem: '기', role: '본기' },
    ],
    인: [
      { stem: '무', role: '여기' },
      { stem: '병', role: '중기' },
      { stem: '갑', role: '본기' },
    ],
    묘: [
      { stem: '갑', role: '여기' },
      { stem: '을', role: '본기' },
    ],
    진: [
      { stem: '을', role: '여기' },
      { stem: '계', role: '중기' },
      { stem: '무', role: '본기' },
    ],
    사: [
      { stem: '무', role: '여기' },
      { stem: '경', role: '중기' },
      { stem: '병', role: '본기' },
    ],
    오: [
      { stem: '병', role: '여기' },
      { stem: '기', role: '중기' },
      { stem: '정', role: '본기' },
    ],
    미: [
      { stem: '정', role: '여기' },
      { stem: '을', role: '중기' },
      { stem: '기', role: '본기' },
    ],
    신: [
      { stem: '무', role: '여기' },
      { stem: '임', role: '중기' },
      { stem: '경', role: '본기' },
    ],
    유: [
      { stem: '경', role: '여기' },
      { stem: '신', role: '본기' },
    ],
    술: [
      { stem: '신', role: '여기' },
      { stem: '정', role: '중기' },
      { stem: '무', role: '본기' },
    ],
    해: [
      { stem: '무', role: '여기' },
      { stem: '갑', role: '중기' },
      { stem: '임', role: '본기' },
    ],
  };

/** 지장간 전체를 오행으로 편 것. 통근 판정이 쓴다. docs/05 §11.5 */
export function hiddenElements(branch: EarthlyBranch): readonly Element[] {
  return BRANCH_HIDDEN_STEMS[branch].map((hidden) => STEM_ELEMENT[hidden.stem]);
}

/** 오행 상생. 목생화 화생토 토생금 금생수 수생목 */
export const ELEMENT_GENERATES: Record<Element, Element> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
};

/** 오행 상극. 목극토 토극수 수극화 화극금 금극목 */
export const ELEMENT_CONTROLS: Record<Element, Element> = {
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
};

/**
 * 십성 5분류. docs/05 §11.2
 *
 * 10종 십신(같은 분류를 음양으로 다시 가르는 것)은 아직 만들지 않았다.
 * 신강약 판정에 필요한 것이 5분류까지다.
 */
export type TenGodGroup = '비겁' | '인성' | '식상' | '재성' | '관성';

/**
 * 일간 오행에서 본 대상 오행의 분류. docs/05 §11.2
 *
 * 표를 따로 두지 않고 상생상극에서 유도한다. 두 벌을 두면 어긋날 자리가 생긴다.
 * 다섯 분기가 오행 다섯을 남김없이 덮으므로 마지막 throw 에는 도달하지 않는다.
 */
export function tenGodGroup(dayElement: Element, target: Element): TenGodGroup {
  if (target === dayElement) return '비겁';
  if (ELEMENT_GENERATES[target] === dayElement) return '인성';
  if (ELEMENT_GENERATES[dayElement] === target) return '식상';
  if (ELEMENT_CONTROLS[dayElement] === target) return '재성';
  if (ELEMENT_CONTROLS[target] === dayElement) return '관성';
  throw new Error(
    `오행 관계를 분류할 수 없다: 일간 ${dayElement}, 대상 ${target}`,
  );
}

/** tenGodGroup 의 역방향. 일간에서 본 분류 하나에 오행 하나가 대응한다. */
export function elementOfGroup(
  dayElement: Element,
  group: TenGodGroup,
): Element {
  const found = ELEMENTS.find(
    (element) => tenGodGroup(dayElement, element) === group,
  );
  if (found === undefined) {
    throw new Error(
      `분류에 해당하는 오행이 없다: 일간 ${dayElement}, 분류 ${group}`,
    );
  }
  return found;
}
