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
import { useField, useForm, useSelector } from '@tanstack/react-form';

type Calendar = ChartInput['calendar'];

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

const validateDate = (value: string, calendar: Calendar) => {
  const parsed = parseDate(value, calendar);

  return parsed.ok  ? undefined : parsed.message;
};

const validateTime = (value: string) => {
  const parsed = parseTime(value);

  return parsed.ok  ? undefined : parsed.message;
};

type InputPageProps = {
  onSubmit: (input: ChartInput, info: ProfileInfo) => void;
};

const InputPage = ({ onSubmit }: InputPageProps) => {
  const [searching, setSearching] = useState(false);

  const toChartInput = (values: BirthForm): ChartInput | null => {
    const parsed = parseDate(values.date, values.calendar);
    const parsedTime = parseTime(values.time);
    if (!parsed.ok || !parsedTime.ok || values.region === null) return null;

    const birth = { ...parsed.value, ...parsedTime.value };
    return {
      ...(values.calendar === 'lunar'
        ? { calendar: 'lunar', leapMonth: leapAvailable && values.leapMonth }
        : { calendar: 'solar' }),
      birth,
      gender: values.gender,
      ziPolicy: ZI_POLICY,
      longitude: values.region.longitude,
    } as ChartInput;
  }

  const form = useForm({
    defaultValues: DEFAULTS,
    validators: {
    onSubmit: ({ value }) => {
      const input = toChartInput(value);
      if (input === null) return { form: '계산하지 못했습니다. 입력을 다시 확인해 주세요.' };

      try {
        computeSaju(input);
      } catch (thrown) {
        if (thrown instanceof RangeError) {
          return { fields: { date: thrown.message } };
        }
        
        return { form: '계산하지 못했습니다. 입력을 다시 확인해 주세요.' };
      }
      return null;
    },
  },
  onSubmit: ({ value }) => {
    const input = toChartInput(value);
    
    if (input === null || value.region === null) return;

    onSubmit(input, {
      name: value.name.trim(),
      gender: GENDER_LABEL[value.gender],
      region: value.region.name,
    });
  },
  });

  const date = useField({
    form,
    name: 'date',
    validators: { 
      onSubmit : ({value, fieldApi}) => 
        validateDate(value, fieldApi.form.getFieldValue('calendar')) 
    },
  });
  const time = useField({
    form,
    name: 'time',
    validators: { 
      onSubmit: ({value}) => validateTime(value)
    },
  });

  const {calendar, gender, leapMonth, name, region} = useSelector(
    form.store, s => s.values
  );

  const parsedDate = parseDate(date.state.value, calendar);

  // 그 해 그 달이 실제로 윤달일 때만 물어본다. 아니면 물을 것이 없다
  const leapAvailable =
    calendar === 'lunar' &&
    parsedDate.ok &&
    leapMonthOf(parsedDate.value.year) === parsedDate.value.month;

  // 출생지가 없으면 서울 관례값이 답으로 나간다(ADR 0019 3항)
  const filled =
    name.trim() !== '' &&
    date.state.value.trim() !== '' &&
    time.state.value.trim() !== '' &&
    region !== null;

  // 두 칸이 문구 한 줄을 나눠 쓴다. 둘 다 틀렸으면 날짜를 먼저 낸다
  const dateMessage = date.state.meta.errors[0];
  const timeMessage = time.state.meta.errors[0];
  const birthError: BirthError | undefined =
    dateMessage !== undefined
      ? { on: 'date', message: dateMessage }
      : timeMessage !== undefined
        ? { on: 'time', message: timeMessage }
        : undefined;

  const handleGenderChange = (next: Gender) => {
    form.setFieldValue('gender', next);
  };

  const handleCalendarChange = (next: Calendar) => {
    form.setFieldValue('calendar', next);
  };

  const handleDateChange = (next: string) => {
    date.handleChange(next);
  };

  const handleTimeChange = (next: string) => {
    time.handleChange(next);
  };

  const handleLeapMonthChange = (next: boolean) => {
    form.setFieldValue('leapMonth', next);
  };

  const handleOpenSearch = () => {
    setSearching(true);
  };

  const handleCloseSearch = () => {
    setSearching(false);
  };

  const handleSelectRegion = (next: Region) => {
    form.setFieldValue('region', next);
    setSearching(false);
  };

  return (
    <>
      <form
        autoComplete="off"
        className="flex flex-1 flex-col gap-[26px] px-[18px] pt-[22px]"
        onSubmit={form.handleSubmit}
      >
        <div className="flex flex-col gap-[9px]">
          <label className="text-[13.5px] font-semibold" htmlFor="name">
            이름
          </label>
          <form.Field
          name='name'
          children={(field) =>(
            <input
              id={field.name}
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              type="text"
              maxLength={12}
              placeholder="최대 12글자 이내로 입력하세요"
              className="border-line bg-field text-ink placeholder:text-ink-soft rounded-card focus-visible:border-accent focus-visible:outline-accent-soft h-12 w-full border px-3.5 text-[15px] focus-visible:outline-2"
            />)}
          />
        </div>

        <GenderSegment value={gender} onChange={handleGenderChange} />

        <BirthFields
          calendar={calendar}
          date={date.state.value}
          time={time.state.value}
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
