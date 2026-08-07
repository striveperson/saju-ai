# ADR 0012. 웹은 Vercel 에 배포하고 앱은 스토어에 수동 배포한다

- 상태: 채택(Accepted)
- 날짜: 2026-08-05

## 배경

[ADR 0003](0003-spa-bundle-for-app.md) 에서 빌드 타깃이 SSR 과 SPA 둘로 갈렸다.
데이터는 Supabase 에 있으므로([ADR 0010](0010-supabase-auth-and-db.md)) 웹 서버는 상태를 갖지 않는다.

## 결정

1. `apps/web` 은 Vercel 에 배포한다.
2. `apps/mobile` 은 SPA 빌드를 `cap sync` 로 반영한 뒤 Xcode 와 Android Studio 를 거쳐 스토어에 올린다.
3. 앱 화면 수정은 묶어서 릴리스한다.

## 이유

- git push 로 배포되고 프리뷰 환경이 자동으로 생긴다. QA 를 프리뷰 URL 로 돌릴 수 있다.
- 서버가 상태를 갖지 않으므로 서버리스와 잘 맞는다. 유지보수할 서버가 없다.
- 환경변수 관리와 도메인, HTTPS 가 기본 제공된다.

## 트레이드오프 / 대안

- 대안 1: Cloudflare Workers. 응답 지연이 적고 비용 효율이 좋으며 장시간 처리에 유리하지만,
  Node 런타임이 아니라 TanStack Start 와 Supabase SDK 의 엣지 호환성을 먼저 확인해야 한다.
  검증 스파이크가 하나 더 늘어난다.
- 대안 2: 자체 서버 Docker. 실행시간과 비용 제약이 없고 form-flow 의 배포 자산을 재사용할 수 있지만
  서버 유지보수와 보안 패치를 직접 지고, 프리뷰 환경을 직접 만들어야 한다.
- 서버리스 실행시간 제한이 있다. [ADR 0011](0011-single-prompt-no-streaming.md) 에서
  스트리밍 없는 단일 호출을 택했으므로 Gemini 응답 시간이 제한 안에 들어오는지 확인해야 한다.
  넘치면 스트리밍 도입이나 백그라운드 생성으로 우회한다.
- 트래픽이 급증하면 비용을 예측하기 어렵다.
- 앱 릴리스가 스토어 심사를 타므로 웹과 배포 주기가 어긋난다.
  웹에서 고친 화면이 앱에 반영되려면 심사를 기다려야 한다.

## 영향

- 스캐폴딩 단계에서 확인할 것이 두 가지다.
  TanStack Start 를 SPA 로 빌드해 Capacitor `webDir` 에 넣는 경로([ADR 0003](0003-spa-bundle-for-app.md))와
  Gemini 응답 시간이 서버리스 제한 안에 들어오는지다.
- 앱은 배포된 웹의 절대 URL 을 API base URL 로 갖는다([ADR 0004](0004-api-routes-over-server-functions.md)).
  프리뷰 환경과 운영 환경의 URL 이 다르므로 빌드 시점에 주입한다.
- CORS 허용 목록에 앱 오리진을 넣는다.
