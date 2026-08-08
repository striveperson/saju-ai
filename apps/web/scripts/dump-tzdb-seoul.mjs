/**
 * tz database 의 Asia/Seoul 전환 이력을 정답지로 뜬다.
 *
 * 엔진의 data/korea-time.ts 는 손으로 옮긴 표다. 이 파일이 그 표의 정답지이고
 * data/korea-time.test.ts 가 둘을 대조한다. 근거는 ADR 0015.
 *
 * 값의 출처는 컴파일된 TZif 바이너리다. Intl 은 오프셋만 알려주고
 * isdst 와 약칭(KST/KDT/JST/LMT)을 주지 않기 때문이다.
 * 대신 Intl 로 같은 값을 다시 뽑아 교차검증한다. tzdata 사본 둘이 독립적으로 일치해야 통과다.
 *
 * 실행:
 *   node apps/web/scripts/dump-tzdb-seoul.mjs           정답지를 다시 쓴다
 *   node apps/web/scripts/dump-tzdb-seoul.mjs --check   쓰지 않고 현재 정답지와 대조만 한다
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZONE = 'Asia/Seoul';

/** 정답지가 덮는 구간. 엔진의 지원 범위와 같다. */
const FIRST_YEAR = 1900;
const LAST_YEAR = 2100;

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../src/lib/saju/fixtures/tzdb-asia-seoul.json');

/* ------------------------------------------------------------------ *
 * 달력 산술. Date 를 쓰면 실행 환경 타임존이 섞이므로 정수 연산만 쓴다.
 * ------------------------------------------------------------------ */

/** Howard Hinnant 의 days_from_civil. 1970-01-01 을 0 으로 둔 일수. */
function daysFromCivil(y, m, d) {
  const yy = y - (m <= 2 ? 1 : 0);
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** daysFromCivil 의 역함수. */
function civilFromDays(z) {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { year: y + (m <= 2 ? 1 : 0), month: m, day: d };
}

const utcSeconds = (y, m, d, hh = 0, mm = 0, ss = 0) =>
  daysFromCivil(y, m, d) * 86400 + hh * 3600 + mm * 60 + ss;

const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, '0');

/** 초 단위 절대값을 'YYYY-MM-DDTHH:mm:ss' 로. 시간대 표기는 붙이지 않는다. */
function formatSeconds(seconds) {
  const days = Math.floor(seconds / 86400);
  const rem = seconds - days * 86400;
  const { year, month, day } = civilFromDays(days);
  return (
    `${pad(year, 4)}-${pad(month)}-${pad(day)}` +
    `T${pad(Math.floor(rem / 3600))}:${pad(Math.floor((rem % 3600) / 60))}:${pad(rem % 60)}`
  );
}

const formatUtc = (seconds) => `${formatSeconds(seconds)}Z`;
const formatLocal = (utcSec, offsetSec) => formatSeconds(utcSec + offsetSec);

/* ------------------------------------------------------------------ *
 * TZif 파서
 * ------------------------------------------------------------------ */

function findTzif(zone) {
  const candidates = [
    process.env.TZDIR && resolve(process.env.TZDIR, zone),
    `/var/db/timezone/zoneinfo/${zone}`,
    `/usr/share/zoneinfo/${zone}`,
    `/etc/zoneinfo/${zone}`,
  ].filter(Boolean);

  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      `${zone} 의 TZif 파일을 찾지 못했다. 찾아본 곳: ${candidates.join(', ')}`,
    );
  }
  return found;
}

/**
 * TZif 한 블록을 읽는다. RFC 8536 4.2.
 * v1 블록은 전환 시각이 32비트, v2+ 블록은 64비트다.
 */
