---
name: pr
description: PR 을 만든다. .github/pull_request_template.md 를 채우고 github MCP 로 올린다. 제목은 Conventional Commits, 본문은 한국어. "PR 올려줘", "PR 만들어줘", /pr 로 부른다.
---

# PR

템플릿이 SSOT 다. 구조를 새로 지어내지 않는다.

본문은 [.github/pull_request_template.md](../../../.github/pull_request_template.md) 를 읽어서 채운다.
템플릿이 바뀌면 이 스킬을 고치지 않아도 결과가 따라 바뀐다.

상위 규칙은 [CLAUDE.md](../../../CLAUDE.md) 의 Git 절이다.

## 순서

### 1. 브랜치 확인

`main` 이면 여기서 멈춘다. `main` 에 직접 push 하지 않는다.
`feature/<요약>`, `fix/<요약>`, `chore/<요약>` 중 맞는 것으로 옮길 것을 제안하고 승인을 받는다.

### 2. 커밋과 push

로컬 `git` 으로 한다. 커밋 메시지는 `commit` 스킬 규칙을 따른다.

`push_files` MCP 도구로 커밋하지 않는다. 그 도구는 로컬 워킹트리를 모른다.

### 3. 변경 범위 파악

`git diff main...HEAD --stat` 과 커밋 목록을 본다.

### 4. 템플릿 채우기

- 절의 제목과 순서를 바꾸지 않는다
- 안내용 주석(`<!-- -->`)은 채운 뒤 지운다
- 조건에 맞지 않는 절은 통째로 지운다. 빈 채로 두거나 "해당 없음" 을 적지 않는다

| 절              | 언제 남기나                  |
| --------------- | ---------------------------- |
| 무엇을 왜       | 항상                         |
| 커밋            | 커밋이 여럿일 때             |
| 도메인 규칙     | 사주 계산 규칙을 건드렸을 때 |
| Breaking Change | 호환성이 깨질 때             |
| 스크린샷        | UI 가 바뀌었을 때            |
| 관련 이슈       | 이슈 번호가 있을 때          |

자명한 PR 은 "무엇을 왜" 하나로 끝난다. 절 수로 성의를 재지 않는다.

### 5. 생성

`github` MCP 의 `create_pull_request` 를 쓴다. `gh` CLI 를 쓰지 않는다.

- base 는 `main`
- 제목은 Conventional Commits 에 한국어. `commit` 스킬의 type 과 scope 표를 그대로 쓴다
- 커밋이 하나면 그 제목을 PR 제목으로 쓰고 `커밋` 절은 지운다

## 넣지 않는 것

PR 본문은 리뷰어가 diff 를 읽기 전에 맥락을 잡는 자리다.
diff 나 CI 가 이미 말하는 것을 옮겨 적으면 정작 읽어야 할 "왜" 가 묻힌다.

- 파일 목록과 변경 내용 나열. PR 페이지가 커밋과 diff 를 이미 보여준다
- 검증 체크리스트. `pnpm typecheck`, `lint`, `test` 는 통과해야 push 하는 것이고
  `pre-commit-check.sh` 가 이미 막는다. 본문에 다시 적을 이유가 없다
- 테스트 방법. 리뷰어가 재현해야 할 절차가 실제로 있을 때만 쓰고,
  없으면 쓰지 않는다. 대개는 테스트 코드가 그 자리다
- 되돌리기. 단순 revert 로 안 되는 경우에만 적는다. 대개는 단순 revert 로 된다
- 규약 준수 체크박스. 시크릿과 개인정보, 문서 동시 변경 같은 것은
  훅과 lint 가 강제하는 쪽이 맞다. 자기 신고로 대신하지 않는다

## 경계

- PR 생성까지 한다. 병합은 하지 않는다. 별도 지시가 있을 때만 한다
- 리뷰 코멘트를 남기려면 `pull_request_review_write` 로 pending review 를 만들고
  `add_comment_to_pending_review` 로 채운 뒤 제출한다
- 브랜치 보호 규칙은 아직 걸려 있지 않다. 규칙이 없다고 `main` 에 직접 올리지 않는다
