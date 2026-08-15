/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 서버의 절대 URL. 빌드 시점에 주입한다.
   *
   * 앱은 `capacitor://localhost` 오리진에서 뜨므로 상대 경로가 서버로 나가지 않는다
   * (ADR 0003, ADR 0004). 웹은 비워 두면 같은 오리진으로 간다.
   *
   * vite 의 `ImportMetaEnv` 는 인덱스 시그니처가 `any` 라 여기 적어야 타입이 붙는다.
   */
  readonly VITE_API_BASE_URL?: string;
}
