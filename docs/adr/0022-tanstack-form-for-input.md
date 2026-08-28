# ADR 0022. 입력 폼을 TanStack Form 으로 든다

- 상태: 채택(Accepted)
- 날짜: 2026-08-29

## 배경

[ADR 0021](0021-react-hook-form-for-input.md) 이 입력 지면의 폼 상태를 react-hook-form 으로 옮겼다.
그 문서의 대안 절이 TanStack Form 을 검토하고 물리면서 조건을 하나 걸어 두었다.

> 고르지 않은 것은 react-hook-form 쪽이 같은 일에 API 가 적고, 이 폼이 필드 일곱짜리라
> 프레임워크 통합에서 얻을 것이 없어서다. 폼이 여러 지면으로 늘고 서버 검증이 붙으면 그때 다시 본다.

지금 그 둘 다 아니다. 폼은 여전히 하나고 서버 검증도 없다.
그래서 이 결정의 근거는 0021 이 적어 둔 조건이 아니라 다른 것이다.

저장소가 이미 TanStack 을 넷 쓴다. 라우터, Start, Query, Devtools 다.
0021 이 "결이 맞다" 로만 적고 넘긴 항목인데, 실제로는 두 가지가 딸려 온다.
`@tanstack/intent` 가 라우터와 Start 의 공식 스킬을 lockfile 에 고정된 버전으로 꺼내 주고,
`@tanstack/devtools-vite` 가 devtools 를 프로덕션 빌드에서 벗겨 낸다.
폼도 그 두 가지를 함께 받는다.

## 결정

`@tanstack/react-form` 1.33.5 와 `@tanstack/react-form-devtools` 0.2.34 를
`apps/web` 에 정확한 버전으로 고정해 들인다. react-hook-form 7.85.0 은 뺀다.

devtools 는 devDependencies 에 둔다. 나머지 devtools 셋도 같이 옮긴다.
근거는 아래 4항이다.

1. 등록 방식을 셋으로 가른다.
   입력칸이 지면에 있으면 `form.Field`, 표시 컴포넌트 안에 있어 값과 콜백만
   내려보내야 하면 지면에서 `useField`, 등록할 것이 없으면 `form.setFieldValue` 다.
   0021 3항이 "검증 규칙이 붙는 칸" 으로 가르던 기준을 이것으로 바꾼다.
   `calendar` 가 검증 규칙 없이 등록되는 것이 그 차이다. 이유는 3항에 있다.
2. 검증은 제출 시점에만 돈다. 날짜와 시각의 형식은 필드 `validators.onSubmit`,
   엔진에 넣어 보는 것은 폼 `validators.onSubmit` 이다.
   `_handleSubmit` 이 `validateAllFields` 를 먼저 돌리고 실패하면 거기서 끝내므로
   형식이 먼저고 엔진이 나중이라는 순서가 라이브러리에서 나온다.
   `revalidateLogic` 은 쓰지 않는다. 제출 시점 하나만 필요해 기본 검증 로직으로 충분하다.
3. 지난 오류 문구는 폼 레벨 `listeners.onChange` 하나가 지운다.
   라이브러리가 스스로 지우는 것은 값이 바뀐 칸의 오류와 폼 오류까지다.
   남의 칸 오류는 남아서 시각을 고쳐도 날짜 문구가 붙어 있다. 리스너가 그것을 지운다.
   리스너를 쏘는 것은 `FieldApi` 인스턴스가 있는 필드뿐이라
   문구를 잊어야 하는 칸 셋(날짜, 시각, 양력음력)을 모두 등록한다.
4. 어느 칸인지 아는 오류는 검증기가 `fields` 키로, 모르는 오류는 `form` 키로 돌려준다.
   앞엣것은 해당 칸 옆에, 뒤엣것은 제출 버튼 위 폼 문구 자리에 뜬다.
   두 갈래가 `form` 과 `fields` 를 다 들어야 한다. 아래 이유 절에 근거가 있다.
5. 폼 레벨 검증기는 컴포넌트 밖 모듈 자리에 둔다. 타입 추론 때문이고 이유 절에 있다.
6. `formOptions`, `createFormHook`, Standard Schema 리졸버를 쓰지 않는다.
   폼이 하나고 규칙이 이미 순수 함수다. 0021 2항의 근거가 그대로 이어진다.
7. 필드 단위 렌더 격리를 쫓지 않는다. 제출 버튼만 `form.Subscribe` 로 감싼다.
   나머지는 `useSelector(form.store, (s) => s.values)` 하나로 구독한다.

## 이유

3항으로 `calendar` 를 등록한 것은 리스너가 폼이 아니라 필드에서 나가기 때문이다.
`form.setFieldValue` 는 `getFieldInfo(field).instance?.triggerOnChangeListener()` 로 부르고,
등록되지 않은 필드는 `instance` 가 null 이라 조용히 넘어간다.
양력음력을 바꿔도 문구가 안 지워져 테스트 한 갈래가 깨진다.

2항이 되검증 모드 대신 리스너를 쓰는 것은 0021 4항의 이유 그대로다.
`revalidateLogic({ modeAfterSubmission: 'change' })` 를 걸면 값이 유효해져야 문구가 사라지는데,
마스킹이 여덟 자리에서 끊으므로 틀린 날짜에 숫자를 더 쳐도 값이 그대로다.
고치기 시작했는데 문구가 남는다.

