import products from '../data/products.json' with {type:'json'};
import cases from '../data/cases.json' with {type:'json'};
import flights from '../data/flights.json' with {type:'json'};
export {products,cases,flights};
export function prepare(input,departure=null){
  const scenario=cases.find(c=>c.id===input.caseId);
  const flight=departure??flights.find(f=>f.id===input.flight);
  if(!scenario||!flight||!['공항철도','자가용','택시'].includes(input.transport)||(!departure&&! [10,30,60,120,180].includes(input.minutes))) throw Error('허용된 가상 시나리오를 선택해 줘.');
  const customer={purpose:scenario.purpose,preference:scenario.preference,transport:input.transport,minutes:departure?.minutes??input.minutes};
  const eligible=[], excluded=[];
  for(const p of products){
    const reasons=[];
    if(p.terminal && p.terminal!==flight.terminal) reasons.push('터미널 불일치');
    if(p.zone && p.terminal===flight.terminal && p.zone!==flight.zone) reasons.push('출국장 위치 불일치');
    if(p.country && p.country!==flight.country) reasons.push('서비스 국가 불일치');
    if(p.transport && p.transport!==customer.transport) reasons.push('자가용 전용');
    if(p.minMinutes>customer.minutes) reasons.push('필요 시간 '+p.minMinutes+'분');
    if(reasons.length) excluded.push({id:p.id,reasons}); else eligible.push(p);
  }
  return {customer,flight,eligible,excluded};
}
export function baseline(ctx){
  const tags={'출장':'업무','가족 여행':'아이 돌봄','부부 여행':'짧은 동선'};
  return ctx.eligible.map(p=>({id:p.id,score:p.priority+(tags[ctx.customer.purpose]===p.tag?10:0)})).sort((a,b)=>b.score-a.score);
}
export function mock(ctx){
  const patterns={desk:/회의 자료/,family:/애들은 좀 놀/,gate:/오래 걸으면/,meal:/샌드위치/,esim:/노선/,park:/차를 맡/};
  return ctx.eligible.map(p=>({id:p.id,score:patterns[p.id]?.test(ctx.customer.preference)?4:1})).sort((a,b)=>b.score-a.score);
}
export function defaults(c){return {caseId:c.id,flight:c.flight,minutes:c.minutes,transport:c.transport}}