function readBlock(buf, offset, wide) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const counts = {};
  for (const [i, key] of [
    'isutcnt',
    'isstdcnt',
    'leapcnt',
    'timecnt',
    'typecnt',
    'charcnt',
  ].entries()) {
    counts[key] = view.getUint32(offset + 20 + i * 4);
  }
  let p = offset + 44;

  const timeSize = wide ? 8 : 4;
  const transitions = [];
  for (let i = 0; i < counts.timecnt; i++, p += timeSize) {
    transitions.push(wide ? Number(view.getBigInt64(p)) : view.getInt32(p));
  }

  const typeIndex = [];
  for (let i = 0; i < counts.timecnt; i++, p += 1)
    typeIndex.push(view.getUint8(p));

  const types = [];
  for (let i = 0; i < counts.typecnt; i++, p += 6) {
    types.push({
      offsetSeconds: view.getInt32(p),
      daylight: view.getUint8(p + 4) !== 0,
      abbrevIndex: view.getUint8(p + 5),
    });
  }

  const chars = buf.subarray(p, p + counts.charcnt);
  p += counts.charcnt;
  for (const t of types) {
    const end = chars.indexOf(0, t.abbrevIndex);
    t.abbreviation = chars.toString('ascii', t.abbrevIndex, end);
  }

  p += counts.leapcnt * (wide ? 12 : 8);
  p += counts.isstdcnt + counts.isutcnt;

  return { transitions, typeIndex, types, end: p };
}

function parseTzif(path) {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'TZif')
    throw new Error(`TZif 가 아니다: ${path}`);

  const version = buf.toString('ascii', 4, 5);
  const first = readBlock(buf, 0, false);
  if (version === '\0') return { version: '1', ...first };

  // v2+ 는 같은 내용을 64비트로 다시 담는다. 넓은 쪽을 쓴다.
  const second = readBlock(buf, first.end, true);
  return { version, ...second };
}

/* ------------------------------------------------------------------ *
 * 전환 목록
 * ------------------------------------------------------------------ */

const rangeStart = utcSeconds(FIRST_YEAR, 1, 1);
const rangeEnd = utcSeconds(LAST_YEAR + 1, 1, 1);

function buildTransitions(tzif) {
  const { transitions, typeIndex, types } = tzif;

  // 첫 전환 이전에 쓰이는 타입. 서머타임이 아닌 첫 타입이 규약이다.
  const initial = types.find((t) => !t.daylight) ?? types[0];

  const rows = [];
  for (const [i, at] of transitions.entries()) {
    if (at >= rangeEnd) break;
    const before = i === 0 ? initial : types[typeIndex[i - 1]];
    const after = types[typeIndex[i]];
    if (at < rangeStart) continue;
    rows.push({ at, before, after });
  }
  return { initial, rows };
}

const describeType = (t) => ({
  offsetSeconds: t.offsetSeconds,
  dst: t.daylight,
  abbr: t.abbreviation,
});

/**
 * 전환이 만드는 이상 구간.
 *
 * 시계를 앞으로 돌리면 그 사이 벽시계가 존재하지 않고,
 * 뒤로 돌리면 두 번 존재한다.
 */
function anomalyOf(at, before, after) {
  const delta = after.offsetSeconds - before.offsetSeconds;
  if (delta === 0) return null;

  const kind = delta > 0 ? 'nonexistent' : 'ambiguous';
  const seconds = Math.abs(delta);
  // 존재하지 않는 구간은 전환 직전 벽시계부터, 두 번 존재하는 구간은 전환 직후 벽시계부터다.
  const fromLocal =
    at + (delta > 0 ? before.offsetSeconds : after.offsetSeconds);

  return {
    kind,
    fromLocal: formatSeconds(fromLocal),
    untilLocal: formatSeconds(fromLocal + seconds),
    seconds,
  };
}

/* ------------------------------------------------------------------ *
 * Intl 교차검증
 * ------------------------------------------------------------------ */

const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  era: 'short',
});

/** Intl 이 보는 오프셋(초). TZif 와 독립된 두 번째 tzdata 사본이다. */
function intlOffsetSeconds(utcSec) {
  const f = {};
  for (const p of parts.formatToParts(utcSec * 1000)) f[p.type] = p.value;
  const year = Number(f.year) * (f.era === 'BC' ? -1 : 1);
  const hour = Number(f.hour) % 24; // hourCycle 이 24를 낼 수 있다
  return (
    utcSeconds(
      year,
      Number(f.month),
      Number(f.day),
      hour,
      Number(f.minute),
      Number(f.second),
    ) - utcSec
  );
}

