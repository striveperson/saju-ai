/**
 * KASI 음양력정보 API 에서 음력 각 달의 초하루를 받아 저장한다.
 *
 * 절기와 달리 이 데이터는 교차검증 코퍼스가 아니라 출처 그 자체다.
 * 자체 음력 산출 알고리즘을 만들지 않기로 했으므로(ADR 0006, ADR 0014 10항)
 * 대조할 계산이 우리 쪽에 없다. 대신 표 자체의 정합성을 저장 전에 검사한다.
 *
 * 산출물은 중간 파일이다. 런타임이 쓰는 모듈은 여기서 뽑아 data/ 에 둔다.
 *
 * 실행:
 *   node --env-file=apps/web/.env.local apps/web/scripts/dump-kasi-lunar.mjs
 *
 * 서비스 키는 dump-kasi-terms.mjs 와 같은 KASI_SERVICE_KEY 를 쓴다.
 * 런타임에는 쓰이지 않는다.
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
  'https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo';

/** 요청 범위. 실제로 덮인 구간은 응답이 정하며 payload 의 coverage 가 적는다. */
const FIRST_YEAR = 1900;
const LAST_YEAR = 2050;

/**
 * KASI 가 주지 않는 달. 2050년 11월이 마지막이고 12월은 0건이다.
 * 여기 없는 자리에서 0건이 나오면 중단한다.
 */
const KNOWN_EMPTY = new Set(['2050-12']);

/**
 * 동시 요청 수. 일 한도 10,000 건과 별개로 짧은 구간의 유량 제한이 걸린다.
 * 4 로 돌리면 60 요청 부근에서 429 가 났다.
 */
const CONCURRENCY = 2;

/** 재시도 간격. 유량 제한은 시간이 지나야 풀리므로 점점 길게 기다린다. */
const BACKOFF_MS = [2000, 5000, 15000, 30000];

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'kasi-lunar-months.json',
);

/** 키가 이미 URL 인코딩된 형태로 발급되므로 URLSearchParams 에 넣지 않는다. */
function buildUrl(year, month) {
  const params = new URLSearchParams({
    lunYear: String(year),
    lunMonth: String(month).padStart(2, '0'),
    lunDay: '01',
    numOfRows: '10',
  });
  return `${ENDPOINT}?${params}&serviceKey=${KEY}`;
}

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

/**
 * 태그가 없거나 비어 있으면 멈춘다.
 *
 * 결측을 빈 문자열로 흘리면 Number('') 가 0 이 되어 결측과 진짜 0 이 같은 값이 된다.
 * 절기 데이터의 sunLongitude 가 그렇게 되어 있다. 259건이 0 인데 그중 29건은 춘분이다.
 */
function pick(block, tag, where) {
  const value = block
    .match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]
    ?.trim();
  if (!value) fail(`${where}: ${tag} 가 비어 있다. 중단한다.`);
  return value;
}

function parseItems(xml, where) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1];
    const pad = (v) => v.padStart(2, '0');

    return {
      lunYear: Number(pick(block, 'lunYear', where)),
      lunMonth: Number(pick(block, 'lunMonth', where)),
      leap: pick(block, 'lunLeapmonth', where) === '윤',
      /** 그 달의 크기. 29 또는 30 */
      days: Number(pick(block, 'lunNday', where)),
      /** 초하루의 율리우스 적일 */
      jdn: Number(pick(block, 'solJd', where)),
      solar: `${pick(block, 'solYear', where)}-${pad(pick(block, 'solMonth', where))}-${pad(pick(block, 'solDay', where))}`,
      /** 초하루의 일진. 일주 공식 대조에 쓴다 */
      iljin: pick(block, 'lunIljin', where),
    };
  });
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function fetchMonth(year, month) {
  const where = `${year}-${String(month).padStart(2, '0')}`;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    const last = attempt === BACKOFF_MS.length;
    let res;
    let xml;
    try {
      res = await fetch(buildUrl(year, month));
      xml = await res.text();
    } catch (error) {
      if (last) fail(`${where}: ${error.message}. 중단한다.`);
      await sleep(BACKOFF_MS[attempt]);
      continue;
    }

    const code = xml.match(/<resultCode>([^<]*)</)?.[1];
    if (!res.ok || code !== '00') {
      if (last) {
        fail(`${where}: HTTP ${res.status} resultCode ${code}. 중단한다.`);
      }
      await sleep(BACKOFF_MS[attempt]);
      continue;
    }

    const items = parseItems(xml, where);

    // 평달만 있으면 1건, 윤달이 있으면 평달과 윤달로 2건이다. 그 밖은 응답이 달라진 것이다
    if (items.length === 0 && !KNOWN_EMPTY.has(where)) {
      fail(`${where}: 0건이다. 중단한다.`);
    }
    if (items.length > 2) fail(`${where}: ${items.length}건이다. 중단한다.`);
    // 순서는 보장되지 않는다. 2042년 2월은 윤달이 먼저 온다. 산출물은 마지막에 jdn 으로 정렬한다
    if (items.length === 2 && items[0].leap === items[1].leap) {
      fail(`${where}: 2건인데 평달과 윤달의 짝이 아니다. 중단한다.`);
    }

    return items;
  }
}

