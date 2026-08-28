import BirthFields from '@features/input/components/BirthFields';
import GenderSegment from '@features/input/components/GenderSegment';
import RegionField from '@features/input/components/RegionField';
import RegionSearchSheet from '@features/input/components/RegionSearchSheet';
import { parseDate, parseTime } from '@features/input/utils/birth';
import { computeSaju } from '@saju/chart';
import { leapMonthOf } from '@saju/lunar';
import { useField, useForm, useSelector } from '@tanstack/react-form';
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

/** 그 해 그 달이 실제로 윤달일 때만 물어본다. 아니면 물을 것이 없다 */
const leapAvailableFor = (date: string, calendar: Calendar) => {
  const parsed = parseDate(date, calendar);

  return (
    calendar === 'lunar' &&
    parsed.ok &&
    leapMonthOf(parsed.value.year) === parsed.value.month
  );
};

const validateDate = (value: string, calendar: Calendar) => {
  const parsed = parseDate(value, calendar);

  return parsed.ok ? undefined : parsed.message;
};

const validateTime = (value: string) => {
  const parsed = parseTime(value);

  return parsed.ok ? undefined : parsed.message;
};

const toChartInput = (values: BirthForm): ChartInput | null => {
  const parsed = parseDate(values.date, values.calendar);
  const parsedTime = parseTime(values.time);
  if (!parsed.ok || !parsedTime.ok || values.region === null) return null;

  const common = {
    birth: { ...parsed.value, ...parsedTime.value },
    gender: values.gender,
    ziPolicy: ZI_POLICY,
    longitude: values.region.longitude,
  } as const;

  if (values.calendar === 'lunar') {
    return {
      calendar: 'lunar',
      leapMonth:
        leapMonthOf(parsed.value.year) === parsed.value.month &&
        values.leapMonth,
      ...common,
    };
  }
  return { calendar: 'solar', ...common };
};

/**
 * 엔진에 한 번 넣어 보고 던지면 그 문구를 옮긴다(docs/03 8장).
 *
 * 필드 규칙이 다 통과한 뒤에만 불린다. `validateAllFields` 가 먼저 걸러서다.
 * 두 갈래가 `form` 과 `fields` 를 다 들어야 `GlobalFormValidationError` 로 추론된다.
 *
 * 모듈 자리에 두는 이유는 추론 고리다. `useForm` 안에 직접 적으면
 * `listeners` 의 `setErrorMap` 인자 타입이 이 검증기의 반환에 물려
 * `TOnSubmit` 이 통째로 undefined 로 무너지고, 폼 문구 타입이 사라진다.
 */
const validateEngine = ({ value }: { value: BirthForm }) => {
  const input = toChartInput(value);
  if (input === null) return null;

  try {
    computeSaju(input);
  } catch (thrown) {
    // 엔진이 던지는 RangeError 는 전부 날짜를 지목한다.
    // 그 외는 어느 칸인지 모르므로 칸에 붙이지 않는다
    return thrown instanceof RangeError
      ? { form: undefined, fields: { date: thrown.message } }
      : {
          form: '계산하지 못했습니다. 입력을 다시 확인해 주세요.',
          fields: {},
        };
  }
  return null;
};

const InputPage = ({ onSubmit }: InputPageProps) => {
  const [searching, setSearching] = useState(false);

  const form = useForm({
    defaultValues: DEFAULTS,
    listeners: {
      onChange: ({ formApi }) => {
        if (formApi.state.isValid) return;
        formApi.setErrorMap({ onSubmit: { form: undefined, fields: {} } });
      },
    },
    validators: { onSubmit: validateEngine },
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

  // 검증 규칙이 붙거나 값이 바뀌면 문구를 잊어야 하는 칸을 등록한다.
  // 입력칸이 표시 컴포넌트 안에 있어 등록은 지면이 하고 값과 콜백만 내려보낸다
  const calendar = useField({ form, name: 'calendar' });
  const date = useField({
    form,
    name: 'date',
    validators: {
      onSubmit: ({ value, fieldApi }) =>
        validateDate(value, fieldApi.form.getFieldValue('calendar')),
    },
  });
  const time = useField({
    form,
    name: 'time',
    validators: { onSubmit: ({ value }) => validateTime(value) },
  });

  const { gender, leapMonth, region } = useSelector(
    form.store,
    (state) => state.values,
  );
  // 어느 칸인지 모르는 오류가 여기로 온다. 필드 몫은 setErrorMap 이 갈라 놓는다
  const formMessage = useSelector(
    form.store,
    (state) => state.errorMap.onSubmit,
  );

  // 두 칸이 문구 한 줄을 나눠 쓴다. 둘 다 틀렸으면 날짜를 먼저 낸다
  const dateMessage = date.state.meta.errors[0];
  const timeMessage = time.state.meta.errors[0];
  const birthError: BirthError | undefined =
    dateMessage !== undefined
      ? { on: 'date', message: dateMessage }
      : timeMessage !== undefined
        ? { on: 'time', message: timeMessage }
        : undefined;

  return (
    <>
      <form
        autoComplete="off"
        className="flex flex-1 flex-col gap-[26px] px-[18px] pt-[22px]"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-[9px]">
          <label className="text-[13.5px] font-semibold" htmlFor="name">
            이름
          </label>
          <form.Field name="name">
            {(field) => (
              <input
                type="text"
                id={field.name}
                maxLength={12}
                placeholder="최대 12글자 이내로 입력하세요"
                className="border-line bg-field text-ink placeholder:text-ink-soft rounded-card focus-visible:border-accent focus-visible:outline-accent-soft h-12 w-full border px-3.5 text-[15px] focus-visible:outline-2"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
        </div>

        <GenderSegment
          value={gender}
          onChange={(next) => form.setFieldValue('gender', next)}
        />

        <BirthFields
          calendar={calendar.state.value}
          date={date.state.value}
          time={time.state.value}
          leapMonth={leapMonth}
          leapAvailable={leapAvailableFor(
            date.state.value,
            calendar.state.value,
          )}
          error={birthError}
          onCalendarChange={(next) => calendar.handleChange(next)}
          onDateChange={(next) => date.handleChange(next)}
          onTimeChange={(next) => time.handleChange(next)}
          onLeapMonthChange={(next) => form.setFieldValue('leapMonth', next)}
        />

        <RegionField
          value={region}
          onOpen={() => {
            setSearching(true);
          }}
        />

        <div className="bg-frame border-line mx-[-18px] mt-auto grid grid-cols-2 gap-2 border-t px-[18px] pt-3.5 pb-[calc(18px+env(safe-area-inset-bottom))]">
          {typeof formMessage === 'string' && (
            <p
              role="alert"
              className="text-danger col-span-2 m-0 text-xs leading-normal"
            >
              {formMessage}
            </p>
          )}
          <form.Subscribe
            selector={(state) =>
              state.values.name.trim() !== '' &&
              state.values.date.trim() !== '' &&
              state.values.time.trim() !== '' &&
              state.values.region !== null
            }
          >
            {(filled) => (
              <button
                type="submit"
                disabled={!filled}
                className="bg-accent text-accent-ink rounded-card disabled:bg-field disabled:text-ink-soft focus-visible:outline-accent h-13 cursor-pointer border border-transparent text-[15px] font-semibold transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                사주보러가기
              </button>
            )}
          </form.Subscribe>
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
          onSelect={(next) => {
            form.setFieldValue('region', next);
            setSearching(false);
          }}
          onClose={() => {
            setSearching(false);
          }}
        />
      )}
    </>
  );
};

export default InputPage;
