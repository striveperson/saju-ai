/**
 * 신살(神殺)과 길성 판정. docs/07-sinsal-rules.md.
 *
 * 완성된 팔자 여덟 글자를 받아 붙은 것만 목록으로 낸다.
 * strength.ts 와 같이 만세력 계산과 분리된 순수 규칙 함수라 시각도 절기도 보지 않는다.
 *
 * 채택 목록은 17종이고 07 의 10장이 정본이다. 유파가 갈리는 지점은 문서가 한쪽을
 * 확정했으므로 옵션 인자를 두지 않는다. 어느 쪽을 따랐는지는 07 의 각 장에 있다.
 */

import {
  branchOf,
  stemOf,
  type EarthlyBranch,
  type FourPillars,
  type HeavenlyStem,
} from './index';
import {
  CHEONEUL_GWIIN,
  GEUMYEO_SEONG,
  GWANGWI_HAKGWAN,
  HAKDANG_GWIIN,
  JEONGNOK,
  MUNCHANG_GWIIN,
  TAEGEUK_GWIIN,
  YANGIN,
  type StemBranchTable,
} from './tables';

/** 채택된 신살 17종. 표기는 docs/07 10장이 정본이다. */
export type SinsalName =
  | '천을귀인'
  | '태극귀인'
  | '문창귀인'
  | '정록'
  | '학당귀인'
  | '관귀학관'
  | '금여성'
  | '양인'
  | '고신살'
  | '과숙살'
  | '백호대살'
  | '괴강살'
  | '도화살'
  | '역마살'
  | '화개살'
  | '겁살'
  | '망신살';

/** 길흉 분류. docs/07 §6 */
export type SinsalCategory = '길성' | '흉살' | '중립';

/** 채택 등급. C 는 미채택이라 나오지 않는다. docs/07 §1 */
export type SinsalGrade = 'A' | 'B';

/** 판정 기준. docs/07 §6 */
export type SinsalBasis =
  | '일간'
  | '년지'
  | '주 간지'
  | '삼합(년지)'
  | '삼합(일지)';

/** 네 기둥의 자리. */
export type PillarKey = keyof FourPillars;

/**
 * 신살이 붙은 지점. docs/07 §6
 *
 * position 이 char 의 종류를 정하는 관계라 판별 유니온으로 둔다.
 * 평평하게 두면 천간 자리에 지지 글자가 들어간 값도 타입을 통과한다.
 */
export type SinsalHit =
  | { pillar: PillarKey; position: 'stem'; char: HeavenlyStem }
  | { pillar: PillarKey; position: 'branch'; char: EarthlyBranch };

/** 판정 하나. hits 는 항상 하나 이상이다. 붙지 않은 신살은 결과에 없다. docs/07 §6 */
export interface Sinsal {
  name: SinsalName;
  category: SinsalCategory;
  grade: SinsalGrade;
  basis: SinsalBasis;
  hits: readonly SinsalHit[];
}

/** 신살의 이름별 메타. 선언 순서가 곧 출력 순서다. docs/07 §6, §10 */
export interface SinsalMeta {
  name: SinsalName;
  category: SinsalCategory;
  grade: SinsalGrade;
}

/**
 * 채택 목록 17종. docs/07 §10 의 순서를 그대로 따른다.
 *
 * 출력 순서를 여기에 묶어 두는 이유는 해석 캐시다.
 * 캐시 키가 판정 결과의 해시라 순서가 흔들리면 같은 팔자가 다른 키를 만든다.
 */
export const SINSAL_CATALOG: readonly SinsalMeta[] = [
  { name: '천을귀인', category: '길성', grade: 'A' },
  { name: '태극귀인', category: '길성', grade: 'B' },
  { name: '문창귀인', category: '길성', grade: 'A' },
  { name: '정록', category: '길성', grade: 'A' },
  { name: '학당귀인', category: '길성', grade: 'A' },
  { name: '관귀학관', category: '길성', grade: 'A' },
  { name: '금여성', category: '길성', grade: 'A' },
  { name: '양인', category: '흉살', grade: 'B' },
  { name: '고신살', category: '흉살', grade: 'A' },
  { name: '과숙살', category: '흉살', grade: 'A' },
  { name: '백호대살', category: '흉살', grade: 'B' },
  { name: '괴강살', category: '중립', grade: 'B' },
  { name: '도화살', category: '흉살', grade: 'B' },
  { name: '역마살', category: '중립', grade: 'B' },
  { name: '화개살', category: '중립', grade: 'B' },
  { name: '겁살', category: '흉살', grade: 'B' },
  { name: '망신살', category: '흉살', grade: 'B' },
];

/** 기둥을 도는 순서. hits 안의 순서를 고정한다. docs/07 §6 */
const PILLAR_KEYS: readonly PillarKey[] = ['year', 'month', 'day', 'hour'];

/** 일간 기준 8종의 판정표. 선언 순서는 카탈로그를 따른다. */
const BY_DAY_STEM: readonly (readonly [SinsalName, StemBranchTable])[] = [
  ['천을귀인', CHEONEUL_GWIIN],
  ['태극귀인', TAEGEUK_GWIIN],
  ['문창귀인', MUNCHANG_GWIIN],
  ['정록', JEONGNOK],
  ['학당귀인', HAKDANG_GWIIN],
  ['관귀학관', GWANGWI_HAKGWAN],
  ['금여성', GEUMYEO_SEONG],
  ['양인', YANGIN],
];

function metaOf(name: SinsalName): SinsalMeta {
  const found = SINSAL_CATALOG.find((meta) => meta.name === name);
  if (found === undefined) {
    throw new Error(`카탈로그에 없는 신살이다: ${name}`);
  }
  return found;
}

/**
 * 네 기둥의 지지에서 목표 지지를 전부 찾는다. docs/07 §2, §3, §5
 *
 * 기준으로 삼은 자리도 빼지 않는다. 삼합 화개가 기준 지지 자신에 걸리기 때문이다.
 */
function branchHits(
  pillars: FourPillars,
  targets: readonly EarthlyBranch[],
): readonly SinsalHit[] {
  const hits: SinsalHit[] = [];
  for (const pillar of PILLAR_KEYS) {
    const branch = branchOf(pillars[pillar]);
    if (targets.includes(branch)) {
      hits.push({ pillar, position: 'branch', char: branch });
    }
  }
  return hits;
}

/** hits 가 비어 있지 않을 때만 판정을 만든다. docs/07 §6 */
function toSinsal(
  name: SinsalName,
  basis: SinsalBasis,
  hits: readonly SinsalHit[],
): Sinsal | null {
  if (hits.length === 0) return null;
  const meta = metaOf(name);
  return { name, category: meta.category, grade: meta.grade, basis, hits };
}

/** 일간을 기준으로 네 지지를 훑는 8종. docs/07 §2 */
function byDayStem(pillars: FourPillars): readonly Sinsal[] {
  const dayStem = stemOf(pillars.day);
  const out: Sinsal[] = [];

  for (const [name, table] of BY_DAY_STEM) {
    const found = toSinsal(name, '일간', branchHits(pillars, table[dayStem]));
    if (found !== null) out.push(found);
  }
  return out;
}

/**
 * 팔자에 붙은 신살 전부. docs/07
 *
 * 같은 신살이 다른 basis 로 두 번 나올 수 있다. 접는 것은 표시 단계가 한다(§6).
 */
export function computeSinsal(pillars: FourPillars): readonly Sinsal[] {
  return byDayStem(pillars);
}
