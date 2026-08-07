# 검증 케이스

> 공인 만세력 대조를 거친 사주 계산 기대값을 둔다.

## 채우는 방법

선행 프로젝트 `/Users/mychoi/f-lab/saju/.claude/docs/test-case/saju-verification-cases.json` 에
포스텔러 실측 대조를 거친 케이스 13개가 있다. 계산 엔진을 구현할 때 옮겨온다.

옮기기 전에 확인할 것이 하나 있다.
그 케이스들은 신강약 5단계 4요소 모델을 기준으로 작성되어 있고, 이 프로젝트도 같은 모델을 쓴다
([ADR 0007](../../../../../../docs/adr/0007-strength-five-grade-model.md)).
기대값 필드가 현재 엔진의 출력 타입과 맞는지 대조한 뒤 옮긴다.

## 케이스의 구조

```jsonc
{
  "id": "verified-19950127-1439-F-seoul",
  "purpose": "이 케이스가 무엇을 검증하는가",
  "input": {
    "birth": "1995-01-27T14:39:00",
    "calendar": "solar",
    "gender": "F",
    "longitude": 126.98,
    "options": { "night_zi_policy": "zheng", "true_solar_time": false }
  },
  "expected": { "year": "갑술", "month": "정축", "day": "무오", "hour": "기미" },
  "verified": true,
  "sources": ["대조한 만세력과 조회 일시"],
  "notes": "유파가 갈리는 지점이면 여기에 남긴다"
}
```

`verified: true` 인 케이스만 회귀 테스트가 실행한다.
`sources` 없이 `verified: true` 를 붙이지 않는다.

## 반드시 포함할 경계 케이스

목록은 [`docs/05-saju-domain-rules.md`](../../../../../../docs/05-saju-domain-rules.md) 10장에 있다.
입춘 절입 전후, 각 절기 경계, 자시 경계, 표준시 전환일, 서머타임 구간, 음력 윤달, 대운 방향 네 조합이다.

## 일주 앵커

일주 계산의 기준 앵커 값은 문서나 코드에 근거 없이 하드코딩하지 않는다.
`verified: true` 케이스 3개 이상의 대조로 확정한다.
