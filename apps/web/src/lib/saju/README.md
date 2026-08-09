# 사주 계산 엔진

> 생년월일시에서 사주팔자를 뽑고 오행, 십신, 신강약, 용신, 신살, 대운을 판정한다.
> 전부 순수 함수이며 외부 의존이 없다.

## 규칙의 출처

계산 규칙의 단일 진실 공급원은 [`docs/05-saju-domain-rules.md`](../../../../../docs/05-saju-domain-rules.md) 다.
코드와 그 문서가 어긋나면 코드가 틀린 것으로 간주한다.
문서를 고쳐야 한다면 근거와 함께 문서를 먼저 고치고, 그 다음 코드를 고친다.

도메인 규칙이 애매하면 추측해서 구현하지 않는다. 근거를 찾거나 사용자에게 확인한다.

## 이 디렉토리의 제약

외부 의존이 0 이다. React, 날짜 라이브러리, Supabase 클라이언트, UI 코드를 import 하지 않는다.
허용 예외는 `data/` 의 절기와 음력 데이터 모듈뿐이며, 그 모듈도 값을 품고 있는 형태여야 하고
네트워크를 타면 안 된다.

`data/solar-terms.ts` 는 자동 생성 파일이라 직접 고치지 않는다.
`apps/web/scripts/build-terms-table.mjs` 가 만든다. 근거는
[ADR 0014](../../../../../docs/adr/0014-kasi-data-bundled-not-fetched.md).

현재 시각과 실행 환경 타임존을 읽지 않는다.
`Date.now()`, 인자 없는 `new Date()`, `Math.random()`, `getTimezoneOffset()`,
`toLocale*`, `Intl.DateTimeFormat`, `process.env` 를 쓰지 않는다.
시각은 항상 인자로 받는다.

이 제약은 두 겹으로 강제된다.

| 수단 | 담당           | 위치                                     |
| ---- | -------------- | ---------------------------------------- |
| lint | import 경계    | `apps/web/.oxlintrc.json` 의 `overrides` |
| 훅   | 환경 의존 호출 | `.claude/hooks/saju-engine-purity.sh`    |

정당한 예외가 있으면 같은 줄에 `hook-allow` 와 사유를 주석으로 남긴다.

근거는 [ADR 0005](../../../../../docs/adr/0005-rule-engine-plus-llm-interpretation.md) 와
[ADR 0013](../../../../../docs/adr/0013-saju-engine-purity-enforcement.md) 이다.

## 왜 순수해야 하는가

두 가지 이유가 있다.

검증 케이스가 언제 어디서 실행하든 같은 결과를 내야 한다.
엔진이 현재 시각이나 실행 환경 타임존을 읽으면 테스트가 재현되지 않는다.

앱이 네트워크 없이 계산까지 끝내야 한다([ADR 0003](../../../../../docs/adr/0003-spa-bundle-for-app.md)).
이 오프라인 동작이 App Store 심사 지침 4.2 에 대한 방어 논리이기도 하다.

## 테스트

`vitest.config.ts` 의 `saju` 프로젝트가 이 디렉토리를 node 환경에서 돌린다.
DOM 이 필요 없으므로 jsdom 을 띄우지 않는다.

```bash
pnpm --filter web exec vitest run --project saju
```

테스트 파일은 `no-restricted-imports` 예외라 vitest 를 import 할 수 있다.
소스 파일은 예외가 아니다.

경계 케이스 테스트는 선택이 아니다.
필수 목록은 [`docs/05-saju-domain-rules.md`](../../../../../docs/05-saju-domain-rules.md) 10장에 있다.

## 파일

| 파일 | 하는 일 |
| ---- | ------- |
| `index.ts` | 천간, 지지, 오행, 음양 기본 테이블 |
| `calendar.ts` | 율리우스 적일과 벽시계 왕복. 도메인 규칙이 없는 바닥이다 |
| `data/solar-terms.ts` | 절기 1900~2100. 자동 생성 |
| `data/korea-time.ts` | 표준시 전환 이력. 손으로 옮긴 표 |
| `time.ts` | 시간 보정 파이프라인 |
| `pillars.ts` | 년주, 월주, 일주, 시주 |
| `tables.ts` | 지장간, 오행 상생상극, 십성 5분류 |
| `strength.ts` | 신강약과 억부용신 |
| `fixtures/` | 검증 케이스 |

`data/` 두 파일의 성격이 다르다.
`solar-terms.ts` 는 자동 생성이라 직접 고치지 않고, `korea-time.ts` 는 손으로 고치는 표다.
고쳤으면 `node apps/web/scripts/dump-tzdb-seoul.mjs --check` 로 정답지와 대조한다.

## 아직 없는 것

균시차 보정, 대운과 세운, 신살, 음력 입력이다.
십신은 5분류(비겁, 인성, 식상, 재성, 관성)까지만 있고 음양으로 가르는 10종은 없다.

`fixtures/` 에는 공인 만세력 대조를 거친 검증 케이스가 들어간다.
일주 앵커 값은 문서에 하드코딩하지 않고 `verified: true` 케이스 3개 이상으로 확정한다.
