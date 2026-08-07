#!/bin/bash
# PreToolUse hook: 자동 생성 파일 routeTree.gen.ts에 대한 Edit/Write를 차단.
# 라우트는 파일 기반이며, 이 파일은 dev 서버 또는 generate-routes가 재생성한다.

file_path=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).tool_input.file_path ?? ''); } catch {}
});
")

case "$file_path" in
  */apps/web/src/routeTree.gen.ts)
    cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"routeTree.gen.ts는 자동 생성 파일이라 직접 수정하지 않습니다. 라우트는 apps/web/src/routes/ 아래 파일로 추가하고, 필요하면 `pnpm --filter web generate-routes`로 재생성하세요."}}
EOF
    ;;
esac

exit 0
