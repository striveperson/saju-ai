---
name: frontend
description: 화면 코드를 쓸 때 자주 틀리는 자리의 고치기 전후 예시와 체크리스트. 규칙 목록은 docs/03 에 있고 이 스킬은 적용을 담당한다. 컴포넌트나 라우트를 새로 만들 때, 경계를 배치할 때, 화면 코드를 리뷰할 때 사용한다. "화면 만들어줘", "컴포넌트 추가해줘", /frontend 로 부른다.
---

# 화면 코드

규칙의 canonical 목록은 [docs/03-frontend-rules.md](../../../docs/03-frontend-rules.md) 다.
어긋나면 03 이 맞다. 이 스킬은 그 규칙을 적용하는 방법과 고치기 전후를 담는다.

oxlint, tsgolint, 훅이 이미 잡는 것은 여기서 다루지 않는다.
훅 규칙, 수동 메모이제이션, 쿼리 사용, 엔진 import 경계, 포맷, 라우트 트리 편집이 그것이다.
목록은 03 의 14장에 있다.

여기 있는 것은 기계가 못 잡는 것들이다. 지면 경계, 상태의 위치, 경계 배치,
`key` 선택, 이미지 실패 경로다. 전부 타입체크와 lint 를 통과한 채로 잘못될 수 있다.

## 시작하기 전에

만들려는 것이 어느 지면에 속하는지 먼저 정한다.
입력, 결과, 내 사주, 공유, 설정 다섯 중 하나면 `features/<지면>/` 아래다.
둘 이상이 쓰면 `components/` 다.

"나중에 공유할 것 같으니 일단 `components/`" 를 하지 않는다.
지면 하나가 쓰는 것을 공통에 두면 그 지면의 사정이 공통 컴포넌트에 새어 들어간다.
두 번째 지면이 실제로 쓰게 될 때 옮긴다.

## 고치기 전후

### 파생 상태

`useEffect` 로 state 를 state 에 맞추는 코드는 렌더가 두 번 돈다.
중간 프레임에 옛 값이 그려지고, 동기화를 빠뜨리면 조용히 어긋난다.

```tsx
// 전
const [list, setList] = useState<SavedSaju[]>([]);
const [hasShared, setHasShared] = useState(false);

useEffect(() => {
  setHasShared(list.some((saju) => saju.shareId !== null));
}, [list]);

// 후
const [list, setList] = useState<SavedSaju[]>([]);
const hasShared = list.some((saju) => saju.shareId !== null);
```

### 인덱스 key

지우거나 정렬할 때 React 가 엉뚱한 노드를 재사용한다.
입력값과 포커스가 옆 항목으로 딸려간다.

```tsx
// 전
{savedList.map((saju, i) => (
  <SajuRow key={i} saju={saju} />
))}

// 후
{savedList.map((saju) => (
  <SajuRow key={saju.id} saju={saju} />
))}
```

고유 식별자가 없으면 만든다. 서버가 안 주면 목록을 만들 때 붙인다.

### 이미지 실패를 경계로 잡으려는 것

`img` 의 404 는 렌더 에러를 던지지 않는다. `onError` 이벤트만 난다.
경계를 씌워 두면 처리한 것처럼 보이지만 깨진 아이콘이 그대로 나간다.

```tsx
// 전
<CatchBoundary getResetKey={() => 'avatar'} errorComponent={AvatarError}>
  <img src={user.avatarUrl} alt="" />
</CatchBoundary>

// 후
<SafeImage src={user.avatarUrl} alt="" width={40} height={40} />
```

반대로 데이터 가져오기 실패는 던져지므로 경계가 맡는다. 두 경로를 섞지 않는다.

### 경계를 너무 위에 두는 것

결과 화면에서 해석문만 LLM 을 탄다. 나머지는 로컬 계산이라 실패하지 않는다.
경계를 페이지 전체에 두면 해석문 하나 때문에 팔자까지 사라진다.

