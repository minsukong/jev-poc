// DecisionProvider.rank(context) returns { rows, raw, model, usage }.
const levels=['상황과 무관함','관련성이 낮음','일부 도움이 됨','상황에 잘 맞음','고객이 명시한 필요를 직접 해결함'];
export function jevProvider({key=process.env.TYPESAFE_API_KEY,send=fetch}={}){
  return {async rank({customer,flight,eligible}){
    if(!key) throw Error('TYPESAFE_API_KEY 미설정');
    const options=Object.fromEntries(eligible.map(p=>[p.id,p.name+' · '+p.description]));
    const questions=Object.fromEntries(eligible.map(p=>['fit_'+p.id,{type:'score',instructions:p.name+' 상품이 이 여행자의 현재 필요에 얼마나 적합한가?',criteria:levels}]));
    if(eligible.length>1) questions.best={type:'choice',instructions:'현재 명시한 필요를 가장 잘 해결하는 상품 하나를 고르세요.',criteria:options};
    questions.relevant={type:'noul',instructions:'후보 중 고객이 명시한 필요를 직접 해결하는 상품이 있나요?'};
    const payload={model:'jev-latest',state:JSON.stringify({customer,flight,products:options}),questions};
    const response=await send('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw Error('Jev HTTP '+response.status);
    const raw=await response.json();
    const answers=raw.answers;
    const bounded=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
    if(answers?.relevant?.type!=='noul'||!bounded(answers.relevant.noul,1)||(questions.best&&(answers.best?.type!=='choice'||!Object.hasOwn(options,answers.best.choice)))) throw Error('Jev 응답 형식 오류');
    const rows=eligible.map(p=>{
      const answer=answers['fit_'+p.id];
      if(answer?.type!=='score'||!bounded(answer.score,levels.length-1)) throw Error('Jev 상품 점수 오류');
      return {id:p.id,score:answer.score};
    }).sort((a,b)=>b.score-a.score);
    return {rows,raw,model:raw.model,usage:raw.usage??null};
  }};
}

