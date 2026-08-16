# CLAUDE.md - saju-ai

> 생년월일시로 사주를 계산해 보여주고, 그 판정이 무엇을 뜻하는지 AI 가 풀어 설명하는 서비스.
> 이 파일은 저장소 루트 설정이다.

## 먼저 읽을 것

작업 전에 관련 문서를 먼저 확인한다. 코드와 문서는 같은 PR 에서 함께 바꾼다.

| 작업                             | 문서                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| 사주 계산 규칙 (SSOT)            | [docs/05-saju-domain-rules.md](docs/05-saju-domain-rules.md)       |
| 신살 판정 규칙 (SSOT)            | [docs/07-sinsal-rules.md](docs/07-sinsal-rules.md)                 |
| 서비스 정의, 사용자 흐름, 용어집 | [docs/01-overview.md](docs/01-overview.md)                         |
| 시스템 구조, 빌드 타깃, 데이터   | [docs/02-architecture.md](docs/02-architecture.md)                 |
| 화면 코드 규칙 (SSOT)            | [docs/03-frontend-rules.md](docs/03-frontend-rules.md)             |
| 웹 패키지 규칙                   | [apps/web/CLAUDE.md](apps/web/CLAUDE.md)                           |
| 계산 엔진 규칙                   | [apps/web/src/lib/saju/README.md](apps/web/src/lib/saju/README.md) |
| 모바일 셸                        | [apps/mobile/README.md](apps/mobile/README.md)                     |
| 왜 이렇게 결정했는가             | [docs/adr/](docs/adr/)                                             |
| 문서 작성 규칙                   | [docs/00-documentation-guide.md](docs/00-documentation-guide.md)   |
| 코드를 고칠 때의 작업 방식       | [docs/06-code-working-rules.md](docs/06-code-working-rules.md)     |

06 은 세션마다 자동으로 읽힌다. 표의 나머지는 필요할 때 열어본다.

@docs/06-code-working-rules.md

## 모노레포 구조

`packages/` 공유 패키지를 두지 않는다. 계산 엔진의 소비자가 웹 하나뿐이기 때문이다
([ADR 0001](docs/adr/0001-monorepo-pnpm-workspaces.md)).

## 기술 스택

쓰는 것과 버전은 `package.json` 에 있다. 아직 붙이지 않은 것은 Supabase(인증, Postgres, RLS),
Gemini Flash Lite, Vercel 배포다.

의존성 버전은 고정되어 있다. `latest` 나 범위 지정으로 되돌리지 않는다.
검증된 조합을 유지해야 문제가 생겼을 때 원인을 좁힐 수 있다.

## 명령어

`package.json` 의 scripts 를 쓴다. 거기서 안 나오는 것이 둘이다.

엔진만 돌릴 때는 `pnpm --filter web exec vitest run --project saju` 를 쓴다.
`pnpm test` 는 saju 와 web 두 프로젝트를 함께 돌린다.

번들된 만세력 데이터가 원본과 어긋나는지는 `pnpm --filter web verify:data` 가 본다.
음력표를 다시 구웠을 때 한 해 안에서 상쇄되는 오류는 vitest 가 잡지 못한다.
접힌 표에서는 달 크기가 해 단위 합으로만 확인되기 때문이다.
`pre-commit-check.sh` 가 커밋 직전에 이 스크립트를 부른다.
표준시 이력을 고쳤을 때 쓰는 `dump-tzdb-seoul.mjs --check` 는 아직 여기 붙지 않았다.

## 훅 (`.claude/hooks/`, 설정은 `.claude/settings.json`)

