import { ELEMENT_CELL } from '@features/result/utils/element';

import type { StrengthResult } from '@saju/strength';

type YongshinCardProps = {
  strength: StrengthResult;
};

/**
 * 억부용신. 목업 result-screen.html 의 용신 절이다.
 *
 * 중화는 억부용신이 없어 `yongshin` 이 null 이다(docs/05 11.5).
 * 그때는 빈 카드가 아니라 왜 없는지를 낸다.
 */
const YongshinCard = ({ strength }: YongshinCardProps) => {
  const { yongshin, huisin, flags2 } = strength;

  if (yongshin === null) {
    return (
      <p className="border-line-strong text-ink-soft m-0 rounded-xl border border-dashed px-3.5 py-3 text-center text-[13px]">
        {flags2.needsJohuReview
          ? '중화라 억부용신이 없습니다. 조후나 병약 등 다른 용신법을 봐야 합니다.'
          : '억부용신이 정해지지 않았습니다.'}
      </p>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${ELEMENT_CELL[yongshin.element]}`}
    >
      <span className="text-2xl font-bold">{yongshin.element}</span>
      <span className="text-ink-mid text-[12.5px]">
        {yongshin.method}
        {huisin !== null && ` / 희신 ${huisin}`}
        {yongshin.fallbackReason !== undefined &&
          ` (${yongshin.fallbackReason})`}
      </span>
    </div>
  );
};

export default YongshinCard;
