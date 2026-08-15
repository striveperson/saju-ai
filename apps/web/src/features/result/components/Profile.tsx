import {
  AMBIGUITY_LABEL,
  NOTICE_TEXT,
} from '@features/result/utils/disclosure';

import type { CalendarDateTime } from '@saju/calendar';
import type { Chart } from '@saju/chart';

/**
 * 엔진이 알 수 없는 표시용 값. 사용자가 입력한 것을 그대로 받는다.
 *
 * `Chart` 에 성별이 없고 지역명은 경도에서 유도되지 않는다.
 * 성별은 대운 방향에만 쓰여 결과에 담기지 않고, 지역명은 애초에 엔진이 모른다.
 */
export type ProfileInfo = {
  name?: string;
  gender?: '남자' | '여자';
  region?: string;
};

type ProfileProps = {
  chart: Chart;
  info?: ProfileInfo;
};

const pad = (n: number): string => String(n).padStart(2, '0');

const date = (at: CalendarDateTime): string =>
  `${at.year}-${pad(at.month)}-${pad(at.day)}`;

const clock = (at: CalendarDateTime): string =>
  `${pad(at.hour)}:${pad(at.minute)}`;

/**
 * 프로필과 계산이 세운 가정. 목업 result-screen.html 의 첫 절이다.
 *
 * 경고를 접지 않는다. 가정을 세웠다는 사실은 눌러야 보이면 안 된다(docs/01 5.1).
 * 적용한 유파 값은 표시하지 않는다. 근거는 docs/01 5장이다.
 */
const Profile = ({ chart, info }: ProfileProps) => {
  const { correction, solar, pillars, ziBoundary } = chart;
  const { minutes } = correction.disclosure.trueSolar;
  const { notices, resolution } = correction.disclosure;

  const 태어난곳 = [info?.gender, info?.region].filter(Boolean).join(' ');

  return (
    <section className="border-line bg-field rounded-card border p-4">
      <div className="mb-2.5 flex items-baseline gap-2">
        {info?.name !== undefined && (
          <strong className="text-[19px] font-semibold">{info.name}</strong>
        )}
        <span className="text-accent text-[13px] font-semibold">
          {`${pillars.day} 일주`}
        </span>
      </div>

      <dl className="m-0 grid grid-cols-[44px_1fr] gap-x-2.5 gap-y-1 text-[12.5px]">
        <dt className="text-ink-soft">양력</dt>
        <dd className="text-ink-mid m-0 tabular-nums">
          {`${date(solar)} ${clock(correction.recorded)}${태어난곳 === '' ? '' : ` ${태어난곳}`}`}
        </dd>
        <dt className="text-ink-soft">보정</dt>
        <dd className="text-ink-mid m-0 tabular-nums">
          {`${date(correction.corrected)} ${clock(correction.corrected)} (진태양시 ${minutes}분)`}
        </dd>
      </dl>

      {ziBoundary !== null && (
        <p className="border-line-strong text-ink-mid mt-3 mb-0 border-t pt-3 text-xs leading-relaxed">
          {`이 시각은 자시 경계라 일주가 ${pillars.day}과 ${ziBoundary}로 갈립니다. ` +
            `${pillars.day}로 계산했고, 다른 해석을 고르면 일간이 바뀌어 ` +
            `신강약과 용신과 신살도 함께 달라집니다.`}
        </p>
      )}

      {notices.length > 0 && (
        <ul
          aria-label="계산이 세운 가정"
          className="border-line-strong text-ink-mid mt-3 flex list-none flex-col gap-1.5 border-t p-0 pt-3 text-xs"
        >
          {notices.map((notice) => (
            <li key={notice} className="leading-relaxed">
              {NOTICE_TEXT[notice]}
              {notice === 'ambiguous-wall-clock' &&
                resolution.kind === 'ambiguous' &&
                ` ${AMBIGUITY_LABEL[resolution.chosen]}인 ${clock(correction.normalized)}으로 계산했고${
                  resolution.because === 'default' ? ' (기본값)' : ''
                }, 다른 해석은 ${date(resolution.alternative.normalized)} ${clock(resolution.alternative.normalized)}입니다.`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default Profile;