| 훅                      | 시점                         | 하는 일                                                      |
| ----------------------- | ---------------------------- | ------------------------------------------------------------ |
| `protect-env.sh`        | PreToolUse (Read/Edit/Write) | `.env*` 와 `.claude/settings.local.json` 접근 차단           |
| `protect-routetree.sh`  | PreToolUse (Edit/Write)      | `routeTree.gen.ts` 편집 차단. 자동 생성 파일이다             |
| `protect-main.sh`       | PreToolUse (Bash)            | `main` 에서의 커밋과 push, `main` 대상 push 차단             |
| `pre-commit-check.sh`   | PreToolUse (Bash)            | `git commit` 직전 타입체크, lint, 데이터 대조, 테스트. 실패하면 커밋 차단 |
| `format-file.sh`        | PostToolUse (Edit/Write)     | oxfmt 자동 포맷 + oxlint --fix                               |
| `saju-engine-purity.sh` | PostToolUse (Edit/Write)     | 엔진의 환경 의존 호출 차단                                   |
| `md-style-guard.sh`     | PostToolUse (Edit/Write)     | 문서 스타일 규칙 검사                                        |
| `saju-validate-gate.sh` | Stop                         | 엔진 변경이 남아 있으면 검증 에이전트를 부르게 한다          |

계산 엔진의 import 경계는 훅이 아니라 oxlint 가 막는다.
`apps/web/.oxlintrc.json` 의 `overrides` 에서 `src/lib/saju/**` 에 `no-restricted-imports` 를 건다.

## 어겨서는 안 되는 규칙

### 계산과 해석의 분리

이 프로젝트의 존재 근거다. 무너지면 나머지가 전부 무의미해진다.

- 사주 계산과 판정은 `apps/web/src/lib/saju` 의 순수 함수만 한다.
  LLM 에게 간지, 오행 강약, 십신, 용신, 신살을 계산시키지 않는다.
- LLM 프롬프트에는 계산이 끝난 판정 결과만 넣는다.
  생년월일시 원본을 넣어 LLM 이 재계산할 여지를 만들지 않는다.
- `apps/web/src/lib/saju` 는 외부 의존이 0 이다.
  React, 날짜 라이브러리, Supabase 클라이언트, UI 코드를 import 하지 않는다.
  예외는 `data/` 의 절기와 음력 데이터 모듈뿐이며, 그 모듈도 값을 품고 있어야 하고 네트워크를 타면 안 된다.
- 계산 엔진은 현재 시각과 실행 환경 타임존을 읽지 않는다.
  `Date.now()`, 인자 없는 `new Date()`, `Math.random()` 을 쓰지 않는다. 시각은 인자로 받는다.

근거: [ADR 0005](docs/adr/0005-rule-engine-plus-llm-interpretation.md),
[ADR 0013](docs/adr/0013-saju-engine-purity-enforcement.md)

### 도메인 SSOT

- [docs/05-saju-domain-rules.md](docs/05-saju-domain-rules.md) 가 사주 계산 규칙의 단일 진실 공급원이다.
- 코드와 이 문서가 어긋나면 코드가 틀린 것으로 간주한다.
- 문서를 고쳐야 한다면 근거와 함께 문서를 먼저 고치고, 그 다음 코드를 고친다.
- 도메인 규칙이 애매하면 추측해서 구현하지 않는다. 근거를 찾거나 사용자에게 확인한다.

### 만세력 데이터

- 절기 시각은 `apps/web/src/lib/saju/data/solar-terms.ts` 를 쓴다. 자동 생성 파일이라 직접 고치지 않는다.
  태양 겉보기 황경이 15도의 배수가 되는 순간을 계산한 값이고, 근사 공식이 아니다.
  KASI 는 값의 출처가 아니라 교차검증 코퍼스다. 특일정보 API 가 2000~2028 만 주기 때문이고,
  그 구간은 정답지 역할을 한다([ADR 0014](docs/adr/0014-kasi-data-bundled-not-fetched.md)).
- 표준시 이력과 서머타임은 `apps/web/src/lib/saju/data/korea-time.ts` 를 쓴다.
  tz database `Asia/Seoul` 을 손으로 옮긴 표이고, `Intl` 이나 날짜 라이브러리로 대신하지 않는다.
  값을 고쳤으면 `node apps/web/scripts/dump-tzdb-seoul.mjs --check` 로 정답지를 먼저 확인한다
  ([ADR 0015](docs/adr/0015-korea-time-history-bundled.md)).
