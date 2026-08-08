/**
 * 사주 계산 엔진.
 *
 * 이 디렉토리는 외부 의존이 0 이다. React, 날짜 라이브러리, Supabase 클라이언트,
 * UI 코드를 import 하지 않는다. 허용 예외는 KASI 절기·음력 데이터 모듈뿐이다.
 *
 * 현재 시각과 실행 환경 타임존을 읽지 않는다.
 * Date.now(), 인자 없는 new Date(), Math.random() 을 쓰지 않는다. 시각은 인자로 받는다.
 *
 * 규칙의 단일 진실 공급원은 docs/05-saju-domain-rules.md 다.
 * 코드와 문서가 어긋나면 코드가 틀린 것으로 간주한다.
 *
 * 참고: docs/adr/0005, docs/adr/0013
 */

export const HEAVENLY_STEMS = [
  '갑',
  '을',
  '병',
  '정',
  '무',
  '기',
  '경',
  '신',
  '임',
  '계',
] as const;

export const EARTHLY_BRANCHES = [
  '자',
  '축',
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
] as const;

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];
export type Element = '목' | '화' | '토' | '금' | '수';
export type Polarity = '양' | '음';

/**
 * 간지 한 기둥. 천간 1자와 지지 1자가 붙는다.
 *
 * 타입만으로는 60갑자에 실재하지 않는 조합(갑축 등)도 통과한다.
 * 천간과 지지의 인덱스 홀짝이 같아야 실재하는 조합이고, 그 검사는 테스트가 한다.
 */
export type Pillar = `${HeavenlyStem}${EarthlyBranch}`;

/** 천간 오행. docs/05 §1 */
export const STEM_ELEMENT: Record<HeavenlyStem, Element> = {
  갑: '목',
  을: '목',
  병: '화',
  정: '화',
  무: '토',
  기: '토',
  경: '금',
  신: '금',
  임: '수',
  계: '수',
};

/** 천간 음양. 갑·병·무·경·임이 양. docs/05 §1 */
export const STEM_POLARITY: Record<HeavenlyStem, Polarity> = {
  갑: '양',
  을: '음',
  병: '양',
  정: '음',
  무: '양',
  기: '음',
  경: '양',
  신: '음',
  임: '양',
  계: '음',
};

/** 지지 오행. 진술축미가 토. docs/05 §1 */
export const BRANCH_ELEMENT: Record<EarthlyBranch, Element> = {
  자: '수',
  축: '토',
  인: '목',
  묘: '목',
  진: '토',
  사: '화',
  오: '화',
  미: '토',
  신: '금',
  유: '금',
  술: '토',
  해: '수',
};
