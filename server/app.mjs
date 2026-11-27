import {airportDeparture} from './airport.mjs';
import http from 'node:http';
import {decide} from './decide.mjs';
import {prepare} from '../shared/lab.mjs';
const port=4174;
http.createServer(async(req,res)=>{
  const reply=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
  if(!['/api/decide','/api/departure'].includes(req.url)||req.method!=='POST') return reply(404,{error:'경로 없음'});
  if(!req.headers['content-type']?.startsWith('application/json')||(req.headers.origin && !['http://localhost:5173','http://127.0.0.1:5173'].includes(req.headers.origin))) return reply(403,{error:'로컬 시연 요청만 허용'});
  try{
    let body='';
    for await(const part of req){body+=part;if(body.length>2048)return reply(413,{error:'입력 크기 초과'})}
    const input=JSON.parse(body);
    if(req.url==='/api/departure'){
      prepare({caseId:input.caseId,transport:input.transport,flight:'TYO',minutes:120});
      let flight;
      try{flight=await airportDeparture(input)}catch(e){return reply(422,{error:e.message})}
      return reply(200,{flight,recommendation:await decide(input,undefined,flight)});
    }
    prepare(input);
    reply(200,await decide(input));
  }catch{reply(400,{error:'잘못된 가상 시나리오'})}
}).listen(port,'127.0.0.1',()=>console.log('Jev server · localhost:'+port));