- 음력에서 양력으로의 변환은 KASI 공식 데이터를 쓴다. 자체 음력 산출 알고리즘을 구현하지 않는다.
- 일주 앵커 값을 하드코딩하지 않는다.
  `verified: true` 검증 케이스 3개 이상으로 확정한다.
- 계산 함수는 vitest 테스트와 함께 작성한다. 경계 케이스 테스트는 선택이 아니다.
  필수 목록은 [docs/05-saju-domain-rules.md](docs/05-saju-domain-rules.md) 10장에 있다.

### 모바일

- `apps/mobile` 에 비즈니스 로직을 넣지 않는다. Capacitor 셸일 뿐이다.
- 앱에서 서버를 호출할 때 상대 경로를 쓰지 않는다.
  앱은 `capacitor://localhost` 오리진에서 뜨므로 절대 URL 이어야 한다.

### 비밀값

- Supabase 키, Gemini API 키, 카카오 REST API 키, GitHub PAT 은 환경변수로만 주입한다. 커밋하지 않는다.
  클라이언트로 새지 않도록 `VITE_` 접두사를 붙이지 않는다. 서버 라우트 안에서만 읽는다.
  출생지 검색이 쓰는 `KAKAO_REST_API_KEY` 가 그것이다([ADR 0019](docs/adr/0019-region-lookup-via-address-api.md)).
- 시크릿이 들어가는 파일은 사용자가 직접 관리한다. 읽거나 수정하지 않는다.
  `.env*` 와 `.claude/settings.local.json` 둘이며, `protect-env.sh` 훅이 접근을 차단한다.
- `.mcp.json` 의 `${VAR}` 확장은 harness 가 처리한다.
  Claude 가 토큰 값을 볼 일이 없고, 볼 필요도 없다.

### 개인정보

- 생년월일시는 개인정보다. 로그에 남기지 않는다.
- 해석 캐시에 사용자를 식별할 수 있는 정보를 넣지 않는다.
  캐시 키는 팔자, 판정 결과, 계산 옵션, 프롬프트 버전, 모델 버전의 해시다.
- 공유 링크는 사용자가 명시적으로 생성해야 만들어진다. 기본으로 존재하지 않는다.

## 유파가 갈리는 지점

사주에는 정답이 하나가 아닌 영역이 있다.
그런 곳에 단일 값을 하드코딩하지 않고 옵션으로 노출한다.

적용한 값을 결과 화면에 표시하지 않는다. 사용자가 옵션을 고를 수단이 아직 없어
넷 다 기본값으로 고정되고, 매번 같은 네 줄을 띄우는 것이 정보가 되지 않는다.
설정 지면이 붙어 값이 갈리기 시작하면 다시 정한다.

계산이 가정을 세운 것은 별개다. 이상 구간과 서머타임 가정과 진태양시 폴백은
해당할 때만 생기는 사실이라 결과 화면이 그때 표시한다.
문구는 [docs/01](docs/01-overview.md) 5.1 에 있다.

| 지점               | 옵션                      | 기본값         |
| ------------------ | ------------------------- | -------------- |
| 야자시 정책        | `ziPolicy`                | 정자시설       |
| 서머타임 기록 성격 | `dstAssumption`           | `unknown`      |
| 모호한 벽시계 해석 | `ambiguityChoice`         | `earlier`      |
| 지원 세력 범위     | `supportIncludesResource` | true           |

대운수 나머지 처리는 이 표에 있었으나 뺐다. 가르는 검증 케이스가 없어
옵션으로 두면 근거 없이 다른 값을 내는 경로가 남는다. 근거는
[docs/05](docs/05-saju-domain-rules.md) 9.1 이다.

## 문서와 마크다운 규칙

