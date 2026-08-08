/**
 * 계산된 절기 목록을 엔진이 쓰는 데이터 모듈로 굽는다.
 *
 * 전 구간을 계산값으로 통일한다. KASI 는 교차검증 코퍼스일 뿐 값의 출처가 아니다.
 * 2000~2028 을 KASI 로 채우면 2029 에서 산출 방식이 바뀌는 이음솔기가 생긴다. 근거는 ADR 0014.
 *
 * 산출물 둘이다.
 *   data/solar-terms.ts    런타임용. 압축 바이너리를 base64 로 담는다
 *   data/solar-terms.json  리뷰용. PR 에서 무엇이 바뀌었는지 줄 단위로 보인다
 *
 * 실행:
 *   node apps/web/scripts/build-terms-table.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(resolve(here, p), 'utf8'));

const computed = read('computed-terms-1900-2100.json');
const kasi = read('../src/lib/saju/fixtures/kasi-solar-terms.json');
const corrections = read(
  '../src/lib/saju/fixtures/kasi-corrections.json',
).entries;

const terms = computed.terms;
const { firstYear, lastYear } = computed.range;

/** ΔT 가 관측으로 확정된 마지막 해. 이후는 예측값이라 나중에 바뀔 수 있다. */
const PROVISIONAL_FROM_YEAR = kasi.range.lastYear + 1;

/** 절기 순서. 소한(285도)에서 시작해 15도씩 돈다. */
const TERM_NAMES = [
  '소한',
  '대한',
  '입춘',
  '우수',
  '경칩',
  '춘분',
  '청명',
  '곡우',
  '입하',
  '소만',
  '망종',
  '하지',
  '소서',
  '대서',
  '입추',
  '처서',
  '백로',
  '추분',
  '한로',
  '상강',
  '입동',
  '소설',
  '대설',
  '동지',
];

// ---- 검증 ----

if (terms.length !== (lastYear - firstYear + 1) * 24) {
  throw new Error(`건수가 맞지 않는다: ${terms.length}`);
}

const epochMs = Date.UTC(firstYear, 0, 1);
const minutes = terms.map((t) =>
  Math.round((new Date(t.utc).getTime() - epochMs) / 60000),
);

for (let i = 1; i < minutes.length; i++) {
  const delta = minutes[i] - minutes[i - 1];
  if (delta <= 0 || delta > 0xffff) {
    throw new Error(
      `${terms[i].name} ${terms[i].date} 의 간격이 uint16 을 벗어난다: ${delta}`,
    );
  }
}

const startIndex = TERM_NAMES.indexOf(terms[0].name);
if (startIndex === -1)
  throw new Error(`첫 절기 이름을 모르겠다: ${terms[0].name}`);

for (const [i, t] of terms.entries()) {
  const expected = TERM_NAMES[(startIndex + i) % 24];
  if (t.name !== expected) {
    throw new Error(
      `${i}번째가 ${expected} 여야 하는데 ${t.name} 이다. 순서가 깨졌다`,
    );
  }
}

// ---- 바이너리 ----
// 첫 항목만 절대값(uint32 분)으로 두고 나머지는 이웃과의 차이(uint16 분)로 담는다.
// 간격이 14.7~15.7일이라 uint16 에 넉넉히 들어가고 크기가 절반이 된다.

const buffer = Buffer.alloc(4 + (minutes.length - 1) * 2);
buffer.writeUInt32BE(minutes[0], 0);
for (let i = 1; i < minutes.length; i++) {
  buffer.writeUInt16BE(minutes[i] - minutes[i - 1], 4 + (i - 1) * 2);
}
const base64 = buffer.toString('base64');

// ---- 교차검증 메타 ----

const kasiByKey = new Map(
  kasi.terms.map((t) => [`${t.name}@${t.date.slice(0, 4)}`, t]),
);
let agreed = 0;
for (const t of terms) {
  const k = kasiByKey.get(`${t.name}@${t.date.slice(0, 4)}`);
  if (k && k.date === t.date && k.time === t.time) agreed++;
}

// ---- 산출 ----

const tsPath = resolve(here, '../src/lib/saju/data/solar-terms.ts');
const jsonPath = resolve(here, '../src/lib/saju/data/solar-terms.json');

