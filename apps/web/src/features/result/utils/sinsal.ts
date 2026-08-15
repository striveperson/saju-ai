import type {
  Sinsal,
  SinsalBasis,
  SinsalCategory,
  SinsalGrade,
  SinsalHit,
  SinsalName,
} from '@saju/sinsal';

export type FoldedSinsal = {
  name: SinsalName;
  category: SinsalCategory;
  grade: SinsalGrade;
  bases: readonly SinsalBasis[]; // 접기 전에 몇 가지 기준으로 걸렸는가
  hits: readonly SinsalHit[]; // 자리 중복을 뺀 것
};

const hitKey = (hit: SinsalHit): string => `${hit.pillar}:${hit.position}`;

/**
 * 같은 이름을 하나로 접는다. docs/07 6장이 이 일을 화면에 뒀다.
 *
 * 계산 코어는 `삼합(년지)` 와 `삼합(일지)` 로 같은 신살을 두 번 낼 수 있다.
 * 사용자에게는 도화살이 두 줄로 보일 이유가 없다.
 *
 * 입력 순서를 그대로 지킨다. `computeSinsal` 이 카탈로그 순으로 정렬해 주고
 * 그 순서가 해석 캐시 키의 근거이기 때문이다.
 */
export const foldSinsal = (
  list: readonly Sinsal[],
): readonly FoldedSinsal[] => {
  const folded = new Map<SinsalName, FoldedSinsal>();

  for (const sinsal of list) {
    const found = folded.get(sinsal.name);
    if (found === undefined) {
      folded.set(sinsal.name, {
        name: sinsal.name,
        category: sinsal.category,
        grade: sinsal.grade,
        bases: [sinsal.basis],
        hits: sinsal.hits,
      });
      continue;
    }

    const seen = new Set(found.hits.map(hitKey));
    folded.set(sinsal.name, {
      ...found,
      bases: [...found.bases, sinsal.basis],
      hits: [...found.hits, ...sinsal.hits.filter((h) => !seen.has(hitKey(h)))],
    });
  }

  return [...folded.values()];
};

/** 분류별 태그 색. docs/07 6장의 세 값 */
export const CATEGORY_TAG: Record<SinsalCategory, string> = {
  길성: 'border-accent/34 bg-accent/12 text-accent',
  흉살: 'border-hwa/34 bg-hwa/12 text-hwa',
  중립: 'border-ink-mid/34 bg-ink-mid/12 text-ink-mid',
};

/** 분류별 글자색만. 위 문자열을 실행 시점에 잘라 쓰지 않는다 */
export const CATEGORY_TEXT: Record<SinsalCategory, string> = {
  길성: 'text-accent',
  흉살: 'text-hwa',
  중립: 'text-ink-mid',
};
