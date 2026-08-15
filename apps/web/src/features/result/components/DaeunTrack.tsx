import { ELEMENT_CELL } from '@features/result/utils/element';
import { STEM_ELEMENT, stemOf } from '@saju';

import type { Daeun } from '@saju/daeun';

type DaeunTrackProps = {
  daeun: readonly Daeun[];
};

/**
 * 대운 열 개. 목업 result-screen.html 의 대운 절이다.
 *
 * 지금 대운을 표시하지 않는다. 고르는 기준이 현재 시각인데 그것은 화면 몫이고
 * 아직 받을 자리가 없다. docs/05 12.3 이 세운을 담지 않는 이유와 같다.
 */
const DaeunTrack = ({ daeun }: DaeunTrackProps) => {
  return (
    <div className="flex gap-[5px] overflow-x-auto pb-1">
      {daeun.map((each) => (
        <div
          key={each.index}
          className={`shrink-0 basis-[50px] rounded-[10px] border px-0 pt-1.5 pb-[7px] text-center ${
            ELEMENT_CELL[STEM_ELEMENT[stemOf(each.pillar)]]
          }`}
        >
          <div className="text-ink-soft text-[10px] leading-[1.4] tabular-nums">
            {each.startYear === null ? '연도 밖' : `${each.startYear}년`}
          </div>
          <div className="text-ink-soft text-[10px] leading-[1.4] tabular-nums">
            {`${each.startAge}세`}
          </div>
          <div className="mt-0.5 text-[15px] leading-[1.3] font-semibold">
            {each.pillar}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DaeunTrack;