4항이 두 갈래에 `form` 과 `fields` 를 다 요구하는 것은 값 분배가 키 이름으로 갈리기 때문이다.
`normalizeError` 가 `'fields' in error` 일 때만 둘을 나눠 각각 폼 `errorMap` 과 필드 메타로 보낸다.
`fields` 없이 `{ form: '문구' }` 만 돌려주면 그 객체가 통째로 `errorMap` 에 들어가
화면이 객체를 렌더하게 된다. 타입 추론도 같은 자리에서 무너진다.
`GlobalFormValidationError` 가 `fields` 를 필수로 받기 때문이다.

5항으로 검증기를 밖에 뺀 것은 추론 고리다.
`listeners.onChange` 가 `formApi.setErrorMap(...)` 을 부르는데 그 인자 타입이 `TOnSubmit` 에 의존하고,
`TOnSubmit` 은 같은 객체 리터럴의 `validators.onSubmit` 에서 추론된다.
검증기를 그 자리에 인라인 화살표로 적으면 매개변수 타입이 문맥에서 오므로 검사가 미뤄지고,
그 사이에 리스너가 `TOnSubmit` 을 물어 답이 없어 `undefined` 로 굳는다.
그러면 `errorMap` 이 `ValidationErrorMap<undefined, ...>` 가 되어 폼 문구 타입이 사라진다.
화면에는 문자열이 뜨는데 타입만 아니라고 말하는 상태다.
매개변수 타입을 적은 모듈 자리 상수로 빼면 `useForm` 을 보기 전에 타입이 확정되어 고리가 끊긴다.
둘 중 하나만으로는 안 깨진다. 인라인 검증기와 리스너의 `setErrorMap` 호출이 함께 있어야 한다.

devtools 를 devDependencies 로 옮긴 것은 `@tanstack/devtools-vite` 가
`removeDevtoolsOnBuild` 기본값 `true` 로 프로덕션 빌드에서 import 와 JSX 를 지우기 때문이다.
번들에 도달하지 않으므로 런타임 의존이 아니다.
다만 스트리핑이 `<TanStackDevtools>` 의 `plugins` 배열에서 `{ render: <Panel /> }` 꼴만 훑는다.
`formDevtoolsPlugin()` 같은 호출식은 대상이 아니라 import 가 남는다.
그래서 폼 devtools 도 `{ name: 'Tanstack Form', render: <FormDevtoolsPanel /> }` 로 적는다.

## 트레이드오프 / 대안

- 이름 칸에 값이 바뀌면 지난 오류 문구가 함께 지워진다.
  리스너가 필드를 가리지 않아서다. 옮기기 전에는 이름을 쳐도 날짜 문구가 남았다.
  "고치기 시작하면 지운다" 라는 규칙과 어긋나지 않아 받아들인다.
- `toChartInput` 이 폼 검증기와 제출 처리기에서 각각 한 번씩 돈다.
  검증기가 만든 값을 제출 처리기로 넘기려면 렌더 사이에 값을 들 자리가 필요하고
  파싱 두 번보다 그쪽이 비싸다. 0021 이 적어 둔 트레이드오프의 연장이다.
- 등록 방식이 셋이라 파일 안에 서로 다른 꼴이 섞인다.
  기준은 하나지만 읽는 사람이 그 기준을 알아야 한다.
- API 가 react-hook-form 보다 많다. 0021 이 물린 이유가 이것이었고 그대로 남는다.
  대신 지금 쓰는 것은 `useForm`, `useField`, `form.Field`, `form.Subscribe`, `useSelector` 다섯이다.
- 대안: react-hook-form 을 유지한다. 지금 코드가 그대로 가고 옮기는 값을 안 치른다.
  TanStack 스킬과 devtools 스트리핑을 폼에서는 못 받는다.
- 대안: 필드 단위로 렌더를 격리한다. `BirthFields` 를 `form.Subscribe` 로 감싸는 것이다.
  선택자가 객체를 만들어 비교 함수를 손으로 써야 하고
  (`shallow` 가 `@tanstack/react-store` 0.11.1 에서 빠졌다) 파생값 셋이 갈라진다.
  필드 일곱짜리 한 지면에서 얻는 것이 측정되지 않아 하지 않았다.
  React DevTools Profiler 로 먼저 재고 눈에 걸리는 값이 나오면 그때 넣는다.

## 영향

- [ADR 0021](0021-react-hook-form-for-input.md) 의 상태가 `대체됨` 이 된다.
  그 문서의 1항과 3항과 4항이 이 문서의 1항, 2항, 3항으로 바뀐다.
  2항(zod 리졸버를 안 붙인다)과 5항(마스킹은 폼 밖)과 6항(제출 버튼 게이트)은 그대로 산다.
- [docs/03](../03-frontend-rules.md) 5장의 상태 표와 8장의 폼 문단이 함께 바뀐다.
- 화면에 폼 전체 오류 문구 자리가 새로 생긴다.
  엔진이 `RangeError` 가 아닌 예외를 던졌을 때만 뜬다.
- `InputPage.test.tsx` 는 한 줄도 바뀌지 않는다. 라벨과 role 로만 조작하는 테스트라
  라이브러리를 갈아도 그대로 통과한다. 이것이 이번 작업의 성공 조건이었다.
- 아직 만들지 않은 입력 항목이 이 결정을 물려받는다.
  시 미상 토글과 야자시 정책 토글이 그것이고, 둘 다 자리를 감춰 둔 상태다.
