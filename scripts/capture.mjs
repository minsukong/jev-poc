import {writeFile} from 'node:fs/promises';
import {cases,defaults} from '../shared/lab.mjs';
import {decide} from '../server/decide.mjs';
const records={};
for(const c of cases){
  const input=defaults(c), result=await decide(input);
  if(result.source!=='live') throw Error(c.id+' · '+result.error);
  console.log(c.id,result.rows[0].id,result.elapsedMs+'ms',result.usage?.input_tokens);
  records[c.id]={input,result,capturedAt:new Date().toISOString()};
}
await writeFile(new URL('../data/recordings.json',import.meta.url),JSON.stringify(records,null,2)+'\n');

