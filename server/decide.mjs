import {prepare,baseline} from '../shared/lab.mjs';
import {jevProvider} from './providers.mjs';
export async function decide(input,provider=jevProvider(),departure=null){
  const ctx=prepare(input,departure),rules=baseline(ctx);
  const start=performance.now();
  const base={rules,excluded:ctx.excluded,usage:null,estimatedUsd:null,raw:null,model:null,error:null};
  if(!rules.length) return {...base,source:'empty',rows:[],elapsedMs:0};
  try{
    const result=await provider.rank(ctx);
    const tokens=result.usage?.input_tokens;
    return {...base,...result,source:'live',estimatedUsd:Number.isSafeInteger(tokens)&&tokens>=0?tokens*0.042/1e6:null,elapsedMs:Math.round(performance.now()-start)};
  }catch(error){
    return {...base,source:'fallback',rows:rules,error:error.message,elapsedMs:Math.round(performance.now()-start)};
  }
}