문서(`*.md`)와 Claude 의 마크다운 답변 모두에 적용한다.
canonical 목록은 [docs/00-documentation-guide.md](docs/00-documentation-guide.md) 5장이다.

기계적으로 검사되는 것은 `md-style-guard.sh` 훅이 저장할 때 잡는다.
em dash, 이모지, 번호 목록 안의 굵은 강조, 취소선, 한 줄에 짝을 이루는 물결표 다섯이다.
규칙을 설명하느라 그 문자를 써야 하는 줄에는 `<!-- md-allow -->` 를 붙인다.

굵은 강조(`**`)는 어겨서는 안 되는 규칙에만 쓴다. 한 문서에 두세 번을 넘기면 남용이다.

정규식으로 검사할 수 없는 문장 규칙은 `writing-style` 스킬에 있다.
근거 없는 형용사, 메타 서술, 문장 구조 반복, 번역투, 말미 요약 같은 것들이다.
문서를 새로 쓰거나 크게 고칠 때, 긴 설명형 답변을 쓸 때 그 스킬을 부른다.

## 스킬 (`.claude/skills/`)

- `feature`: 기능 구현을 계획, 설계, 테스트, 품질, 문서, 보안 여섯 단계로 돈다.
  단계마다 담당과 넘어가는 조건이 있다. 부를 때만 적용되고 오타나 한 줄 변경에는 쓰지 않는다.
- `frontend`: 화면 코드의 고치기 전후 예시와 체크리스트.
  규칙 목록은 [docs/03](docs/03-frontend-rules.md) 이고 이 스킬은 적용을 담당한다.
- `writing-style`: 문장 규칙과 고치기 전후 예시. 훅이 잡지 못하는 항목을 담당한다.
- `commit`: 커밋 메시지 규칙과 scope 목록. 메시지만 만들고 커밋은 하지 않는다.
- `pr`: PR 본문을 쓰고 github MCP 로 올린다. 병합은 하지 않는다.
- `validate-loop`: 검증기가 낸 기록 항목을 라운드로 정리한다. 종료 조건은 스킬에 있다.
- `tanstack-skills`: TanStack 패키지가 npm 으로 함께 배포하는 공식 스킬을 `@tanstack/intent` 로
  꺼내 읽는다. 무엇이 있고 우리 규약과 어긋나는 자리가 어디인지 거기 적혀 있다.

PR 본문은 고정 양식이 아니다. 요약만 항상 쓰고 나머지는 diff 를 보고 판단해 더한다.
`.github/pull_request_template.md` 를 두지 않는다.

스킬은 `.claude/skills/` 에만 둔다. Claude Code 가 읽는 경로가 여기뿐이다.
`.agents/skills/` 는 다른 도구의 규약이고 로드되지 않는다.

## 에이전트 (`.claude/agents/`)

- `saju-engine-validator`: 엔진 변경을 [docs/05](docs/05-saju-domain-rules.md) 와 대조한다.
  읽기만 하고 고치지 않는다.
- `saju-screen-validator`: 화면 변경을 표기 의무와 `docs/mockups/` 와 대조한다.
  읽기만 하고 고치지 않는다. 엔진은 보지 않는다.
- `saju-record-fixer`: 검증기가 낸 기록 항목 중 고침으로 분류된 것만 적용한다.
  받은 목록대로만 고치고 무엇을 고칠지는 판단하지 않는다. `validate-loop` 스킬이 부른다.

검증기 둘 다 보고를 차단과 기록으로 나눈다. 차단이 0 이면 통과다.
엔진 쪽은 값이 문서와 다르거나, 폴백이 표기 없이 나가거나, 10장 목록에 대응 테스트가 없거나,
문서와 코드가 서로 다른 말을 하면 차단이다.
화면 쪽은 표시 의무가 화면에 도달하지 못하거나, 컴포넌트가 판정을 다시 계산하거나,
개인정보가 밖으로 나가면 차단이다. 각 목록은 에이전트 정의에 있다.
나머지는 기록이고 미룰 수 있다.
등급이 없으면 지적을 전부 고치게 되고, 고칠 때마다 검증이 다시 붙어 끝나지 않는다.

