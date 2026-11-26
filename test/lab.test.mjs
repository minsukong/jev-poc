import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,defaults,prepare,baseline,mock} from '../shared/lab.mjs';
import {decide} from '../server/decide.mjs';
import {jevProvider} from '../server/providers.mjs';
import recordings from '../data/recordings.json' with {type:'json'};
for(const c of cases)test(c.id+' · fixture / captured response',async()=>{
 const input=defaults(c),ctx=prepare(input),saved=recordings[c.id].result;
 assert.equal(mock(ctx)[0].id,c.expected);
 const provider=jevProvider({key:'fixture',send:async(url,init)=>{
   const request=JSON.parse(init.body);
   assert.equal(url,'https://api.typesafe.ai/v1/systemone');
   assert.deepEqual(Object.keys(request.questions).filter(k=>k.startsWith('fit_')).map(k=>k.slice(4)),ctx.eligible.map(p=>p.id));
   assert.ok(!request.state.includes('expected'));
   return Response.json(saved.raw);
 }});
 const result=await decide(input,provider);
 assert.equal(result.source,'live');assert.deepEqual(result.rows,saved.rows);
 assert.deepEqual(result.rules,baseline(ctx));
});
test('empty candidate skips provider',async()=>{let calls=0;const r=await decide({...defaults(cases[0]),minutes:10,flight:'DAD'},{rank(){calls++}});assert.equal(calls,0);assert.equal(r.source,'empty')});
for(const [name,send] of [['429',()=>new Response(null,{status:429})],['bad answer',()=>Response.json({answers:{}})],['timeout',()=>{throw Error('timeout')}]])test(name+' falls back',async()=>{
 const r=await decide(defaults(cases[0]),jevProvider({key:'fixture',send}));assert.equal(r.source,'fallback');assert.deepEqual(r.rules,r.rows);assert.ok(r.error);assert.equal(r.estimatedUsd,null);
});
test('constraints',()=>{const ctx=prepare({...defaults(cases[0]),minutes:30,flight:'DAD'});assert.deepEqual(ctx.eligible.map(p=>p.id),['gate','meal']);assert.throws(()=>prepare({...defaults(cases[0]),minutes:-1}))});
