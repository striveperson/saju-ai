# CLAUDE.md - saju-ai

> 생년월일시로 사주를 계산해 보여주고, 그 판정이 무엇을 뜻하는지 AI 가 풀어 설명하는 서비스.
> 이 파일은 저장소 루트 설정이다.

## 먼저 읽을 것

작업 전에 관련 문서를 먼저 확인한다. 코드와 문서는 같은 PR 에서 함께 바꾼다.

| 작업                             | 문서                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| 사주 계산 규칙 (SSOT)            | [docs/05-saju-domain-rules.md](docs/05-saju-domain-rules.md)       |
| 서비스 정의, 사용자 흐름, 용어집 | [docs/01-overview.md](docs/01-overview.md)                         |
| 시스템 구조, 빌드 타깃, 데이터   | [docs/02-architecture.md](docs/02-architecture.md)                 |
| 웹 패키지 규칙                   | [apps/web/CLAUDE.md](apps/web/CLAUDE.md)                           |
| 계산 엔진 규칙                   | [apps/web/src/lib/saju/README.md](apps/web/src/lib/saju/README.md) |
| 모바일 셸                        | [apps/mobile/README.md](apps/mobile/README.md)                     |
| 왜 이렇게 결정했는가             | [docs/adr/](docs/adr/)                                             |
| 문서 작성 규칙                   | [docs/00-documentation-guide.md](docs/00-documentation-guide.md)   |

## 모노레포 구조

```
saju-ai/
├── docs/                   ADR 과 도메인 문서
├── apps/
│   ├── web/                TanStack Start. 사실상 앱 전체
│   │   └── src/lib/saju/   계산 엔진 (외부 의존 0)
│   └── mobile/             Capacitor 셸. 비즈니스 로직 없음
├── .claude/hooks/          아래 훅 표 참고
└── pnpm-workspace.yaml
```

`packages/` 공유 패키지를 두지 않는다. 계산 엔진의 소비자가 웹 하나뿐이기 때문이다
([ADR 0001](docs/adr/0001-monorepo-pnpm-workspaces.md)).

## 기술 스택

- 웹: TanStack Start 1.168, TanStack Router 1.170, React 19.2 (+React Compiler),
  Vite 8, Tailwind 4, TanStack Query 5
- 도구: pnpm 10.33, TypeScript 7, oxlint (type-aware 켬), oxfmt, vitest 4
- 모바일: Capacitor 7
- 예정: Supabase (인증, Postgres, RLS), Gemini Flash Lite, Vercel 배포

의존성 버전은 고정되어 있다. `latest` 나 범위 지정으로 되돌리지 않는다.
검증된 조합을 유지해야 문제가 생겼을 때 원인을 좁힐 수 있다.

## 명령어

```bash
pnpm install
pnpm dev              # 웹 dev 서버 :3000 (점유되어 있으면 다음 포트)
pnpm build            # SSR 빌드 -> apps/web/.output/
pnpm build:spa        # 앱용 SPA 빌드 -> apps/web/dist-spa/
pnpm mobile:sync      # SPA 빌드 후 Capacitor 네이티브 프로젝트에 반영
pnpm test             # vitest (saju, web 두 프로젝트)
pnpm lint             # oxlint
pnpm typecheck        # tsc --noEmit
pnpm format           # oxfmt
```

엔진만 돌릴 때는 `pnpm --filter web exec vitest run --project saju` 를 쓴다.

## 훅 (`.claude/hooks/`, 설정은 `.claude/settings.json`)

| 훅                      | 시점                         | 하는 일                                                      |
| ----------------------- | ---------------------------- | ------------------------------------------------------------ |
| `protect-env.sh`        | PreToolUse (Read/Edit/Write) | `.env*` 와 `.claude/settings.local.json` 접근 차단           |
| `protect-routetree.sh`  | PreToolUse (Edit/Write)      | `routeTree.gen.ts` 편집 차단. 자동 생성 파일이다             |
| `pre-commit-check.sh`   | PreToolUse (Bash)            | `git commit` 직전 타입체크, lint, 테스트. 실패하면 커밋 차단 |
| `format-file.sh`        | PostToolUse (Edit/Write)     | oxfmt 자동 포맷 + oxlint --fix                               |
| `saju-engine-purity.sh` | PostToolUse (Edit/Write)     | 엔진의 환경 의존 호출 차단                                   |
| `md-style-guard.sh`     | PostToolUse (Edit/Write)     | 문서 스타일 규칙 검사                                        |

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
  예외는 KASI 절기·음력 데이터 모듈뿐이다.
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

