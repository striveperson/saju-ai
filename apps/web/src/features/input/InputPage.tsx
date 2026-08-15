import BirthFields from '@features/input/components/BirthFields';
import GenderSegment from '@features/input/components/GenderSegment';
import RegionField from '@features/input/components/RegionField';
import RegionSearchSheet from '@features/input/components/RegionSearchSheet';
import { parseDate, parseTime } from '@features/input/utils/birth';
import { computeSaju } from '@saju/chart';
import { leapMonthOf } from '@saju/lunar';
import { useState } from 'react';

import type { BirthError } from '@features/input/components/BirthFields';
import type { Region } from '@features/input/utils/region';
import type { ChartInput } from '@saju/chart';
import type { Gender } from '@saju/daeun';
import type { ProfileInfo } from '@shared/handoff';

type InputPageProps = {
  onSubmit: (input: ChartInput, info: ProfileInfo) => void;
};

type Calendar = ChartInput['calendar'];

/**
 * 야자시 정책. 지금은 정자시설로 고정한다.
 *
 * 유파가 갈리는 지점이라 엔진이 기본값을 정하지 않고 호출부가 넘긴다(docs/05 6장).
 * 사용자가 고르는 수단은 설정 지면이 생길 때 붙는다(docs/01 5장).
 */
const ZI_POLICY = 'nextDay';

const GENDER_LABEL: Record<Gender, '남자' | '여자'> = {
  M: '남자',
  F: '여자',
};

/**
 * 입력 지면. 목업 docs/mockups/input-screen.html 이다.
 *
 * 제출 전에 `computeSaju` 를 한 번 돌려 본다. 성공해야 넘어간다.
 * 지원 범위 밖과 음력 윤달 오류를 엔진이 `RangeError` 로 던지므로
 * 그 문구를 그대로 낸다. 같은 판정을 여기 다시 적으면 두 벌이 되고,
 * 결과 지면까지 갔다가 깨지는 경로도 사라진다(docs/03 8장).
 */
const InputPage = ({ onSubmit }: InputPageProps) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('F');
  const [calendar, setCalendar] = useState<Calendar>('solar');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [leapMonth, setLeapMonth] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<BirthError>();

  const parsedDate = parseDate(date, calendar);

  // 그 해 그 달이 실제로 윤달일 때만 물어본다. 아니면 물을 것이 없다
  const leapAvailable =
    calendar === 'lunar' &&
    parsedDate.ok &&
    leapMonthOf(parsedDate.value.year) === parsedDate.value.month;

  // 출생지가 없으면 서울 관례값이 답으로 나간다(ADR 0019 3항)
  const filled =
    name.trim() !== '' &&
    date.trim() !== '' &&
    time.trim() !== '' &&
    region !== null;

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  // 고치기 시작하면 지운다. 남겨 두면 이미 고친 값에 대고 틀렸다고 말하게 된다
  const handleCalendarChange = (next: Calendar) => {
    setCalendar(next);
    setError(undefined);
  };

  const handleDateChange = (next: string) => {
    setDate(next);
    setError(undefined);
  };

  const handleTimeChange = (next: string) => {
    setTime(next);
    setError(undefined);
  };

  const handleOpenSearch = () => {
    setSearching(true);
  };

  const handleCloseSearch = () => {
    setSearching(false);
  };

  const handleSelectRegion = (next: Region) => {
    setRegion(next);
    setSearching(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedTime = parseTime(time);
    if (!parsedDate.ok) {
      setError({ on: 'date', message: parsedDate.message });
      return;
    }
    if (!parsedTime.ok) {
      setError({ on: 'time', message: parsedTime.message });
      return;
    }
    // 버튼이 이미 막고 있다. 타입을 좁히려고 한 번 더 본다
    if (region === null) return;

    const birth = { ...parsedDate.value, ...parsedTime.value };
    const input: ChartInput = {
      ...(calendar === 'lunar'
        ? { calendar: 'lunar', leapMonth: leapAvailable && leapMonth }
        : { calendar: 'solar' }),
      birth,
      gender,
      ziPolicy: ZI_POLICY,
      longitude: region.longitude,
    };

    try {
      computeSaju(input);
    } catch (thrown) {
      // 엔진이 던지는 것은 지원 범위와 음력 윤달이라 전부 날짜 쪽이다
      setError({
        on: 'date',
        message:
          thrown instanceof RangeError
            ? thrown.message
            : '계산하지 못했습니다. 입력을 다시 확인해 주세요.',
      });
      return;
    }

    setError(undefined);
    onSubmit(input, {
      name: name.trim(),
      gender: GENDER_LABEL[gender],
      region: region.name,
    });
  };

  return (
    <>
      <form
        autoComplete="off"
        className="flex flex-1 flex-col gap-[26px] px-[18px] pt-[22px]"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-[9px]">
          <label className="text-[13.5px] font-semibold" htmlFor="name">
            이름
          </label>
          <input
            type="text"
            id="name"
            maxLength={12}
            placeholder="최대 12글자 이내로 입력하세요"
            className="border-line bg-field text-ink placeholder:text-ink-soft rounded-card focus-visible:border-accent focus-visible:outline-accent-soft h-12 w-full border px-3.5 text-[15px] focus-visible:outline-2"
            value={name}
            onChange={handleNameChange}
          />
        </div>

        <GenderSegment value={gender} onChange={setGender} />

        <BirthFields
          calendar={calendar}
          date={date}
          time={time}
          leapMonth={leapMonth}
          leapAvailable={leapAvailable}
          error={error}
          onCalendarChange={handleCalendarChange}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onLeapMonthChange={setLeapMonth}
        />

        <RegionField value={region} onOpen={handleOpenSearch} />

        <div className="bg-frame border-line mx-[-18px] mt-auto grid grid-cols-2 gap-2 border-t px-[18px] pt-3.5 pb-[calc(18px+env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={!filled}
            className="bg-accent text-accent-ink rounded-card disabled:bg-field disabled:text-ink-soft focus-visible:outline-accent h-13 cursor-pointer border border-transparent text-[15px] font-semibold transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            사주보러가기
          </button>
          {/* 저장한 사주를 부르려면 소셜 로그인과 Supabase 가 있어야 한다 (ADR 0008, 0010) */}
          <button
            type="button"
            disabled
            className="border-line-strong bg-field text-ink rounded-card disabled:text-ink-soft h-13 cursor-pointer border text-[15px] font-semibold transition-colors disabled:cursor-not-allowed"
          >
            사주 불러오기
          </button>
        </div>
      </form>

      {searching && (
        <RegionSearchSheet
          onSelect={handleSelectRegion}
          onClose={handleCloseSearch}
        />
      )}
    </>
  );
};

export default InputPage;