검증을 별도 에이전트로 뗀 이유는 구현한 맥락에서 스스로 확인하면
방금 한 착각을 그대로 한 번 더 하기 때문이다.
근거는 [docs/06](docs/06-code-working-rules.md) 4장.

실행을 뗀 것은 반대 방향의 같은 이유다. 고칠 것을 정한 맥락에서 그대로 고치면
"이왕 여는 김에" 가 붙어 diff 가 목록 밖으로 나간다. 실행자는 목록만 보므로 나갈 자리가 없다.
편집 분량이 메인 컨텍스트에 쌓이지 않는 것도 얻는다. 라운드가 여럿 도는 작업이라 그것이 크다.
대신 지시가 모호하면 실행자가 멈추고 돌려주므로 대장을 정확히 적어야 한다.

엔진 검증기를 부르는 것은 `saju-validate-gate.sh` 가 챙긴다.
`apps/web/src/lib/saju` 가 바뀐 채로 턴이 끝나려 하면 종료를 막고 검증기를 부르게 한다.
편집마다가 아니라 턴이 끝날 때 한 번이다. 구현 중간의 미완성 코드를 검증해봐야 지적만 쌓인다.
같은 변경 내용으로는 한 번만 막고, 커밋만 하고 넘어가는 경로를 막으려고
워킹트리뿐 아니라 `main...HEAD` 도 함께 본다.
건너뛰어야 하면 `SAJU_SKIP_VALIDATE=1` 을 준다.

화면 검증기에는 훅이 없다. `feature` 스킬의 4단계가 부른다.
엔진은 틀린 간지가 조용히 나가서 사람 눈으로 잡을 방법이 없지만
화면은 목업과 나란히 놓고 볼 수 있다. 그 차이만큼 강제 수단을 덜 둔다.

## MCP 서버 (`.mcp.json`)

쓰이는 시점에 맞춰 단계적으로 붙인다. 안 쓰는 도구를 설정에 쌓지 않는다.

| 서버         | 쓰는 곳                                            | 상태                |
| ------------ | -------------------------------------------------- | ------------------- |
| `context7`   | TanStack Start, Capacitor, Supabase 최신 문서 조회 | 붙임                |
| `playwright` | 브라우저 검증. SPA 번들 부팅 확인 등               | 붙임                |
| `github`     | PR 생성, 리뷰, 병합. 저장소와 브랜치 조회          | 붙임. PAT 필요      |
| `supabase`   | 스키마와 RLS 작업                                  | 서버 작업 시작할 때 |
| `vercel`     | 배포와 빌드 로그                                   | 붙일 때가 됐다      |

`vercel` 이 앞당겨졌다. 출생지 검색이 서버 라우트를 타면서 앱이 부를 대상이 배포되어 있어야 한다
([ADR 0019](docs/adr/0019-region-lookup-via-address-api.md)).

TanStack Start 는 버전이 빠르게 움직인다. API 를 추측하지 말고 `context7` 로 확인한다.
설치된 `.d.ts` 를 뒤지는 것은 문서를 못 찾을 때의 차선이다.

예외가 하나 있다. TanStack 이 주제별 스킬을 패키지 안에 실어 배포하고
루트 devDependency 인 `@tanstack/intent` 가 그것을 꺼낸다.
버전이 lockfile 에 고정되어 있어 라우터와 Start 는 그것부터 본다.
읽는 법은 `tanstack-skills` 스킬에 있다.
React Query 는 스킬을 배포하지 않아 `context7` 이 그대로 담당한다.

### github 서버

원격 서버(`https://api.githubcopilot.com/mcp/`)를 쓰고 툴셋을 `repos,pull_requests` 로 제한한다.
전체 21개 툴셋 중 나머지 19개는 빠진다.
`actions`, `issues`, `notifications`, `orgs`, `gists`, `discussions`, `projects`, `labels`,
`secret_protection`, `security_advisories`, `dependabot`, `stargazers`, `users`, `copilot` 등이다.

