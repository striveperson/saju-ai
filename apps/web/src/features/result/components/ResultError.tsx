import { Link } from '@tanstack/react-router';

import type { ErrorComponentProps } from '@tanstack/react-router';

/**
 * 입력 지면이 제출 전에 같은 계산을 돌려 보므로 여기까지 오는 것은
 * 앞 버전이 넣은 히스토리 state 가 새로고침으로 돌아온 경우다.
 */
const ResultError = ({ reset }: ErrorComponentProps) => {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-[18px] py-16 text-center">
      <p className="text-ink m-0 text-[15px] leading-relaxed">
        결과를 그리지 못했습니다.
        <br />
        입력을 다시 받아 계산해 주세요.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          className="border-line-strong bg-field text-ink rounded-card focus-visible:outline-accent h-11 cursor-pointer border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={reset}
        >
          다시 시도
        </button>
        <Link
          to="/"
          className="bg-accent text-accent-ink rounded-card focus-visible:outline-accent grid h-11 cursor-pointer place-items-center px-4 text-sm font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          처음부터 입력
        </Link>
      </div>
    </main>
  );
};

export default ResultError;
