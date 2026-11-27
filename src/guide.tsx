import {createRoot} from 'react-dom/client';
import departures from '../data/airport-snapshots.json';
import records from '../data/recordings.json';
import {products} from '../shared/lab.mjs';
import hljs from 'highlight.js/lib/core';
import java from 'highlight.js/lib/languages/java';
import './style.css';
import './guide.css';

const assets = {
  logo: new URL('./assets/logo.svg', import.meta.url).href,
  flow: new URL('./assets/guide-flow.svg?no-inline', import.meta.url).href,
  fallback: new URL('./assets/guide-fallback.svg?no-inline', import.meta.url).href,
};
const lunch = records.meal.result.raw.answers;
const decisions = [
  {type:'Score', title:'상품마다 점수를 매깁니다', question:'테이크아웃 식사권은 이 고객에게 얼마나 유용한가요?', answer:lunch.fit_meal.score.toFixed(2)+' / 4점', meaning:'각 상품을 같은 척도로 평가합니다. 시연 화면은 이 점수가 높은 순서로 상품을 보여줍니다.'},
  {type:'Choice', title:'후보 중 하나를 고릅니다', question:'한 가지 상품만 추천한다면 무엇을 고를까요?', answer:products.find(p=>p.id===lunch.best.choice)!.name, meaning:'후보 전체를 놓고 한 번 더 선택합니다. 이 사례에서는 선택 결과와 적합도 1위가 일치했습니다.'},
  {type:'Noul', title:'필요를 해결할 후보가 있는지 판단합니다', question:'지금 필요한 일을 직접 해결해 주는 상품이 하나라도 있나요?', answer:'예 · '+Math.round(lunch.relevant.noul*100)+'%', meaning:'모델이 “예”라고 판단한 확률입니다. 현재 시연에서는 참고값으로 표시하며, 상품 노출 여부를 결정하는 데 사용하지 않습니다.'}
];
const example = departures[0];
const samples = departures.map(d => d.result);
const times = samples.map(r => r.elapsedMs);
const meanCost = samples.reduce((sum,r) => sum+r.estimatedUsd,0)/samples.length;
function Diagram({image,alt,caption}:{image:string;alt:string;caption:string}){
  return <figure><a href={image} aria-label={alt+' 그림 크게 보기'}><img src={image} alt={alt}/></a><figcaption>{caption} · 그림을 누르면 확대할 수 있습니다.</figcaption></figure>;
}
hljs.registerLanguage('java', java);
function JavaCode({children}:{children:string}){
  const html = hljs.highlight(children, {language:'java'}).value;
  return <pre className="java-source" tabIndex={0} aria-label="Java 코드"><code className="hljs language-java" dangerouslySetInnerHTML={{__html:html}}/></pre>;
}
const javaExample = `// Java 서비스 설계 예시. 메서드명은 역할을 설명하기 위한 이름입니다.
var flight = airport.findDeparture(date, flightNumber);
var candidates = eligibility.filter(catalog, flight, trip);
if (candidates.isEmpty()) return Recommendation.empty();

var baseline = rules.rank(candidates, trip);
try {
    var scores = decisionProvider.score(trip, flight, candidates);
    validator.requireCompleteScores(candidates, scores);
    return Recommendation.byScore(candidates, scores);
} catch (DecisionProviderException failure) {
    return Recommendation.fallback(baseline, failure.reason());
}`;
function Guide(){
  return <><header className="mast"><img className="brand-logo" width="150" height="30" src={assets.logo} alt="더라운지"/><a className="guide-link" href="./"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 5-7 7 7 7M3 12h18"/></svg>시연 화면으로</a></header>
    <main className="handbook"><header className="lead"><h1>Jev 추천 도입 가이드</h1><p>같은 비행기를 타도 회의 자료를 마무리할 사람과 점심을 포장할 사람에게 필요한 상품은 다릅니다. 항공편으로 이용 가능한 상품을 추린 뒤, 고객의 말이 추천 순서에 어떻게 반영되는지 살펴봅니다.</p></header>
    <nav aria-label="가이드 목차">{[['role','Jev의 역할'],['flow','추천 흐름'],['java','Java 연동'],['cost','비용과 속도']].map(([id,label])=><a key={id} href={'#'+id}>{label}</a>)}</nav>
    <section id="role"><h2>Jev가 판단하는 것</h2><p>Jev는 TypeSafe AI의 판단 모델입니다. 서버가 고객 상황과 후보 상품 설명을 보내면, 미리 정한 질문에 점수·선택·확률로 답합니다. 이 서비스에서는 <strong>상품을 하나씩 평가한 점수</strong>로 추천 순위를 만듭니다.</p>
    <h3>한 고객에게 던진 세 가지 질문</h3>
    <p>점심을 거른 출장객은 탑승구로 가는 길에 샌드위치를 사고 싶다고 했습니다. 아래는 이 가상 사례에 Jev가 실제로 반환한 결과입니다.</p>
    <div className="decision-list">{decisions.map(d=><article key={d.type}>
      <h4><span>{d.type}</span>{d.title}</h4>
      <div className="decision-reading"><p className="decision-question">“{d.question}”</p>
      <p className="decision-answer"><span>응답</span><strong>{d.answer}</strong></p><p>{d.meaning}</p></div>
    </article>)}</div>
    <h3>기획과 개발에서 달라지는 일</h3>
    <p>출장에 업무 공간 가산점 10점을 주는 규칙은 두 출장 사례 모두 워크 라운지를 추천했습니다. Jev는 회의를 준비할 고객에게 워크 라운지를, 식사를 포장할 고객에게 테이크아웃 식사권을 추천했습니다.</p>
    <dl className="responsibilities"><dt>기획</dt><dd>상품의 이용 조건과 어떤 상황에서 유용한지를 정의합니다. 추천이 적절한지 확인할 고객 사례와 기대 상품도 함께 정합니다.</dd>
    <dt>개발</dt><dd>선호 조합마다 가중치를 추가하는 작업을 줄일 수 있습니다. 상품 설명이나 판단 기준을 바꾸면 기존 사례를 다시 실행해 순위를 확인합니다.</dd></dl></section>
    <section id="flow"><h2>항공편 한 건이 추천으로 바뀌는 과정</h2><Diagram image={assets.flow} alt="항공편 입력, 운항정보 조회, 백엔드 필터, Jev 평가와 상품 반환 흐름" caption="현재 Node.js PoC에서 확인한 데이터 흐름"/>
    <h3>{example.flight.code}에서 확인한 결과</h3><p> 인천공항 API는 인천 {example.flight.terminal}, 탑승구 {example.flight.gate}번을 반환했습니다. 서버는 터미널·목적지·남은 시간과 가상 고객의 이동 수단을 확인했습니다. 동·서편 위치는 확인할 수 없어 해당 구역 전용 상품은 제외했습니다.</p>
    <p className="fit-notice"><strong>이 고객에게 업무용으로 권할 만한 상품은 없었습니다.</strong> 게이트 옆 휴게석은 앉아서 쉴 수 있지만, 고객이 찾던 조용한 업무 공간은 상품 설명에서 확인되지 않았습니다.</p>
    <p>Jev 적합도는 4점 만점에 휴게석 {example.result.rows[0].score.toFixed(2)}점, 테이크아웃 식사권 {example.result.rows[1].score.toFixed(2)}점이었습니다. 시연 화면의 ‘후보 1위’는 두 상품 중 점수가 더 높은 휴게석을 가리킵니다.</p></section>
    <section id="java"><h2>Java 백엔드에 붙이는 방법</h2><p>시연 서버는 Node.js로 동작합니다. 아래는 더라운지 가이드의 화면·백엔드·외부 API 구분을 따른 <strong>Java 적용 예시</strong>입니다. 실제 Spring 버전과 운영 API 계약은 백엔드팀이 사용하는 기준에 맞춥니다.</p>
    <ol className="steps"><li><strong>추천 요청을 받습니다.</strong> 컨트롤러에서 출발일·편명과 허용한 여행 조건을 검증합니다. 항공사 예약번호나 고객 이름은 이 판단에 필요하지 않습니다.</li><li><strong>상품 후보를 만듭니다.</strong> 서비스에서 운항정보를 조회하고 상품 DB의 이용 조건을 적용합니다. 위치가 미정이면 해당 위치가 필요한 상품을 제외합니다. 후보가 없으면 여기서 종료합니다.</li><li><strong>Jev 호출을 어댑터에 모읍니다.</strong> 예를 들어 Spring의 HTTP 클라이언트로 <code>POST /v1/systemone</code>을 호출합니다. 서버 환경변수의 키를 Bearer 인증에 사용하고, <code>state</code>에는 필요한 여행 맥락과 후보 설명을, <code>questions</code>에는 후보별 Score 질문을 넣습니다. 한 요청으로 여러 후보를 평가할 수 있습니다.</li><li><strong>결과를 검증하고 반환합니다.</strong> 후보마다 점수가 하나씩 있고 0~4 범위인지 확인합니다. 정렬한 상품 ID를 서버의 상품 정보와 결합해 화면으로 보냅니다. 호출 시간, 사용량, 오류와 대체 여부를 기록하면 추천 품질과 운영 비용을 함께 점검할 수 있습니다.</li></ol>
    <Diagram image={assets.fallback} alt="후보 없음, 정상 응답, Jev 장애 시 Java 서비스의 반환 경로" caption="Java 추천 서비스 설계 예시"/>
    <details open><summary>Java 서비스 코드 예시</summary><div className="disclosure-body"><div className="inner"><JavaCode>{javaExample}</JavaCode><p><code>DecisionProvider</code>는 후보별 점수를 반환하는 인터페이스입니다. Jev 어댑터가 HTTP 오류·시간 초과·응답 형식 오류를 도메인 예외로 변환합니다. 다른 모델을 검토할 때는 어댑터와 단가 계산을 교체하고 동일한 사례로 결과를 비교할 수 있습니다.</p></div></div></details>
    <details><summary>어댑터에서 보내는 실제 HTTP 요청의 형태</summary><div className="disclosure-body"><div className="inner"><p>Java 11 이상 표준 HTTP 클라이언트와 Jackson을 사용하는 예시입니다. 아래 코드는 한 상품의 Score 질문을 보여줍니다. 실제 추천에서는 후보마다 상품 ID가 다른 질문을 만들고 한 번에 전송합니다.</p><JavaCode>{`var question = Map.of(
    "type", "score",
    "instructions", "워크 라운지가 이 고객의 현재 필요에 얼마나 적합한가?",
    "criteria", List.of("무관함", "관련성 낮음", "일부 도움", "잘 맞음", "직접 해결")
);
var body = Map.of(
    "model", "jev-latest",
    "state", mapper.writeValueAsString(contextWithEligibleProducts),
    "questions", Map.of("fit_desk", question)
);
var request = HttpRequest.newBuilder(URI.create("https://api.typesafe.ai/v1/systemone"))
    .timeout(Duration.ofSeconds(15))
    .header("Authorization", "Bearer " + apiKey)
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
    .build();
var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());`}</JavaCode><p><code>apiKey</code>는 서버에서 읽고 HTTP 클라이언트는 재사용합니다. 2xx 응답이면 <code>answers.fit_desk.score</code>가 숫자이며 범위 안인지 검사합니다. 운영 서비스에서는 호출 제한 시간을 전체 응답 예산에 맞게 조정합니다.</p></div></div></details>
    <p>장애 처리도 단계마다 다릅니다. 항공편이 확인되지 않으면 조회 실패를 표시합니다. 항공편과 후보까지 확인한 뒤 Jev 호출만 실패하면, 같은 후보에서 미리 계산한 규칙 순위를 돌려줍니다.</p></section>
    <section id="cost"><h2>추천 한 번의 비용과 응답 시간</h2><p>2026년 11월 27일에 실제 출발편 세 건으로 측정했습니다. 운항정보는 인천공항 API, 고객과 상품은 가상 데이터, 점수는 Jev의 실제 응답입니다.</p>
    <div className="scroll"><table><caption>실제 출발편별 Jev 호출 기록</caption><thead><tr>{['항공편','응답 시간','입력 토큰','추정 API 비용'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{departures.map(d=><tr key={d.flight.code}><th scope="row">{d.flight.code}</th><td>{d.result.elapsedMs} ms</td><td>{d.result.usage.input_tokens}</td><td>${d.result.estimatedUsd.toFixed(8)}</td></tr>)}</tbody></table></div>
    <h3>응답 시간</h3><p> 이 세 요청에서 서버가 Jev에 요청하고 결과를 검증하기까지 {Math.min(...times)}~{Math.max(...times)}ms가 걸렸습니다. 항공편 조회와 화면 표시 시간은 별도입니다. 규칙만 계산하면 외부 호출이 생략됩니다. 일반 생성형 모델과의 속도 차이는 이번 시연에서 측정하지 않았습니다.</p>
    <h3>호출 비용</h3><p> 입력 100만 토큰당 $0.042이고 출력은 무료입니다. 세 건의 평균 입력량이 유지된다면 추천 1,000건의 Jev 비용은 약 ${(meanCost*1000).toFixed(3)}입니다. 후보가 늘거나 상품 설명이 길어지면 입력량도 늘어납니다. 서버 운영비는 별도입니다. <a href="https://help.typesafe.ai/articles/5187202169-how-much-does-jev-cost">공식 요금표</a></p>
    <h3>도입을 결정하기 전에</h3><p>실제 상품으로 별도의 평가 사례를 만들고 규칙과 Jev의 1위를 비교합니다. 특히 적합한 상품이 없는 사례에서 추천을 보류할 기준을 정해야 합니다. 운영 전에는 동시 요청 시 응답 시간, 대체 비율, 추천 클릭·구매 변화도 확인합니다.</p></section>
    <footer><a href="./">시연 화면으로 돌아가기</a> · <a href="https://api.typesafe.ai/redoc">TypeSafe API 명세</a> · <a href="https://www.data.go.kr/data/15140153/openapi.do">인천공항 운항정보 API</a></footer>
    </main></>;
}
createRoot(document.getElementById('root')!).render(<Guide/>);
