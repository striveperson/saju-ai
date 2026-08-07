# 모바일 셸

> `apps/web` 의 SPA 빌드를 감싸 스토어에 올리는 Capacitor 셸이다.

## 이 디렉토리에 넣지 않는 것

비즈니스 로직을 넣지 않는다([ADR 0002](../../docs/adr/0002-tanstack-start-capacitor-shell.md)).
화면과 계산은 전부 `apps/web` 이 만든다. 여기에 있는 것은 네이티브 껍데기와 플러그인 설정뿐이다.

## 어떻게 동작하는가

원격 URL 을 로드하지 않는다. SPA 정적 번들을 앱 안에 넣는다
([ADR 0003](../../docs/adr/0003-spa-bundle-for-app.md)).

```
apps/web            SAJU_BUILD_TARGET=spa vite build
  -> .output/public/_shell.html + assets/
  -> scripts/build-spa.mjs 가 dist-spa/ 로 옮기고 index.html 로 이름 변경
apps/mobile         capacitor.config.ts 의 webDir 이 ../web/dist-spa 를 가리킨다
  -> cap sync 가 네이티브 프로젝트에 복사한다
```

앱은 네트워크 없이 사주팔자 계산과 결과 화면까지 동작한다.
서버는 AI 해석 생성과 저장, 공유에만 호출한다.

`server.url` 을 설정하면 이 전제가 무너진다. 쓰지 않는다.

## 아직 하지 않은 것

네이티브 프로젝트(`ios/`, `android/`)를 만들지 않았다.
작성 시점의 개발 환경에 Xcode 가 없고 Android 쪽도 `ANDROID_HOME` 이 설정되지 않았으며
Java 11 이라 Capacitor 7 의 요구(Java 17 이상)를 만족하지 못했다.
검증할 수 없는 네이티브 프로젝트를 만들어 커밋하지 않기로 했다.

## 툴체인이 준비되면

```bash
# 웹 SPA 번들을 먼저 만든다
pnpm build:spa

# 네이티브 프로젝트 생성 (한 번만)
cd apps/mobile
pnpm exec cap add ios
pnpm exec cap add android

# 이후 웹을 고칠 때마다
pnpm mobile:sync
```

`ios/` 와 `android/` 는 `.gitignore` 대상이 아니다. 커밋한다.
`saju://` 커스텀 스킴 등록이 `Info.plist` 와 `AndroidManifest.xml` 에 들어가므로
네이티브 프로젝트를 무시하면 그 설정이 사라진다.

## 생성 후 해야 할 설정

1. 커스텀 스킴 `saju://` 등록. iOS 는 `Info.plist` 의 `CFBundleURLTypes`,
   Android 는 `AndroidManifest.xml` 의 `intent-filter` 다.
   소셜 로그인이 시스템 브라우저에서 PKCE 로 진행한 뒤 이 스킴으로 돌아온다
   ([ADR 0010](../../docs/adr/0010-supabase-auth-and-db.md)).
2. `@capacitor/browser` 설치. 웹뷰 안에서 공급자 인증 화면을 직접 열면
   구글이 `disallowed_useragent` 로 차단한다.
3. 푸시 알림 플러그인. App Store 심사 지침 4.2 에 대비해
   오프라인 계산 외에 네이티브 가치를 하나 더 확보한다
   ([ADR 0002](../../docs/adr/0002-tanstack-start-capacitor-shell.md)).

## 확인된 것

`cap config` 가 `webDir` 을 `apps/web/dist-spa` 로 정확히 해석한다.
워크스페이스를 가로지르는 상대 경로가 동작하는 것을 확인했다.

SPA 번들 자체는 자기완결적이다. 정적 서버에 올려 에셋이 전부 해석되고
라우트 청크가 `import('./routes-*.js')` 로 지연 로딩되는 것을 확인했다.
본문에 SSR 마크업이 없어 클라이언트 전용 셸이 맞다.

웹뷰 안에서 실제로 부팅하는지는 시뮬레이터가 필요해 아직 확인하지 못했다.
