import { maskDate, maskTime } from '@features/input/utils/birth';

import type { ChartInput } from '@saju/chart';

type Calendar = ChartInput['calendar'];

/** 어느 칸이 잘못됐는지. 둘 다에 표시하면 멀쩡한 칸까지 잘못된 것으로 읽힌다 */
export type BirthError = { on: 'date' | 'time'; message: string };

type BirthFieldsProps = {
  calendar: Calendar;
  date: string;
  time: string;
  leapMonth: boolean;
  /** 그 해 그 달이 실제로 윤달일 때만 참. 아니면 토글 자체가 없다 */
  leapAvailable: boolean;
  error?: BirthError;
  onCalendarChange: (next: Calendar) => void;
  onDateChange: (next: string) => void;
  onTimeChange: (next: string) => void;
  onLeapMonthChange: (next: boolean) => void;
};

const FIELD =
  'border-line bg-field text-ink rounded-card focus-visible:border-accent focus-visible:outline-accent-soft h-12 border px-3.5 text-[15px] focus-visible:outline-2';

/**
 * 생년월일시. 목업 input-screen.html 의 .birth-row 다.
 *
 * 시각은 비울 수 없다. `ChartInput.birth` 가 필수로 받고 시 미상은 규칙이 아직
 * 없다(docs/05 12.1). 목업의 "시간 모름" 토글이 그래서 아직 여기 없다.
 */
const BirthFields = ({
  calendar,
  date,
  time,
  leapMonth,
  leapAvailable,
  error,
  onCalendarChange,
  onDateChange,
  onTimeChange,
  onLeapMonthChange,
}: BirthFieldsProps) => {
  const handleCalendarChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    onCalendarChange(event.target.value === 'lunar' ? 'lunar' : 'solar');
  };

  // 구분자는 치는 대로 붙는다. 값은 언제나 마스킹을 거친 것이라 폼이 날것을 보지 않는다
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(maskDate(event.target.value));
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(maskTime(event.target.value));
  };

  const handleLeapChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLeapMonthChange(event.target.checked);
  };

  return (
    <div className="flex flex-col gap-[9px]">
      <span className="text-[13.5px] font-semibold" id="birth-label">
        생년월일시
      </span>

      <div className="grid grid-cols-[78px_1fr_86px] gap-2">
        <div className="relative grid">
          <select
            aria-label="양력 음력"
            className={`${FIELD} appearance-none pr-6 pl-[13px] text-sm`}
            value={calendar}
            onChange={handleCalendarChange}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
          {/* 목업은 배경 이미지로 넣었는데 색이 하드코딩되어 토큰을 안 따라간다 */}
          <svg
            width="10"
            height="7"
            viewBox="0 0 10 7"
            fill="none"
            aria-hidden="true"
            className="text-ink-soft pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
          >
            <path
              d="M1 1.5L5 5.5L9 1.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <input
          type="text"
          inputMode="numeric"
          aria-labelledby="birth-label"
          aria-invalid={error?.on === 'date'}
          aria-describedby={error?.on === 'date' ? 'birth-error' : undefined}
          placeholder="1995-01-27"
          className={`${FIELD} w-full tabular-nums`}
          value={date}
          onChange={handleDateChange}
        />
        <input
          type="text"
          inputMode="numeric"
          aria-label="태어난 시각"
          aria-invalid={error?.on === 'time'}
          aria-describedby={error?.on === 'time' ? 'birth-error' : undefined}
          placeholder="14:39"
          className={`${FIELD} w-full tabular-nums`}
          value={time}
          onChange={handleTimeChange}
        />
      </div>

      {error !== undefined && (
        <p
          id="birth-error"
          role="alert"
          className="text-danger m-0 text-xs leading-normal"
        >
          {error.message}
        </p>
      )}

      {leapAvailable && (
        <div className="flex gap-5 pt-[3px]">
          <label className="text-ink-mid flex cursor-pointer items-center gap-[7px] text-[13px]">
            <input
              type="checkbox"
              className="peer absolute m-0 h-px w-px opacity-0"
              checked={leapMonth}
              onChange={handleLeapChange}
            />
            <span className="border-line-strong peer-checked:border-accent peer-checked:[&>span]:scale-100 peer-focus-visible:outline-accent grid size-[18px] place-items-center rounded-full border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
              <span className="bg-accent size-[9px] scale-0 rounded-full transition-transform" />
            </span>
            윤달
          </label>
        </div>
      )}
    </div>
  );
};

export default BirthFields;
