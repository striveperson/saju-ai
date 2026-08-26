# ADR 0013. 계산 엔진의 순수성은 lint 로 강제한다

- 상태: 채택(Accepted)
- 날짜: 2026-08-05 (개정 2026-08-22)

## 배경

계산 엔진은 현재 시각과 실행 환경 타임존을 읽지 않는다.
검증 케이스가 언제 어디서 실행하든 같은 값을 내야 하고,
[ADR 0003](0003-spa-bundle-for-app.md) 의 오프라인 동작이 런타임 환경에 기대면 안 되기 때문이다.

엔진은 패키지가 아니라 `apps/web/src/lib/saju/` 폴더다([ADR 0001](0001-monorepo-pnpm-workspaces.md)).
`package.json` 의 빈 dependencies 가 대신 막아 주는 것이 없어 규칙을 따로 걸어야 한다.
막을 것은 둘이다. 외부 모듈 import 와 환경을 읽는 함수 호출이다.

## 결정

`apps/web/.oxlintrc.json` 의 `src/lib/saju/**` override 에 세 규칙을 건다.

`no-restricted-imports` 가 import 경계를 본다.
React, 날짜 라이브러리, Supabase 클라이언트, UI 코드가 전부 대상이고
허용 예외는 상대 경로로 들어오는 `data/` 의 절기와 음력 데이터 모듈뿐이다.

나머지 둘이 환경 의존 호출을 본다.

| 규칙                       | 막는 것                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| `no-restricted-globals`    | `Date`, `Intl`, `performance`, `crypto`, `navigator`, `globalThis`             |
| `no-restricted-properties` | `Math.random`, `process.env`, `getTimezoneOffset`, `toLocale*`, `localeCompare` |

목록에 이유가 붙은 것이 둘이다.
`globalThis` 는 값이 필요해서가 아니라 `globalThis.Date.now()` 로 우회하는 길을 막으려고 넣는다.
oxlint 의 `checkGlobalObject` 가 기본으로 꺼져 있어 전역 객체를 거친 접근은 탐지되지 않는다.
`Math` 는 반대로 글로벌을 막을 수 없다. `Math.floor` 가 스무 곳 넘게 쓰이므로
`no-restricted-properties` 가 `Math.random` 만 골라낸다.

각 항목의 `message` 는 이 ADR 을 가리킨다. 규칙에 걸린 사람이 근거를 바로 찾게 하기 위해서다.

두 규칙을 끄는 곳은 [data/solar-terms.test.ts](../../apps/web/src/lib/saju/data/solar-terms.test.ts) 하나다.
KASI 정답지와 대조하면서 `Date.parse` 와 `new Date(ms)` 를 쓴다.
나머지 테스트 파일은 `no-restricted-imports` 만 예외이고 환경 의존 호출은 소스와 같은 규칙을 받는다.
테스트가 `new Date()` 로 만든 값을 엔진에 넘기면 실행 시점에 따라 결과가 달라지는데,
그것이 검증 케이스에서 일어나면 실패가 무작위로 나타난다.

정당한 예외는 `oxlint-disable-next-line` 에 사유를 적어 통과시킨다.

lint 로 잡히지 않는 우회는 테스트가 값으로 잡는다.
`pnpm --filter web verify:tz` 가 엔진 테스트를 `TZ=UTC` 로 한 번 더 돌린다.
픽스처가 같으므로 두 타임존의 결과가 갈리면 엔진이 실행 환경을 읽은 것이다.
자동으로 부르는 자리는 없다. 커밋 전에 직접 돌린다.

같은 검사를 하는 편집 훅은 두지 않는다.

## 이유

전역을 통째로 막을 수 있는 것은 엔진 소스가 그것들을 쓰지 않기 때문이다.
[calendar.ts](../../apps/web/src/lib/saju/calendar.ts) 가 Fliegel 과 Van Flandern 의 정수 연산으로
율리우스 적일을 다뤄서 `Date` 가 필요한 자리 자체가 없고,
`Intl` 과 `performance` 와 `crypto` 와 `navigator` 는 한 번도 나오지 않는다.
막아 두면 나중에 들어오는 것까지 걸린다.

