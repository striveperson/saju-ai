#!/bin/bash
# PostToolUse hook: 마크다운 문서가 docs/00-documentation-guide.md 5장의
# 스타일 규칙을 어기면 경고한다.
#
# exit 2 -> stderr 내용이 피드백으로 전달된다. 툴 실행 자체는 이미 끝난 상태다.
# 규칙 자체를 설명하느라 해당 문자를 써야 하는 줄에는 <!-- md-allow --> 를 붙인다.

file_path=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).tool_input.file_path ?? ''); } catch {}
});
")

[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.md|*.mdx) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

node - "$file_path" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];

// 이모지와 장식 기호. 상태 기호는 표나 다이어그램에서만 쓰고 본문에는 넣지 않는다.
// 다이어그램은 코드 펜스 안이라 이미 제외되고, 표는 아래 skipInTable 로 뺀다.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

// [정규식, 설명, 표 행에서 제외할지]
const CHECKS = [
  [/—/, 'em dash. 쉼표, 콜론, 괄호, 하이픈으로 대체한다', false],
  [EMOJI, '이모지 또는 장식 기호', true],
  [/^\s*\d+\.\s.*\*\*/, '번호 목록 안의 굵은 강조. 번호가 이미 구분하고 있다', false],
  // 지울 내용이면 지운다. 범위 표기(1900~2100)가 이렇게 바뀌어 있으면 손상된 것이다.
  [/~~/, '취소선', false],
];

const lines = fs.readFileSync(path, 'utf8').split('\n');
const hits = [];

// 여는 펜스의 종류를 기억한다. ``` 블록 안의 ~~~ 가 블록을 닫아버리는 것을 막는다.
let fence = null;

lines.forEach((line, i) => {
  const open = /^\s*(`{3,}|~{3,})/.exec(line);
  if (open) {
    const kind = open[1][0];
    if (fence === null) fence = kind;
    else if (fence === kind) fence = null;
    return; // 펜스 줄 자체는 열든 닫든 검사하지 않는다
  }
  if (fence !== null) return;
  if (line.includes('md-allow')) return;

  const isTableRow = /^\s*\|/.test(line);

  for (const [re, label, skipInTable] of CHECKS) {
    if (skipInTable && isTableRow) continue;
    if (re.test(line)) hits.push(`  ${i + 1}행  ${label}`);
  }

  // 물결표 하나짜리도 GFM 취소선 구분자다. 한 줄에 둘이 남으면 짝을 지어
  // 그 사이가 통째로 그어진다. 범위 표기 둘이 한 문장에 오면 여기 걸린다.
  // 백틱 안, escape 한 것, 위에서 이미 잡은 ~~ 는 세지 않는다.
  const bare = line
    .replace(/`[^`]*`/g, '')
    .replace(/\\~/g, '')
    .replace(/~~/g, '');

  if ((bare.match(/~/g) ?? []).length >= 2) {
    hits.push(
      `  ${i + 1}행  물결표 짝. GFM 이 취소선으로 읽는다. ` +
        '범위 표기는 \\~ 로 escape 하고, 물결표 자체를 보이려면 백틱으로 감싼다',
    );
  }
});

if (hits.length === 0) process.exit(0);

console.error('[md-style-guard] 문서 스타일 규칙 위반.');
console.error(hits.join('\n'));
console.error('');
console.error('전체 규칙은 docs/00-documentation-guide.md 5장에 있다.');
console.error('규칙을 설명하느라 해당 문자를 써야 하는 줄에는 <!-- md-allow --> 를 붙인다.');
process.exit(2);
NODE