const tsSource = `/**
 * 24절기 절입 시각. ${firstYear}년부터 ${lastYear}년까지 ${terms.length}건.
 *
 * 자동 생성 파일이다. 직접 고치지 않는다.
 * 다시 만들려면 apps/web/scripts/build-terms-table.mjs 를 돌린다.
 *
 * 전 구간을 Skyfield 와 JPL DE440s 로 계산했다. 태양 겉보기 황경이 15도의 배수가 되는
 * 순간을 이분법으로 찾은 값이다. 근사 공식이 아니다. 근거는 docs/adr/0014.
 *
 * ${kasi.range.firstYear}~${kasi.range.lastYear} 은 KASI 발표값과 교차검증했다.
 * ${agreed}/${kasi.count} 이 분 단위로 일치하고, 나머지는 반올림 경계이거나
 * KASI 쪽 오류로 판정됐다. 근거는 fixtures/kasi-corrections.json 이다.
 *
 * 시각은 UTC 다. 한국 표준시 이력(1908~1911 및 1954~1961 의 UTC+8:30)과
 * 서머타임은 엔진이 처리한다. 여기에 반영하지 않는다.
 */

/** 절기 이름. 소한이 황경 285도이고 15도씩 돈다. */
export const SOLAR_TERM_NAMES = [
${TERM_NAMES.map((n) => `  '${n}',`).join('\n')}
] as const;

export type SolarTermName = (typeof SOLAR_TERM_NAMES)[number];

/** 데이터가 덮는 연도 범위. 밖의 입력은 계산하지 않고 거부한다. */
export const SOLAR_TERM_FIRST_YEAR = ${firstYear};
export const SOLAR_TERM_LAST_YEAR = ${lastYear};

/**
 * 이 해부터는 ΔT 가 예측값이라 나중에 KASI 발표와 달라질 수 있다.
 * 경계에 걸리는 출생 시각이면 화면에 그 사실을 표시한다.
 */
export const SOLAR_TERM_PROVISIONAL_FROM_YEAR = ${PROVISIONAL_FROM_YEAR};

/** 목록의 첫 항목이 SOLAR_TERM_NAMES 의 몇 번째인가. */
const START_INDEX = ${startIndex};

/** ${firstYear}-01-01T00:00Z 를 0 으로 둔 분 단위 기준점. */
const EPOCH_MS = ${epochMs};

/** uint32 첫 값 뒤에 uint16 차이가 이어진다. */
const PACKED =
  '${base64}';

function decode(): number[] {
  const binary = atob(PACKED);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const view = new DataView(bytes.buffer);
  const count = (bytes.length - 4) / 2 + 1;
  const out: number[] = [view.getUint32(0)];
  for (let i = 1; i < count; i++) {
    out.push(out[i - 1] + view.getUint16(4 + (i - 1) * 2));
  }
  return out;
}

let cached: readonly SolarTerm[] | null = null;

export interface SolarTerm {
  name: SolarTermName;
  /** 절입 순간. UTC 기준 밀리초 */
  utcMs: number;
  /** 황경. 소한이 285 이고 15도씩 는다 */
  sunLongitude: number;
}

/** 절입 시각 목록. 시간순으로 정렬되어 있다. */
export function solarTerms(): readonly SolarTerm[] {
  if (cached) return cached;

  cached = decode().map((minute, i) => {
    const index = (START_INDEX + i) % 24;
    return {
      name: SOLAR_TERM_NAMES[index],
      utcMs: EPOCH_MS + minute * 60000,
      sunLongitude: (285 + index * 15) % 360,
    };
  });
  return cached;
}
`;

writeFileSync(tsPath, tsSource);

writeFileSync(
  jsonPath,
  `${JSON.stringify(
    {
      $comment:
        '리뷰용 사본이다. 런타임은 solar-terms.ts 를 쓴다. ' +
        '두 파일이 같은 값을 담고 있는지는 solar-terms.test.ts 가 확인한다. ' +
        '자동 생성 파일이라 직접 고치지 않는다.',
      source: 'COMPUTED (skyfield, de440s)',
      range: { firstYear, lastYear },
      crossCheckedRange: kasi.range,
      crossCheckAgreed: agreed,
      crossCheckTotal: kasi.count,
      knownKasiDiscrepancies: Object.keys(corrections).length,
      provisionalFromYear: PROVISIONAL_FROM_YEAR,
      count: terms.length,
      // utcMinute 이 실제로 실리는 값이다. utcExact 는 반올림 전 계산값으로 감사용이다.
      terms: terms.map((t, i) => ({
        name: t.name,
        kst: `${t.date} ${t.time}`,
        utcMinute: new Date(epochMs + minutes[i] * 60000)
          .toISOString()
          .replace('.000Z', 'Z'),
        utcExact: t.utc,
      })),
    },
    null,
    2,
  )}\n`,
);

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
console.log(`바이너리 ${kb(buffer.length)} -> base64 ${kb(base64.length)}`);
console.log(`solar-terms.ts    ${kb(tsSource.length)}`);
console.log(`solar-terms.json  ${kb(readFileSync(jsonPath).length)}`);
console.log(
  `교차검증 일치 ${agreed}/${kasi.count}, 알려진 불일치 ${Object.keys(corrections).length}건`,
);