쓰지 않는 도구를 열어두지 않는다는 원칙이고, 실수로 이슈를 만들거나 워크플로를 돌릴 여지도 없앤다.
툴셋을 늘려야 할 일이 생기면 `.mcp.json` 의 `X-MCP-Toolsets` 헤더를 고친다.

PAT 이 필요하다. `gh` 의 OAuth 토큰은 keyring 에 있어 환경변수로 쓸 수 없다.

1. GitHub 에서 `repo` 권한을 가진 personal access token 을 발급한다.
2. 셸 환경변수 `GITHUB_PERSONAL_ACCESS_TOKEN` 에 넣는다.
3. 세션을 다시 시작한다. `.mcp.json` 은 시작할 때 로드된다.

토큰은 사용자가 직접 관리한다. 저장소에 커밋하지 않는다.

## 외부 에이전트 모음 (ECC)

[affaan-m/ECC](https://github.com/affaan-m/ECC) 같은 확장 모음은 플러그인으로 통째 설치하지 않는다.
필요한 것만 골라 우리 규약에 맞게 고쳐 가져온다.
무엇을 언제 가져올지는 [ADR 0017](docs/adr/0017-external-agent-collections-selective-port.md) 에 있다.

react-doctor 는 그 ADR 이 보류했다가 화면 코드가 서면서 들였다.
`pnpm --filter web verify:react` 로 부르고 텔레메트리와 공급망 스캔을 끈 채 돈다.
패키지가 싣는 에이전트 스킬은 붙이지 않는다. 실행 중에 원격 플레이북을 받아 따르게 되어 있다.
근거는 [ADR 0020](docs/adr/0020-react-doctor-adopted.md) 이다.

## ADR

큰 구조나 기술 결정은 코드보다 ADR 을 먼저 쓴다.

- 위치는 `docs/adr/`, 형식은 [docs/00-documentation-guide.md](docs/00-documentation-guide.md) 4장을 따른다.
- 결정을 바꿀 때는 기존 ADR 을 수정하지 않는다.
  새 ADR 을 쓰고 기존 것의 상태를 `대체됨`으로 바꾼다.
- 채택하지 않기로 한 것도 기록한다. 같은 논의가 반복되는 것을 막는 것이 ADR 의 값어치다.

목록은 [docs/adr/](docs/adr/) 에 있다.

## Git

- 브랜치: `feature/<요약>`, `fix/<요약>`, `chore/<요약>`
- `main` 에 직접 push 하지 않는다. PR 을 거친다.
  GitHub 의 브랜치 보호 규칙은 걸려 있지 않고 `protect-main.sh` 훅이 그 자리를 대신한다.
  `main` 에서의 커밋과 push, 다른 브랜치에서 `main` 을 대상으로 하는 push 를 막는다.
  사람이 판단해 `main` 을 직접 고쳐야 하면 명령에 `# allow-main` 을 붙인다.
- 커밋과 push 는 명시적으로 요청받았을 때만 한다.
  `permissions.ask` 에 걸려 있어 매번 확인 프롬프트가 뜬다.
- 커밋: Conventional Commits 규격에 한국어 본문.
  `feat(saju): 시주 계산에 진태양시 보정 적용`, `docs(adr): 0014 추가`
  scope 목록과 본문 규칙은 `commit` 스킬에 있다.
  AI 귀속 트레일러(`Co-Authored-By: Claude ...`)는 붙이지 않는다.
- 버그 수정은 재현 테스트를 먼저 쓴다.

### 로컬 git 과 GitHub 작업의 경계

로컬 저장소 작업은 `git` 으로 한다. `add`, `commit`, `push`, `switch`, `diff` 등이다.

GitHub 쪽 작업은 `gh` CLI 를 쓰지 않고 `github` MCP 도구로 한다.
PR 생성과 리뷰, 병합, 저장소와 브랜치 조회가 여기에 해당한다.

MCP 의 `push_files` 로 커밋하지 않는다.
그 도구는 로컬 워킹트리를 모르고 파일 내용을 API 로 보내 원격에 커밋을 만든다.
로컬 이력과 어긋나고 `pnpm-lock.yaml` 같은 큰 파일에 맞지 않는다.
커밋은 로컬 `git` 이 하고, 그 결과를 `git push` 로 올린다.

## 아직 정해지지 않은 것

- 절입 근처 출생의 경고 문구. [ADR 0014](docs/adr/0014-kasi-data-bundled-not-fetched.md) 가
  표시를 요구하는데 엔진이 그 사실을 내지 않는다. `TimeNotice` 에 항목이 없다.
  이상 구간 쪽 일곱 종은 [docs/01](docs/01-overview.md) 5.1 이 채웠다
- MVP 화면 디자인
- 앱 푸시 알림 내용과 발송 시점

## 아직 확인하지 못한 것

- Gemini Flash Lite 응답 시간이 Vercel 서버리스 실행시간 제한 안에 들어오는가.
  넘치면 [ADR 0011](docs/adr/0011-single-prompt-no-streaming.md) 을 대체해
  스트리밍이나 백그라운드 생성으로 간다.
- SPA 번들이 실제 웹뷰 안에서 부팅하는가.
  번들 자체가 자기완결적인 것은 확인했다([ADR 0003](docs/adr/0003-spa-bundle-for-app.md) 검증 결과).
  웹뷰 부팅은 Xcode 나 Android SDK 가 필요해 네이티브 프로젝트를 만들 때 확인한다.

## 아직 만들지 않은 것

- 균시차 보정. docs/05 7.3 이 유파 선택 옵션으로 둔 항목이다
- 십신 10종. 5분류(비겁, 인성, 식상, 재성, 관성)까지만 있다
- 월운. docs/05 9장이 대운과 세운까지만 정의한다
- Supabase 스키마와 RLS
- 결과 지면의 연운, 월운, 일진 달력. 연운은 현재 시각 기준이 필요하고 뒤 둘은 엔진에 없다
- 시 미상 입력. 결정표는 받았고 규칙은 별도 ADR 로 정한다.
  입력 지면 목업에 `시간 모름` 자리가 있고 지금은 감춰 두었다
- 야자시 정책을 사용자가 고르는 수단. 입력 목업의 토글을 감춰 두었다.
  이것이 서면 유파 넷이 기본값으로 고정된다는 전제가 깨져 표시 규칙을 다시 정해야 한다
- 사주 불러오기. 입력 지면에 버튼이 있고 로그인과 저장이 붙을 때까지 비활성이다
- AI 해석 레이어
- 네이티브 프로젝트 (`apps/mobile/ios`, `android`)

만들어진 것은 `apps/web/src/lib/saju` 를 열면 나온다. 파일마다 머리 주석이 담당 범위와
근거가 되는 docs/05 장 번호를 적어 두었다.

검증 케이스 중 일부만 `verified` 다. 나머지는 표준시 전환, 진태양시, 대운, 강약이라
공인 만세력 대조가 붙어야 채운다. 어느 것이 왜 막혀 있는지는 각 케이스의 `blockedBy` 에 있다.
다만 표준시와 서머타임 케이스는 간지가 비어 있어도 파이프라인 출력이 검증된다.
tz database 로 결정되는 값이라 만세력을 기다릴 이유가 없다.

에이전트는 `saju-engine-validator`, `saju-screen-validator`, `saju-record-fixer` 셋이고
커스텀 커맨드는 아직 없다. 대상이 생길 때 만든다.
`/Users/mychoi/f-lab/saju` 의 `saju-calc` 스킬과 `saju-master` 에이전트는 가져오지 않았다.
검증 쪽은 이미 자리가 찼고, 계산 쪽은 이 저장소의 순수 함수와 픽스처가 담당한다.
