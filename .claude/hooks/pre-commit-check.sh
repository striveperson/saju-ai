#!/bin/bash
# PreToolUse(Bash) hook: git commit이 실행되기 전에 변경된 워크스페이스의
# 타입체크/lint/테스트를 강제한다. 실패하면 커밋 자체를 deny로 차단한다.

command=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).tool_input.command ?? ''); } catch {}
});
")

case "$command" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0

deny() {
  node -e "
const reason = process.argv[1];
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  },
}));
" "$1"
  exit 0
}

# 커밋 대상 파악: staged가 있으면 staged 기준,
# 없으면(git add와 한 명령으로 묶인 경우) 전체 변경 기준.
#
# -z 로 NUL 구분해 읽는다. porcelain 출력을 awk '{print $NF}' 로 자르면
# 공백이 든 경로에서 앞부분이 잘려 "apps/web/" 매칭이 실패하고,
# 타입체크와 lint 와 테스트가 통째로 건너뛰어진 채 커밋이 통과한다.
changed=$(git diff --cached --name-only -z | tr '\0' '\n')

if [ -z "$changed" ]; then
  # untracked 는 ls-files 로 개별 파일로 펼친다. status 는 디렉토리로 접는다.
  changed=$(
    {
      git diff --name-only -z
      git ls-files --others --exclude-standard -z
    } | tr '\0' '\n'
  )
fi

log=$(mktemp)
trap 'rm -f "$log"' EXIT

if echo "$changed" | grep -q "^apps/web/"; then
  if ! pnpm --filter web typecheck >"$log" 2>&1; then
    deny "[pre-commit-check] 커밋 차단: apps/web 타입체크 실패. 오류를 고친 뒤 다시 커밋하세요:
$(head -15 "$log")"
  fi
  if ! pnpm --filter web lint >"$log" 2>&1; then
    deny "[pre-commit-check] 커밋 차단: apps/web lint 실패. 오류를 고친 뒤 다시 커밋하세요:
$(grep -vE "^>|^$" "$log" | head -15)"
  fi
  # 번들된 만세력 데이터가 원본과 어긋나는지 본다. 순수 node 라 python 이나 네트워크를 타지 않고
  # 둘이 합쳐 0.2초다. 데이터가 다시 구워졌을 때 상쇄되는 오류는 vitest 가 잡지 못한다.
  if ! pnpm --filter web verify:data >"$log" 2>&1; then
    deny "[pre-commit-check] 커밋 차단: 만세력 데이터 대조 실패. 번들된 표가 원본과 어긋납니다:
$(grep -vE "^>|^$" "$log" | tail -15)"
  fi
  if ! pnpm --filter web exec vitest run >"$log" 2>&1; then
    deny "[pre-commit-check] 커밋 차단: apps/web 테스트 실패. 실패한 테스트를 고친 뒤 다시 커밋하세요:
$(grep -E "FAIL|✕|Tests" "$log" | head -10)"
  fi
  # react-doctor 진단. 지적이 하나라도 있으면 종료 코드가 1 이라 경고도 차단이 된다.
  # 고칠 것이 아니라고 판단한 자리는 react-doctor-disable-next-line 으로 근거와 함께 끈다.
  if ! pnpm --filter web verify:react >"$log" 2>&1; then
    deny "[pre-commit-check] 커밋 차단: react-doctor 진단 실패. 고치거나 근거와 함께 끄세요:
$(grep -E "^⚠|^  [a-z-]+/|^  (src|package)" "$log" | head -20)"
  fi
fi

exit 0
