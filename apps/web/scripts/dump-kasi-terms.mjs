/**
 * KASI 특일정보 API 에서 24절기 절입 시각을 받아 정답지로 저장한다.
 *
 * KASI 는 2000~2028 만 제공한다. 이 범위는 실사용 데이터이면서
 * 1900~2100 전 구간을 계산으로 채울 때의 정답지가 된다. 근거는 ADR 0014.
 *
 * 실행:
 *   node --env-file=apps/web/.env.local apps/web/scripts/dump-kasi-terms.mjs
 *
 * 서비스 키는 공공데이터포털에서 발급받아 .env.local 의 KASI_SERVICE_KEY 에 둔다.
 * 런타임에는 쓰이지 않는다. 이 스크립트를 돌릴 때만 필요하다.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.KASI_SERVICE_KEY;
if (!KEY) {
  console.error(
    'KASI_SERVICE_KEY 가 없다. --env-file=apps/web/.env.local 을 붙였는지 확인한다.',
  );
  process.exit(1);
}

const ENDPOINT =
  'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo';

/** KASI 가 제공하는 범위. 밖은 0건을 돌려준다. */
const FIRST_YEAR = 2000;
const LAST_YEAR = 2028;

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/lib/saju/fixtures/kasi-solar-terms.json',
);

/**
 * 키가 이미 URL 인코딩된 형태로 발급되므로 URLSearchParams 에 넣지 않는다.
 * 넣으면 %가 다시 인코딩되어 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 가 난다.
 */
function buildUrl(year) {
  const params = new URLSearchParams({
    solYear: String(year),
    numOfRows: '30',
  });
  return `${ENDPOINT}?${params}&serviceKey=${KEY}`;
}

function parseItems(xml) {
  const pick = (block, tag) =>
    block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? '';

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1];
    const locdate = pick(block, 'locdate');
    const kst = pick(block, 'kst');

    return {
      name: pick(block, 'dateName'),
      date: `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`,
      time: `${kst.slice(0, 2)}:${kst.slice(2, 4)}`,
      sunLongitude: Number(pick(block, 'sunLongitude')),
    };
  });
}

const terms = [];

for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
  const res = await fetch(buildUrl(year));
  const xml = await res.text();

  if (!res.ok) {
    console.error(`${year}: HTTP ${res.status}`);
    process.exit(1);
  }

  const items = parseItems(xml);
  if (items.length !== 24) {
    console.error(
      `${year}: 24건이어야 하는데 ${items.length}건이다. 중단한다.`,
    );
    process.exit(1);
  }

  terms.push(...items);
  process.stdout.write(`\r수집 ${year} (${terms.length}건)`);
}

process.stdout.write('\n');

terms.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

const payload = {
  $comment:
    'KASI 특일정보 API 에서 받은 24절기 절입 시각. 계산 구현의 정답지다. ' +
    '손으로 고치지 않는다. 갱신은 dump-kasi-terms.mjs 를 다시 돌린다.',
  source: 'KASI 특일정보 get24DivisionsInfo',
  range: { firstYear: FIRST_YEAR, lastYear: LAST_YEAR },
  count: terms.length,
  terms,
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `${terms.length}건을 ${OUT.replace(process.cwd(), '.')} 에 저장했다.`,
);
