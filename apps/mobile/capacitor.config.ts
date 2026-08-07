import type { CapacitorConfig } from '@capacitor/cli';

// 이 셸에는 비즈니스 로직이 들어가지 않는다 (ADR 0002).
// 화면은 전부 apps/web 이 만들고, 여기서는 그 SPA 빌드를 감싸기만 한다.
const config: CapacitorConfig = {
  appId: 'app.saju.ai',
  appName: 'saju-ai',

  // ADR 0003: 원격 URL 을 로드하지 않고 SPA 정적 번들을 앱에 넣는다.
  // 앱은 네트워크 없이 사주팔자 계산과 결과 화면까지 동작한다.
  // 이 오프라인 동작이 App Store 심사 지침 4.2 에 대한 방어 논리이기도 하다.
  // server.url 을 설정하면 그 전제가 무너지므로 쓰지 않는다.
  webDir: '../web/dist-spa',

  // ADR 0010: 소셜 로그인은 시스템 브라우저에서 PKCE 로 진행하고
  // 이 스킴의 딥링크로 돌아온다. 웹뷰 안에서 공급자 인증 화면을 직접 열지 않는다.
  // 구글은 내장 웹뷰를 disallowed_useragent 로 차단한다.
  //
  // 이 값은 네이티브 프로젝트를 만든 뒤 iOS 의 Info.plist 와
  // Android 의 AndroidManifest.xml 에도 등록해야 한다.
  plugins: {},
};

export default config;
