# CLAUDE.md - apps/web

> TanStack Start 앱. SSR 웹과 앱용 SPA 번들을 같은 소스에서 뽑는다.
> 루트 [CLAUDE.md](../../CLAUDE.md) 의 규칙을 상속하고 여기에 웹 패키지 규칙을 더한다.

## 디렉토리

```
apps/web/
├── src/
│   ├── routes/           파일 기반 라우트. __root.tsx 가 HTML 셸
│   ├── lib/saju/         계산 엔진 (외부 의존 0). README 를 먼저 읽는다
│   │   └── fixtures/     검증 케이스
│   ├── test/             vitest 셋업과 하네스 테스트
│   ├── router.tsx        라우터와 QueryClient 구성
│   ├── styles.css        Tailwind 진입점
│   └── routeTree.gen.ts  자동 생성. 직접 수정하지 않는다
├── scripts/build-spa.mjs SPA 산출물을 Capacitor 용으로 변환
├── vite.config.ts        빌드 타깃 두 개를 환경변수로 분기
└── vitest.config.ts      saju(node) 와 web(jsdom) 두 프로젝트
```

경로 별칭은 `@saju`, `@saju/*`, `@components/*`, `@features/*` 다.

## 명령어

```bash
pnpm dev              # :3000. 점유되어 있으면 다음 포트로 뜬다
pnpm build            # SSR 빌드. .output/ 생성
pnpm build:spa        # 앱용 SPA 빌드. dist-spa/ 생성
pnpm test             # vitest run (두 프로젝트)
pnpm lint             # oxlint
pnpm typecheck        # tsc --noEmit
pnpm --filter web generate-routes   # routeTree.gen.ts 재생성
```

엔진만 빠르게 돌릴 때는 `pnpm --filter web exec vitest run --project saju` 를 쓴다.
node 환경이라 jsdom 을 띄우지 않는다.

## 계산 엔진

`src/lib/saju/` 는 별도 규칙이 있다. 그 안에서 작업하기 전에
[src/lib/saju/README.md](src/lib/saju/README.md) 를 읽는다.

핵심만 옮기면 이렇다.

- 외부 의존 0. React, 날짜 라이브러리, Supabase 클라이언트, UI 코드를 import 하지 않는다.
  허용 예외는 KASI 절기·음력 데이터 모듈뿐이다.
- 현재 시각과 실행 환경 타임존을 읽지 않는다. 시각은 인자로 받는다.
- 규칙의 SSOT 는 [docs/05-saju-domain-rules.md](../../docs/05-saju-domain-rules.md) 다.
  코드와 어긋나면 코드가 틀린 것으로 간주한다.

이 제약은 lint 와 훅 세 겹으로 강제된다.

| 수단                              | 담당           | 위치                            |
| --------------------------------- | -------------- | ------------------------------- |
| oxlint `no-restricted-imports`    | import 경계    | `.oxlintrc.json` 의 `overrides` |
| oxlint `no-unnecessary-condition` | 도달 불가 분기 | `.oxlintrc.json` 의 `rules`     |
| `saju-engine-purity.sh`           | 환경 의존 호출 | `.claude/hooks/`                |

둘째는 타입 정보가 있어야 판정할 수 있어 tsgolint 가 돌린다.
판정 함수에 절대 걸리지 않는 분기나 항상 참인 조건이 있으면 잡는다.
예외가 터지는 대신 틀린 간지가 조용히 나가는 실패를 겨냥한 것이다.

테스트 파일은 `no-restricted-imports` 예외라 vitest 를 import 할 수 있다.
소스 파일은 예외가 아니다.

## 빌드 타깃 두 개

`vite.config.ts` 가 `SAJU_BUILD_TARGET` 으로 분기한다([ADR 0003](../../docs/adr/0003-spa-bundle-for-app.md)).

| 타깃 | 명령             | 산출물      | 쓰는 곳            |
| ---- | ---------------- | ----------- | ------------------ |
| SSR  | `pnpm build`     | `.output/`  | Vercel             |
| SPA  | `pnpm build:spa` | `dist-spa/` | Capacitor `webDir` |

앱은 `capacitor://localhost` 오리진에서 뜨므로 상대 경로 서버 호출이 나가지 않는다.
서버 호출은 명시적 API 라우트에 절대 URL 로 한다([ADR 0004](../../docs/adr/0004-api-routes-over-server-functions.md)).
`createServerFn` 을 데이터 경로로 쓰지 않는다.

## 라우팅

파일 기반이다. 라우트는 `src/routes/` 아래 파일로 추가한다.

`routeTree.gen.ts` 는 자동 생성 파일이라 직접 수정하지 않는다.
dev 서버나 `generate-routes` 가 재생성한다. 훅이 편집을 차단한다.

## 스타일

Tailwind 4 를 쓴다. 설정은 `src/styles.css` 의 `@theme` 블록에 둔다.
별도 `tailwind.config` 파일을 만들지 않는다.

## React

React Compiler 가 켜져 있다.
`useMemo`, `useCallback`, `React.memo` 를 수동으로 넣지 않는다. 컴파일러가 담당한다.

## 커밋 전

`pre-commit-check.sh` 훅이 `git commit` 직전에 타입체크, lint, 테스트를 돌리고
하나라도 실패하면 커밋을 차단한다. 미리 확인하려면 세 개를 직접 돌린다.