function crossCheck(initial, rows) {
  const mismatches = [];
  const check = (utcSec, expected, label) => {
    const actual = intlOffsetSeconds(utcSec);
    if (actual !== expected) {
      mismatches.push(
        `${label} ${formatUtc(utcSec)}: TZif ${expected}, Intl ${actual}`,
      );
    }
  };

  // 전환마다 1초 전후를 본다. 경계가 어긋나면 여기서 잡힌다.
  for (const { at, before, after } of rows) {
    check(at - 1, before.offsetSeconds, '전환 직전');
    check(at, after.offsetSeconds, '전환 직후');
  }

  // 구간마다 표본을 하나씩. 전환 사이가 비어 있지 않은지 본다.
  const samples = [];
  let prev = { at: rangeStart, type: initial };
  for (const { at, after } of [...rows, { at: rangeEnd, after: null }]) {
    const mid = prev.at + Math.floor((at - prev.at) / 2);
    if (mid > prev.at && mid < at) {
      check(mid, prev.type.offsetSeconds, '구간 내부');
      samples.push({ utc: formatUtc(mid), ...describeType(prev.type) });
    }
    if (after) prev = { at, type: after };
  }

  // 6시간 격자로 전 구간을 훑어 전환을 하나도 빠뜨리지 않았는지 본다.
  const boundaries = rows.map((r) => r.at);
  let scanned = 0;
  for (let t = rangeStart; t < rangeEnd; t += 21600) {
    const expected = boundaries.filter((b) => b <= t).length;
    const type = expected === 0 ? initial : rows[expected - 1].after;
    check(t, type.offsetSeconds, '격자');
    scanned++;
  }

  return { mismatches, samples, scanned };
}

/* ------------------------------------------------------------------ *
 * 실행
 * ------------------------------------------------------------------ */

const tzifPath = findTzif(ZONE);
const tzif = parseTzif(tzifPath);
const { initial, rows } = buildTransitions(tzif);

const { mismatches, samples, scanned } = crossCheck(initial, rows);
if (mismatches.length > 0) {
  console.error('TZif 와 Intl 이 어긋난다. tzdata 사본 둘이 다르다는 뜻이다.');
  for (const m of mismatches.slice(0, 10)) console.error(`  ${m}`);
  process.exit(1);
}

const anomalies = [];
const transitions = rows.map(({ at, before, after }) => {
  const anomaly = anomalyOf(at, before, after);
  if (anomaly) anomalies.push({ utc: formatUtc(at), ...anomaly });
  return {
    utc: formatUtc(at),
    before: {
      ...describeType(before),
      localBefore: formatLocal(at - 1, before.offsetSeconds),
    },
    after: {
      ...describeType(after),
      localAfter: formatLocal(at, after.offsetSeconds),
    },
    anomaly,
  };
});

const payload = {
  $comment:
    'tz database Asia/Seoul 전환 이력. data/korea-time.ts 의 정답지다. ' +
    '손으로 고치지 않는다. 갱신은 dump-tzdb-seoul.mjs 를 다시 돌린다.',
  zone: ZONE,
  source: {
    tzif: tzifPath,
    tzifVersion: tzif.version,
    nodeIcuTz: process.versions.tz,
  },
  crossCheck: { intlGridSamples: scanned, stepSeconds: 21600 },
  range: { firstYear: FIRST_YEAR, lastYear: LAST_YEAR },
  initial: {
    ...describeType(initial),
    note: `${FIRST_YEAR} 년 초에 쓰이던 타입`,
  },
  transitionCount: transitions.length,
  anomalyCount: anomalies.length,
  transitions,
  anomalies,
  samples,
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== json) {
    console.error(
      '정답지가 현재 tzdata 와 다르다. 인자 없이 다시 돌려 갱신한다.',
    );
    process.exit(1);
  }
  console.log(
    `정답지가 현재 tzdata 와 일치한다. 전환 ${transitions.length}건.`,
  );
} else {
  writeFileSync(outPath, json);
  console.log(`${outPath}`);
  console.log(
    `전환 ${transitions.length}건, 이상 구간 ${anomalies.length}건, ` +
      `Intl 격자 대조 ${scanned}회. TZif ${tzifPath} (v${tzif.version}), Node ICU tz ${process.versions.tz}.`,
  );
}
