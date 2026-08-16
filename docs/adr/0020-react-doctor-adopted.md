# ADR 0020. react-doctor 를 devDependency 로 고정해 쓴다

- 상태: 채택(Accepted)
- 날짜: 2026-08-16

## 배경

[ADR 0017](0017-external-agent-collections-selective-port.md) 이 react-doctor 를 보류하며
조건을 달았다. "화면 코드가 생기면 다시 판단한다. 지금 React 코드가 107줄뿐이라 얻을 것이 없고,
도입 비용이 그보다 크다."

결과 지면과 입력 지면이 서면서 그 조건이 채워졌다. 지금 89개 파일이다.

0017 이 남긴 미해결 항목도 함께 정리한다. 라이선스가 `SEE LICENSE IN LICENSE` 라
확인이 필요하다고 적혀 있었다.

## 결정

`react-doctor` 0.9.12 를 `apps/web` 의 devDependency 로 정확한 버전에 고정한다.
부르는 것은 `pnpm --filter web verify:react` 하나다.

```
REACT_DOCTOR_NO_TELEMETRY=1 react-doctor --no-telemetry --no-supply-chain
```

0017 이 적은 도입 순서 넷 중 셋을 여기서 한다. devDependency 고정, 텔레메트리 차단,
토큰 없는 셸에서 실행이다. 넷째인 플레이북 벤더링은 하지 않는다. 아래 4항이 이유다.

1. `npx` 나 `pnpm dlx` 로 부르지 않는다. 런타임 의존성 19개가 범위 지정이라
   그 형태로는 트리가 고정되지 않는다.
2. 텔레메트리를 끈다. `@sentry/node` 가 런타임 의존성이고 `api.axiom.co` 가 dist 에 박혀 있다.
   환경변수와 플래그 둘 다 준다. 한쪽이 판올림에서 이름이 바뀌어도 다른 쪽이 남는다.
3. 공급망 스캔을 끈다. Socket.dev 로 의존성 목록이 나간다.
   `pnpm-lock.yaml` 이 공개 저장소에 있어 비밀은 아니지만, 끄는 쪽이 기본값이다.
4. 패키지가 `dist/skills/` 로 싣는 에이전트 스킬을 붙이지 않는다.
   그 스킬이 `https://www.react.doctor/prompts/rules/<plugin>/<rule>.md` 를
   실행 중에 받아 그대로 따르라고 지시한다. 진단 결과를 사람이 읽고 판단한다.
5. `pre-commit-check.sh` 의 다섯째 단계로 넣는다. 지적이 남아 있으면 커밋이 막힌다.
6. 규칙 설정 파일을 만들지 않는다. 끄는 것은 `react-doctor-disable-next-line` 으로
   그 줄 옆에서 한다. 규칙 이름만 적힌 설정 파일에는 왜 껐는지가 남지 않는다.
7. `--no-dead-code` 로 죽은 코드 분석을 끈다. `deslop` 계열이 `package.json` 을
   짚는데 JSON 이라 주석을 못 달고, 그 규칙이 `react-doctor rules list` 에도 없어
   6항의 수단이 닿지 않는다. 끄는 단위가 분석 전체뿐이다.

## 이유

라이선스는 Modified MIT 이고 제한이 둘이다. 소프트웨어를 학습이나 평가 데이터로 쓰는 것과,
그것에서 값어치가 나오는 유료 호스팅 서비스로 되파는 것이다.
로컬에서 진단 CLI 를 돌리는 우리 용도는 둘 다 아니다. 0017 의 미해결 항목이 이것으로 닫힌다.

첫 실행이 89개 파일에서 5건을 냈고 그중 하나가 이 저장소가 두 시간 전에 만든 것이었다.
히스토리 state 를 zustand 스토어로 옮기면서 `@tanstack/history` 직접 의존이 쓰이지 않게 됐는데
타입체크도 lint 도 이것을 잡지 않는다. 지우면 그만인 의존이라 손해가 크지 않지만,
사람 눈으로는 판올림을 몇 번 지나야 발견되는 종류다.

