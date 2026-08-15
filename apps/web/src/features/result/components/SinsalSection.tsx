import {
  CATEGORY_TAG,
  CATEGORY_TEXT,
  foldSinsal,
} from '@features/result/utils/sinsal';
import { Fragment } from 'react';

import type { PillarKey, Sinsal } from '@saju/sinsal';

type SinsalSectionProps = {
  sinsal: readonly Sinsal[];
};

/** 목업이 시, 일, 월, 년 순으로 놓는다. 팔자 표와 같은 자리다 */
const PILLARS: readonly (readonly [PillarKey, string])[] = [
  ['hour', '시'],
  ['day', '일'],
  ['month', '월'],
  ['year', '년'],
];

/**
 * 신살과 길성. 목업 result-screen.html 의 마지막 판정 절이다.
 *
 * 이름 단위로 접는다. 계산 코어가 같은 신살을 두 기준으로 낼 수 있고
 * 접는 것은 표시 단계 몫이다(docs/07 6장).
 *
 * A 와 B 등급을 구분해 표시한다. B 는 유파 선택이 들어간 판정이라
 * 결과에 `grade` 를 담은 이유가 그것이다(docs/07 6장).
 */
const SinsalSection = ({ sinsal }: SinsalSectionProps) => {
  const folded = foldSinsal(sinsal);

  if (folded.length === 0) {
    return (
      <p className="text-ink-soft m-0 text-center text-[13px]">
        붙은 신살이 없습니다.
      </p>
    );
  }

  return (
    <>
      <ul className="mb-3 flex list-none flex-wrap gap-[5px] p-0">
        {folded.map((each) => (
          <li
            key={each.name}
            className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${CATEGORY_TAG[each.category]}`}
          >
            {each.name}
            <span className="ml-1 font-normal opacity-70">{each.grade}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-[34px_repeat(4,1fr)] items-stretch gap-1">
        <div />
        {PILLARS.map(([key, label]) => (
          <div key={key} className="text-ink-soft text-center text-[11.5px]">
            {label}
          </div>
        ))}

        {(['stem', 'branch'] as const).map((position) => (
          <Fragment key={position}>
            <div className="text-ink-soft self-center text-right text-[11px]">
              {position === 'stem' ? '천간' : '지지'}
            </div>
            {PILLARS.map(([key]) => {
              const here = folded.filter((each) =>
                each.hits.some(
                  (hit) => hit.pillar === key && hit.position === position,
                ),
              );
              return (
                <div
                  key={key}
                  className="border-line flex min-h-[34px] flex-col items-center justify-center gap-[3px] rounded-[10px] border px-0.5 py-1.5"
                >
                  {here.length === 0 ? (
                    <span className="text-ink-soft text-xs">×</span>
                  ) : (
                    here.map((each) => (
                      <span
                        key={each.name}
                        className={`text-[11px] font-semibold tracking-[-0.04em] ${CATEGORY_TEXT[each.category]}`}
                      >
                        {each.name}
                      </span>
                    ))
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </>
  );
};

export default SinsalSection;
