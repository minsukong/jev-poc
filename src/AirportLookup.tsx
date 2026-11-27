import {useState} from 'react';
type Reply={flight:{code:string;city:string;terminal:string;gate:string;minutes:number};recommendation:{source:string;error?:string;rows:{id:string}[]}};
export function AirportLookup({caseId,transport,productName}:{caseId:string;transport:string;productName:(id:string)=>string}){
 const [number,setNumber]=useState(''),[date,setDate]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()));
 const [reply,setReply]=useState<Reply|null>(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 async function search(event:React.FormEvent){event.preventDefault();setBusy(true);setErr('');setReply(null);
 try{const res=await fetch('/api/departure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number,date,caseId,transport})});
 const body=await res.json();if(!res.ok)throw Error(body.error);setReply(body)}catch(e){setErr(e instanceof Error?e.message:'서버에 연결할 수 없습니다.')}finally{setBusy(false)}}
 return <form onSubmit={search}><fieldset disabled={busy}><label>출발일<input required type="date" value={date} onChange={e=>{setDate(e.target.value);setReply(null);setErr('')}}/></label><label>항공편명<input required placeholder="예: KE703" maxLength={9} value={number} onChange={e=>{setNumber(e.target.value);setReply(null);setErr('')}}/></label><button>{busy?'조회 중…':'실제 운항편 조회 및 추천'}</button></fieldset>
 {err&&<p role="alert">{err}</p>}{reply&&<div aria-live="polite"><h3>{reply.flight.code} · {reply.flight.city}</h3><p>인천 {reply.flight.terminal} · 탑승구 {reply.flight.gate} · 출발 {reply.flight.minutes}분 전</p><p>추천 상품 · {reply.recommendation.rows.map(r=>productName(r.id)).join(', ')||'이용 가능한 상품이 없습니다.'}</p><small>{reply.recommendation.source==='fallback'?'규칙 기반 대체 · '+reply.recommendation.error:reply.recommendation.source==='live'?'실제 Jev 응답':'후보 없음'}</small></div>}</form>
}