한편 `@tanstack/eslint-plugin-query` 를 안 쓰는 것으로 짚은 것은 오탐이다.
저장소 루트 `.oxlintrc.json` 의 `jsPlugins` 가 그것을 로드한다.
oxlint 가 eslint 플러그인을 JS 플러그인으로 받는 것을 스캐너가 모른다.
도구가 우리 설정을 다 알지 못한다는 표본이고, 그래서 6항으로 규칙 설정을 미룬다.

## 트레이드오프 / 대안

- 타입스크립트 버전이 어긋난다. react-doctor 가 `typescript >=5.0.4 <6` 을 끌어오고
  우리는 7.0.2 다. pnpm 의 격리된 트리라 우리 `tsc` 는 그대로지만,
  진단은 5.x 로 판정한 결과다. 7.0.2 에서만 나타나는 것을 못 보거나 그 반대일 수 있다.
- oxlint 는 이제 겹친다. 0017 조사 시점에는 `>=1.76.0 <1.77.0` 이라 우리 1.77.0 과 어긋났는데
  0.9.12 가 `>=1.77.0 <1.78.0` 으로 옮겨 왔다. 우리가 oxlint 를 올리면 다시 갈라진다.
- devDependency 84개가 늘었다. 설치 시간과 디스크를 쓰고 공급망 표면도 그만큼 넓어진다.
- 커밋마다 4초가 늘고, 무엇보다 경고 하나에 커밋이 막힌다.
  종료 코드가 지적 유무로만 갈리고 `--blocking` 이 그것을 바꾸지 않는다.
  조언으로 두면 아무도 안 돌려 없는 것과 같아지므로 막는 쪽을 골랐고,
  대신 끄는 문턱을 낮게 뒀다. 근거를 한 줄 적으면 그 줄에서 꺼진다.
- 지적이 0 이어야 커밋이 되므로 도구를 들인 시점의 재고를 먼저 비워야 한다.
  기존 지적을 끄지도 고치지도 않은 채로는 아무 커밋도 나가지 않는다.
- 7항이 제일 비싸다. 안 쓰는 파일과 export 와 의존과 순환 import 를 함께 잃는다.
  이 도구를 들이자마자 `@tanstack/history` 를 짚어낸 것이 바로 그 분석이다.
  오탐 하나 때문에 진짜를 내는 분석을 껐다. `deslop` 이 규칙 단위로 열리면 되돌린다.
  그때까지는 `pnpm --filter web exec react-doctor --dead-code` 로 손으로 부른다.
- 대안: oxlint 규칙을 늘린다. 의존이 안 늘고 이미 훅에 있다.
  react-doctor 가 낸 다섯 중 셋(`no-scale-from-zero`, `prefer-html-dialog`,
  `js-set-map-lookups`)은 oxlint 에 대응 규칙이 없어 이것으로 대신하지 못한다.
- 대안: 안 쓴다. 0017 이 이미 한 번 고른 쪽이고, 그때의 이유였던 코드 분량이 해소됐다.

## 영향

- ADR 0017 의 "react-doctor 는 보류" 절이 이 ADR 로 대체된다.
  0017 의 결정 본문인 선별 이식 원칙은 그대로다.
- `apps/web/package.json` 에 `verify:react` 가 생긴다.
  `pnpm doctor` 는 pnpm 내장 명령이라 그 이름을 쓸 수 없다.
- 진단 결과를 고치는 것은 이 ADR 밖이다.
  첫 실행의 다섯 건 중 `prefer-html-dialog` 는 이미 판단이 끝나 있다.
  jsdom 에 `showModal` 이 없어 `div role="dialog"` 로 간 것이고 그 근거는
  `RegionSearchSheet.tsx` 에 적혀 있다.
