# ADR 0001. pnpm workspaces 모노레포, 공유 패키지는 두지 않는다

- 상태: 채택(Accepted)
- 날짜: 2026-08-05

## 배경

saju-ai 는 웹과 모바일 앱 두 개의 배포 단위를 갖는다([ADR 0002](0002-tanstack-start-capacitor-shell.md)).
저장소를 어떻게 나누고 무엇으로 묶을지 정해야 한다.

처음에는 사주 계산 엔진을 `packages/saju-core` 로 빼서 웹 서버, 웹 클라이언트, 모바일 앱이
공유하는 그림을 검토했다. 그러나 모바일이 웹뷰 셸로 결정되면서 엔진의 실질 소비자는 웹 하나가 되었다.

## 결정

1. 하나의 저장소에 `apps/web` 과 `apps/mobile` 두 배포 단위를 두고 pnpm workspaces 로 묶는다.
2. `packages/` 공유 패키지를 만들지 않는다.
3. Turborepo 를 도입하지 않는다.
4. 사주 계산 엔진은 `apps/web/src/lib/saju/` 폴더에 둔다.

```
saju-ai/
├── docs/
├── apps/
│   ├── web/                TanStack Start (사실상 앱 전체)
│   │   └── src/lib/saju/   계산 엔진 (외부 의존 0)
│   └── mobile/             Capacitor 셸
│       ├── ios/
│       └── android/
├── package.json            루트 스크립트
└── pnpm-workspace.yaml
```

## 이유

- 워크스페이스가 필요한 진짜 이유는 코드 공유가 아니라 의존성 트리 분리다.
  Capacitor 와 네이티브 툴링 의존성이 웹 빌드와 같은 `package.json` 에 섞이면 안 된다.
- 소비자가 하나뿐인 코드를 패키지로 빼면 얻는 것은 의존성 경계 강제 하나뿐인데,
  그것은 lint 규칙과 훅으로도 얻을 수 있다([ADR 0013](0013-saju-engine-purity-enforcement.md)).
  대신 설정 파일, tsconfig 경로, 빌드 순서라는 비용은 지금 당장 발생한다.
- 두 앱이 서로 의존하지 않으므로 빌드 순서 문제가 없다.
  Turborepo 의 태스크 오케스트레이션과 캐싱이 해결할 문제 자체가 존재하지 않는다.

## 트레이드오프 / 대안

- 대안 1: `apps/` + `packages/` + Turborepo. 엔진을 독립 패키지로 격리한다.
  앱에 네이티브 화면이 생겨 엔진을 공유해야 할 때 재검토한다.
  승격 비용은 파일 이동과 `package.json` 하나 추가 수준이라, 지금 미리 만드는 복잡도보다 낮다.
- 대안 2: `frontend/` + `backend/` 단순 분리(form-flow 방식). 워크스페이스 없이 각자 빌드한다.
  이 프로젝트는 백엔드를 따로 두지 않으므로 구조가 맞지 않는다.
- 패키지 경계가 없으므로 엔진의 순수성이 컨벤션에만 의존하게 된다.
  이 위험은 [ADR 0013](0013-saju-engine-purity-enforcement.md) 에서 lint 와 훅으로 막는다.

## 영향

- 루트에는 `pnpm-workspace.yaml` 과 스크립트용 `package.json` 만 둔다.
- 계산 엔진 코드는 `apps/web/src/lib/saju/` 로 경로가 고정된다.
  CLAUDE.md 의 제약과 훅 경로가 이 경로를 기준으로 작성된다.
- 승격 조건: 앱에 네이티브 화면이 생기면 `packages/saju-core` 로 옮기고
  이 ADR 을 대체하는 새 ADR 을 쓴다.