- 절기 시각은 KASI 데이터를 쓴다. 근사 공식으로 계산하면 경계 케이스가 틀린다.
- 음력에서 양력으로의 변환도 KASI 공식 데이터를 쓴다. 자체 음력 산출 알고리즘을 구현하지 않는다.
- 일주 앵커 값을 하드코딩하지 않는다.
  `verified: true` 검증 케이스 3개 이상으로 확정한다.
- 계산 함수는 vitest 테스트와 함께 작성한다. 경계 케이스 테스트는 선택이 아니다.
  필수 목록은 [docs/05-saju-domain-rules.md](docs/05-saju-domain-rules.md) 10장에 있다.

### 모바일

- `apps/mobile` 에 비즈니스 로직을 넣지 않는다. Capacitor 셸일 뿐이다.
- 앱에서 서버를 호출할 때 상대 경로를 쓰지 않는다.
  앱은 `capacitor://localhost` 오리진에서 뜨므로 절대 URL 이어야 한다.

### 비밀값

- Supabase 키, Gemini API 키, GitHub PAT 은 환경변수로만 주입한다. 커밋하지 않는다.
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
어떤 값을 적용했는지는 결과 화면에 항상 표시한다.

| 지점               | 옵션                      | 기본값         |
| ------------------ | ------------------------- | -------------- |
| 진태양시 보정      | `trueSolarTime`           | 끔             |
| 야자시 정책        | `ziPolicy`                | 제품 결정 사항 |
| 지원 세력 범위     | `supportIncludesResource` | true           |
| 대운수 나머지 처리 | 설정 상수                 | 문서 참조      |

## 문서와 마크다운 규칙

문서(`*.md`)와 Claude 의 마크다운 답변 모두에 적용한다.
canonical 목록은 [docs/00-documentation-guide.md](docs/00-documentation-guide.md) 5장이다.

기계적으로 검사되는 것은 `md-style-guard.sh` 훅이 저장할 때 잡는다.
em dash, 이모지, 번호 목록 안의 굵은 강조 셋이다.
규칙을 설명하느라 그 문자를 써야 하는 줄에는 `<!-- md-allow -->` 를 붙인다.

굵은 강조(`**`)는 어겨서는 안 되는 규칙에만 쓴다. 한 문서에 두세 번을 넘기면 남용이다.

정규식으로 검사할 수 없는 문장 규칙은 `writing-style` 스킬에 있다.
근거 없는 형용사, 메타 서술, 문장 구조 반복, 번역투, 말미 요약 같은 것들이다.
문서를 새로 쓰거나 크게 고칠 때, 긴 설명형 답변을 쓸 때 그 스킬을 부른다.

## 스킬 (`.claude/skills/`)

- `writing-style`: 문장 규칙과 고치기 전후 예시. 훅이 잡지 못하는 항목을 담당한다.
- `commit`: 커밋 메시지 규칙과 scope 목록. 메시지만 만들고 커밋은 하지 않는다.
- `pr`: PR 본문을 쓰고 github MCP 로 올린다. 병합은 하지 않는다.

PR 본문은 고정 양식이 아니다. 요약만 항상 쓰고 나머지는 diff 를 보고 판단해 더한다.
`.github/pull_request_template.md` 를 두지 않는다.

스킬은 `.claude/skills/` 에만 둔다. Claude Code 가 읽는 경로가 여기뿐이다.
`.agents/skills/` 는 다른 도구의 규약이고 로드되지 않는다.

## MCP 서버 (`.mcp.json`)

쓰이는 시점에 맞춰 단계적으로 붙인다. 안 쓰는 도구를 설정에 쌓지 않는다.

| 서버         | 쓰는 곳                                            | 상태                |
| ------------ | -------------------------------------------------- | ------------------- |
| `context7`   | TanStack Start, Capacitor, Supabase 최신 문서 조회 | 붙임                |
| `playwright` | 브라우저 검증. SPA 번들 부팅 확인 등               | 붙임                |
| `github`     | PR 생성, 리뷰, 병합. 저장소와 브랜치 조회          | 붙임. PAT 필요      |
| `supabase`   | 스키마와 RLS 작업                                  | 서버 작업 시작할 때 |
| `vercel`     | 배포와 빌드 로그                                   | 배포할 때           |

