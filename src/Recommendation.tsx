import {cases, products} from '../shared/lab.mjs';

export type Ranking = {
  source: string;
  rows: {id: string; score: number}[];
};
type Props = {
  caseId: string;
  minutes: number;
  result: Ranking | null;
  excluded: {id: string; reasons: string[]}[];
  unknownZone?: boolean;
};
const needs: Record<string, string> = {
  desk: '조용히 일할 공간', family: '보호자가 곁에서 지켜볼 수 있는 아이 놀이 공간',
  gate: '탑승구 가까이에서 쉴 좌석', meal: '탑승 전에 포장할 식사',
  esim: '도착 직후 사용할 모바일 데이터', park: '터미널 앞에서 차를 맡길 서비스',
};
export function Recommendation({caseId, minutes, result, excluded, unknownZone}: Props) {
  const expected = cases.find(c => c.id === caseId)!.expected;
  const preferred = products.find(p => p.id === expected)!;
  const rows = result?.rows ?? [];
  const first = rows[0];
  const product = products.find(p => p.id === first?.id);
  const blocked = excluded.find(p => p.id === expected);
  const reasons = blocked?.reasons.map(reason => {
    if (reason.startsWith('필요 시간')) return '출발까지 최소 ' + preferred.minMinutes + '분 필요';
    if (unknownZone && reason === '출국장 위치 불일치') return '항공편 정보로 출국장 구역 확인 불가';
    return reason;
  });
  const mock = result?.source === 'mock';
  const fallback = result?.source === 'fallback';
  const tied = first ? rows.filter(r => r.score === first.score).length : 0;
  const weak = !!first && !fallback && (mock ? first.score === 1 : first.score < 2.5);
  let explanation = '';
  if (first) {
    if (mock) explanation = first.score === 1
      ? '남은 후보 중 고객 요청에 설정한 문구가 일치한 상품이 없어 모두 기본 1점을 받았습니다.'
      : '고객 요청이 이 상품에 설정한 문구와 일치해 모의 점수 4점을 받았습니다.';
    else if (fallback) explanation = 'Jev 호출에 실패해 상품 기본 점수와 여행 유형 가산점을 합한 규칙 점수로 정렬했습니다.';
    else explanation = 'Jev가 이용 가능한 후보 ' + rows.length + '개를 평가했습니다. 이 상품의 적합도는 4점 만점에 ' + first.score.toFixed(2) + '점입니다.';
    if (tied > 1) explanation += mock
      ? ' 동점인 ' + tied + '개 중 상품 목록에서 앞선 후보를 표시했습니다.'
      : ' 최고점이 같은 후보가 ' + tied + '개입니다.';
    else if (rows.length === 1) explanation += ' 이용 조건을 통과한 유일한 후보입니다.';
    else if (!mock && !fallback) explanation += ' 다음 후보는 ' + rows[1].score.toFixed(2) + '점입니다.';
  }
  const headline = !product ? '이 조건에서 이용할 수 있는 상품이 없습니다.'
    : weak && product.id !== expected ? '요청하신 ‘' + needs[expected] + '’ 용도로는 추천하기 어렵습니다.'
    : weak ? '후보 중 첫 번째지만 요청과의 관련성은 낮게 평가됐습니다.'
    : fallback ? '규칙 기반 순위로 안내합니다.'
    : '이 후보가 먼저 나온 이유';
  return <>
    <article className="pick recommendation"><div><small>{first ? '후보 ' + rows.length + '개 중 ' + (tied > 1 ? '공동 1위' : '1위') : '추천 상태'}</small>
      <h3>{product?.name ?? (result || excluded.length === products.length ? '이용 가능한 상품 없음' : '실행 대기')}</h3>
      {product && <p>{product.displayDescription}</p>}</div>
      {first && <div className="score"><small>{fallback ? '규칙 점수' : mock ? '모의 점수' : 'Jev 적합도'}</small><strong>{fallback ? first.score : first.score.toFixed(2)} {!fallback && <em>/ 4</em>}</strong></div>}
    </article>
    {(result || excluded.length === products.length) && <div className={'rank-context' + (weak || !product || fallback ? ' caution' : '')}>
      <strong>{headline}</strong>
      {reasons && <p>{preferred.name} 제외 사유 · {reasons.join(' · ')}</p>}
      {product?.id === expected && !weak && <p>이 시나리오에서 고객이 찾는 것은 ‘{needs[expected]}’입니다. 선택된 상품은 이 용도로 설정한 기대 후보와 일치합니다.</p>}
      {explanation && <p>{explanation}</p>}
      {minutes <= 30 && <p>출발까지 {minutes}분 남았습니다. 탑승 마감 시각과 현재 위치에서 탑승구까지 걸리는 시간을 먼저 확인하세요. 여유가 없다면 탑승구로 바로 이동하세요.</p>}
    </div>}
  </>;
}
