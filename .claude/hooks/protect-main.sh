#!/bin/bash
# PreToolUse(Bash) hook: main 브랜치에 커밋하거나 push 하는 것을 차단한다.
#
# CLAUDE.md Git 절: main 에 직접 push 하지 않는다. PR 을 거친다.
# GitHub 브랜치 보호 규칙을 걸지 않기로 해서 이 훅이 그 자리를 대신한다.
#
# 막는 것은 둘이다.
#   1. 현재 브랜치가 main 일 때의 git commit 과 git push
#   2. 다른 브랜치에 있더라도 push 대상이 main 인 경우 (git push origin main 등)
#
# 정당한 예외는 명령에 allow-main 을 주석으로 붙이면 통과한다.
# 병합 후 되돌리기처럼 사람이 판단해 main 을 직접 고쳐야 하는 경우가 있다.

command=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).tool_input.command ?? ''); } catch {}
});
")

case "$command" in
  *"git commit"*|*"git push"*) ;;
  *) exit 0 ;;
esac

case "$command" in
  *allow-main*) exit 0 ;;
esac

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

cd "$CLAUDE_PROJECT_DIR" || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ "$branch" = "main" ]; then
  deny "main 브랜치에서의 커밋과 push 는 hook 으로 차단되어 있습니다. feature/<요약>, fix/<요약>, chore/<요약> 중 맞는 브랜치를 만들어 작업하고 PR 을 거치세요. 근거는 CLAUDE.md 의 Git 절. 사람이 판단해 main 을 직접 고쳐야 하는 경우라면 명령에 '# allow-main' 을 붙이세요."
fi

# 다른 브랜치에 있어도 push 대상이 main 이면 막는다.
# feature/main-thing 이나 mainline 은 걸리지 않도록 앞뒤 경계를 본다.
case "$command" in
  *"git push"*)
    if printf '%s' "$command" | grep -qE 'git push[^;&|]*[[:space:]:]main([[:space:]]|$)'; then
      deny "main 으로의 push 는 hook 으로 차단되어 있습니다. PR 을 거치세요. 근거는 CLAUDE.md 의 Git 절. 사람이 판단해 main 을 직접 고쳐야 하는 경우라면 명령에 '# allow-main' 을 붙이세요."
    fi
    ;;
esac

exit 0
