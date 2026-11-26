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
const modeNames={record:'Jev 실측 재생',mock:'Mock 실험',live:'실시간 Jev'};
function Ranking({title,rows,caption,ai=false}:{title:string;rows:Row[];caption:string;ai?:boolean}){
  return <article className={'ranking '+(ai?'active':'')}><header><span>{ai?'DECISION MODEL':'RULE ENGINE'}</span><h3>{title}</h3><small>{caption}</small></header>
    {rows.length?<ol>{rows.map(({id,score},i)=><li key={id}><b className="num">{String(i+1).padStart(2,'0')}</b><div><strong>{item(id).name}</strong><small>{item(id).category}</small></div><b className="points">{score.toFixed(ai?2:0)}</b></li>)}</ol>:<p className="pad">표시할 추천 결과가 없어.</p>}</article>
}
function App(){
  const [mode,setMode]=useState<Mode>('record'),[input,setInput]=useState<Input>(defaults(cases[3]));
  const [live,setLive]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const c=cases.find(c=>c.id===input.caseId)!;
  const ctx=prepare(input),record=recordings[c.id],rules=baseline(ctx);
  const isPreset=input.flight===c.flight&&input.minutes===c.minutes&&input.transport===c.transport;
  const result:Result|null=mode==='record'?record.result:mode==='live'?live:{rows:mock(ctx),rules,source:'mock',elapsedMs:0};
  function change(next:Input){setInput(next);setLive(null);setError('')}
  function switchMode(next:Mode){setMode(next);change(next==='record'?defaults(c):input)}
  async function run(){setBusy(true);setError('');setLive(null);
    try{const res=await fetch('/api/decide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      if(!res.ok)throw Error('Node 서버 응답 '+res.status);setLive(await res.json());
    }catch{setError('로컬 Node 서버에 연결하지 못했어. npm run server 실행 여부를 확인해 줘.')}finally{setBusy(false)}
  }
  const fallback=result?.source==='fallback', measured=!!result&&['record','live'].includes(mode)&&result.source==='live';
  const expected=item(c.expected).name;
  const top=result?.rows[0]?.id;
  return <><header className="mast"><div className="brand">THE LOUNGE <i>3.0</i></div><span>상품 추천 실험실</span></header><main>
    <section className="intro"><div><small className="eyebrow">RECOMMENDATION LAB</small><h1>여행 맥락에 따른 상품 추천</h1><p>같은 항공편과 상품에서 고객의 필요가 추천 순위를 어떻게 바꾸는지 비교해 보세요.</p></div><div className="ticket"><small>가상 항공편 · {ctx.flight.code}</small><b>ICN <em>→</em> {ctx.flight.airport}</b><small>인천 {ctx.flight.terminal} 출발 · {ctx.flight.city} 도착</small></div></section>
    <nav aria-label="실행 방식">{(['record','mock','live'] as Mode[]).map(m=><button key={m} disabled={busy||(m==='live'&&!local)} aria-pressed={mode===m} onClick={()=>switchMode(m)}>{modeNames[m]}</button>)}</nav>
    <p className="note">{mode==='record'?'저장된 실제 API 응답을 재생합니다.':mode==='mock'?'선호 문구에 맞춘 모의 점수입니다. AI 호출과 과금이 없습니다.':'내 컴퓨터의 Node 서버를 통해 실제 API를 호출합니다.'} {!local&&'실시간 호출은 로컬 서버에서 이용할 수 있습니다.'}</p>
    <div className="layout"><aside><h2>고객 상황</h2><label>테스트 케이스<select disabled={busy} value={c.id} onChange={e=>change(defaults(cases.find(x=>x.id===e.target.value)!))}>{cases.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><blockquote>“{c.preference}”</blockquote>
    <fieldset disabled={busy||mode==='record'}><label>항공편<select value={input.flight} onChange={e=>change({...input,flight:e.target.value})}>{flights.map(f=><option key={f.id} value={f.id}>{f.code} · {f.city}</option>)}</select></label><label>공항 이동<select value={input.transport} onChange={e=>change({...input,transport:e.target.value})}>{['공항철도','자가용','택시'].map(v=><option key={v}>{v}</option>)}</select></label><label>출발까지<select value={input.minutes} onChange={e=>change({...input,minutes:+e.target.value})}>{[10,30,60,120,180].map(v=><option key={v} value={v}>{v}분</option>)}</select></label></fieldset>
    {mode==='record'&&<small>조건을 직접 바꾸려면 Mock 실험을 선택하세요.</small>}{mode==='live'&&<button className="run" onClick={run} disabled={busy}>{busy?'호출 중…':'실제 추천 실행'}</button>}</aside>
    <section className="results"><div className="heading"><h2>추천 순위 비교</h2><small>이용 가능 {ctx.eligible.length} / 전체 {products.length}개</small></div>
    {error&&<p role="alert">{error}</p>}{fallback&&<p role="alert">규칙 기반으로 대체됨 · {result?.error}</p>}
    <div className="pair"><Ranking title="규칙 기반" caption="기본 우선점수 + 여행 유형 일치 10점" rows={rules}/><Ranking ai={!fallback} title={fallback?'규칙 기반 대체':modeNames[mode]} caption={fallback?'기준 규칙 점수':mode==='mock'?'문구 매칭 모의 점수 · 0–4':'상품별 적합도 Score · 0–4'} rows={result?.rows??[]}/></div>
    <div className="verdict"><b>{isPreset?'기대 1위 · '+expected:'조건 변경 실험'}</b><span>{isPreset&&top?(top===c.expected?'기대와 일치':'기대와 다름'):'별도 평가 필요'}{fallback?' · 대체 결과':mode==='mock'?' · 모의 결과':''}</span></div>
    <div className="metrics">{[['서버 측 응답시간',measured||fallback?result?.elapsedMs+' ms':'—'],['입력 / 출력 토큰',result?.usage?result.usage.input_tokens+' / '+result.usage.output_tokens:'—'],['추정 비용 (USD)',result?.estimatedUsd!=null?'$'+result.estimatedUsd.toFixed(8):'—']].map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
    <details><summary>필수 이용조건 · 제외된 상품 {ctx.excluded.length}개</summary>{ctx.excluded.map((p:{id:string;reasons:string[]})=><p key={p.id}>{item(p.id).name} · {p.reasons.join(', ')}</p>)}</details>
    <details><summary>Jev 판단 및 원본 응답</summary>{measured?<><p>{result?.model} · {mode==='record'?new Date(record.capturedAt).toLocaleString('ko-KR')+' 저장':'실시간 호출'} · 대체 없음</p><p>Choice 선택 · {result?.raw?.answers?.best?item(result.raw.answers.best.choice).name:'후보 1개'}<br/>Noul · 필요를 직접 해결하는 상품이 있을 확률 {result?.raw?.answers?.relevant?.noul}</p><pre>{JSON.stringify(result?.raw,null,2)}</pre></>:<p>{result?.error??'이 실행의 Jev 응답이 없습니다.'}</p>}</details>
    </section></div><section className="study"><h2>시나리오별 실측 결과</h2><p>사전에 정한 기대 상품과 저장된 1위를 비교합니다. 직접 만든 6개 사례로, 실제 고객의 구매율은 별도 검증이 필요합니다.</p><div className="scroll"><table><thead><tr>{['고객 상황','기대 1위','규칙 1위','Jev 1위'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{cases.map(x=><tr key={x.id}><td>{x.title}</td><td>{item(x.expected).name}</td><td>{item(recordings[x.id].result.rules[0].id).name}</td><td>{item(recordings[x.id].result.rows[0].id).name}</td></tr>)}</tbody></table></div></section></main><footer>THE LOUNGE · 가상 고객 및 가상 상품을 사용한 독립형 PoC</footer></>
}
createRoot(document.getElementById('root')!).render(<App/>);

