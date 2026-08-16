---
name: tanstack-skills
description: TanStack 패키지가 npm 으로 함께 배포하는 공식 스킬을 @tanstack/intent 로 찾아 읽는다. 라우트, 로더, 검색 파라미터, 네비게이션, SSR, 서버 라우트, 코드 스플리팅, 타입 추론이 대상이다. 라우트를 새로 만들거나 로더를 붙이거나 라우터 타입이 안 맞을 때 사용한다.
---

# TanStack 공식 스킬

TanStack 이 `SKILL.md` 를 패키지 안에 실어 배포한다.
[agentskills.io](https://agentskills.io) 형식이고 `@tanstack/intent` 가 그것을 찾아 꺼낸다.

복사해 오지 않는다. 버전이 lockfile 에 고정되어 있어 이미 우리 저장소에 담긴 것과 같고,
복사본을 두면 업그레이드마다 두 벌이 갈린다.

## 읽는 법

```
pnpm exec intent list                                        무엇이 있는지
pnpm exec intent load @tanstack/router-core#router-core/navigation   본문
```

`pnpm dlx @tanstack/intent@latest` 를 쓰지 않는다. 그 형태가 매번 최신을 받아 와
의존성 트리가 고정되지 않는다([ADR 0017](../../../docs/adr/0017-external-agent-collections-selective-port.md)).
루트 devDependency 로 박아 두었으므로 `pnpm exec` 로 부른다.

보이는 것은 루트 `package.json` 의 `intent.skills` 가 정한다. 허용 목록이다.

| 패키지                        | 개수 | 무엇                                            |
| ----------------------------- | ---- | ----------------------------------------------- |
| `@tanstack/router-core`       | 10   | 라우트, 로더, 검색 파라미터, 네비게이션, SSR    |
| `@tanstack/start-client-core` | 7    | 서버 라우트, 실행 모델, 배포, 서버측 인증       |
| `@tanstack/react-start`       | 3    | React 바인딩. 나머지 둘은 RSC 와 Next.js 이주다 |

목록 밖에도 6개 출처 11개가 설치되어 있고 `list` 가 숨긴 채 개수만 알린다.
devtools 계열 여덟은 플러그인을 만들어 배포하는 쪽이라 소비자인 우리에게 해당이 없다.
`router-plugin` 과 `virtual-file-routes` 는 라우트 생성 설정이라 필요해지면 목록에 더한다.

## 이 저장소에서 다른 것

공식 스킬은 우리 규약을 모른다. 아래 넷은 스킬이 뭐라고 적혀 있든 우리 쪽이 이긴다.

- `routeTree.gen.ts` 를 편집하지 않는다. 자동 생성 파일이고 `protect-routetree.sh` 가 막는다
- 생년월일시를 검색 파라미터에 넣지 않는다. 개인정보이고 리퍼러와 서버 로그에 남는다
  ([docs/03](../../../docs/03-frontend-rules.md) 5.1). 지면 사이로 넘기는 것은
  `getRouter()` 가 만들어 라우터 컨텍스트에 실은 zustand 스토어다
- `createServerFn` 을 데이터 경로로 쓰지 않는다. 서버 호출은 명시적 API 라우트에 절대 URL 이다
  ([ADR 0004](../../../docs/adr/0004-api-routes-over-server-functions.md)).
  `router-core/auth-and-guards` 와 `start-core/auth-server-primitives` 가 그 API 를 전제로 쓴다
- React Compiler 가 켜져 있다. 예제의 `useMemo` 와 `useCallback` 을 따라 넣지 않는다

`defaultPreload: 'intent'` 와 `defaultPreloadStaleTime: 0` 은 `src/router.tsx` 에 이미 있다.
React Query 를 외부 캐시로 쓸 때의 공식 권장 조합이고 다시 넣을 것이 아니다.

## 못 미치는 것

- `intent install` 을 돌리지 않았다. 그 명령은 `AGENTS.md` 에 안내를 쓰는데
  이 저장소에 없는 파일이고 Claude Code 가 읽는 것은 `CLAUDE.md` 다.
  `--map` 은 31개를 전부 적어 99줄이 되고, 그중 대부분이 우리와 무관하다.
  안 쓰는 설명문이 매 세션 로드되는 것을 ADR 0017 이 통째 설치를 거부한 이유로 들었다
- 스킬이 패키지보다 뒤처진다. frontmatter 가 `1.166.2` 를 가리키는데
  설치된 `router-core` 는 `1.171.14` 다. 최신 API 는 여전히 `context7` 로 확인한다
- React Query 는 스킬을 배포하지 않는다. 2026-08-16 에 `5.101.4` 배포본을 받아 확인했다.
  쿼리 쪽은 `context7` 이 계속 담당한다
- 라우터와 쿼리를 잇는 `compositions/router-query` 로 가는 링크가 끊겨 있다.
  `react-router` 패키지 안에 있어야 하는데 `1.170.29` 배포본에도 없다
