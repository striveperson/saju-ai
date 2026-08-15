import { z } from 'zod';

import type { ChartInput } from '@saju/chart';

/**
 * 입력 지면이 만들고 결과 지면이 받는 것. 히스토리 state 로 건너간다.
 */

/**
 * 엔진이 알 수 없는 표시용 값.
 *
 * `Chart` 에 성별이 없고 지역명은 경도에서 유도되지 않는다.
 * 성별은 대운 방향에만 쓰여 결과에 담기지 않고, 지역명은 애초에 엔진이 모른다.
 */
export const profileInfoSchema = z.object({
  name: z.string().optional(),
  gender: z.enum(['남자', '여자']).optional(),
  region: z.string().optional(),
});

export type ProfileInfo = z.infer<typeof profileInfoSchema>;

const calendarDateTimeSchema = z.object({
  year: z.int(),
  month: z.int(),
  day: z.int(),
  hour: z.int(),
  minute: z.int(),
});

const shared = {
  birth: calendarDateTimeSchema,
  gender: z.enum(['M', 'F']),
  ziPolicy: z.enum(['sameDay', 'nextDay']),
  longitude: z.number().optional(),
  dstAssumption: z.enum(['daylight', 'standard', 'unknown']).optional(),
  ambiguityChoice: z.enum(['earlier', 'later']).optional(),
};

/**
 * `ChartInput` 을 그대로 옮긴 것이다.
 *
 * `satisfies` 가 둘을 묶는다. 엔진 타입이 바뀌면 여기서 타입체크가 깨지므로
 *  스키마만 낡은 채로 통과하는 일이 없다.
 */
export const chartInputSchema = z.discriminatedUnion('calendar', [
  z.object({ calendar: z.literal('solar'), ...shared }),
  z.object({ calendar: z.literal('lunar'), leapMonth: z.boolean(), ...shared }),
]) satisfies z.ZodType<ChartInput>;

export const handoffSchema = z.object({
  input: chartInputSchema,
  info: profileInfoSchema,
});

export type Handoff = z.infer<typeof handoffSchema>;
