#!/bin/bash
# PostToolUse hook: apps/web/src/lib/saju/ 아래 파일이 현재 시각이나 실행 환경에
# 의존하면 경고한다. 엔진이 환경을 읽으면 검증 케이스가 재현되지 않는다.
# 시각은 항상 인자로 받는다. 근거는 docs/adr/0013.
#
# import 경계는 oxlint 가 막는다(apps/web/.oxlintrc.json 의 overrides).
# 이 훅은 lint 가 잡지 못하는 함수 호출을 담당한다.
#
# exit 2 -> stderr 내용이 피드백으로 전달된다. 툴 실행 자체는 이미 끝난 상태다.
# 정당한 예외는 같은 줄에 hook-allow 와 사유를 주석으로 남기면 통과한다.

file_path=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).tool_input.file_path ?? ''); } catch {}
});
")

[ -z "$file_path" ] && exit 0

case "$file_path" in
  */apps/web/src/lib/saju/*.ts|*/apps/web/src/lib/saju/*.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

node - "$file_path" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];

const CHECKS = [
  [/\bDate\.now\s*\(/, 'Date.now()'],
  [/\bnew\s+Date\s*\(\s*\)/, '인자 없는 new Date()'],
  [/\bMath\.random\s*\(/, 'Math.random()'],
  [/\.getTimezoneOffset\s*\(/, 'getTimezoneOffset()'],
  [/\.toLocale(String|DateString|TimeString)\s*\(/, 'toLocale* (실행 환경 로캘·타임존 의존)'],
  [/\bIntl\.DateTimeFormat\s*\(/, 'Intl.DateTimeFormat (기본값이 실행 환경 타임존)'],
  [/\bprocess\.env\b/, 'process.env'],
];

// 주석을 걷어낸 뒤 남은 코드만 검사한다.
// 규칙을 설명하는 문서 주석이 오탐으로 잡히는 것을 막으면서,
// `*/ const y = new Date();` 처럼 주석과 코드가 한 줄에 섞인 경우도 놓치지 않는다.
const state = { inBlock: false };

function codeOf(line) {
  let out = '';
  let i = 0;

  while (i < line.length) {
    if (state.inBlock) {
      const end = line.indexOf('*/', i);
      if (end === -1) return out;
      state.inBlock = false;
      i = end + 2;
      continue;
    }

    const block = line.indexOf('/*', i);
    let lineComment = line.indexOf('//', i);
    // `https://` 의 슬래시를 주석 시작으로 오인하면 뒤쪽 코드를 통째로 놓친다.
    while (lineComment > 0 && line[lineComment - 1] === ':') {
      lineComment = line.indexOf('//', lineComment + 2);
    }

    if (lineComment !== -1 && (block === -1 || lineComment < block)) {
      return out + line.slice(i, lineComment);
    }
    if (block !== -1) {
      out += line.slice(i, block);
      state.inBlock = true;
      i = block + 2;
      continue;
    }
    return out + line.slice(i);
  }

  return out;
}

const hits = [];

fs.readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
  const code = codeOf(line);
  if (line.includes('hook-allow')) return;

  for (const [re, label] of CHECKS) {
    if (re.test(code)) hits.push(`  ${i + 1}행  ${label}`);
  }
});

if (hits.length === 0) process.exit(0);

console.error('[saju-engine-purity] 계산 엔진은 현재 시각과 실행 환경을 읽지 않는다.');
console.error(hits.join('\n'));
console.error('');
console.error('시각은 인자로 받는다. 근거는 docs/adr/0013-saju-engine-purity-enforcement.md.');
console.error('정당한 예외라면 같은 줄에 hook-allow 와 사유를 주석으로 남긴다.');
process.exit(2);
NODE
