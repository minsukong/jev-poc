import test from 'node:test';
import assert from 'node:assert/strict';
import {airportDeparture} from '../server/airport.mjs';
import {prepare,cases,defaults,flights} from '../shared/lab.mjs';
import recordings from '../data/recordings.json' with {type:'json'};
test('every replay uses its own flight and eligible catalog',()=>{
 for(const c of cases)for(const f of flights){
  const input={...defaults(c),flight:f.id};
  const r=recordings[f.id===c.flight?c.id:f.id+'-'+c.id];
  assert.deepEqual(r.input,input);
  assert.deepEqual(r.result.rows.map(x=>x.id).sort(),prepare(input).eligible.map(x=>x.id).sort());
 }
});
const input={number:'ke 703',date:'2026-11-27'};
test('public departures adapter maps published fields and keeps unknown zone',async()=>{
 const f=await airportDeparture(input,{key:'dummy',send:async(url)=>{
  assert.equal(new URL(url).searchParams.get('flightId'),'KE703');
  return Response.json({response:{header:{resultCode:'00'},body:{items:[{flightId:'KE703',terminalId:'P03',gateNumber:'251',airportCode:'NRT',airport:'도쿄',scheduleDatetime:'209901011100'}]}}});
 }});
 assert.equal(f.terminal,'T2');assert.equal(f.gate,'251');assert.equal(f.zone,null);
 assert.ok(!prepare(defaults(cases[0]),f).eligible.some(p=>p.zone));
});
test('public data needs a separate key',()=>assert.rejects(airportDeparture(input,{key:''}),/인증키/));

