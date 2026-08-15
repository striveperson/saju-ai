# ADR 0003. 앱은 SPA 정적 번들, 서버는 API 로만 호출

- 상태: 채택(Accepted). 3항의 입력 부분은 대체됨(Superseded by ADR 0019)
- 날짜: 2026-08-05

## 배경

Capacitor 는 보통 정적 웹 자산을 앱 번들에 넣고 로컬에서 로드한다.
그런데 [ADR 0002](0002-tanstack-start-capacitor-shell.md) 에서 택한 TanStack Start 는 SSR 을 전제로 한다.
셸이 웹을 어떻게 로드할지가 자명하지 않다.

## 결정

1. 웹은 TanStack Start SSR 로 그대로 서비스한다.
2. 앱용으로는 같은 소스를 클라이언트 전용 SPA 로 따로 빌드해 Capacitor 번들에 넣는다.
3. 앱은 네트워크 없이도 생년월일시 입력, 사주팔자 계산, 판정 결과 화면까지 동작한다.
4. 서버는 AI 해석 생성과 저장·조회에만 호출한다.

## 이유

- 사주 계산이 순수 함수라 클라이언트에서 완결되므로 오프라인 동작이 거의 공짜로 얻어진다.
- 이 오프라인 계산 기능이 App Store 심사 지침 4.2 에 대한 실질적인 방어 논리가 된다.
  네트워크 없이 쓸 수 있는 계산기는 웹사이트 래퍼가 아니다.
- 원격 URL 로드 방식과 달리 첫 화면이 네트워크에 의존하지 않는다.
- 서버 장애가 앱 전체 정지로 이어지지 않는다. 해석만 실패하고 계산 결과는 그대로 보인다.

## 트레이드오프 / 대안

- 대안 1: Capacitor `server.url` 로 배포된 웹을 원격 로드한다.
  구현이 거의 없고 웹을 고치면 앱도 즉시 갱신되지만, 오프라인이 완전히 불가능하고
  App Store 4.2 반려 위험이 가장 크며 서버 장애가 앱 정지로 이어진다.
- 대안 2: PWA 만 하고 스토어 배포를 포기한다. 스토어 검색 유입 경로를 잃는다.
- 빌드 타깃이 둘(SSR, SPA)이다. CORS 와 API base URL 설정이 필요하다.
- 앱 화면 수정은 스토어 심사를 타야 반영된다.

## 검증 결과 (2026-08-05)

채택 시점에는 TanStack Start 와 Capacitor 조합의 지원 수준을 확인하지 못한 상태였다.
스캐폴딩 단계에서 스파이크로 확인했고 결과는 아래와 같다.

| 항목 | 결과 |
| --- | --- |
| SPA 모드 지원 | `tanstackStart({ spa: { enabled, maskPath, prerender } })` 로 공식 지원 |
| 셸 산출물 | `.output/public/_shell.html` 과 `assets/` |
| Capacitor `webDir` 형태 | `_shell.html` 을 `index.html` 로 바꿔 `dist-spa/` 로 옮긴다 |
| 에셋 해석 | 정적 서버에서 전부 200 |
| 라우트 청크 | `import('./routes-*.js')` 로 지연 로딩. 번들이 자기완결적이다 |
| 서버 의존 | 본문에 SSR 마크업 없음. 클라이언트 전용 셸이 맞다 |
| `webDir` 경로 | `cap config` 가 `../web/dist-spa` 를 정확히 해석한다 |

빌드 타깃은 `SAJU_BUILD_TARGET=spa` 환경변수로 나눈다.
변환 스크립트는 `apps/web/scripts/build-spa.mjs` 다.

아직 확인하지 못한 것: 실제 웹뷰 안에서의 부팅.
확인하려면 Xcode 나 Android SDK 가 필요하고 작성 시점 개발 환경에는 둘 다 없었다.
네이티브 프로젝트를 만들 때 다시 확인한다.

## 영향

- 앱은 `capacitor://localhost` 오리진에서 뜬다. 상대 경로 서버 호출이 나가지 않으므로
  서버 호출 방식이 제약된다([ADR 0004](0004-api-routes-over-server-functions.md)).
- 배포 파이프라인이 웹과 앱으로 갈린다([ADR 0012](0012-vercel-deploy.md)).
- 계산 엔진이 클라이언트 번들에 포함되므로 번들 크기와 실행 속도가 사용자 체감에 직결된다.
