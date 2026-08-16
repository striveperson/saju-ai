# ADR 0017. 외부 에이전트 모음은 통째 설치하지 않고 골라 이식한다

- 상태: 채택(Accepted). react-doctor 절은 대체됨(Superseded by ADR 0020)
- 날짜: 2026-08-14

## 배경

[affaan-m/ECC](https://github.com/affaan-m/ECC) 는 에이전트 66개, 커맨드 90여 개, 스킬 65여 개를 담은
Claude Code 확장 모음이다. 리뷰어와 검증 계열이 여럿 있어 이 저장소에 붙일 만한 것이 있는지 살폈다.

react-doctor 도 같이 검토했다. React 진단 CLI 이고 한 번 붙였다가 뺐다.

## 결정

플러그인으로 통째 설치하지 않는다. 필요한 것만 골라 우리 규약에 맞게 고쳐 가져온다.

가져올 시점은 대상이 생길 때다. 프로젝트가 완성된 뒤가 아니다.
리뷰어 계열은 늦게 붙일수록 지적이 한꺼번에 쏟아져 손해다.

| 우리 작업             | 가져올 것                                                       | 상태                                                      |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| 계산 엔진 구현        | `silent-failure-hunter`                                         | 안 가져옴. `saju-engine-validator` 로 대신함              |
| 계산 엔진 구현        | `tdd-guide`                                                     | 검토. 픽스처 선행이 이미 더 강해서 불필요할 수 있다       |
| API 와 화면           | `typescript-reviewer`, `react-reviewer`, `react-build-resolver` | 그 다음                                                   |
| Supabase 스키마와 RLS | `database-reviewer`                                             | 그 다음                                                   |
| PR                    | `code-review`, `security-scan`                                  | 내장 `/code-review`, `/security-review` 와 중복 확인 먼저 |
| 유지보수              | `refactor-clean`, `doc-updater`, `prune`                        | 한참 뒤                                                   |

## 이유

통째 설치하지 않는 이유는 셋이다.

- 에이전트 66개 중 우리와 무관한 것이 대부분이다. cpp, dart, flutter, go, java, rust, swift, vue 등.
  에이전트와 스킬은 설명문이 매칭용으로 로드되므로 안 쓰는 것도 비용이다.
- 규약이 다르다. `typescript-reviewer` 는 eslint 를, `tdd-guide` 는 `npm test` 와 커버리지 80퍼센트를
  전제한다. 우리는 oxlint 와 pnpm 이고 커버리지 목표를 정한 적이 없다.
- ECC 자체 `hooks.json` 과 `rules/` 가 우리 훅 여섯 개, CLAUDE.md 와 충돌할 수 있다.

기획과 설계 단계 도구(`planner`, `architect`, `plan-prd`)는 쓰지 않았다.
그 자리는 ADR 이 대신했고, 범용 도구가 낼 수 없는 이 프로젝트만의 결정을 근거와 함께 남겼다.

## 트레이드오프 / 대안

통째 설치했다면 고를 필요가 없고 업스트림 갱신이 자동으로 따라온다.
대신 안 쓰는 설명문이 매 세션 로드되고, 우리 훅과 충돌했을 때 원인을 좁히기 어렵다.
고르는 쪽은 이식할 때마다 손이 가고 업스트림 갱신을 수동으로 따라가야 한다.

## silent-failure-hunter 를 안 가져온 경위

첫 대상으로 잡았던 이유는 이 앱의 최악의 실패가 예외가 아니라 조용히 틀린 간지를 돌려주는 것이기 때문이다.
입춘 경계에서 년주가 하나 밀려도 프로그램은 멀쩡히 돌고 화면에는 여덟 글자가 그대로 뜬다.
[docs/05](../05-saju-domain-rules.md) 7.3 의 진태양시 -30분 폴백 명시 조건과
야자시 적용 방식 표기 조건이 정확히 이 유형이다.

막상 이식하려니 남길 것이 거의 없었다.
원본의 네트워크, 파일, DB, 트랜잭션 항목은 계산 엔진에 해당이 없고,
정작 필요한 것은 전부 도메인 쪽이었다. 판정 함수가 어느 분기에도 걸리지 않았을 때
기본값을 반환하는가, 검증 케이스가 없는 경계 조건을 조용히 통과시키는가 같은 것이다.
그래서 가져오는 대신 `saju-engine-validator` 를 새로 썼다.

## react-doctor 는 보류

이 절은 [ADR 0020](0020-react-doctor-adopted.md) 으로 대체됨(Superseded).
아래 조건이 채워져 2026-08-16 에 도입했다. 조사 기록은 그대로 둔다.

화면 코드가 생기면 다시 판단한다.
지금 React 코드가 107줄뿐이라 얻을 것이 없고, 도입 비용이 그보다 크다.

tarball 을 받아 확인한 사실을 남긴다. 다시 조사하지 않도록.

- 텔레메트리가 기본으로 켜져 있다. `@sentry/node` 가 런타임 의존성이고
  `api.axiom.co` 가 dist 에 박혀 있다. `REACT_DOCTOR_NO_TELEMETRY=1` 로 끈다
- 런타임 의존성 21개가 범위 지정이라 `npx react-doctor@0.9.6` 으로는 트리가 고정되지 않는다.
  devDependency 로 넣어 lockfile 에 담아야 한다. `npx -y` 는 특히 피한다
- 우리와 도구 버전이 어긋난다. `typescript >=5.0.4 <6`, `oxlint >=1.76.0 <1.77.0` 을 끌어온다.
  우리는 7.0.2 와 1.77.0 이다. 빌드는 안 깨지지만 판정이 엇갈릴 수 있다
- 원본 스킬이 `https://www.react.doctor/prompts/` 에서 플레이북을 받아 그대로 따르고
  워킹트리를 고치라고 지시한다. 받지 않는다. 쓰게 되면 한 번 받아 커밋해 두고
  로컬 파일로 읽는다. 업스트림 갱신은 수동 diff 로 PR 리뷰를 거친다
- React Compiler 는 스스로 감지한다. `vite.config.ts` 의 `reactCompilerPreset` import 를 본다.
  감지되면 수동 메모이제이션을 지적하므로 우리 규약과 같은 방향이다
- 라이선스가 `SEE LICENSE IN LICENSE` 라 확인이 필요하다

도입한다면 순서는 devDependency 고정, 텔레메트리 차단, 토큰 없는 셸에서 실행, 플레이북 벤더링이다.

## 영향

CLAUDE.md 는 이 ADR 을 가리키는 한 줄만 둔다.
조사 기록이 매 세션 읽히는 자리에 있을 이유가 없고, 채택하지 않은 결정을 남기는 것은 ADR 의 몫이다.
