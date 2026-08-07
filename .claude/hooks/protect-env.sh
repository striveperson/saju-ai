#!/bin/bash
# PreToolUse hook: 시크릿이 들어가는 파일에 대한 Read/Edit/Write를 차단.
# permissionDecision: "deny"를 JSON으로 출력하면 해당 툴 호출이 거부된다.
#
# 대상은 둘이다.
#   .env*                       환경변수 파일.
#                               .env.example 계열은 예외다. 아래 case 주석 참고.
#   .claude/settings.local.json MCP 토큰이 들어가는 곳 (.mcp.json 의 ${VAR} 확장용).
#                               gitignore 대상이고 harness 가 직접 읽으므로
#                               Claude 가 읽을 이유가 없다.

file_path=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).tool_input.file_path ?? ''); } catch {}
});
")

[ -z "$file_path" ] && exit 0

deny() {
  node -e "
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: process.argv[1],
  },
}));
" "$1"
  exit 0
}

case "$(basename "$file_path")" in
  # .gitignore 가 `!.env.example` 로 되돌려 커밋 대상에 넣은 파일이다.
  # 실제 값이 아니라 키 이름만 담기고, 어떤 환경변수가 필요한지 확인할 유일한 경로다.
  #
  # 이 예외는 Edit/Write 에만 실질적으로 걸린다.
  # settings.json 의 `deny: Read(./**/.env*)` 가 훅보다 먼저 Read 를 끊기 때문이다.
  # 권한 규칙 문법에 부정 패턴이 없어 그쪽에는 예외를 쓸 수 없다. 의도한 상태다.
  .env.example|.env.sample|.env.template) ;;
  .env*)
    deny ".env 파일 접근은 hook 으로 차단되어 있습니다. 시크릿은 사용자가 직접 관리합니다. 어떤 환경변수가 필요한지는 .env.example 로 확인하세요."
    ;;
esac

case "$file_path" in
  */.claude/settings.local.json)
    deny "settings.local.json 접근은 hook 으로 차단되어 있습니다. MCP 토큰이 들어가는 파일이라 사용자가 직접 관리합니다. .mcp.json 의 \${VAR} 확장은 harness 가 처리하므로 Claude 가 이 파일을 읽을 이유가 없습니다."
    ;;
esac

exit 0