```tsx
// 전
<Suspense fallback={<ResultSkeleton />}>
  <PillarBoard />
  <SinsalList />
  <Interpretation />
</Suspense>

// 후
<PillarBoard />
<SinsalList />
<CatchBoundary getResetKey={() => 'interpretation'} errorComponent={InterpretationError}>
  <Suspense fallback={<InterpretationSkeleton />}>
    <Interpretation />
  </Suspense>
</CatchBoundary>
```

### URL 에 넣으면 안 되는 것

생년월일시는 개인정보다. search params 에 넣으면 리퍼러와 서버 로그에 남는다.

```tsx
// 전
navigate({ to: '/result', search: { birth: '1990-03-15T07:20', lon: 126.98 } });

// 후
navigate({ to: '/result', search: { hash: resultHash, tab: 'sinsal' } });
```

탭이나 펼침 여부는 반대로 URL 에 둔다. 새로고침과 뒤로가기가 그냥 동작한다.

### 화면에서 계산하는 것

간지, 오행, 십신, 용신, 신살을 화면 코드가 다시 계산하지 않는다.
같은 판정이 두 곳에 생기면 둘이 갈라지고, 화면 쪽이 틀려도 테스트가 통과한다.

```tsx
// 전. 화면이 신강약을 다시 판정한다
const isStrong = countByElement['목'] + countByElement['수'] > 4;

// 후. 엔진이 낸 StrengthResult 를 그대로 받는다
const { grade } = result.strength;
```

## 쓰고 나서 확인

### 컴포넌트

- [ ] 화살표 함수 선언, `{컴포넌트명}Props` 타입, 파일 끝 `export default` 인가
- [ ] 내부 함수가 화살표 함수이고 핸들러가 `handle` 로 시작하는가
- [ ] 폴더를 벗어나는 import 가 전부 별칭인가
- [ ] 지면 전용 컴포넌트를 다른 지면에서 끌어 쓰지 않았는가
- [ ] 이 값이 상태여야 하는가. URL search params 가 맞지 않는가
- [ ] `useEffect` 로 파생 상태를 만들고 있지 않은가
- [ ] `key` 가 인덱스가 아닌가
- [ ] 이펙트에 cleanup 이 있는가

### 라우트

- [ ] 라우트 파일에 조립만 있고 화면 구현은 `features/` 에 있는가
- [ ] 컴포넌트를 먼저 쓰고 `export const Route` 를 나중에 썼는가
- [ ] `loader` 로 프리페치했는가. `useEffect` 로 가져오고 있지 않은가
- [ ] `pendingComponent` 와 `errorComponent` 를 걸었는가
- [ ] `errorComponent` 에 `reset()` 을 부르는 재시도 수단이 있는가
- [ ] `createServerFn` 을 데이터 경로로 쓰지 않았는가

### 경계

- [ ] 따로 실패해도 되는 블록마다 `CatchBoundary` 가 있는가
- [ ] Suspense 폴백 크기가 실제 콘텐츠와 맞는가
- [ ] 이미지 실패를 `onError` 로 처리했는가
- [ ] 이벤트 핸들러와 비동기 콜백의 에러가 갈 곳이 있는가

### 표기 의무

- [ ] 적용한 유파 옵션이 결과 화면에 보이는가
- [ ] 이상 구간과 절입 근처 경고를 삼키지 않았는가
- [ ] 생년월일시가 URL, 콘솔, 에러 리포팅에 실려 나가지 않는가

## 경계

이 스킬은 화면 코드만 본다.
`apps/web/src/lib/saju` 는 [docs/05](../../../docs/05-saju-domain-rules.md) 와
`saju-engine-validator` 가 맡는다.

고친 뒤의 대조는 `saju-screen-validator` 에이전트가 한다.
표기 의무와 목업에 맞는지를 구현한 맥락 밖에서 다시 본다.
