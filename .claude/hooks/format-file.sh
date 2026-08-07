#!/bin/bash
# PostToolUse hook: Edit/Write로 수정한 파일을 oxfmt로 자동 포맷하고,
# apps/web 소스 파일이면 oxlint --fix까지 실행한다.
# --fix로 못 고치는 lint 오류는 stderr + exit 2로 피드백된다
# (도구 실행 자체는 이미 끝났으므로 차단이 아니라 수정 유도).

file_path=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).tool_input.file_path ?? ''); } catch {}
});
")

[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.css|*.md)
    cd "$CLAUDE_PROJECT_DIR" && pnpm exec oxfmt --no-error-on-unmatched-pattern "$file_path" >/dev/null 2>&1
    ;;
esac

case "$file_path" in
  */apps/web/*.ts|*/apps/web/*.tsx|*/apps/web/*.js|*/apps/web/*.jsx)
    lint_out=$(cd "$CLAUDE_PROJECT_DIR/apps/web" && pnpm exec oxlint --fix "$file_path" 2>&1)
    if [ $? -ne 0 ]; then
      echo "[format-file hook] oxlint 오류 (자동수정 불가):" >&2
      echo "$lint_out" >&2
      exit 2
    fi
    ;;
esac

exit 0
