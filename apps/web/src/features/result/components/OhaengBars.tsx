import {
  ELEMENT_FILL,
  ELEMENT_TEXT,
  shengRing,
  percent,
} from '@features/result/utils/element';
import { tenGodGroup } from '@saju/tables';

import type { Element } from '@saju';
import type { StrengthResult } from '@saju/strength';

type OhaengBarsProps = {
  dayElement: Element;
  distribution: StrengthResult['elementDistribution'];
};

/**
 * 오행 분포 막대 다섯. 목업 result-screen.html 의 오행과 십신 절이다.
 *
 * 비율은 `elementDistribution` 을 그대로 쓴다. 일간 포함 여덟 글자가 분모다(docs/05 11.6).
 * 십신 이름은 `tenGodGroup` 이 낸다. 화면이 상생상극을 다시 계산하지 않는다.
 */
const OhaengBars = ({ dayElement, distribution }: OhaengBarsProps) => {
  return (
    <div className="flex flex-col gap-2">
      {shengRing('목').map((element) => {
        const { ratio } = distribution[element];
        return (
          <div
            key={element}
            className="grid grid-cols-[62px_1fr] items-center gap-2"
          >
            <span
              className={`flex items-baseline gap-1.5 text-[13px] font-semibold ${ELEMENT_TEXT[element]}`}
            >
              {element}
              <em className="text-ink-mid text-[11.5px] font-medium not-italic">
                {tenGodGroup(dayElement, element)}
              </em>
            </span>
            <div className="bg-ink-soft/15 relative h-[18px] overflow-hidden rounded-[5px]">
              <div
                className={`h-full rounded-r-[5px] ${ELEMENT_FILL[element]}`}
                style={{ width: percent(ratio) }}
              />
              <span className="text-ink-mid absolute top-0 right-[7px] text-[11px] leading-[18px] tabular-nums">
                {percent(ratio)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OhaengBars;
