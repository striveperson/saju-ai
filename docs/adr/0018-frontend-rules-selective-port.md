# ADR 0018. 프론트엔드 규칙은 멘토링 정리본을 저장소 실물에 맞춰 이식한다

- 상태: 채택(Accepted)
- 날짜: 2026-08-15

## 배경

"React 프론트엔드 개발 규칙" 마크다운이 있다.
17장 분량이고 스택이 TanStack Start, TanStack Router, TanStack Query, React 19, TypeScript 로
이 저장소와 같다. 이것을 저장소의 화면 쪽 규칙으로 삼으려 했다.

지금까지 화면 규칙은 `apps/web/CLAUDE.md` 의 라우팅, 스타일, React 세 절뿐이었다.
`saju-screen-validator` 에이전트는 근거 문서가 없다고 적어 두고
루트 CLAUDE.md 와 `docs/mockups/` 와 엔진 타입 셋을 대신 근거로 쓰고 있었다.

정리본은 저장소 밖에서 쓰였다. 열어 보니 여기 없는 도구를 전제하거나
이미 내린 결정과 반대로 가는 대목이 여럿이었다.

## 결정

통째로 넣지 않는다. 저장소 실물과 어긋나는 절을 덜어내고 [docs/03](../03-frontend-rules.md) 으로 옮긴다.
적용 방법과 체크리스트는 `frontend` 스킬이 맡는다.
canonical 규칙은 문서에, 고치기 전후는 스킬에 두는 것은 `writing-style` 이 docs/00 5장에 대해
하는 것과 같은 분업이다.

뺀 것은 다섯이다.

| 뺀 것 | 이유 |
| --- | --- |
| server function (`createServerFn`) 계층 | [ADR 0004](0004-api-routes-over-server-functions.md) 가 데이터 경로 사용을 금지한다. API 라우트로 바꿔 적었다 |
| 모노레포와 Turborepo 절 전체 | [ADR 0001](0001-monorepo-pnpm-workspaces.md) 이 `packages/` 를 금지한다. 공유 패키지가 없으면 `peerDependencies` 도 npm 배포도 해당이 없다 |
| eslint, `eslint-plugin-import`, prettier, SWC | 여기에 eslint 설정 파일이 없다. oxlint, tsgolint, oxfmt 다 |
| 메모이제이션을 측정 후 붙이라는 절 | React Compiler 가 켜져 있고 oxlint `react/react-compiler` 가 수동 메모를 error 로 잡는다. 방향이 반대다 |
| MUST / SHOULD / MAY 강제 수준 표기 | 저장소의 다른 문서에 없는 체계다. 어겨서는 안 되는 것을 1장에 모으는 것으로 대신했다 |

바꾼 것은 둘이다.

지면 디렉터리를 `pages/` 가 아니라 `features/` 로 한다.
`apps/web/tsconfig.json` 에 `@features/*` 별칭이 이미 있고
`saju-screen-validator` 도 `src/features` 를 범위로 잡고 있었다.
`docs/02` 4장 트리만 `components/` 와 `server/` 로 적혀 있어 그쪽을 맞췄다.

경로 별칭은 정리본이 제안한 여덟 개가 아니라 tsconfig 에 있는 넷만 적는다.
`@types/*` 는 넣지 않는다. npm 의 DefinitelyTyped 네임스페이스와 겹쳐 `@types/node` 해석을 흔든다.

## 이유

지금 화면 코드가 없다는 것이 이 작업을 지금 하는 이유다.
`apps/web/src` 에는 `routes/` 둘과 `lib/saju/` 뿐이고 컴포넌트 파일이 사실상 없다.
규칙을 먼저 세우면 고칠 기존 코드가 없고, 나중에 세우면 개편이 된다.

덜어내지 않고 그대로 넣는 쪽이 손은 덜 간다.
그러나 문서가 SSOT 라서 다음 작업이 거기 적힌 값을 근거로 코드를 고친다.
`createServerFn` 을 쓰라고 적힌 문서를 두면 언젠가 누군가 그대로 쓰고,
그 코드는 Capacitor 번들에서 서버로 나가지 않는다.
[docs/06](../06-code-working-rules.md) 1장이 수치와 경계를 추론으로 적지 말라고 하는 것과 같은 이유다.

정리본의 default export 규칙은 그대로 살렸다.
저장소에 `export default` 가 0건이지만 그 51건은 전부 `lib/saju` 의 순수 함수라
컴포넌트 컨벤션은 아직 비어 있었다. 기존 코드를 하나도 고치지 않고 채택된다.
유틸 모듈은 트리 셰이킹 때문에 named export 를 유지하므로 규칙이 갈린다.

## 트레이드오프 / 대안

원본을 그대로 두고 "이 저장소에서는 다르다" 는 주석만 다는 방법도 있었다.
업스트림 정리본이 갱신될 때 diff 를 뜨기 쉽다는 것이 그쪽의 장점이다.
버린 이유는 읽는 쪽이 매번 두 겹을 대조해야 하고,
주석을 못 보고 본문만 읽는 경우가 실제로 생기기 때문이다.

고쳐 넣는 쪽은 원본과 대조가 안 된다.
멘토링 정리본이 갱신되면 무엇이 달라졌는지 손으로 확인해야 한다.
이 표가 그때 쓰인다.

문서를 쪼개지 않고 하나로 둔 것도 선택이다.
docs/00 5장이 스크롤 다섯 번을 넘으면 분리하라고 하지만
1.1 이 참조 관계를 우선한다고 적고 있다.
컴포넌트 선언, 상태 위치, 렌더링, 경계 배치는 서로 자주 참조한다.
`key` 를 인덱스로 쓴 것이 리스트 안 입력 상태를 망가뜨리는 식이라 장 사이 대조가 잦다.
쪼개면 그 대조가 grep 으로 밀린다.

## 영향

`docs/02` 4장 트리에 `features/` 가 들어가고, 루트 CLAUDE.md 와 `docs/00` 1장의
문서 목록에 03 이 추가된다.

`apps/web/CLAUDE.md` 에는 03 을 가리키는 링크를 더하고 기존 스타일, React 절은 그대로 둔다.
그 파일은 세션마다 읽히고 03 은 아니다. Tailwind 설정 위치와 수동 메모이제이션 금지는
어겼을 때 되돌리는 비용이 커서 상시 로드되는 자리에 남길 값어치가 있다.
나머지를 옮기지 않는 것은 같은 규칙이 두 곳에서 갈라지는 것을 막기 위해서다.

`saju-screen-validator` 의 근거가 셋에서 넷으로 늘어난다.
"화면에는 아직 그런 문서가 없다" 는 문장이 더 이상 참이 아니다.

zod 는 아직 `apps/web` 에 없다. 03 의 런타임 검증 규칙은 적용할 대상이 없는 상태로 들어간다.
설치 시점은 정하지 않았다. 검증이 필요한 첫 화면 작업에서 정한다.

라우트 단위 코드 스플리팅도 정하지 않았다.
`tsr.config.json` 이 지금 `{ "target": "react" }` 뿐이라 자동 분할과
`createLazyFileRoute` 중 어느 쪽인지는 실제 라우트가 생길 때 판단한다.

ADR 0017 이 보류한 `react-reviewer` 와 `typescript-reviewer` 는 이 결정으로 우선순위가 내려간다.
03 과 `frontend` 스킬과 `saju-screen-validator` 가 그 자리를 채운다.
화면 코드가 쌓인 뒤 남는 구멍이 보이면 다시 판단한다.
