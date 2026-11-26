# 더라운지 3.0 추천 실험실

가상 항공편, 가상 고객 6명, 상품 7개로 검증하는 독립형 PoC. 모든 상품 조건과 추천 우선순위는 시연용 가정이다.

[공개 시연](https://minsukong.github.io/jev-poc/)은 Jev 응답 재생과 브라우저 Mock을 제공한다. 재생은 저장 당시의 응답시간과 사용량을 표시한다. 실시간 호출은 로컬에서 실행한다.

## 실행

Node 24 기준. `npm ci` 후 터미널 두 개에서 `npm run server`, `npm run dev`를 실행하고 http://127.0.0.1:5173 을 연다. 서버 환경변수 TYPESAFE_API_KEY를 사용한다. 로컬 .env도 지원한다. `npm test`로 회귀 테스트를 실행한다. `npm run capture`는 실제 유료 API를 6회 호출하고 전부 성공하면 재생 자료를 갱신한다. `npm run build`는 GitHub Pages용 docs/를 갱신한다. 저장소 Pages 소스는 main /docs다.

## 시연 순서

1. 실측 재생에서 ‘혼자 출장’과 ‘식사가 급한 출장’을 번갈아 본다. 항공편, 시간, 이동수단, 여행 유형과 후보는 동일하다. 규칙은 여행 유형 보너스와 상품 우선순위를 더한다. Jev는 상품 설명과 고객의 구체적인 필요를 함께 읽는다.
2. Mock이나 로컬 실시간 모드에서 다낭행, 10분 전을 선택한다. 일본 eSIM과 시간이 부족한 상품이 제외된다. 후보가 없으면 API 호출을 생략한다.
3. 로컬 실시간 실행 후 원본을 펼쳐 Score 순위, Choice의 단일 선택과 Noul 확률을 확인한다. 세 판단은 독립적이라 1위와 Choice가 다를 수 있다. HTTP 오류, 제한 초과, 타임아웃, 비정상 응답 시 기준 규칙 순위로 전환한다.
4. 표의 기대 상품은 시나리오 설계 시 정한 가설이다. 통제된 6개 예시에서의 일치는 일반화 성능이나 전환율의 근거가 되지 않는다. 실제 도입 판단에는 별도 사례와 사용자 평가가 필요하다.

## 판단 구조 및 근거

실시간 경로는 허용된 시나리오 ID와 열거형 조건만 입력받는다. 서버는 JSON 원본에서 맥락을 구성하고 터미널, 국가, 이동수단, 소요시간을 필터링한다. Jev에 전달하는 정보는 가상 고객 상황과 적격 상품 설명이다. 기대값, 기본 순위, 실사용자 정보는 요청에서 빠진다. 공개 Mock은 동일한 필터를 브라우저에서 실행한다.

서버의 DecisionProvider 계약은 rank(context) → rows, raw, model, usage다. server/decide.mjs가 어댑터를 주입받아 오류와 빈 후보를 처리한다. Solar Decide, Liquid d1 추가 시 정규화한 상품 순위를 반환하는 새 어댑터를 연결한다. 현재 실제 연동은 Jev 한 곳이다. 비용 계산은 현 Jev 단가로 적용한다. 다른 공급사를 추가할 때 단가 정책도 교체한다.

2026-11-27 공식 규격 및 호출 확인. POST https://api.typesafe.ai/v1/systemone, Authorization Bearer 인증, jev-latest 별칭 사용. 5단계 Score는 0–4 사이의 가중 점수다. Choice는 후보별 확률과 선택, Noul은 yes일 확률을 반환한다. 한 요청에 여러 질문을 담는다. usage.input_tokens와 output_tokens는 실제 응답값이고 USD는 입력 100만 토큰당 $0.042, 출력 무료로 계산한 추정치다. 시간은 서버에서 요청 전후로 잰 경과시간이다. 종전의 속도 배수, 추천 정확도, 개발 공수 가정은 실측값에 사용하지 않는다.

- [공식 OpenAPI](https://api.typesafe.ai/openapi.json)
- [판단 유형](https://docs.typesafe.ai/primitives)
- [요금](https://help.typesafe.ai/articles/5187202169-how-much-does-jev-cost)

