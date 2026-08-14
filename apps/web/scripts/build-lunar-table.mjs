/**
 * KASI 음력표를 엔진이 쓰는 데이터 모듈로 굽는다.
 *
 * 원본은 dump-kasi-lunar.mjs 가 받아 둔 kasi-lunar-months.json 이다.
 * 달마다 한 행인 그 표를 연도당 한 행으로 접는다. 1867행이 151행이 된다.
 *
 * 절기와 달리 base64 바이너리로 담지 않는다. 151행은 diff 로 읽히므로
 * 리뷰용 JSON 사본을 따로 둘 이유가 없다. 근거는 docs/05 8장.
 *
 * 실행:
 *   node apps/web/scripts/build-lunar-table.mjs           굽는다
 *   node apps/web/scripts/build-lunar-table.mjs --check   쓰지 않고 커밋된 파일과 대조만 한다
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const checkOnly = process.argv.includes('--check');

const source = JSON.parse(
  readFileSync(resolve(here, 'kasi-lunar-months.json'), 'utf8'),
);
const months = source.months;
const outPath = resolve(here, '../src/lib/saju/data/lunar-months.ts');

const firstYear = source.requested.firstYear;
const lastYear = source.requested.lastYear;

// ---- 검증 ----
// 굽기 전에 원본을 다시 본다. 덤프가 저장 전에 같은 검사를 하지만
// 손으로 고친 파일이 여기 들어올 수 있고, 접는 것은 표가 온전할 때만 뜻이 있다.

const byYear = new Map();
for (const m of months) {
  if (!byYear.has(m.lunYear)) byYear.set(m.lunYear, []);
  byYear.get(m.lunYear).push(m);
}

for (let i = 0; i < months.length; i++) {
  const m = months[i];
  if (m.days !== 29 && m.days !== 30) {
    throw new Error(`${m.solar} 의 달 크기가 ${m.days} 다`);
  }
  const next = months[i + 1];
  if (next && m.jdn + m.days !== next.jdn) {
    throw new Error(`${m.solar} 다음이 이어지지 않는다`);
  }
  if (m.leap && (i === 0 || months[i - 1].lunMonth !== m.lunMonth)) {
    throw new Error(`${m.lunYear}-${m.lunMonth} 윤달이 평달 뒤에 있지 않다`);
  }
}

const years = [...byYear.keys()].sort((a, b) => a - b);
if (years[0] !== firstYear || years.at(-1) !== lastYear) {
  throw new Error(`연도 범위가 ${years[0]}~${years.at(-1)} 이다`);
}
if (years.length !== lastYear - firstYear + 1) {
  throw new Error(`연도가 ${years.length}개다. 빠진 해가 있다`);
}

// ---- 접기 ----
// 연도당 [정월 초하루 적일, 윤달 위치, 달 수, 크기 비트마스크].
// 마스크는 낮은 자리가 정월이고 1 이면 30일이다.

const rows = years.map((year) => {
  const list = byYear.get(year);
  const leaps = list.filter((m) => m.leap);
  if (leaps.length > 1) throw new Error(`${year} 에 윤달이 둘이다`);

  // 마지막 해는 데이터가 끝나는 자리라 달 수가 모자란다
  const expected = 12 + leaps.length;
  if (list.length !== expected && year !== lastYear) {
    throw new Error(`${year} 의 달 수가 ${list.length} 다`);
  }
  if (list[0].lunMonth !== 1 || list[0].leap) {
    throw new Error(`${year} 가 정월에서 시작하지 않는다`);
  }

  let mask = 0;
  for (const [i, m] of list.entries()) {
    if (m.days === 30) mask |= 1 << i;
  }
  return [
    list[0].jdn,
    leaps.length === 1 ? leaps[0].lunMonth : 0,
    list.length,
    mask,
  ];
});

/** 접은 행을 다시 달 목록으로 펼친다. 생성되는 모듈도 같은 규칙을 쓴다. */
function expand(rows, firstYear) {
  const out = [];
  for (const [index, [startJdn, leapMonth, count, mask]] of rows.entries()) {
    let jdn = startJdn;
    let month = 1;
    let leap = false;

    for (let i = 0; i < count; i++) {
      const days = (mask >> i) & 1 ? 30 : 29;
      out.push({ year: firstYear + index, month, leap, days, startJdn: jdn });
      jdn += days;

      if (!leap && month === leapMonth) {
        leap = true;
      } else {
        leap = false;
        month++;
      }
    }
  }
  return out;
}

// ---- 접었다 펼치기 대조 ----
// 접는 과정에서 잃는 것이 없어야 한다. 한 값이라도 다르면 굽지 않는다.