const requests = [];
for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
  for (let month = 1; month <= 12; month++) {
    requests.push([year, month]);
  }
}

const months = [];
let done = 0;

async function worker(offset) {
  for (let i = offset; i < requests.length; i += CONCURRENCY) {
    const [year, month] = requests[i];
    months.push(...(await fetchMonth(year, month)));
    done++;
    if (done % 20 === 0 || done === requests.length) {
      process.stdout.write(
        `\r수집 ${done}/${requests.length} 요청 (${months.length}달)`,
      );
    }
  }
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, (_, offset) => worker(offset)),
);
process.stdout.write('\n');

months.sort((a, b) => a.jdn - b.jdn);

/**
 * 저장 전 검사. 외부 출처 없이 확인되는 것만 본다.
 *
 * 마지막 달의 days 는 뒤에 비교할 달이 없어 이 검사에 참여하지 못한다.
 * 지원 상한이 그 한 값에 걸려 있다는 것을 docs/05 8장에 적어 두었다.
 */
function checkTable() {
  const problems = [];
  const seen = new Set();

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const id = `${m.lunYear}-${m.lunMonth}-${m.leap}`;
    if (seen.has(id)) problems.push(`중복 ${id}`);
    seen.add(id);

    if (m.days !== 29 && m.days !== 30) {
      problems.push(`크기 ${m.solar} ${m.days}`);
    }

    const next = months[i + 1];
    if (next && m.jdn + m.days !== next.jdn) {
      problems.push(
        `불연속 ${m.solar} +${m.days} 이 ${next.solar} 와 안 맞는다`,
      );
    }
    if (m.leap && (i === 0 || months[i - 1].lunMonth !== m.lunMonth)) {
      problems.push(`윤달 위치 ${m.lunYear}-${m.lunMonth}`);
    }
  }

  const byYear = new Map();
  for (const m of months) {
    byYear.set(m.lunYear, (byYear.get(m.lunYear) ?? 0) + 1);
  }
  for (const [year, n] of byYear) {
    // 마지막 해는 데이터가 끝나는 자리라 달 수가 모자란다
    if (n !== 12 && n !== 13 && year !== LAST_YEAR) {
      problems.push(`달 수 ${year}: ${n}`);
    }
  }

  return problems;
}

const problems = checkTable();
if (problems.length > 0) {
  console.error(`정합성 검사 ${problems.length}건 실패. 저장하지 않는다.`);
  for (const p of problems.slice(0, 20)) console.error(`  ${p}`);
  process.exit(1);
}

const first = months[0];
const last = months.at(-1);
const label = (m, day) =>
  `${m.lunYear}-${String(m.lunMonth).padStart(2, '0')}${m.leap ? '윤' : ''}-${String(day).padStart(2, '0')}`;

const payload = {
  $comment:
    'KASI 음양력정보 API 에서 받은 음력 각 달의 초하루. 음력 변환의 출처다. ' +
    '손으로 고치지 않는다. 갱신은 dump-kasi-lunar.mjs 를 다시 돌린다.',
  source: 'KASI 음양력정보 getSolCalInfo',
  requested: { firstYear: FIRST_YEAR, lastYear: LAST_YEAR },
  /** 실제로 덮인 구간. 요청 범위와 다르다. 상한이 2050년 12월이 아니라 11월이다 */
  coverage: {
    firstLunar: label(first, 1),
    firstJdn: first.jdn,
    lastLunar: label(last, last.days),
    lastJdn: last.jdn + last.days - 1,
  },
  count: months.length,
  months,
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `${months.length}달을 ${OUT.replace(process.cwd(), '.')} 에 저장했다. ` +
    `덮는 구간 ${payload.coverage.firstLunar} ~ ${payload.coverage.lastLunar}`,
);
