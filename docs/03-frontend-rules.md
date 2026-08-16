# 03. 프론트엔드 규칙

> 화면 코드를 쓸 때 지키는 규칙. 계산 규칙의 SSOT 가 [05](05-saju-domain-rules.md) 라면 화면 쪽 SSOT 는 이 문서다. 코드와 어긋나면 코드가 틀린 것으로 간주한다.

스택은 TanStack Start, TanStack Router, TanStack Query, React 19, Tailwind 4 다.
버전은 `apps/web/package.json` 에 있고 고정되어 있다.

출처는 멘토링 정리본이다. 저장소 밖에서 쓰인 문서라 여기 없는 도구와
ADR 이 금지한 것이 섞여 있었고, 덜어내고 옮겼다. 무엇을 왜 뺐는지는
[ADR 0018](adr/0018-frontend-rules-selective-port.md) 에 있다.

이 문서는 코드 규칙만 정한다. 무엇이 어디에 어떤 값으로 나오는지는
`docs/mockups/` 의 HTML 이 정답지다.

## 1. 어겨서는 안 되는 것

2장부터는 근거가 있으면 예외를 둘 수 있다. 이 표는 아니다.

| 규칙 | 상세 |
| --- | --- |
| 컴포넌트는 화살표 함수로 선언하고 파일 끝에서 default export 한다 | [2장](#2-파일과-컴포넌트) |
| props 는 `{컴포넌트명}Props` 라는 별도 `type` 으로 선언한다 | [2장](#2-파일과-컴포넌트) |
| `React.FC` 를 쓰지 않는다 | [2장](#2-파일과-컴포넌트) |
| 폴더를 벗어나는 import 는 경로 별칭으로 한다 | [3장](#3-디렉터리와-경로-별칭) |
| 지면 전용 컴포넌트를 다른 지면에서 import 하지 않는다 | [3장](#3-디렉터리와-경로-별칭) |
| `any` 를 쓰지 않는다. 모르면 `unknown` 으로 받아 좁힌다 | [4장](#4-타입과-값) |
| 생년월일시를 URL 과 로그에 남기지 않는다 | [5장](#5-상태) |
| 상태를 직접 바꾸지 않는다. 변경 경로의 객체를 전부 새로 만든다 | [5장](#5-상태) |
| 리스트 `key` 에 배열 인덱스를 쓰지 않는다 | [6장](#6-렌더링) |
| `useMemo`, `useCallback`, `React.memo` 를 수동으로 넣지 않는다 | [6장](#6-렌더링) |
| 데이터를 `useEffect` 로 가져오지 않는다 | [7장](#7-이펙트) |
| `createServerFn` 을 데이터 경로로 쓰지 않는다 | [9장](#9-데이터-가져오기) |
| 라우트 파일에는 조립만 두고 화면 구현은 `features/` 에 둔다 | [10장](#10-라우팅) |
| 경계를 앱 전체에 하나만 두지 않는다 | [11장](#11-경계) |
| 이미지와 임베드에 크기를 지정한다 | [12장](#12-성능) |

화면 코드가 지는 표기 의무는 이 문서 밖에 있다.
계산이 세운 가정을 알리는 경고 문구([01](01-overview.md) 5.1),
접힌 신살 이름을 어떻게 보일지([07](07-sinsal-rules.md) 6장)가 그것이다.

간지, 오행, 십신, 용신, 신살을 화면 코드에서 계산하지 않는다.
**계산과 판정은 `apps/web/src/lib/saju` 의 순수 함수만 한다.**
화면은 그 결과를 받아 그리기만 한다.

## 2. 파일과 컴포넌트

```tsx
// apps/web/src/features/result/components/PillarCard.tsx
import { branchOf, stemOf, type Pillar } from '@saju';

type PillarCardProps = {
  pillar: Pillar;
  label: string;
  onSelect: (label: string) => void;
};

const PillarCard = ({ pillar, label, onSelect }: PillarCardProps) => {
  const handleClick = () => {
    onSelect(label);
  };

  return (
    <button type="button" onClick={handleClick}>
      <span>{stemOf(pillar)}</span>
      <span>{branchOf(pillar)}</span>
    </button>
  );
};

export default PillarCard;
```

컴포넌트는 화살표 함수로 선언하고 파일 끝에서 default export 한다.
선언과 export 를 한 줄에 붙이지 않는다.

props 는 인라인 타입 리터럴 대신 `{컴포넌트명}Props` 로 따로 선언한다.
children 이 필요하면 그 타입에 명시한다.

`React.FC` 를 쓰지 않는다. children 을 암묵으로 포함하고 제네릭 컴포넌트를 막는다.

파일 안의 순서는 타입, 하위 컴포넌트, 메인 컴포넌트, export 다.
화살표 함수는 호이스팅되지 않으므로 이 순서가 강제된다.

`src/lib/saju` 는 이 규칙 밖이다. 컴포넌트가 아니라 순수 함수 모음이고
named export 를 쓴다. 그쪽 규칙은 [엔진 README](../apps/web/src/lib/saju/README.md) 에 있다.

### 2.1 컴포넌트 안의 함수

내부 함수도 화살표 함수로 쓴다. 이벤트 핸들러는 `handle` 로 시작하고,
props 로 넘기는 콜백은 `on` 으로 시작한다.

핸들러가 스무 줄을 넘거나 컴포넌트 상태를 읽지 않으면 파일 밖 유틸로 뺀다.
`renderItem` 처럼 JSX 를 반환하는 내부 함수는 만들지 않는다. 컴포넌트로 분리한다.

## 3. 디렉터리와 경로 별칭

```
apps/web/src/
├── routes/            라우트 정의만. 화면 구현을 두지 않는다
│   └── api/           서버 라우트. 시크릿과 외부 API 호출이 여기서만 일어난다
├── features/          지면 단위 화면 조립
│   ├── input/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/      그 지면에서만 쓰는 순수 함수. named export (13장)
│   │   ├── api/        그 지면이 부르는 queryOptions (9장)
│   │   └── InputPage.tsx
│   └── result/
├── components/        지면 공통 컴포넌트
├── shared/            지면 사이로 넘기는 값의 타입과 스키마와 스토어
├── lib/saju/          계산 엔진. 외부 의존 0
├── server/            Supabase 접근, LLM 공급자
└── styles.css
```

지면은 [01](01-overview.md) 4장의 화면 다섯을 말한다.
입력, 결과, 내 사주, 공유, 설정이다.

경로 별칭은 다섯이고 `apps/web/tsconfig.json` 의 `paths` 가 단일 소스다.

| 별칭 | 가리키는 곳 |
| --- | --- |
| `@saju` | `src/lib/saju/index.ts` |
| `@saju/*` | `src/lib/saju/*` |
| `@components/*` | `src/components/*` |
| `@features/*` | `src/features/*` |
| `@shared/*` | `src/shared/*` |

`vite.config.ts` 와 `vitest.config.ts` 는 별칭을 다시 나열하지 않는다.
`resolve.tsconfigPaths: true` 로 tsconfig 를 그대로 읽는다.
두 곳에 나눠 적으면 타입체크는 통과하는데 런타임에서 깨진다.

별칭을 늘려야 하면 tsconfig 와 이 표와 [02](02-architecture.md) 4장 트리를 함께 고친다.
`@types/*` 는 두지 않는다. npm 의 DefinitelyTyped 네임스페이스와 겹쳐
`@types/node` 해석을 흔든다.

규칙은 셋이다.

- 같은 폴더 안의 파일만 `./` 로 가져온다. 폴더를 벗어나면 별칭을 쓴다
- 지면 전용 컴포넌트를 다른 지면에서 가져오지 않는다.
  두 지면이 함께 쓰게 되면 `@components` 로 올린다.
  컴포넌트가 아닌 것은 `@shared` 로 올린다. 지면 사이로 넘기는 값의 타입과 스키마와 스토어가 그것이다
- import 순서는 외부 패키지, 별칭, 상대 경로, 스타일 순이다.
  이 순서를 강제하는 린트 규칙은 아직 없다. 사람이 지킨다

`src/lib/saju/**` 는 반대다. oxlint `no-restricted-imports` 가 그 안에서
별칭과 패키지 import 를 전부 막고 상대 경로만 허용한다.
엔진의 외부 의존을 0 으로 유지하는 장치이고, 별칭 규칙보다 우선한다.

## 4. 타입과 값

`undefined` 는 아직 값이 정해지지 않은 것, `null` 은 의도적으로 비운 것이다.
조회 전과 조회했지만 없음을 구분해야 할 때 셋을 함께 쓴다.

```ts
// apps/web/src/features/my/hooks/useSavedSaju.ts
const [saju, setSaju] = useState<SavedSaju | null | undefined>(undefined);
```

API 응답 타입에서 둘을 섞지 않는다. 서버 스키마 기준으로 하나를 고른다.

`0`, 빈 문자열, `false` 가 유효한 값이면 `||` 가 아니라 `??` 를 쓴다.
경도 0 도, 보정 분 0 도 유효한 값이다.

옵셔널 체이닝으로 에러를 삼키지 않는다.
없으면 안 되는 값은 타입으로 보장하거나 그 자리에서 던진다.

객체 형태는 `type` 으로 쓴다. 라이브러리 타입을 확장할 때만 `interface` 를 쓴다.
`enum` 대신 `as const` 객체와 union 타입을 쓴다.

`any` 를 쓰지 않는다. 모르면 `unknown` 으로 받아 좁힌다.
바깥에서 들어오는 값은 타입 단언으로 넘기지 않고 런타임에 검증한다.
API 응답, URL 파라미터, `localStorage`, 히스토리 state 가 그 경계다.

히스토리 state 와 `localStorage` 가 경계인 것은 브라우저가 복원해 주기 때문이다.
앞 버전이 넣은 모양이 그대로 돌아올 수 있고, 사용자가 고칠 수도 있다.
메모리 스토어는 브라우저를 거치지 않아 이 경계가 아니다.

검증 라이브러리는 zod 를 쓴다. 폼 자체의 값은 여기 해당하지 않는다.
제어 컴포넌트의 상태는 우리가 만든 것이라 경계 밖이다.

## 5. 상태

상태는 바뀌면 화면을 다시 그려야 하는 값이다. 그 외는 상태가 아니다.

| 값의 성격 | 두는 곳 |
| --- | --- |
| 화면에 반영되어야 함 | `useState`, `useReducer` |
| 폼이 받는 입력값 | react-hook-form (8장) |
| 렌더링과 무관하게 값만 유지 | `useRef` |
| props 나 state 로 계산 가능 | 상태로 만들지 않고 렌더 중 계산 |
| 서버에서 온 데이터 | 라우트 loader 와 TanStack Query |
| 새로고침과 링크 공유를 견뎌야 하는 뷰 상태 | URL search params |
| 지면 사이로 넘기는 값 | 라우터 컨텍스트에 실은 zustand 스토어 (5.1) |
| 모듈 전역 상수 | 컴포넌트 바깥 |

파생 상태를 만들지 않는다. `useEffect` 로 state 를 state 에 동기화하는 코드는
대개 설계가 틀린 것이다.

모듈 스코프에 상태를 두지 않는다. 모듈 캐싱 때문에 싱글턴처럼 굴어
언마운트해도 초기화되지 않고, SSR 에서는 요청끼리 값이 섞인다.

상태는 쓰는 컴포넌트에 가장 가깝게 두고, 공유가 필요해질 때만 공통 조상으로 올린다.

초기값 계산이 무거우면 함수를 넘긴다.

```ts
// apps/web/src/features/settings/hooks/useCalcOptions.ts
const [options] = useState(() => readStoredOptions());
```

### 5.1 URL 에 두는 것과 두지 않는 것

TanStack Router 는 search params 에 타입과 런타임 검증을 붙인다.
탭, 필터, 펼침 여부처럼 새로고침과 링크 공유를 견뎌야 하는 값은 여기 둔다.
상태 동기화 코드가 사라지고 뒤로가기가 그냥 동작한다.

```tsx
// apps/web/src/routes/result.tsx
const { tab } = Route.useSearch();
const navigate = Route.useNavigate();

const handleTabChange = (next: ResultTab) => {
  navigate({ search: (prev) => ({ ...prev, tab: next }) });
};
```

**생년월일시는 URL 에 넣지 않는다.** 개인정보이고 리퍼러와 서버 로그에 남는다.
공유 링크는 사주 원본이 아니라 서버가 발급한 식별자를 담는다([ADR 0009](adr/0009-share-link-policy.md)).
같은 이유로 콘솔과 에러 리포팅에도 생년월일시를 싣지 않는다.

지면 사이로 넘겨야 하면 zustand 스토어를 쓴다.
스토어는 `getRouter()` 안에서 만들어 라우터 컨텍스트에 싣는다.
모듈 스코프에 두면 SSR 에서 요청끼리 값이 섞이고, 그 값이 생년월일시라 특히 안 된다.
zustand 도 요청마다 만들라고 권한다.

```ts
// apps/web/src/router.tsx
context: { queryClient, sajuStore: createSajuStore() },
```

보내는 쪽은 스토어에 담고 이동만 하고, 받는 쪽은 `beforeLoad` 에서 컨텍스트로 읽는다.
`useNavigate` 에 값을 실어 보내지 않는다.

받는 쪽은 값이 없을 때를 반드시 다룬다.
스토어는 메모리에만 있으므로 그 라우트를 직접 열거나 새로고침하면 비어 있다.
`beforeLoad` 에서 검증하고 없으면 앞 지면으로 되돌린다.
서버가 리다이렉트로 응답하면 그 라우트의 HTML 이 나가지 않는다.

### 5.2 불변성

React 는 `Object.is` 로 얕게 비교한다. 참조가 그대로면 다시 그리지 않는다.

```ts
// apps/web/src/features/my/hooks/useSajuList.ts
// 전. 같은 배열을 그대로 넘겨 다시 그려지지 않는다
list.push(item);
setList(list);

// 후
setList((prev) => [...prev, item]);
```

전개 연산자와 `Object.assign` 과 `slice` 는 한 겹만 복사한다.
중첩된 값을 고칠 때는 변경 경로에 있는 객체를 전부 새로 만든다.

### 5.3 Context

Context 는 전역 상태 도구가 아니라 의존성 주입 도구다.
자주 바뀌는 값을 넣으면 구독 트리 전체가 다시 그려진다.
값과 액션을 나눠 두 개로 만든다.

React 19 부터 `<Context>` 를 Provider 로 바로 쓰고 `useContext` 대신 `use` 를 쓴다.

셀렉터 단위 구독이 필요해지면 Context 로 흉내내지 않고 전용 라이브러리를 쓴다.
어느 것을 쓸지는 아직 정하지 않았다. 필요해질 때 ADR 로 정한다.

서버에서 온 데이터를 전역 스토어에 넣지 않는다. loader 와 Query 가 맡는다.

## 6. 렌더링

리스트 `key` 는 데이터의 고유 식별자를 쓴다.
배열 인덱스를 쓰면 중간에 넣거나 지우거나 정렬할 때
React 가 엉뚱한 노드를 재사용해 입력값과 포커스가 딸려간다.
순서가 절대 바뀌지 않고 항목이 상태를 갖지 않는 정적 리스트만 예외다.

`key` 를 바꿔 일부러 리마운트시킬 때는 그 의도를 주석으로 남긴다.

다시 그리는 범위를 줄이는 순서는 이렇다.

1. 상태를 쓰는 가장 작은 컴포넌트로 내린다
2. 정적인 트리를 `children` 으로 받아 리렌더 대상에서 뺀다
3. 상태 변경 범위를 컴포넌트 경계로 자른다

`useMemo`, `useCallback`, `React.memo` 를 수동으로 넣지 않는다.
React Compiler 가 켜져 있고 oxlint `react/react-compiler` 가 error 로 잡는다.
수동 메모와 섞이면 컴파일러의 추론을 방해한다.

스타일은 Tailwind 4 만 쓴다. 설정은 `src/styles.css` 의 `@theme` 블록에 두고
`tailwind.config` 파일을 만들지 않는다.
자주 그려지는 자리에 인라인 `style` 객체를 두지 않는다. 매 렌더 새 객체가 된다.

## 7. 이펙트

`useEffect` 는 외부 시스템과 동기화할 때만 쓴다.
구독, 타이머, 로깅, React 가 모르는 DOM 조작이 그것이다.

쓰면 안 되는 자리가 셋이다.

- props 나 state 로 계산되는 값. 렌더 중에 계산한다
- 사용자 동작에 대한 반응. 이벤트 핸들러에서 한다
- 데이터 가져오기. 라우트 loader 와 TanStack Query 가 한다

린트가 요구하는 의존성을 지우지 않는다. 걸리면 이펙트를 다시 설계한다.
`react/exhaustive-deps` 가 warn 으로 잡는다.

cleanup 을 반드시 쓴다. 구독 해제, 타이머 제거, `AbortController` 취소다.

`useLayoutEffect` 는 페인트 전에 동기로 재야 하는 DOM 측정에만 쓴다.
스크롤 복원과 툴팁 위치가 그런 경우다. SSR 에서는 실행되지 않아 경고가 뜬다.

## 8. 폼

| | 제어 | 비제어 |
| --- | --- | --- |
| 값의 흐름 | 상태에서 DOM 으로 | ref 로 읽어옴 |
| 다시 그리기 | 입력마다 | 없음 |
| 맞는 자리 | 실시간 검증, 값에 따라 UI 가 갈릴 때 | 항목이 많고 제출 시점에만 값이 필요할 때 |

기본은 제어 컴포넌트다. 성능 문제가 측정되면 그때 비제어로 바꾼다.

제어와 비제어를 실행 중에 바꾸지 않는다. 초기값을 `?? ''` 로 항상 정의한다.

입력 화면은 생년월일시와 성별과 경도와 계산 옵션을 받는다.
폼 상태는 react-hook-form 이 든다([ADR 0021](adr/0021-react-hook-form-for-input.md)).
`useState` 를 여럿 두고 손으로 맞추지 않는다.

값을 라이브러리에 등록하는 방식은 둘로 나눈다.
검증 규칙이 붙는 칸은 `useController` 로 등록하고, 입력칸이 없거나 값이 틀릴 수 없는 것은
`setValue` 와 `watch` 로 든다. 출생지와 성별과 양력음력과 윤달이 뒤쪽이다.

`Controller` 를 표시 컴포넌트 안에 넣지 않는다.
`BirthFields` 는 값과 콜백만 받는 제어 컴포넌트로 두고 등록은 지면이 한다.
그래야 목업과 대조할 때 라이브러리를 읽지 않아도 된다.

엔진이 검증하는 것을 폼이 다시 검증하지 않는다.
`lib/saju` 가 지원 범위 밖과 음력 윤달 오류를 `RangeError` 로 던지므로
제출 시점에 한 번 돌려 보고 그 메시지를 그대로 낸다.
같은 판정을 폼에 다시 적으면 두 벌이 되고, 엔진이 범위를 넓혀도 폼이 계속 막는다.

폼이 막아야 하는 것은 엔진이 보지 않는 것들이다.
`calendar.ts` 는 순수 정수 산술이라 2월 30일을 던지지 않고 조용히 다른 날로 굴린다.
양력 월과 일의 실재, 시와 분의 범위가 폼 몫이다.

검증 규칙 본문은 순수 함수에 두고 `rules.validate` 가 그것을 부르기만 한다.
`parseDate` 와 `parseTime` 이 그 자리다. 규칙 안에 판정을 직접 적으면
폼을 띄우지 않고는 확인할 수 없게 된다.

구분자 자동 입력은 검증이 아니라 표기다. 날짜의 `-` 와 시각의 `:` 가 그것이고
`utils/birth.ts` 의 `maskDate` 와 `maskTime` 이 입력마다 값을 다시 만든다.
파서는 구분자를 가리지 않으므로 마스킹이 없어도 읽는 쪽은 그대로다.

## 9. 데이터 가져오기

| 무엇을 | 무엇으로 |
| --- | --- |
| 화면 진입에 필요한 데이터 | 라우트 `loader` |
| 서버 호출 | API 라우트 (`src/routes/api/`) |
| 캐싱, 재검증, 낙관적 업데이트 | TanStack Query |
| 화면 안의 동작으로 생기는 요청 | `useMutation` |

`createServerFn` 을 데이터 경로로 쓰지 않는다.
앱은 `capacitor://localhost` 오리진에서 뜨므로 상대 경로 호출이 서버로 나가지 않는다.
서버 호출을 명시적 API 라우트로 통일하고 base URL 을 빌드 시점에 주입한다
([ADR 0004](adr/0004-api-routes-over-server-functions.md), [ADR 0003](adr/0003-spa-bundle-for-app.md)).

사주 계산은 이 표에 없다. 클라이언트 안에서 끝나므로 서버를 거치지 않는다.
서버가 맡는 것은 저장, 공유 링크, LLM 해석 셋이다.

loader 에서 Query 의 `ensureQueryData` 를 부르고 컴포넌트에서 같은 키로
`useSuspenseQuery` 를 쓴다. 프리페치와 캐시를 한 번에 얻고 `data` 가 항상 정의된다.

```ts
// apps/web/src/features/result/api/interpretation.ts
import { queryOptions } from '@tanstack/react-query';

export const interpretationQuery = (hash: string) =>
  queryOptions({
    queryKey: ['interpretation', hash],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_BASE_URL}/api/interpretations/${hash}`, {
        signal,
      });
      if (!res.ok) throw new Error(`해석 조회 실패 (${res.status})`);
      return parseInterpretation(await res.json());
    },
  });
```

`queryKey` 에 생년월일시를 넣지 않는다. 해석 캐시 키는 팔자와 판정 결과와
계산 옵션과 프롬프트 버전과 모델 버전의 해시다.

API 라우트는 입력을 검증한다. 비밀키와 DB 접근은 그 안에서만 한다.
클라이언트 번들로 새지 않도록 환경변수 접두사 규칙을 지킨다.

### 9.1 SSR 에서 조심할 것

컴포넌트 최상단에서 `window`, `document`, `localStorage` 를 바로 읽지 않는다.

하이드레이션이 어긋나는 값을 첫 렌더에 넣지 않는다.
`Math.random()`, `Date.now()`, 로케일에 따라 달라지는 포맷이 그것이다.
계산 엔진은 애초에 이 셋을 쓰지 않고 훅이 막는다([ADR 0013](adr/0013-saju-engine-purity-enforcement.md)).
화면 코드에는 그 훅이 걸리지 않으므로 사람이 지킨다.

클라이언트에서만 도는 컴포넌트는 SSR 을 끄거나 마운트 이후에 그린다.

## 10. 라우팅

`src/routes/` 에는 라우트 정의만 둔다. 화면 구현은 `features/` 에 두고 여기서 조립한다.

라우트 파일은 컴포넌트를 먼저 쓰고 `export const Route` 를 나중에 쓴다.
화살표 함수가 호이스팅되지 않기 때문이다.

```tsx
// apps/web/src/routes/result.tsx
import { createFileRoute } from '@tanstack/react-router';
import ResultPage from '@features/result/ResultPage';
import ResultError from '@features/result/components/ResultError';
import ResultSkeleton from '@features/result/components/ResultSkeleton';
import { interpretationQuery } from '@features/result/api/interpretation';

export const Route = createFileRoute('/result')({
  validateSearch: resultSearchSchema,
  loaderDeps: ({ search }) => ({ hash: search.hash }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(interpretationQuery(deps.hash)),
  pendingComponent: ResultSkeleton,
  errorComponent: ResultError,
  component: ResultPage,
});
```

경로 문자열을 손으로 조립하지 않는다.
`<Link to="/share/$shareId" params={{ shareId }} />` 로 써서 타입 검증을 받는다.
파라미터와 search params 는 `Route.useParams()` 와 `Route.useSearch()` 로 읽는다.

`routeTree.gen.ts` 는 자동 생성 파일이라 고치지 않는다. 훅이 편집을 차단한다.

`__root.tsx` 는 코드 스플리팅 대상이 아니다. 여기에 무거운 의존성을 두지 않는다.
라우트 밖의 무거운 모달과 차트는 `React.lazy` 로 미뤄 부른다.

`defaultPreload: 'intent'` 는 `src/router.tsx` 에 이미 켜져 있다.

라우트 단위 코드 스플리팅은 아직 켜지 않았다.
`tsr.config.json` 이 지금 `{ "target": "react" }` 뿐이고 `.lazy.tsx` 사용 사례가 없다.
자동 분할과 `createLazyFileRoute` 중 어느 쪽을 쓸지는 실제 라우트가 생길 때 정한다.
어느 쪽이든 `loader`, `beforeLoad`, `validateSearch` 는 lazy 파일로 옮길 수 없다.
라우트를 매칭하고 프리로드하는 시점에 필요하기 때문이다.

## 11. 경계

경계를 앱 전체에 하나만 두지 않는다. 실패가 번지는 범위가 곧 경계의 범위다.

| 층 | 로딩 | 에러 |
| --- | --- | --- |
| 앱 루트 | 없음 | `defaultErrorComponent` |
| 라우트 | `pendingComponent` | `errorComponent`, `notFoundComponent` |
| 콘텐츠 블록 | `Suspense` | `CatchBoundary` |
| 말단 요소 | 스켈레톤 | 요소별 폴백 |

Error Boundary 가 Suspense 보다 바깥에 온다.
폴백에는 되돌아갈 수단을 반드시 넣는다. `errorComponent` 가 받는 `reset` 을 부르는
재시도 버튼이 그것이다.

### 11.1 블록 단위

위젯 하나가 죽어서 화면 전체가 사라지면 안 된다.
결과 화면에서 해석문은 LLM 을 타고 신살과 대운은 로컬 계산이다.
해석문이 실패해도 팔자와 신살은 그대로 보여야 한다.

```tsx
// apps/web/src/features/result/ResultPage.tsx
const ResultPage = () => {
  return (
    <>
      <PillarBoard />
      <SinsalList />

      <CatchBoundary
        getResetKey={() => 'interpretation'}
        errorComponent={InterpretationError}
      >
        <Suspense fallback={<InterpretationSkeleton />}>
          <Interpretation />
        </Suspense>
      </CatchBoundary>
    </>
  );
};

export default ResultPage;
```

`getResetKey` 가 바뀌면 경계가 스스로 초기화된다.
라우트를 옮겼을 때 이전 에러가 남지 않도록 키를 정한다.

스켈레톤 크기를 실제 콘텐츠와 맞춘다. 어긋나면 레이아웃이 밀린다.
Suspense 를 너무 위에 두면 넓은 영역이 통째로 폴백으로 바뀐다. 블록까지 내린다.

### 11.2 Error Boundary 가 못 잡는 것

Error Boundary 는 렌더링 중에 동기로 던져진 에러만 잡는다.

| 어디서 나는 에러 | 무엇이 잡는가 |
| --- | --- |
| 이벤트 핸들러 안 | `try` / `catch` 와 에러 상태 |
| `setTimeout` 과 비동기 콜백 | 상태에 담았다가 렌더 중에 던진다 |
| 이미지와 스크립트 로드 실패 | `onError` 이벤트 |
| SSR 중 서버 에러 | 라우트 `errorComponent` 와 서버 로그 |

이미지 로드 실패가 특히 헷갈린다.
`img` 의 404 는 렌더 에러를 던지지 않고 `onError` 이벤트만 낸다.
경계를 씌워 두고 처리했다고 여기면 깨진 아이콘이 그대로 나간다.

```tsx
// apps/web/src/components/SafeImage.tsx
type SafeImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  fallbackSrc?: string;
};

const SafeImage = ({
  src,
  alt,
  width,
  height,
  fallbackSrc = '/images/fallback.png',
}: SafeImageProps) => {
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleError = () => {
    if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      onError={handleError}
    />
  );
};

export default SafeImage;
```

`src` 가 바뀌어도 상태는 따라오지 않는다. 목록에서는 `key={src}` 로 리마운트시킨다.
크기를 반드시 지정한다. 폴백으로 바뀔 때 레이아웃이 흔들리지 않게 하는 것이다.
반복되는 아바타와 썸네일은 이 컴포넌트로 통일하고 `onError` 를 흩뿌리지 않는다.

TanStack Query 의 `throwOnError` 를 켜면 쿼리 에러가 경계까지 올라간다.

## 12. 성능

이미지와 비디오와 임베드에 `width` 와 `height` 또는 `aspect-ratio` 를 지정한다.
나중에 끼어드는 배너와 알림은 자리를 미리 잡아 둔다.

위치를 옮길 때는 `top` 과 `left` 가 아니라 `transform: translate` 를 쓰고
투명도는 `opacity` 를 쓴다. 레이아웃과 페인트를 건너뛰고 합성만 일어난다.
`will-change` 는 실제로 움직이는 요소에 필요한 동안만 건다.
프레임 단위 작업은 `setTimeout` 이 아니라 `requestAnimationFrame` 으로 한다.

숨기는 방법마다 남는 것이 다르다.

| 방법 | 렌더 트리 | 자리 | 상태 |
| --- | --- | --- | --- |
| 언마운트 | 빠짐 | 없음 | 사라짐 |
| `display: none` | 빠짐 | 없음 | DOM 유지 |
| `visibility: hidden` | 남음 | 차지함 | 유지 |
| React 19 `Activity` | 숨김 | 없음 | 보존 |

결과 화면의 탭처럼 상태를 지켜야 하면 언마운트하지 말고 `Activity` 를 쓴다.
`display: none` 과 `visibility: hidden` 은 스크린 리더에서도 빠진다.
눈에만 안 보이게 하려면 sr-only 방식을 쓴다.

뷰포트 밖 이미지는 `loading="lazy"`, LCP 후보는 `fetchpriority="high"` 로 먼저 받는다.
`alt` 는 필수이고 장식용 이미지는 빈 문자열을 준다.

## 13. 빌드와 캐시

함수 단위 named export 로 내보낸다. 객체 하나에 묶어 default export 하면
트리 셰이킹이 걸리지 않아 전부 번들에 들어간다.

```ts
// apps/web/src/features/result/utils/format.ts
// 전. 객체로 묶으면 하나만 써도 전부 딸려 들어간다
export default { formatPillar, formatSinsal };

// 후
export const formatPillar = (pillar: Pillar) => {
  /* ... */
};
export const formatSinsal = (sinsal: Sinsal) => {
  /* ... */
};
```

2장의 default export 규칙은 컴포넌트 파일에만 적용된다. 유틸 모듈은 여기를 따른다.

리소스마다 캐시 헤더를 명시한다. 지정하지 않으면 브라우저가 임의로 캐시한다.

| 리소스 | 헤더 |
| --- | --- |
| SSR 로 만든 HTML | `no-cache` 또는 짧은 `s-maxage` 와 SWR |
| 해시가 붙은 JS 와 CSS | `max-age=31536000, immutable` |
| 이미지와 폰트 | 해시 파일명에 장기 캐시 |
| API 응답 | 엔드포인트마다 정한다 |

CDN 을 무효화해도 브라우저 캐시는 지워지지 않는다. 파일명 해시가 해결책이다.
검증 캐시(`ETag`)와 강제 캐시(`max-age`)의 역할을 섞지 않는다.

웹은 Vercel 에 SSR 로 배포하고 앱은 SPA 번들을 Capacitor 에 넣는다
([ADR 0012](adr/0012-vercel-deploy.md), [ADR 0003](adr/0003-spa-bundle-for-app.md)).
`vite.config.ts` 가 `SAJU_BUILD_TARGET` 으로 갈린다.

## 14. 이 규칙을 강제하는 것

사람이 지켜야 하는 것과 기계가 잡는 것을 구분한다.

| 무엇을 | 무엇이 잡는가 |
| --- | --- |
| 훅 규칙, 수동 메모이제이션 | oxlint `react/rules-of-hooks`, `react/react-compiler` |
| 이펙트 의존성 | oxlint `react/exhaustive-deps` (warn) |
| 쿼리 사용 | oxlint `@tanstack/query/*` |
| 엔진 import 경계 | oxlint `no-restricted-imports` |
| 도달 불가 분기 | tsgolint `no-unnecessary-condition` |
| 타입 계약 | `tsc --noEmit` |
| 포맷 | oxfmt, `format-file.sh` 훅 |
| 자동 생성 라우트 트리 편집 | `protect-routetree.sh` 훅 |
| 엔진의 환경 의존 호출 | `saju-engine-purity.sh` 훅 |
| 표기 의무와 목업 대조 | `saju-screen-validator` 에이전트 |

eslint 와 prettier 는 쓰지 않는다. oxlint 와 oxfmt 가 그 자리에 있다.
설정은 `apps/web/.oxlintrc.json` 과 루트 `.oxfmtrc.json` 이다.

나머지는 기계가 잡지 않는다. 지면 경계, 상태의 위치, 경계 배치,
`key` 선택이 그렇다. 리뷰와 `frontend` 스킬의 체크리스트가 맡는다.

## 15. 이 문서 밖

- 커밋과 PR 규칙은 루트 [CLAUDE.md](../CLAUDE.md) 의 Git 절과 `commit`, `pr` 스킬에 있다
- 작업 방식과 성공 조건은 [06](06-code-working-rules.md) 이다
- AI 에게 줄 컨텍스트를 어떻게 쪼갤지는 이 문서와 `frontend` 스킬의 관계가 그 예다.
  canonical 규칙은 여기 두고 적용 방법과 체크리스트는 스킬에 둔다
- 이상 구간 경고 일곱 종의 문구는 [01](01-overview.md) 5.1 이 확정했다.
  화면 디자인과 절입 근처 경고는 아직 정하지 않았다. 루트 CLAUDE.md 가 그렇게 적고 있다