TanStack Start 는 버전이 빠르게 움직인다. API 를 추측하지 말고 `context7` 로 확인한다.
설치된 `.d.ts` 를 뒤지는 것은 문서를 못 찾을 때의 차선이다.

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

[affaan-m/ECC](https://github.com/affaan-m/ECC) 는 에이전트 66개, 커맨드 90여 개, 스킬 65여 개를 담은
Claude Code 확장 모음이다. 필요한 것만 골라 우리 규약에 맞게 고쳐 가져온다.
플러그인으로 통째 설치하지 않는다.

통째 설치하지 않는 이유는 셋이다.

- 에이전트 66개 중 우리와 무관한 것이 대부분이다. cpp, dart, flutter, go, java, rust, swift, vue 등.
  에이전트와 스킬은 설명문이 매칭용으로 로드되므로 안 쓰는 것도 비용이다.
- 규약이 다르다. `typescript-reviewer` 는 eslint 를, `tdd-guide` 는 `npm test` 와 커버리지 80퍼센트를
  전제한다. 우리는 oxlint 와 pnpm 이고 커버리지 목표를 정한 적이 없다.
- ECC 자체 `hooks.json` 과 `rules/` 가 우리 훅 6개, CLAUDE.md 와 충돌할 수 있다.

가져올 시점은 대상이 생길 때다. 프로젝트가 완성된 뒤가 아니다.
리뷰어 계열은 늦게 붙일수록 지적이 한꺼번에 쏟아져 손해다.

| 우리 작업             | 가져올 것                                                       | 상태                                                      |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| 계산 엔진 구현        | `silent-failure-hunter`                                         | 엔진 시작할 때                                            |
| 계산 엔진 구현        | `tdd-guide`                                                     | 검토. 픽스처 선행이 이미 더 강해서 불필요할 수 있다       |
| API 와 화면           | `typescript-reviewer`, `react-reviewer`, `react-build-resolver` | 그 다음                                                   |
| Supabase 스키마와 RLS | `database-reviewer`                                             | 그 다음                                                   |
| PR                    | `code-review`, `security-scan`                                  | 내장 `/code-review`, `/security-review` 와 중복 확인 먼저 |
| 유지보수              | `refactor-clean`, `doc-updater`, `prune`                        | 한참 뒤                                                   |

기획과 설계 단계 도구(`planner`, `architect`, `plan-prd`)는 쓰지 않았다.
그 자리는 ADR 13편이 대신했고, 범용 도구가 낼 수 없는 이 프로젝트만의 결정을 근거와 함께 남겼다.

`silent-failure-hunter` 를 첫 대상으로 잡은 이유는 이 앱의 최악의 실패가 예외가 아니라
조용히 틀린 간지를 돌려주는 것이기 때문이다.
입춘 경계에서 년주가 하나 밀려도 프로그램은 멀쩡히 돌고 화면에는 여덟 글자가 그대로 뜬다.
[ADR 0006](docs/adr/0006-manseryeok-and-time-correction.md) 의 진태양시 -30분 폴백 명시 조건과
야자시 적용 방식 표기 조건이 정확히 이 유형이다.

이식할 때 그대로 복사하지 않는다. 원본의 네트워크, 파일, DB, 트랜잭션 항목은 계산 엔진에 해당이 없다.
대신 도메인 항목을 더한다. 판정 함수가 어느 분기에도 걸리지 않았을 때 기본값을 반환하는가,
검증 케이스가 없는 경계 조건을 조용히 통과시키는가 같은 것이다.

### react-doctor (보류)

React 진단 CLI 다. 한 번 붙였다가 뺐다. 화면 코드가 생기면 다시 판단한다.
지금 React 코드가 107줄뿐이라 얻을 것이 없고, 도입 비용이 그보다 크다.

tarball 을 받아 확인한 사실을 남긴다. 다시 조사하지 않도록.

- 텔레메트리가 기본으로 켜져 있다. `@sentry/node` 가 런타임 의존성이고
  `api.axiom.co` 가 dist 에 박혀 있다. `REACT_DOCTOR_NO_TELEMETRY=1` 로 끈다
- 런타임 의존성 21개가 범위 지정이라 `npx react-doctor@0.9.6` 으로는 트리가 고정되지 않는다.
  devDependency 로 넣어 lockfile 에 담아야 한다. `npx -y` 는 특히 피한다
- 우리와 도구 버전이 어긋난다. `typescript >=5.0.4 <6`, `oxlint >=1.76.0 <1.77.0` 을 끌어온다.
  우리는 7.0.2 와 1.77.0 이다. 빌드는 안 깨지지만 판정이 엇갈릴 수 있다
- 원본 스킬이 `https://www.react.doctor/prompts/` 에서 플레이북을 받아 그대로 따르고
  워킹트리를 고치라고 지시한다. 받지 않는다. 쓰게 되면 한 번 받아 커밋해 두고
  로컬 파일로 읽는다. 업스트림 갱신은 수동 diff 로 PR 리뷰를 거친다
- React Compiler 는 스스로 감지한다. `vite.config.ts` 의 `reactCompilerPreset` import 를 본다.
  감지되면 수동 메모이제이션을 지적하므로 우리 규약과 같은 방향이다
- 라이선스가 `SEE LICENSE IN LICENSE` 라 확인이 필요하다

도입한다면 순서는 devDependency 고정, 텔레메트리 차단, 토큰 없는 셸에서 실행, 플레이북 벤더링이다.

## ADR

큰 구조나 기술 결정은 코드보다 ADR 을 먼저 쓴다.

- 위치는 `docs/adr/`, 형식은 [docs/00-documentation-guide.md](docs/00-documentation-guide.md) 4장을 따른다.
- 결정을 바꿀 때는 기존 ADR 을 수정하지 않는다.
  새 ADR 을 쓰고 기존 것의 상태를 `대체됨`으로 바꾼다.
- 채택하지 않기로 한 것도 기록한다. 같은 논의가 반복되는 것을 막는 것이 ADR 의 값어치다.

현재 ADR 0001부터 0013까지 채택되어 있다. 목록은 [docs/adr/](docs/adr/) 에 있다.

## Git

- 브랜치: `feature/<요약>`, `fix/<요약>`, `chore/<요약>`
- `main` 에 직접 push 하지 않는다. PR 을 거친다.
  GitHub 의 브랜치 보호 규칙은 아직 걸려 있지 않다.
  규칙으로 강제할지 관행으로 둘지는 정하지 않았다.
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

- 야자시 정책 기본값
- MVP 화면 디자인
- 앱 푸시 알림 내용과 발송 시점
- 지원 연도 범위 (KASI 데이터 범위에 따라 결정)

## 아직 확인하지 못한 것

- Gemini Flash Lite 응답 시간이 Vercel 서버리스 실행시간 제한 안에 들어오는가.
  넘치면 [ADR 0011](docs/adr/0011-single-prompt-no-streaming.md) 을 대체해
  스트리밍이나 백그라운드 생성으로 간다.
- SPA 번들이 실제 웹뷰 안에서 부팅하는가.
  번들 자체가 자기완결적인 것은 확인했다([ADR 0003](docs/adr/0003-spa-bundle-for-app.md) 검증 결과).
  웹뷰 부팅은 Xcode 나 Android SDK 가 필요해 네이티브 프로젝트를 만들 때 확인한다.

## 아직 만들지 않은 것

- 사주 계산 (엔진에는 60갑자 기본 테이블만 있다)
- 검증 케이스 (`apps/web/src/lib/saju/fixtures/` 에 채우는 방법만 적혀 있다)
- Supabase 스키마와 RLS
- API 라우트와 화면
- AI 해석 레이어
- 네이티브 프로젝트 (`apps/mobile/ios`, `android`)

에이전트와 커스텀 커맨드도 아직 없다. 대상이 생길 때 만든다.
엔진 구현을 시작하면 `/Users/mychoi/f-lab/saju` 의 `saju-calc` 스킬과 `saju-master` 에이전트를
가져올지 그때 정한다. 검증할 코드가 없는 상태에서 도메인 검증 에이전트를 만들어봐야 할 일이 없다.
