# CLAUDE.md - apps/web

> TanStack Start 앱. SSR 웹과 앱용 SPA 번들을 같은 소스에서 뽑는다.
> 루트 [CLAUDE.md](../../CLAUDE.md) 의 규칙을 상속하고 여기에 웹 패키지 규칙을 더한다.

## 디렉토리

`src/routes/` 가 파일 기반 라우트, `src/routes/api/` 가 서버 라우트,
`src/features/` 가 지면 단위 화면, `src/components/` 가 지면 공통 컴포넌트,
`src/shared/` 가 지면 사이로 넘기는 값의 타입과 스토어, `src/lib/saju/` 가 계산 엔진,
`scripts/` 가 SPA 변환과 절기 계산과 tz 정답지 생성이다.

경로 별칭은 `tsconfig.json` 의 `paths` 가 단일 소스이고 vite 와 vitest 가 `tsconfigPaths` 로 읽는다.

시크릿은 `src/routes/api/` 안에서만 읽는다. `VITE_` 접두사를 붙이면 클라이언트 번들에 실린다.

## 명령어

`package.json` 의 scripts 를 쓴다.

엔진만 빠르게 돌릴 때는 `pnpm --filter web exec vitest run --project saju` 를 쓴다.
node 환경이라 jsdom 을 띄우지 않는다.

`verify:tz` 는 엔진 테스트를 `TZ=UTC` 로 다시 돌린다.

## 계산 엔진

`src/lib/saju/` 는 별도 규칙이 있다. 외부 의존 0 과 실행 환경을 읽지 않는 것 둘이고
[docs/05-saju-domain-rules.md](../../docs/05-saju-domain-rules.md) 가 규칙의 SSOT 다.
그 안에서 작업하기 전에 [src/lib/saju/README.md](src/lib/saju/README.md) 를 읽는다.

앞의 둘은 `.oxlintrc.json` 의 `overrides` 가 막는다. 규칙 목록은 README 의 표에 있다.

거기에 `no-unnecessary-condition` 이 하나 더 걸린다.
타입 정보가 있어야 판정할 수 있어 tsgolint 가 돌리고, 판정 함수에 절대 걸리지 않는 분기나
항상 참인 조건이 있으면 잡는다. 예외가 터지는 대신 틀린 간지가 조용히 나가는 실패를 겨냥한 것이다.

## 빌드 타깃 두 개

`vite.config.ts` 가 `SAJU_BUILD_TARGET` 으로 분기한다([ADR 0003](../../docs/adr/0003-spa-bundle-for-app.md)).

| 타깃 | 명령             | 산출물      | 쓰는 곳            |
| ---- | ---------------- | ----------- | ------------------ |
| SSR  | `pnpm build`     | `.output/`  | Vercel             |
| SPA  | `pnpm build:spa` | `dist-spa/` | Capacitor `webDir` |

앱은 `capacitor://localhost` 오리진에서 뜨므로 상대 경로 서버 호출이 나가지 않는다.
서버 호출은 명시적 API 라우트에 절대 URL 로 한다([ADR 0004](../../docs/adr/0004-api-routes-over-server-functions.md)).
`createServerFn` 을 데이터 경로로 쓰지 않는다.

## 화면 코드

규칙은 [docs/03-frontend-rules.md](../../docs/03-frontend-rules.md) 에 있다.
지면을 가르는 기준, 경로 별칭 목록, 컴포넌트 선언, 상태와 경계 배치, 스타일이 거기 있다.

라우팅은 파일 기반이다. 라우트는 `src/routes/` 아래 파일로 추가하고
`routeTree.gen.ts` 는 dev 서버나 `generate-routes` 가 재생성한다. 훅이 그 파일의 편집을 차단한다.

## 커밋 전

자동으로 도는 검사가 없다. 커밋 전에 직접 돌린다.

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web verify:data
pnpm --filter web verify:tz
```

데이터 대조는 `verify:data` 다. 번들된 음력표가 원본 KASI 표에서 다시 재현되는지,
초하루가 계산한 합삭과 맞는지 본다. 순수 node 라 python 이나 네트워크를 타지 않는다.
