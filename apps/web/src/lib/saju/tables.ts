/**
 * 판정용 관계 테이블. 지장간, 오행 상생상극, 십성 5분류, 신살 판정표.
 *
 * index.ts 가 담는 것은 간지 자체의 속성(오행, 음양)이고 여기는 그 사이의 관계다.
 * 규칙의 출처는 docs/05-saju-domain-rules.md 1.1 과 11.2, 그리고 07-sinsal-rules.md 다.
 *
 * 신살 판정표는 글자에서 글자로 가는 대응만 담는다.
 * 이름과 분류와 등급은 sinsal.ts 가 갖는다. 여기서 신살은 상수 이름으로만 나온다.
 */

import type { EarthlyBranch, Element, HeavenlyStem, Pillar } from './index';
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

// ---- 신살 판정표: 일간 기준. docs/07 §2 ----
//
// 여덟 표가 모두 같은 모양이다. 일간 하나에 지지 여러 개가 대응하고,
// 그 지지를 네 기둥의 지지 전부에서 찾는다.
// 개수가 표마다 다르다. 천을귀인과 태극귀인은 둘 이상이고 양인은 음간이 비어 있다.
// 모양을 맞춰 두면 판정 쪽이 표 하나를 도는 같은 코드로 여덟을 다 처리한다.

/** 일간 기준 신살의 판정표 모양. 값이 빈 배열이면 그 일간에는 없다. */
export type StemBranchTable = Record<HeavenlyStem, readonly EarthlyBranch[]>;

/** 천을귀인. 일간마다 둘이다. docs/07 §2 */
export const CHEONEUL_GWIIN: StemBranchTable = {
  갑: ['축', '미'],
  을: ['자', '신'],
  병: ['해', '유'],
  정: ['해', '유'],
  무: ['축', '미'],
  기: ['자', '신'],
  경: ['축', '미'],
  신: ['인', '오'],
  임: ['묘', '사'],
  계: ['묘', '사'],
};

/** 문창귀인. docs/07 §2 */
export const MUNCHANG_GWIIN: StemBranchTable = {
  갑: ['사'],
  을: ['오'],
  병: ['신'],
  정: ['유'],
  무: ['신'],
  기: ['유'],
  경: ['해'],
  신: ['자'],
  임: ['인'],
  계: ['묘'],
};

/** 정록. 건록이라고도 한다. docs/07 §2 */
export const JEONGNOK: StemBranchTable = {
  갑: ['인'],
  을: ['묘'],
  병: ['사'],
  정: ['오'],
  무: ['사'],
  기: ['오'],
  경: ['신'],
  신: ['유'],
  임: ['해'],
  계: ['자'],
};

/** 학당귀인. 일간의 장생지다. 음간은 역행이라 오행 단위로 묶이지 않는다. docs/07 §2 */
export const HAKDANG_GWIIN: StemBranchTable = {
  갑: ['해'],
  을: ['오'],
  병: ['인'],
  정: ['유'],
  무: ['인'],
  기: ['유'],
  경: ['사'],
  신: ['자'],
  임: ['신'],
  계: ['묘'],
};

/** 관귀학관. 일간 정관 오행의 장생지다. 오행이 같은 두 일간이 같은 값을 갖는다. docs/07 §2 */
export const GWANGWI_HAKGWAN: StemBranchTable = {
  갑: ['사'],
  을: ['사'],
  병: ['신'],
  정: ['신'],
  무: ['해'],
  기: ['해'],
  경: ['인'],
  신: ['인'],
  임: ['인'],
  계: ['인'],
};

/** 태극귀인. 무기만 넷이고 나머지는 둘이다. docs/07 §2 */
export const TAEGEUK_GWIIN: StemBranchTable = {
  갑: ['자', '오'],
  을: ['자', '오'],
  병: ['묘', '유'],
  정: ['묘', '유'],
  무: ['진', '술', '축', '미'],
  기: ['진', '술', '축', '미'],
  경: ['인', '해'],
  신: ['인', '해'],
  임: ['사', '신'],
  계: ['사', '신'],
};

/**
 * 금여성. docs/07 §2
 *
 * 정록에서 두 칸 뒤 지지라 JEONGNOK 에서 유도할 수 있지만 표로 둔다.
 * 문서가 가독성을 이유로 그렇게 지시했다. 두 표의 관계는 테스트가 지킨다.
 */
export const GEUMYEO_SEONG: StemBranchTable = {
  갑: ['진'],
  을: ['사'],
  병: ['미'],
  정: ['신'],
  무: ['미'],
  기: ['신'],
  경: ['술'],
  신: ['해'],
  임: ['축'],
  계: ['인'],
};

