import departures from '../data/airport-snapshots.json';
import {AirportLookup} from './AirportLookup';
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {baseline,cases,defaults,flights,mock,prepare,products} from '../shared/lab.mjs';
import saved from '../data/recordings.json';
import './style.css';

type Mode='record'|'mock'|'live';
type Row={id:string;score:number};
type Result={rows:Row[];rules:Row[];source:string;model?:string|null;elapsedMs:number;usage?:{input_tokens:number;output_tokens:number}|null;estimatedUsd?:number|null;raw?:{answers?:{best?:{choice:string};relevant?:{noul:number}}}|null;error?:string|null};
type Input={caseId:string;minutes:number;flight:string;transport:string};
const recordings:Record<string,{input:Input;result:Result;capturedAt:string}>=saved;
const item=(id:string)=>products.find(p=>p.id===id)!;
const local=['127.0.0.1','localhost'].includes(location.hostname);
function App(){
  const [view,setView]=useState<'airport'|'demo'>('airport');
  const [snapshotIndex,setSnapshotIndex]=useState(0);
  const snapshot=departures[snapshotIndex];
  const recordedTop=item(snapshot.result.rows[0].id);
  const stamp=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(snapshot.capturedAt));
  const [mode,setMode]=useState<Mode>('record'),[input,setInput]=useState<Input>(defaults(cases[0]));
  const [live,setLive]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const c=cases.find(c=>c.id===input.caseId)!;
  const ctx=prepare(input),record=recordings[input.flight===c.flight?c.id:input.flight+'-'+c.id],rules=baseline(ctx);
  const isPreset=input.flight===c.flight&&input.minutes===c.minutes&&input.transport===c.transport;
  const result:Result|null=mode==='record'?record.result:mode==='live'?live:{rows:mock(ctx),rules,source:'mock',elapsedMs:0};
  function change(next:Input){setInput(next);setLive(null);setError('')}
  function switchMode(next:Mode){setMode(next);change(next==='record'?{...defaults(c),flight:input.flight}:input)}
  async function run(){setBusy(true);setError('');setLive(null);
    try{const res=await fetch('/api/decide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      if(!res.ok)throw Error('Node 서버 응답 '+res.status);setLive(await res.json());
    }catch{setError('로컬 서버에 연결할 수 없습니다. npm run server를 실행한 후 다시 시도해 주세요.')}finally{setBusy(false)}
  }
  const fallback=result?.source==='fallback', measured=!!result&&['record','live'].includes(mode)&&result.source==='live';
  const expected=item(c.expected).name;
  const top=result?.rows[0]?.id;
  const winner=rules[0];
  const ruleNote=winner
    ? '기본 점수는 '+item(winner.id).priority+'점입니다. '+(winner.score>item(winner.id).priority?'여행 유형과 상품 특성이 일치해 10점을 더했습니다.':'가산점 없이 기본 점수로 1위에 올랐습니다.')
    : '이용 조건을 만족하는 상품이 없습니다.';
  const rightTitle=fallback?'장애 시 대체 추천':mode==='mock'?'모의 추천':'Jev 추천';
  const seconds=result?(result.elapsedMs/1000).toFixed(3):'';
  return <><header className="mast"><img className="brand-logo" src={new URL("./assets/logo.svg",import.meta.url).href} width="150" height="30" alt="더라운지" /><small>서비스 시연</small></header>
    <main><section className="intro"><div><h1>항공편별 추천 상품</h1><p>인천 출발 항공편을 선택하면 출국 위치와 여행 상황에 맞는 상품을 안내합니다.</p></div><div className="photo" aria-hidden="true"/></section>
    <nav className="view" aria-label="운항정보 선택">{(['airport','demo'] as const).map(v=><button key={v} aria-pressed={view===v} onClick={()=>setView(v)}>{v==='airport'?'실제 운항편':'가상 조건 실험'}</button>)}</nav>
    {view==='airport'?<section className="recorded">
      <div className="flight"><label>조회한 항공편<select value={snapshotIndex} onChange={e=>setSnapshotIndex(+e.target.value)}>{departures.map((d,i)=><option key={d.flight.code} value={i}>{d.flight.code} · 인천 → {d.flight.city}</option>)}</select></label>
      <div><small>출발 위치</small><strong>인천 {snapshot.flight.terminal}</strong></div><div><small>탑승구</small><strong>{snapshot.flight.gate}번</strong></div></div>
      <p className="source">{snapshot.date} 출발편 · {stamp} (한국시간) 조회 기록<br/>항공편 정보는 <a href="https://www.data.go.kr/data/15140153/openapi.do">인천국제공항공사 항공기 운항 현황 상세 조회 API</a>에서 가져왔습니다.</p>
      <div className="line"><h2>추천 상품</h2><small>가상 상품 · 실제 Jev 응답</small></div>
      <p className="quote">출장 고객 · “{cases[0].preference}”</p>
      <article className="pick"><div><small>추천 1위</small><h3>{recordedTop.name}</h3><p>{recordedTop.displayDescription}</p></div><div className="score"><small>적합도</small><strong>{snapshot.result.rows[0].score.toFixed(2)} <em>/ 4</em></strong></div></article>
      <details><summary>추천 기준과 측정 결과</summary><div className="disclosure-body"><p>인천공항 API가 제공한 터미널과 목적지, 출발까지 남은 시간으로 상품을 추렸습니다. 실제 보안검색 출국장과 상품까지의 도보 거리는 확인되지 않아 동·서편 전용 상품은 제외했습니다. Jev가 고객의 요청과 후보 상품의 설명을 읽고 적합도를 평가했습니다.</p><p>규칙 기반 1위 · {item(snapshot.result.rules[0].id).name}<br/>Jev 응답 시간 · {snapshot.result.elapsedMs}ms<br/>예상 API 비용 · ${snapshot.result.estimatedUsd.toFixed(8)} (입력 {snapshot.result.usage.input_tokens}토큰)</p><details><summary>Jev 원본 응답</summary><div className="disclosure-body"><pre>{JSON.stringify(snapshot.result.raw,null,2)}</pre></div></details></div></details>
      <details><summary>다른 실제 항공편 조회</summary><div className="disclosure-body">{local?<AirportLookup caseId="business" transport="공항철도" productName={id=>item(id).name}/>:<p>공개 페이지에서는 조회 시점의 기록을 재생합니다. 다른 편명과 출발일은 인증키를 등록한 로컬 서버에서 조회할 수 있습니다.</p>}</div></details>
    </section>:<>    <section className="flight"><label>시연용 항공편<select aria-label="시연용 항공편" disabled={busy} value={input.flight} onChange={e=>change({...input,flight:e.target.value})}>{flights.map(f=><option key={f.id} value={f.id}>{f.code} · 인천 → {f.city}</option>)}</select></label>
    <div><small>출발 위치</small><strong>인천 {ctx.flight.terminal} · {ctx.flight.zone}</strong></div>
    <div><small>출발까지</small><strong>{input.minutes}분</strong></div></section>
    <section className="results"><div className="line"><h2>추천 상품</h2><small>{mode==='record'?'Jev 실측 재생':mode==='mock'?'모의 추천':'실시간 모드'}</small></div>
    <label className="traveler">고객 상황<select disabled={busy} value={c.id} onChange={e=>change({...defaults(cases.find(x=>x.id===e.target.value)!),flight:input.flight})}>{cases.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></label>
    <p className="quote">“{c.preference}”</p>
    {error&&<p role="alert">{error}</p>}{fallback&&<p role="alert">규칙 기반 대체 · {result?.error}</p>}
    <article className="pick"><div><small>{top?'추천 1위':'추천 상태'}</small><h3>{top?item(top).name:rules.length?'실행 대기':'이용 가능한 상품 없음'}</h3><p>{top?item(top).displayDescription:''}</p></div>{top&&!fallback&&<div className="score"><small>{mode==='mock'?'모의 점수':'Jev 적합도'}</small><strong>{result!.rows[0].score.toFixed(2)} <em>/ 4</em></strong></div>}</article>
    {mode==='live'&&<button onClick={run} disabled={busy}>{busy?'요청 중…':'실시간 추천 실행'}</button>}
      <details className="settings"><summary>실행 방식과 여행 조건 변경</summary><div className="disclosure-body">
        <label>실행 방식 <select value={mode} disabled={busy} onChange={e=>switchMode(e.target.value as Mode)}><option value="record">저장한 Jev 응답 재생</option><option value="mock">모의 실험 (Mock)</option><option value="live" disabled={!local}>로컬 서버로 Jev 실시간 호출</option></select></label>
        <p>재생 모드에서는 각 사례의 추천 결과와 측정 당시의 조건을 확인합니다. 모의 실험에서는 시간이나 목적지를 바꾸면 이용 가능한 상품과 예시 순위를 확인할 수 있습니다. 실시간 호출은 API 키가 등록된 로컬 서버에서 가능합니다.</p>
        <fieldset disabled={busy||mode==='record'}><label>공항 이동<select value={input.transport} onChange={e=>change({...input,transport:e.target.value})}>{['공항철도','자가용','택시'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>출발까지<select value={input.minutes} onChange={e=>change({...input,minutes:+e.target.value})}>{[10,30,60,120,180].map(v=><option key={v} value={v}>{v}분</option>)}</select></label></fieldset></div></details>
      <details><summary>규칙 기반 추천과 Jev 비교</summary><div className="disclosure-body"><p>백엔드가 이용 조건에 맞는 상품 {ctx.eligible.length}개를 추립니다. Jev는 고객의 필요와 상품 설명을 읽고 각 후보의 적합도를 평가하는 TypeSafe AI의 모델입니다.</p>
      <div className="pair"><article><small>규칙 기반 추천</small><h3>{winner?item(winner.id).name:'후보 없음'}</h3><p>{ruleNote}</p></article>
        <article className="decision"><small>{rightTitle}</small><h3>{top?item(top).name:ctx.eligible.length?'실행 대기':'후보 없음'}</h3><p>{fallback?ruleNote:top?item(top).displayDescription:'이 조건에서 표시할 추천 결과가 없습니다.'}</p>
        {top&&!fallback&&<small>{mode==='mock'?'문구 매칭 예시 점수':'Jev가 매긴 적합도'} {result!.rows[0].score.toFixed(2)} / 4</small>}</article></div>
      {c.id==='meal'&&isPreset&&mode==='record'&&<p className="insight">두 출장 사례는 항공편과 남은 시간이 같습니다. 규칙은 두 고객 모두에게 워크 라운지를 추천했습니다. Jev는 회의를 준비하는 고객에게 워크 라운지를, 샌드위치를 사 가려는 고객에게 테이크아웃 식사권을 추천했습니다.</p>}
      </div></details><details><summary>전체 순위와 제외된 상품</summary><div className="disclosure-body"><p>규칙 점수는 미리 정한 가중치의 합입니다. Jev 점수는 0점(무관)부터 4점(필요를 직접 충족)까지입니다. 두 열은 각각 위에서부터 순서대로 읽으면 됩니다.</p>
      <div className="scroll"><table><thead><tr><th>순위</th><th>규칙 기반</th><th>{rightTitle}</th></tr></thead><tbody>{rules.map((r:Row,i:number)=><tr key={r.id}><td>{i+1}</td><td>{item(r.id).name} · {r.score}점</td><td>{result?.rows[i]?item(result.rows[i].id).name+' · '+result.rows[i].score.toFixed(2)+'점':'—'}</td></tr>)}</tbody></table></div><h4>이용 조건에서 제외된 상품</h4>{ctx.excluded.map((p:{id:string;reasons:string[]})=><p key={p.id}>{item(p.id).name} · {p.reasons.join(', ')}</p>)}</div></details>
    </section>
    <section className="guide"><h2>결과 읽는 법</h2>
    <details><summary>추천 1회의 응답 시간과 예상 비용</summary><div className="disclosure-body">
    <p>{mode==='record'?'이 수치는 저장 당시 서버에서 측정한 값입니다. 공개 페이지에서 여러 번 재생해도 새로 청구되지 않습니다.':mode==='mock'?'모의 실험은 외부 API를 호출하지 않아 Jev 측정값이 없습니다.':'실시간 추천을 실행하면 이번 요청의 측정값을 확인할 수 있습니다.'}</p>
    <dl><dt>응답 시간{(measured||fallback)&&' · '+seconds+'초'}</dt><dd>서버가 Jev에 요청을 보내고 응답이나 오류를 처리하기까지 걸린 시간입니다. 1,000ms가 1초입니다. 고객이 화면을 여는 시간은 별도로 측정해야 합니다.</dd>
    <dt>사용량{result?.usage&&' · 입력 '+result.usage.input_tokens.toLocaleString()+' / 출력 '+result.usage.output_tokens.toLocaleString()+'토큰'}</dt><dd>토큰은 모델이 내용을 읽고 처리하는 단위입니다. 고객 상황·상품 설명·질문이 입력이고, 돌려받은 점수와 선택 결과가 출력입니다.</dd>
    <dt>예상 API 비용{result?.estimatedUsd!=null&&' · 1회 $'+result.estimatedUsd.toFixed(8)}</dt><dd>입력 토큰 100만 개당 0.042달러로 계산합니다. 출력 토큰은 무료입니다. {result?.estimatedUsd!=null&&'이번과 같은 입력량으로 1,000번 호출하면 약 '+(result.estimatedUsd*1000).toFixed(3)+'달러입니다. '}서버 운영비는 별도입니다. <a href="https://help.typesafe.ai/articles/5187202169-how-much-does-jev-cost">공식 요금표</a></dd></dl></div></details>
    <details><summary>백엔드와 Jev의 역할</summary><div className="disclosure-body"><p>백엔드는 고객이 상품을 이용할 수 있는지 확인합니다. 예를 들어 도쿄행 고객에게 일본 eSIM은 후보가 되고, 다낭행에서는 빠집니다. Jev는 남은 상품이 고객의 현재 필요에 얼마나 잘 맞는지 판단합니다.</p>
    <dl><dt>Score · 상품별 적합도 평가</dt><dd>각 상품을 다섯 단계로 평가하고 단계별 확률을 반영한 점수를 돌려줍니다. 이 화면은 그 점수가 높은 순으로 추천합니다. 3.98점은 구매 확률 99.5%라는 뜻으로 해석할 수 없습니다.</dd>
    <dt>Choice · 후보 한 개 선택</dt><dd>같은 후보를 주고 하나를 고르도록 별도로 묻습니다. 상품별 점수와 질문이 달라 Score 1위와 다른 선택도 가능합니다.{measured&&result?.raw?.answers?.best&&' 이번 선택은 '+item(result.raw.answers.best.choice).name+'입니다.'}</dd>
    <dt>Noul · ‘예’라고 판단할 확률</dt><dd>“후보 중 고객의 필요를 직접 해결하는 상품이 있나요?”라고 묻습니다.{measured&&result?.raw?.answers?.relevant&&' 이번 응답은 '+(result.raw.answers.relevant.noul*100).toFixed(1)+'%입니다.'} 이 값은 모델의 판단이며, 이용 자격은 백엔드가 계속 결정합니다.</dd></dl>
    <p>서버는 이 질문들을 한 번에 보내고 결과를 검증합니다. 호출이 실패하면 같은 후보의 규칙 기반 순위를 반환하고 화면에 대체 여부를 표시합니다. <a href="https://docs.typesafe.ai/primitives">공식 판단 유형 설명</a></p></div></details>
    <details><summary>기본 항공편(TL 208)의 시나리오별 결과</summary><div className="disclosure-body"><p>‘기대 1위’는 시나리오를 만들 때 정한 상품입니다. 실제 1위가 예상과 일치한 사례는 규칙 기반 추천 {cases.filter(x=>recordings[x.id].result.rules[0].id===x.expected).length}건, Jev 추천 {cases.filter(x=>recordings[x.id].result.rows[0].id===x.expected).length}건입니다. 실제 고객의 만족도나 구매율을 알려면 별도의 고객 평가가 필요합니다.</p>
    <p>{isPreset?'선택한 사례의 기대 1위는 '+expected+'입니다.':'여행 조건을 바꿨으므로 기존 사례의 기대값을 그대로 적용하기 어렵습니다.'}</p><div className="scroll"><table><thead><tr>{['고객 상황','기대 1위','규칙 1위','Jev 1위'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{cases.map(x=><tr key={x.id}><td>{x.title}</td><td>{item(x.expected).name}</td><td>{item(recordings[x.id].result.rules[0].id).name}</td><td>{item(recordings[x.id].result.rows[0].id).name}</td></tr>)}</tbody></table></div></div></details>
    <details><summary>개발자용 API 원본 응답</summary><div className="disclosure-body">{measured?<><p>{result?.model} · {mode==='record'?new Date(record.capturedAt).toLocaleString('ko-KR')+' 저장':'실시간 호출'} · 규칙 대체 없음</p><pre>{JSON.stringify(result?.raw,null,2)}</pre></>:<p>{result?.error??'이 실행에서 받은 Jev 응답이 없습니다.'}</p>}</div></details></section></>}
    </main><footer>더라운지 3.0 · 항공편 기반 AI 추천 상품 안내</footer></>
}
createRoot(document.getElementById('root')!).render(<App/>);