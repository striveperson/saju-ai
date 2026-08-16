import BirthFields from '@features/input/components/BirthFields';
import GenderSegment from '@features/input/components/GenderSegment';
import RegionField from '@features/input/components/RegionField';
import RegionSearchSheet from '@features/input/components/RegionSearchSheet';
import { parseDate, parseTime } from '@features/input/utils/birth';
import { computeSaju } from '@saju/chart';
import { leapMonthOf } from '@saju/lunar';
import { useState } from 'react';
import { useController, useForm, useWatch } from 'react-hook-form';

import type { BirthError } from '@features/input/components/BirthFields';
import type { Region } from '@features/input/utils/region';
import type { ChartInput } from '@saju/chart';
import type { Gender } from '@saju/daeun';
import type { ProfileInfo } from '@shared/handoff';

type InputPageProps = {
  onSubmit: (input: ChartInput, info: ProfileInfo) => void;
};

type Calendar = ChartInput['calendar'];

/** 폼이 드는 값 전부. 출생지는 시트에서 고르는 것이라 입력칸이 없다 */
type BirthForm = {
  name: string;
  gender: Gender;
  calendar: Calendar;
  date: string;
  time: string;
  leapMonth: boolean;
  region: Region | null;
};

const ZI_POLICY = 'nextDay';

const GENDER_LABEL: Record<Gender, '남자' | '여자'> = {
  M: '남자',
  F: '여자',
};

const DEFAULTS: BirthForm = {
  name: '',
  gender: 'F',
  calendar: 'solar',
  date: '',
  time: '',
  leapMonth: false,
  region: null,
};

/**
 * 날짜 규칙. 양력인지 음력인지에 따라 잣대가 달라 폼의 다른 값을 함께 본다.
 *
 * 지원 범위와 음력 윤달은 여기서 보지 않는다. 엔진이 `RangeError` 로 던지고
 * 제출 시점에 그 문구를 그대로 옮긴다(docs/03 8장).
 */
const validateDate = (value: string, values: BirthForm) => {
  const parsed = parseDate(value, values.calendar);

  return parsed.ok || parsed.message;
};

const validateTime = (value: string) => {
  const parsed = parseTime(value);

  return parsed.ok || parsed.message;
};

const InputPage = ({ onSubmit }: InputPageProps) => {
  const [searching, setSearching] = useState(false);

  // 되검증을 제출 시점으로 미룬다. 고치는 도중의 반쪽짜리 값에 대고
  // 틀렸다고 말하지 않으려는 것이고, 지우는 것은 아래 handleForget 이 맡는다
  const {
    clearErrors,
    control,
    formState,
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<BirthForm>({
    defaultValues: DEFAULTS,
    reValidateMode: 'onSubmit',
  });

  const { field: date } = useController({
    control,
    name: 'date',
    rules: { validate: validateDate },
  });
  const { field: time } = useController({
    control,
    name: 'time',
    rules: { validate: validateTime },
  });

  // watch 가 아니라 useWatch 다. watch 는 렌더 중에 부르는 구독이라
  // react-doctor-disable-next-line react-hooks-js/incompatible-library
  // React Compiler 가 이 컴포넌트의 메모이제이션을 통째로 건너뛴다
  // 이름을 하나하나 적는다. 통째로 받으면 타입이 DeepPartial 이 되어
  // 값마다 없을 때를 다루게 되는데, defaultValues 가 넷 다 채워 두고 있다
  const [calendar, gender, leapMonth, name, region] = useWatch({
    control,
    name: ['calendar', 'gender', 'leapMonth', 'name', 'region'],
  });
  const { errors } = formState;

  const parsedDate = parseDate(date.value, calendar);

  // 그 해 그 달이 실제로 윤달일 때만 물어본다. 아니면 물을 것이 없다
  const leapAvailable =
    calendar === 'lunar' &&
    parsedDate.ok &&
    leapMonthOf(parsedDate.value.year) === parsedDate.value.month;

  // 출생지가 없으면 서울 관례값이 답으로 나간다(ADR 0019 3항)
  const filled =
    name.trim() !== '' &&
    date.value.trim() !== '' &&
    time.value.trim() !== '' &&
    region !== null;

  // 두 칸이 문구 한 줄을 나눠 쓴다. 둘 다 틀렸으면 날짜를 먼저 낸다
  const dateMessage = errors.date?.message;
  const timeMessage = errors.time?.message;
  const birthError: BirthError | undefined =
    dateMessage !== undefined
      ? { on: 'date', message: dateMessage }
      : timeMessage !== undefined
        ? { on: 'time', message: timeMessage }
        : undefined;

  // 고치기 시작하면 지운다. 남겨 두면 이미 고친 값에 대고 틀렸다고 말하게 된다.
  // 한 줄을 나눠 쓰므로 한쪽을 고쳐도 둘 다 지운다
  const handleForget = () => {
    clearErrors(['date', 'time']);
  };

  const handleGenderChange = (next: Gender) => {
    setValue('gender', next);
  };

  const handleCalendarChange = (next: Calendar) => {
    setValue('calendar', next);
    handleForget();
  };

  const handleDateChange = (next: string) => {
    date.onChange(next);
    handleForget();
  };

  const handleTimeChange = (next: string) => {
    time.onChange(next);
    handleForget();
  };

  const handleLeapMonthChange = (next: boolean) => {
    setValue('leapMonth', next);
  };

  const handleOpenSearch = () => {
    setSearching(true);
  };

  const handleCloseSearch = () => {
    setSearching(false);
  };

  const handleSelectRegion = (next: Region) => {
    setValue('region', next);
    setSearching(false);
  };

  const handleValid = (values: BirthForm) => {
    const parsed = parseDate(values.date, values.calendar);
    const parsedTime = parseTime(values.time);
    // 규칙이 이미 걸렀다. 값을 꺼내려고 다시 읽고 타입을 좁힌다
    if (!parsed.ok || !parsedTime.ok || values.region === null) return;

    const birth = { ...parsed.value, ...parsedTime.value };
    const input: ChartInput = {
      ...(values.calendar === 'lunar'
        ? { calendar: 'lunar', leapMonth: leapAvailable && values.leapMonth }
        : { calendar: 'solar' }),
      birth,
      gender: values.gender,
      ziPolicy: ZI_POLICY,
      longitude: values.region.longitude,
    };

    try {
      computeSaju(input);
    } catch (thrown) {
      // 엔진이 던지는 것은 지원 범위와 음력 윤달이라 전부 날짜 쪽이다
      setError('date', {
        message:
          thrown instanceof RangeError
            ? thrown.message
            : '계산하지 못했습니다. 입력을 다시 확인해 주세요.',
      });
      return;
    }

    onSubmit(input, {
      name: values.name.trim(),
      gender: GENDER_LABEL[values.gender],
      region: values.region.name,
    });
  };

  // handleSubmit 이 돌려주는 것은 Promise 라 폼의 onSubmit 자리에 그대로 못 건다
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(handleValid)(event);
  };

  return (
    <>
      <form
        autoComplete="off"
        className="flex flex-1 flex-col gap-[26px] px-[18px] pt-[22px]"
        onSubmit={handleFormSubmit}
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
            {...register('name')}
          />
        </div>

        <GenderSegment value={gender} onChange={handleGenderChange} />

        <BirthFields
          calendar={calendar}
          date={date.value}
          time={time.value}
          leapMonth={leapMonth}
          leapAvailable={leapAvailable}
          error={birthError}
          onCalendarChange={handleCalendarChange}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          onLeapMonthChange={handleLeapMonthChange}
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
