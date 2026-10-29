// 합성 데이터: 2년치 약 1,500건 (가상 상품·가상 가격, 개인정보 없음)
module.exports = function synth(today = '2026-10-29') {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = [ // name, mall, price, gapDays, season months
    ['삼다수 2L 12병', '쿠팡', 6900, 14], ['코디 3겹 30m 30롤', '쿠팡', 15900, 40], ['서울우유 1L 2개', '마켓컬리', 5400, 7], ['풀무원 국산콩 두부 300g', 'SSG', 2480, 10],
    ['한우 1등급 등심 300g', '마켓컬리', 32000, 45], ['돼지 삼겹살 구이용 1kg', '쿠팡', 21900, 21], ['종근당 락토핏 골드 50포', '네이버페이', 15900, 50], ['고려은단 비타민C 1000 300정', '쿠팡', 21900, 120],
    ['피죤 섬유유연제 2.5L', 'G마켓', 9900, 60], ['하기스 맥스드라이 4단계 76매', '쿠팡', 32900, 20], ['오리온 초코파이 정 468g', '쿠팡', 5980, 30], ['스타벅스 캡슐 커피 10개입', '네이버페이', 8900, 25],
    ['로얄캐닌 인도어 4kg', '11번가', 52000, 55], ['CJ 햇반 210g 24개', '쿠팡', 23900, 30], ['페리오 치약 120g 5개', 'G마켓', 9900, 75], ['나이키 스포츠 양말 6켤레', '무신사', 19900, 200],
  ];
  const SEA = [['극조생감귤 3kg', '네이버페이', 19900, [11, 12, 1]], ['제주 한라봉 3kg', 'SSG', 29900, [1, 2, 3]], ['성주 참외 2kg', '쿠팡', 18900, [5, 6]], ['고창 수박 7kg', '쿠팡', 24900, [7, 8]], ['캠핑 의자 1+1', 'G마켓', 45900, [4, 5, 9]], ['제습기 필터 2개', '11번가', 19900, [6, 7]], ['핫팩 30개입', '쿠팡', 12900, [12, 1, 2]], ['선크림 SPF50 50ml', '올리브영', 18900, [5, 6, 7]]];
  const ONE = ['무선 이어폰', '전기포트 1.7L', '스테인리스 프라이팬 28cm', '아기 욕실화', '등산 배낭 30L', '여성 니트 가디건', '수분크림 100ml', '접이식 테이블', 'USB-C 충전기 65W', '실리콘 주걱 3종'];
  const t1 = new Date(today), t0 = new Date(t1); t0.setFullYear(t0.getFullYear() - 2);
  const iso = d => d.toISOString().slice(0, 10), out = [];
  const infl = d => 1 + 0.07 * (d - t0) / (t1 - t0);
  P.forEach(([n, mall, p, gap], k) => { for (let d = new Date(+t0 + rnd() * gap * 864e5); d < t1; d = new Date(+d + gap * (0.7 + rnd() * 0.6) * 864e5)) {
    let name = n; if (k === 10 && d > new Date(+t0 + 400 * 864e5)) name = '오리온 초코파이 정 444g'; // 슈링크플레이션 예시
    out.push({ name, mall, price: Math.round(p * infl(d) * (0.9 + rnd() * 0.2) / 10) * 10, qty: 1, date: iso(d), source: 'synth' }); } });
  SEA.forEach(([n, mall, p, ms]) => { for (let y = t0.getFullYear(); y <= t1.getFullYear(); y++) ms.forEach(m => { const d = new Date(y, m - 1, 3 + Math.floor(rnd() * 24)); if (d > t0 && d < t1 && rnd() < 0.85) out.push({ name: n, mall, price: Math.round(p * (0.9 + rnd() * 0.25) / 10) * 10, qty: 1, date: iso(d), source: 'synth' }); }); });
  for (let i = 0; i < 300; i++) { const d = new Date(+t0 + rnd() * (t1 - t0)); out.push({ name: ONE[i % ONE.length] + ' ' + (100 + i), mall: ['쿠팡', 'G마켓', '11번가', '네이버페이', 'SSG'][i % 5], price: Math.round((8000 + rnd() * 90000) / 100) * 100, qty: 1, date: iso(d), source: 'synth' }); }
  while (out.length < 1500) { const [n, mall, p] = P[Math.floor(rnd() * P.length)], d = new Date(+t0 + rnd() * (t1 - t0)); out.push({ name: n, mall, price: Math.round(p * infl(d) / 10) * 10, qty: 1, date: iso(d), source: 'synth' }); }
  const prices = {}; ['삼다수 2L 12병', '코디 3겹 30m 30롤', '종근당 락토핏 골드 50포', '하기스 맥스드라이 4단계 76매', '로얄캐닌 인도어 4kg', 'CJ 햇반 210g 24개'].forEach((n, i) => { const base = P.find(x => x[0] === n)[2]; prices[n] = Array.from({ length: 30 }, (_, j) => ({ date: iso(new Date(+t1 - (29 - j) * 864e5)), price: Math.round(base * (1.02 + 0.05 * Math.sin(i + j / 4) + i * 0.02) / 10) * 10, mall: ['다나와', '에누리'][i % 2] })); });
  return { orders: out.sort((a, b) => a.date < b.date ? -1 : 1), prices };
};
