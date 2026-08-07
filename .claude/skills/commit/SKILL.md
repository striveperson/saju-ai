---
name: commit
description: 커밋 메시지를 짧고 정확하게 쓴다. Conventional Commits 규격에 한국어 본문, 제목 50자 이내, 본문은 왜가 제목에 담기지 않을 때만. "커밋 메시지 써줘", "커밋 메시지 만들어줘", /commit 으로 부른다.
---

# 커밋 메시지

무엇을 했는지는 diff 가 말한다. 메시지는 왜 했는지를 적는다.

규격은 Conventional Commits 이고, 상위 규칙은 [CLAUDE.md](../../../CLAUDE.md) 의 Git 절이다.
어긋나면 CLAUDE.md 가 맞다.

## 제목

`<type>(<scope>): <요약>` 형태다. `<scope>` 는 생략할 수 있다.

- 명령형으로 쓴다. "추가", "수정", "제거". "추가함", "추가했음" 을 쓰지 않는다
- 50자 이내를 목표로 하고 72자를 넘기지 않는다
- 끝에 마침표를 찍지 않는다

type 은 `feat` `fix` `refactor` `perf` `docs` `test` `chore` `build` `ci` `style` `revert` 다.

scope 는 이 저장소에서 다음을 쓴다.

| scope    | 대상                                 |
| -------- | ------------------------------------ |
| `saju`   | `apps/web/src/lib/saju` 계산 엔진    |
| `web`    | 라우트, 화면, API, 나머지 `apps/web` |
| `mobile` | `apps/mobile` Capacitor 셸           |
| `adr`    | `docs/adr`                           |
| `docs`   | 그 밖의 문서                         |
| `hooks`  | `.claude/hooks`                      |
| `deps`   | 의존성 추가, 제거, 버전 변경         |

엔진 변경은 `web` 이 아니라 `saju` 다. 계산과 해석의 분리가 이력에서도 보여야 한다.

## 본문

본문은 한국어로 쓴다. 제목만으로 왜가 설명되면 본문을 쓰지 않는다.

- 72자에서 줄바꿈한다
- 불릿은 `-` 를 쓴다
- 이슈와 PR 참조는 맨 끝에 둔다. `Closes #42`, `Refs #17`

본문을 반드시 쓰는 경우가 넷 있다.

- 도메인 규칙 변경. 근거가 된 `docs/05-saju-domain-rules.md` 의 장 번호나 ADR 번호를 적는다
- 파괴적 변경. `BREAKING CHANGE:` 로 시작하는 문단을 넣는다
- 되돌리기. 어느 커밋을 왜 되돌리는지 적는다
- 보안 수정과 데이터 마이그레이션

나중에 이력을 파는 사람이 필요로 하는 것이 여기 있다. 제목 한 줄로 압축하지 않는다.

## 넣지 않는 것

- "이 커밋은 ~ 한다", "현재", "이제". 무엇을 했는지는 diff 가 말한다
- "요청에 따라". 사람을 적어야 하면 `Co-authored-by` 트레일러를 쓴다
- AI 귀속 트레일러. `Co-Authored-By: Claude ...` 를 붙이지 않는다.
  Claude Code 의 기본 동작이지만 이 저장소는 쓰지 않기로 정했다
- 이모지
- scope 가 이미 가리키는 파일 이름 되풀이
- 생년월일시. 픽스처를 다루는 커밋에서도 값 자체를 메시지에 옮기지 않는다

## 고치기 전후

```
전  feat: 사용자 프로필 정보를 서버에서 가져오는 새로운 엔드포인트를 추가함

후  feat(web): GET /api/saju/:id 추가

    앱이 해석 전문을 기다리지 않고 판정 결과부터 그리도록 응답을 나눴다.
    LTE 에서 첫 화면이 뜨는 시간을 줄인다.

    Closes #128
```

도메인 규칙 변경. 근거 문서를 남긴다.

```
fix(saju): 입춘 경계에서 년주가 하나 밀리는 문제 수정

절기 시각을 UTC 로 비교하고 있었다. KASI 절기 시각은 KST 기준이라
입춘 당일 이른 시각에 태어난 경우 년주가 앞선 간지로 나왔다.

재현 테스트를 fixtures 에 추가했다. 근거는 docs/05-saju-domain-rules.md 2장.
```

파괴적 변경.

```
feat(saju)!: calculateSaju 인자를 옵션 객체로 변경

BREAKING CHANGE: calculateSaju(date, gender) 호출부를
calculateSaju({ birthedAt, gender, options }) 로 바꿔야 한다.
유파 옵션이 늘면서 위치 인자로는 감당이 안 된다.
```

## 경계

메시지만 만든다. `git add`, `git commit`, `git commit --amend` 를 실행하지 않는다.
붙여넣을 수 있는 코드 블록으로 출력한다.

`git commit` 은 `.claude/hooks/pre-commit-check.sh` 가 가로채 타입체크와 lint 와 테스트를 돌린다.
차단당하면 메시지를 고칠 것이 아니라 코드를 고쳐야 한다.

"이번엔 평소대로" 라고 하면 이 규칙을 적용하지 않는다.