lint 는 편집 경로를 가리지 않는다. `pnpm lint` 가 도는 자리에서 전부 걸리므로
편집기에서 고친 것도, 손으로 돌리는 검사도, 나중에 붙일 CI 도 같은 규칙을 본다.

정규식이 아니라 AST 를 본다.
`index.ts` 머리 주석처럼 규칙 자체를 설명하느라 금지어를 적은 자리가 오탐으로 잡히지 않는다.

이 설정을 지금 엔진에 돌리면 걸리는 것이 없다.
`daeun.ts` 에 `Date.now()` 와 `new Date()` 와 `Math.random()` 을 한 줄로 넣으면 세 자리가 다 잡히고,
`globalThis.Date.now()` 와 `performance.now()` 와 `crypto.randomUUID()` 도 같이 잡힌다.

## 트레이드오프 / 대안

저장하는 즉시 오는 피드백을 포기한다.
PostToolUse 훅이면 편집 직후 그 자리에서 지적이 오지만, 매처가 `Edit|Write` 라
그 두 툴로 들어온 편집만 본다. bash 로 고친 것과 사람이 편집기에서 고친 것,
다른 클론에서 온 커밋은 지나간다. 검사 시점이 이른 대신 보는 범위가 좁다.
lint 는 반대쪽을 골랐다.

`Date` 전체 금지는 정말 필요한 자리가 생기면 막는다.
그때는 `oxlint-disable-next-line` 에 사유를 적고, 그런 자리가 반복되면 이 ADR 을 대체한다.

lint 는 구문 검사라 계산된 접근을 통과시킨다.
`const k = "getTimezoneOffset"; d[k]()` 나 문자열을 조합해 만든 이름은 어느 규칙에도 걸리지 않는다.
구문으로 닫을 수 있는 구멍이 아니라서 `verify:tz` 가 그 자리를 값으로 본다.

- 대안 1: 폴더 컨벤션과 코드 리뷰에만 의존한다. 비용이 0 이지만 사람이 놓치면 그대로 통과한다.
  엔진의 순수성은 결과의 신뢰도와 직결되므로 사람에게 맡기지 않는다.
- 대안 2: `saju-engine-validator` 에이전트가 본다.
  LLM 은 같은 입력에 같은 답을 보장하지 않고, 부를 때만 돌고, 확정한 변경 범위 안만 본다.
  grep 으로 확정되는 불변식을 확률적 판정에 넘기지 않는다.
- 대안 3: `no-restricted-syntax` 로 인자 없는 `new Date()` 만 정밀하게 막는다.
  oxlint 1.77 에 그 규칙이 없어 설정에 넣으면 파싱 단계에서 실패한다.
- 대안 4: 엔진을 `packages/saju-core` 로 승격해 빈 dependencies 로 막는다.
  소비자가 웹 하나뿐인 지금은 설정 비용이 이득보다 크다([ADR 0001](0001-monorepo-pnpm-workspaces.md)).
  앱이 엔진을 직접 쓰게 되면 그때 옮기고 이 ADR 을 대체한다.

## 영향

- 규칙은 `apps/web/.oxlintrc.json` 의 override 둘에 있다.
  `src/lib/saju/**` 가 세 규칙을 걸고 `data/solar-terms.test.ts` 가 둘을 끈다.
- `verify:tz` 는 `apps/web/package.json` 에 있다. 부르는 것은 사람이다.
- 규칙을 고치면 [엔진 README](../../apps/web/src/lib/saju/README.md) 의 표와
  [docs/03](../03-frontend-rules.md) 의 강제 수단 표, `saju-engine-validator` 의
  검사하지 않을 것 표를 같이 고친다. 셋 다 담당을 적어 두고 있다.
- KASI 데이터 모듈은 import 예외 목록에 있으므로 그 모듈 자체도 순수해야 한다.
  데이터를 값으로 품는 형태여야 하고 네트워크를 타면 안 된다.
