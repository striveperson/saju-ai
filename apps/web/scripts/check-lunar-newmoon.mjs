/**
 * KASI 음력표의 초하루를 계산한 합삭과 대조한다.
 *
 * 음력 달은 합삭이 든 날에서 시작한다. 우리가 음력을 산출하려는 것이 아니라
 * (ADR 0006 이 금지한다) 받아온 표에 결손이나 밀림이 있는지 보는 것이다.
 * 표 자체 검사는 dump-kasi-lunar.mjs 가 저장 전에 하고 여기는 외부 대조다.
 *
 * 판정자가 되지는 못한다. 한국 음력에는 관습 규칙이 섞여 있어
 * 불일치가 나와도 KASI 를 따르고 근거를 남긴다. 근거는 docs/05 8장.
 *
 * 실행:
 *   apps/web/scripts/.venv/bin/python apps/web/scripts/compute-new-moons.py 1899 2051
 *   node apps/web/scripts/check-lunar-newmoon.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => JSON.parse(readFileSync(resolve(here, path), 'utf8'));

const lunar = read('kasi-lunar-months.json');
const computed = read('computed-new-moons.json');
const tz = read('../src/lib/saju/fixtures/tzdb-asia-seoul.json');

/** 한국이 동경 135도(UTC+9)로 넘어간 순간. tz database 의 전환값이다. */
const MERIDIAN_SHIFT_MS = Date.parse('1911-12-31T15:30:00Z');

/** 그 이전 음력 계산의 기준 자오선. 아래 프레임 절에 근거가 있다. */
const OLD_MERIDIAN_OFFSET = 8 * 3600;

/** 자정에서 이 분 안에 든 합삭은 기준 자오선이 흔들리면 날짜가 갈린다. */
const NEAR_MIDNIGHT_MIN = 30;

/**
 * 대조에 쓰는 프레임 셋.
 *
 * KASI 가 어느 시각 기준으로 달 경계를 잡았는지는 공표되어 있지 않아 데이터가 말하게 했다.
 * 채택 프레임만 1,867달 전부와 맞고 나머지 둘은 어긋나는 자리가 남는다.
 *
 * 1912년 이전이 한국 표준시가 아닌 것은 오프셋을 1분 단위로 훑어 확인했다.
 * 불일치 0 인 구간이 +07:55 부터 +08:10 까지라 동경 120도(+08:00)만 들어가고
 * 당시 한국 표준시(+08:27:52 와 +08:30)도 북경 지방시(+07:45:36)도 밖이다.
 */
const FRAMES = {
  채택: (utcMs) =>
    utcMs < MERIDIAN_SHIFT_MS ? OLD_MERIDIAN_OFFSET : tzOffset(utcMs).standard,
  'tz 표준시': (utcMs) => tzOffset(utcMs).standard,
  'tz 법적시계': (utcMs) => tzOffset(utcMs).legal,
};

/** 그 순간에 걸린 오프셋 둘. 서머타임 구간에서 갈린다. */
function tzOffset(utcMs) {
  let legal = tz.initial.offsetSeconds;
  let standard = tz.initial.offsetSeconds;

  for (const t of tz.transitions) {
    if (Date.parse(t.utc) > utcMs) break;
    legal = t.after.offsetSeconds;
    if (!t.after.dst) standard = t.after.offsetSeconds;
  }
  return { legal, standard };
}

/** 오프셋을 더한 뒤의 날짜와 시각. 시각은 자정 근처인지 보려고 함께 낸다. */
function localParts(utcMs, offsetSeconds) {
  const shifted = new Date(utcMs + offsetSeconds * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    clock: shifted.toISOString().slice(11, 16),
  };
}

const starts = new Map(lunar.months.map((m) => [m.solar, m]));
const first = lunar.months[0].solar;
const last = lunar.months.at(-1).solar;

/** 표가 덮는 구간의 합삭만 본다. 밖의 합삭은 대조할 상대가 없다 */
const inRange = computed.newMoons.filter((iso) => {
  const date = localParts(Date.parse(iso), FRAMES.채택(Date.parse(iso))).date;
  return date >= first && date <= last;
});

console.log(
  `음력표 ${lunar.count}달, 합삭 ${computed.count}개 중 구간 안 ${inRange.length}개`,
);
console.log(`대조 구간 ${first} ~ ${last}\n`);

const mismatches = [];

for (const [name, frame] of Object.entries(FRAMES)) {
  const missed = inRange.filter((iso) => {
    const utcMs = Date.parse(iso);
    return !starts.has(localParts(utcMs, frame(utcMs)).date);
  });
  console.log(`${name.padEnd(12)} 어긋난 합삭 ${missed.length}`);
  if (name === '채택') mismatches.push(...missed);
}

// 반대 방향. 합삭이 없는 초하루가 있으면 표에 없는 달이 끼어 있다는 뜻이다
const moonDates = new Set(
  inRange.map(
    (iso) => localParts(Date.parse(iso), FRAMES.채택(Date.parse(iso))).date,
  ),
);
const startsWithoutMoon = lunar.months.filter((m) => !moonDates.has(m.solar));

console.log(`\n채택 프레임 기준`);
console.log(`  합삭이 없는 초하루 ${startsWithoutMoon.length}개`);
for (const m of startsWithoutMoon.slice(0, 20)) {
  console.log(
    `    ${m.solar} (음력 ${m.lunYear}-${m.lunMonth}${m.leap ? '윤' : ''})`,
  );
}
console.log(`  초하루가 아닌 합삭 ${mismatches.length}개`);
for (const iso of mismatches.slice(0, 20)) {
  const utcMs = Date.parse(iso);
  const local = localParts(utcMs, FRAMES.채택(utcMs));
  console.log(`    ${iso} -> ${local.date} ${local.clock}`);
}

const nearMidnight = inRange.filter((iso) => {
  const utcMs = Date.parse(iso);
  const { clock } = localParts(utcMs, FRAMES.채택(utcMs));
  const minutes = Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
  return minutes < NEAR_MIDNIGHT_MIN || minutes > 1440 - NEAR_MIDNIGHT_MIN;
});
console.log(
  `  자정 ${NEAR_MIDNIGHT_MIN}분 안에 든 합삭 ${nearMidnight.length}개`,
);

const failed = mismatches.length + startsWithoutMoon.length;
if (failed > 0) {
  console.error(`\n대조 실패 ${failed}건. docs/05 8장에 근거와 함께 남긴다.`);
  process.exit(1);
}
console.log('\n대조 통과.');
