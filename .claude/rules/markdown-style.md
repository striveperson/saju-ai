---
paths: ["**/*.md"]
---

# 마크다운 작성 규칙

문서(`*.md`)와 Claude 의 마크다운 답변 모두에 적용한다.
검사하는 도구는 없다. 이 목록이 전부다.

## format. 기호와 표기

- `format-no-em-dash` em dash 를 쓰지 않는다. 쉼표, 콜론, 괄호, 하이픈으로 대체한다
- `format-no-emoji` 이모지를 쓰지 않는다. 상태 기호는 표와 다이어그램 안에서만 쓴다
- `format-bold` 굵은 강조는 어겨서는 안 되는 규칙에만 쓴다. 문서당 두세 번을 넘기지 않고 번호 목록 안에서는 쓰지 않는다
- `format-no-strikethrough` 취소선을 쓰지 않는다. 지울 내용이면 지운다
- `format-escape-tilde` 한 줄에 물결표를 둘 이상 남기지 않는다. 범위는 `1900\~2100` 으로 escape 하고 물결표 자체는 백틱으로 감싼다
- `format-arrow` 화살표는 순서나 변환에만 쓴다. 문장을 잇는 데 쓰지 않는다
- `format-code-block` 코드 블록에 언어를 지정하고 첫 줄에 파일 경로를 주석으로 적는다
- `format-relative-link` 문서 사이 이동은 상대 경로 링크로 건다
- `format-mermaid` 다이어그램은 Mermaid 로 그린다
- `format-no-oxfmt` 마크다운을 oxfmt 에 넘기지 않는다. 물결표 둘을 취소선으로 바꿔 손대지 않은 줄을 망가뜨린다

## structure. 문서와 문단

- `structure-plan-first` 무엇을 말할지 정한 다음 문장을 만든다
- `structure-table` 비교, 명세, 매핑은 산문 대신 표로 쓴다
- `structure-split-long-doc` 스크롤 다섯 번을 넘기면 문서를 나눈다
- `structure-one-idea-per-sentence` 한 문장에 한 가지만 담는다. 세 줄을 넘으면 자른다
- `structure-vary-bullets` 불릿이 전부 같은 꼴이면 길이와 구조를 섞는다
- `structure-no-forced-triples` 세 개를 채우려고 항목을 만들지 않는다. 두 개면 두 개만 쓴다
- `structure-no-closing-summary` 문서 끝에 앞 내용을 되풀이하는 요약 절을 붙이지 않는다

## tone. 문장

- `tone-no-empty-adjectives` 강력한, 원활한, 최적의, 손쉬운 같은 형용사를 지우고 무엇이 어떻게 되는지 쓴다
- `tone-no-meta-narration` "중요한 점은", "주목할 만한 것은", "다음과 같습니다" 로 시작하는 문장을 지운다
- `tone-plain-korean` `~에 대한`, `~를 통해`, `~에 있어서`, `~되어지다` 를 우리말 어순으로 고친다
- `tone-assert` 결정은 `~한다` 로 단정한다. 확정되지 않은 것은 확정되지 않았다고 적는다
- `tone-tradeoffs` 트레이드오프에는 포기한 것을 반드시 함께 적는다
- `tone-canonical-terms` 도메인 용어는 `docs/01-overview.md` 용어집과 `docs/05-saju-domain-rules.md` 표기를 그대로 쓴다

## 한 줄로 판단이 안 서는 것

```
tone-no-empty-adjectives
전  Supabase 는 강력한 인증 기능을 제공하여 원활한 로그인 경험을 만듭니다.
후  Supabase Auth 가 카카오와 Apple 을 공식 공급자로 지원하고 PKCE 흐름이 문서화되어 있다.

tone-no-meta-narration
전  중요한 점은, 다음과 같이 계산과 해석을 분리해야 한다는 것입니다.
후  계산과 해석을 분리한다.

tone-plain-korean
전  이 훅을 통해 엔진의 순수성에 대한 검증이 수행되어집니다.
후  이 훅이 엔진의 순수성을 검사한다.

structure-vary-bullets
전  사주팔자를 계산한다 / 오행 분포를 계산한다 / 십신 관계를 계산한다
후  생년월일시에서 여덟 글자를 뽑는다 / 오행 분포와 십신 구성을 낸다 / 그 둘로 신강약을 판정한다

structure-no-forced-triples
전  이 결정은 재현성, 검증 가능성, 그리고 유지보수성을 높입니다.
후  같은 사주에 같은 판정이 나오고, 화면에 근거를 함께 보여줄 수 있다.

tone-assert
전  API 라우트를 사용하는 것이 좋을 것 같습니다.
후  서버 호출은 명시적 API 라우트로만 한다.
후  (아직 안 정했으면) 야자시 정책 기본값은 아직 정하지 않았다.
```

## 쓰고 나서 확인

- 형용사를 지웠을 때 문장이 그대로 성립하는가. 성립하면 그 형용사는 장식이었다
- 불릿의 구조가 서로 다른가
- "다음과 같습니다" 로 시작하는 문장이 없는가
- 트레이드오프에 포기한 것이 있는가
- 끝에 요약 절을 붙이지 않았는가
- 확정되지 않은 것을 확정된 것처럼 쓰지 않았는가

## 어겨도 되는 자리

- 규칙 자체를 설명하느라 금지된 문자를 써야 하는 줄
- 코드 블록 안. 기호 규칙을 적용하지 않는다