const restored = expand(rows, firstYear);
if (restored.length !== months.length) {
  throw new Error(
    `펼친 달이 ${restored.length}개다. 원본은 ${months.length}개다`,
  );
}
for (const [i, m] of months.entries()) {
  const r = restored[i];
  if (
    r.year !== m.lunYear ||
    r.month !== m.lunMonth ||
    r.leap !== m.leap ||
    r.days !== m.days ||
    r.startJdn !== m.jdn
  ) {
    throw new Error(
      `${i}번째가 어긋난다: ${m.lunYear}-${m.lunMonth}${m.leap ? '윤' : ''} ${m.jdn} 대 ` +
        `${r.year}-${r.month}${r.leap ? '윤' : ''} ${r.startJdn}`,
    );
  }
}

const last = months.at(-1);

// ---- 산출 ----

const rowSource = rows
  .map(
    ([jdn, leapMonth, count, mask], i) =>
      `  [${jdn}, ${leapMonth}, ${count}, 0b${mask.toString(2).padStart(13, '0')}], // ${firstYear + i}`,
  )
  .join('\n');

const tsSource = `/**
 * 음력 달력표. ${firstYear}년 정월부터 ${lastYear}년 ${last.lunMonth}월까지 ${months.length}달.
 *
 * 자동 생성 파일이다. 직접 고치지 않는다.
 * 다시 만들려면 apps/web/scripts/build-lunar-table.mjs 를 돌린다.
 *
 * 값의 출처는 KASI 음양력정보 API 다. 한국 음력은 천문 계산과 관습 규칙이 섞여 있어
 * 자체 산출 알고리즘을 만들지 않는다. 근거는 docs/adr/0006 과 docs/adr/0014.
 *
 * 받은 표는 Skyfield 로 계산한 합삭과 대조했고 ${months.length}달이 모두 맞는다.
 * 대조 방법과 KASI 가 쓴 기준 자오선은 docs/05 8장에 있다.
 *
 * 상한이 해가 아니라 달이다. ${lastYear}년 ${last.lunMonth}월에서 끝나므로
 * 연도만 보는 범위 검사는 여기서 뚫린다. 근거는 docs/05 8.2.
 */

/** 데이터가 덮는 연도 범위. */
export const LUNAR_FIRST_YEAR = ${firstYear};
export const LUNAR_LAST_YEAR = ${lastYear};

/** 덮는 마지막 음력일. 상한이 ${lastYear}년 12월이 아니다. */
export const LUNAR_LAST_MONTH = ${last.lunMonth};
export const LUNAR_LAST_DAY = ${last.days};

/**
 * 연도당 한 행. [정월 초하루의 율리우스 적일, 윤달 위치, 달 수, 달 크기 비트마스크]
 *
 * 윤달 위치는 그 번호의 평달 바로 뒤에 윤달이 온다는 뜻이고 0 이면 그 해에 윤달이 없다.
 * 비트마스크는 낮은 자리가 정월이라 리터럴에서는 오른쪽 끝이 정월이다.
 * 비트가 1 이면 30일, 0 이면 29일이다. 윤달도 제자리에서 한 자리를 차지한다.
 * 달 수를 함께 담는 것은 마지막 해가 12달로 끊기기 때문이다. 마스크만으로는 알 수 없다.
 */
const YEARS: readonly (readonly [number, number, number, number])[] = [
${rowSource}
];

export interface LunarMonth {
  year: number;
  /** 1 부터 12 */
  month: number;
  /** 윤달이면 참. 같은 year 와 month 가 평달과 윤달로 두 번 있을 수 있다 */
  leap: boolean;
  /** 29 또는 30 */
  days: number;
  /** 초하루의 율리우스 적일 */
  startJdn: number;
}

let cached: readonly LunarMonth[] | null = null;

/** 음력 달 목록. 시간순으로 정렬되어 있다. */
export function lunarMonths(): readonly LunarMonth[] {
  if (cached) return cached;

  const out: LunarMonth[] = [];
  for (const [index, [startJdn, leapMonth, count, mask]] of YEARS.entries()) {
    let jdn = startJdn;
    let month = 1;
    let leap = false;

    for (let i = 0; i < count; i++) {
      const days = (mask >> i) & 1 ? 30 : 29;
      out.push({
        year: LUNAR_FIRST_YEAR + index,
        month,
        leap,
        days,
        startJdn: jdn,
      });
      jdn += days;

      // 윤달은 같은 번호를 한 번 더 쓰고 다음 번호로 넘어간다
      if (!leap && month === leapMonth) {
        leap = true;
      } else {
        leap = false;
        month++;
      }
    }
  }

  cached = out;
  return cached;
}
`;

if (checkOnly) {
  const current = readFileSync(outPath, 'utf8');
  if (current !== tsSource) {
    console.error(
      'data/lunar-months.ts 가 지금 원본에서 재현되지 않는다. 다시 구우려면 --check 를 뗀다.',
    );
    process.exit(1);
  }
  console.log(`대조 통과. ${months.length}달, ${rows.length}행.`);
} else {
  writeFileSync(outPath, tsSource);
  const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
  console.log(
    `${months.length}달을 ${rows.length}행으로 접었다. lunar-months.ts ${kb(tsSource.length)}`,
  );
}