/** 양인. 양간의 제왕지다. 음간은 유파가 갈려 채택하지 않았다. docs/07 §2 */
export const YANGIN: StemBranchTable = {
  갑: ['묘'],
  을: [],
  병: ['오'],
  정: [],
  무: ['오'],
  기: [],
  경: ['유'],
  신: [],
  임: ['자'],
  계: [],
};

// ---- 지지 그룹. 신살 밖에서도 쓰이는 관계라 이름에 신살을 넣지 않는다 ----

/** 방위 삼회(방합) 그룹. 계절로 묶인 셋이다. */
export type DirectionGroup = '해자축' | '인묘진' | '사오미' | '신유술';

/** 삼합 그룹. 생지, 왕지, 고지 셋이다. */
export type TriadGroup = '신자진' | '인오술' | '사유축' | '해묘미';

/** 지지가 속한 방위 그룹. 12지지가 네 그룹을 남김없이 덮는다. */
export const DIRECTION_OF_BRANCH: Record<EarthlyBranch, DirectionGroup> = {
  해: '해자축',
  자: '해자축',
  축: '해자축',
  인: '인묘진',
  묘: '인묘진',
  진: '인묘진',
  사: '사오미',
  오: '사오미',
  미: '사오미',
  신: '신유술',
  유: '신유술',
  술: '신유술',
};

/** 지지가 속한 삼합 그룹. 12지지가 네 그룹을 남김없이 덮는다. */
export const TRIAD_OF_BRANCH: Record<EarthlyBranch, TriadGroup> = {
  신: '신자진',
  자: '신자진',
  진: '신자진',
  인: '인오술',
  오: '인오술',
  술: '인오술',
  사: '사유축',
  유: '사유축',
  축: '사유축',
  해: '해묘미',
  묘: '해묘미',
  미: '해묘미',
};

// ---- 신살 판정표: 년지 기준. docs/07 §3 ----

/** 년지 방위 그룹으로 정해지는 판정 지지 하나. */
export type DirectionBranchTable = Record<DirectionGroup, EarthlyBranch>;

/** 고신살. 년지 그룹의 다음 방위 그룹 첫 글자다. docs/07 §3 */
export const GOSIN: DirectionBranchTable = {
  해자축: '인',
  인묘진: '사',
  사오미: '신',
  신유술: '해',
};

/** 과숙살. 년지 그룹의 이전 방위 그룹 끝 글자다. docs/07 §3 */
export const GWASUK: DirectionBranchTable = {
  해자축: '술',
  인묘진: '축',
  사오미: '진',
  신유술: '미',
};

// ---- 신살 판정표: 주 간지 기준. docs/07 §4 ----
//
// 한 기둥의 천간과 지지가 통째로 맞아야 하고, 맞으면 천간과 지지 양쪽에 붙는다.
// 임술과 무진이 백호에는 있고 괴강에는 없다. 문서 4장의 유파 선택이다.

/** 백호대살. docs/07 §4 */
export const BAEKHO_DAESAL: readonly Pillar[] = [
  '갑진',
  '을미',
  '병술',
  '정축',
  '무진',
  '임술',
  '계축',
];

/** 괴강살. 협의 4간지다. docs/07 §4 */
export const GOEGANG_SAL: readonly Pillar[] = ['경진', '경술', '임진', '무술'];

// ---- 신살 판정표: 삼합 기준. docs/07 §5 ----
//
// 다섯 표가 같은 모양이다. 기준 지지의 삼합 그룹 하나에 판정 지지 하나가 대응한다.
// 화개살만 그룹 안의 글자를 가리켜 기준 지지 자신이 판정 자리가 될 수 있다.

/** 삼합 그룹으로 정해지는 판정 지지 하나. */
export type TriadBranchTable = Record<TriadGroup, EarthlyBranch>;

/** 도화살. docs/07 §5 */
export const DOHWA: TriadBranchTable = {
  신자진: '유',
  인오술: '묘',
  사유축: '오',
  해묘미: '자',
};

/** 역마살. docs/07 §5 */
export const YEOKMA: TriadBranchTable = {
  신자진: '인',
  인오술: '신',
  사유축: '해',
  해묘미: '사',
};

/** 화개살. 그룹의 셋째 글자다. docs/07 §5 */
export const HWAGAE: TriadBranchTable = {
  신자진: '진',
  인오술: '술',
  사유축: '축',
  해묘미: '미',
};

/** 겁살. 망신살과 값이 서로 교차한다. docs/07 §5 */
export const GEOPSAL: TriadBranchTable = {
  신자진: '사',
  인오술: '해',
  사유축: '인',
  해묘미: '신',
};

/** 망신살. 겁살과 값이 서로 교차한다. docs/07 §5 */
export const MANGSIN: TriadBranchTable = {
  신자진: '해',
  인오술: '사',
  사유축: '신',
  해묘미: '인',
};
