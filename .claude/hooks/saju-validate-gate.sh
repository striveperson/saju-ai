#!/bin/bash
# Stop hook: apps/web/src/lib/saju 가 바뀐 채로 턴이 끝나려 하면
# saju-engine-validator 서브에이전트를 부르게 한다.
#
# 훅은 서브에이전트를 직접 띄우지 못한다. 종료를 막고 지시를 돌려주는 것까지가 훅의 몫이고,
# 실제 호출은 Claude 가 한다.
#
# 편집마다 돌지 않고 턴이 끝날 때 한 번만 돈다. 구현 중간의 미완성 코드를 검증해봐야
# 지적만 쌓이고 쓸모가 없다.
#
# 무한 루프를 두 겹으로 막는다.
#   stop_hook_active  이 훅 때문에 이어서 돈 상태면 다시 막지 않는다
#   diff 해시 목록    한 번 검증한 상태로는 다시 막지 않는다. 되돌려도 마찬가지다
#
# SAJU_SKIP_VALIDATE=1 이면 건너뛴다.

set -uo pipefail

[ "${SAJU_SKIP_VALIDATE:-}" = "1" ] && exit 0

active=$(node -e "
let d = '';
process.stdin.on('data', c => (d += c)).on('end', () => {
  try { console.log(JSON.parse(d).stop_hook_active === true ? 'true' : 'false'); }
  catch { console.log('false'); }
});
")

[ "$active" = "true" ] && exit 0

ROOT="${CLAUDE_PROJECT_DIR:-}"
[ -z "$ROOT" ] && ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$ROOT" ] && exit 0
cd "$ROOT" || exit 0

git rev-parse --git-dir >/dev/null 2>&1 || exit 0

ENGINE="apps/web/src/lib/saju"

# 워킹트리 변경, 새로 만든 파일, 브랜치에 쌓인 커밋을 모두 상태에 넣는다.
# 커밋만 하고 검증을 건너뛰는 경로를 막기 위해 main...HEAD 도 본다.
state=$(
  git diff HEAD -- "$ENGINE" 2>/dev/null

  git ls-files --others --exclude-standard -- "$ENGINE" 2>/dev/null | while IFS= read -r f; do
    printf '%s\n' "$f"
    cat "$f" 2>/dev/null
  done

  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$branch" != "main" ] && git rev-parse --verify --quiet main >/dev/null 2>&1; then
    git diff main...HEAD -- "$ENGINE" 2>/dev/null
  fi
)

[ -z "$state" ] && exit 0

if command -v shasum >/dev/null 2>&1; then
  hash=$(printf '%s' "$state" | shasum | cut -d' ' -f1)
else
  hash=$(printf '%s' "$state" | sha1sum | cut -d' ' -f1)
fi

# 마커는 .git 안에 둔다. 커밋되지 않고 클론마다 따로 간다.
#
# 해시 하나가 아니라 목록으로 쌓는다. 하나만 들고 있으면 되돌리기나 브랜치 이동으로
# 이미 검증한 상태로 돌아갔을 때 다시 막는다.
marker="$(git rev-parse --git-dir)/saju-validate-gate"

[ -f "$marker" ] && grep -qxF "$hash" "$marker" 2>/dev/null && exit 0

# 이전 형식은 개행 없는 해시 한 줄이었다. 그대로 이어 붙이면 두 해시가 한 줄로 뭉친다.
{
  [ -f "$marker" ] && cat "$marker"
  printf '\n%s\n' "$hash"
} 2>/dev/null | grep -vE '^[[:space:]]*$' | tail -n 200 >"$marker.tmp"
mv "$marker.tmp" "$marker"

cat <<'JSON'
{"decision":"block","reason":"apps/web/src/lib/saju 가 변경된 채로 턴이 끝나려 한다. saju-engine-validator 서브에이전트를 호출해 이번 변경을 검증하고 보고 결과를 사용자에게 그대로 전달한 뒤 응답을 마친다. 지적이 나와도 임의로 고치지 않고 고칠지를 사용자에게 묻는다. 검증이 필요 없는 변경이면 왜 필요 없는지 한 줄로 말하고 마친다."}
JSON
