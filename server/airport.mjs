const endpoint='https://apis.data.go.kr/B551177/statusOfAllFltDeOdp/getFltDeparturesDeOdp';
const normalize=s=>String(s??'').toUpperCase().replace(/\s/g,'');
export async function airportDeparture({number,date},{key=process.env.DATA_GO_KR_SERVICE_KEY,send=fetch}={}){
  const flightId=normalize(number);
  if(!/^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$/.test(flightId)||!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('항공편명과 출발일을 확인해 주세요.');
  if(!key) throw Error('공공데이터포털 인증키를 로컬 서버에 등록해 주세요.');
  const params=new URLSearchParams({serviceKey:decodeURIComponent(key),flightId,searchDate:date.replaceAll('-',''),passengerOrCargo:'P',searchdtCode:'S',pageNo:'1',numOfRows:'100',type:'json'});
  let packet;
  try{
    const response=await send(endpoint+'?'+params,{signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw Error();
    const json=await response.json();packet=json.response??json;
  }catch{throw Error('인천공항 API 응답을 받지 못했습니다. 인증키의 활용 승인 상태와 연결을 확인해 주세요.')}
  if(!['00','0000','0'].includes(String(packet.header?.resultCode)))throw Error('인천공항 API 조회에 실패했습니다. 인증 상태와 일일 호출 한도를 확인해 주세요.');
  const data=packet.body?.items?.item??packet.body?.items;
  const matches=(Array.isArray(data)?data:data?[data]:[]).filter(r=>normalize(r.flightId)===flightId);
  if(matches.length!==1)throw Error(matches.length?'일치하는 운항편이 여러 건입니다. 고유한 운항편을 확인할 수 없습니다.':'해당 날짜에 일치하는 인천 출발편이 없습니다.');
  const r=matches[0];
  const time=r.estimatedDatetime||r.scheduleDatetime||'';
  const m=/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)$/.exec(time);
  if(!m)throw Error('출발 시각이 미정입니다.');
  const minutes=Math.floor((Date.parse(m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':00+09:00')-Date.now())/60000);
  if(!Number.isFinite(minutes)||minutes<=0||/결항|취소|출발완료|출발$|cancel|departed/i.test(r.remark??''))throw Error('이미 출발했거나 이용할 수 없는 항공편입니다.');
  const terminal=({P01:'T1',P02:'탑승동',P03:'T2'})[r.terminalId]??'미정';
  const country=({NRT:'일본',HND:'일본',KIX:'일본',FUK:'일본',CTS:'일본',NGO:'일본',DAD:'베트남'})[r.airportCode]??'미확인';
  return {code:flightId,city:r.airport||r.airportCode,airport:r.airportCode,origin:'ICN',country,terminal,zone:null,gate:r.gateNumber||'미정',minutes};
}
