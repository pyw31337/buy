/* 렛츠바이 분석: 카테고리·단위가격·월별 지출·시즌·전년 비교·슈링크플레이션 (브라우저/Node 공용, 서버 없음) */
(function (root) {
  // [대분류, 소분류, 키워드] — 위에서부터 먼저 맞는 것
  const DICT = [
    ['영양제', '영양제', /비타민|오메가|유산균|프로바이오|루테인|마그네슘|밀크씨슬|홍삼|영양제|콜라겐|철분|아연|칼슘|멀티비타|글루코사민|프로폴리스|엽산|코엔자임|크릴|락토핏|락토|비타|종합영양|오쏘몰|센트룸|덴마크유산균|밀크시슬|비오틴|쏘팔메토/],
    ['육아', '기저귀·물티슈', /기저귀|하기스|팸퍼스|보솜이|아기\s*물티슈|유아\s*물티슈/],
    ['육아', '육아용품', /아기|유아|키즈|베이비|아동|젖병|분유|이유식|어린이/],
    ['반려동물', '반려동물', /사료|고양이|강아지|반려|펫|모래|츄르|로얄캐닌|캐닌|오리젠|하림펫|배변패드/],
    ['생활용품', '화장지·위생', /화장지|휴지|키친\s*타[올월]|물티슈|생리대|마스크|면봉|티슈|롤(?![가-힣])/],
    ['생활용품', '세탁·청소·생활', /세제|유연제|락스|세정|표백|청소|섬유탈취|제습|방향제|탈취|수세미|고무장갑|쓰레기\s*봉투|종량제|건전지|배터리|전구/],
    ['뷰티', '바디·헤어', /샴푸|린스|컨디셔너|트리트먼트|바디\s*워시|바디\s*로션|핸드\s*크림|비누|치약|칫솔|가글|면도|데오/],
    ['뷰티', '화장품', /크림|로션|세럼|에센스|선크림|선블록|토너|마스크팩|클렌징|립|쿠션|파운데이션|화장품|향수/],
    ['캠핑·레저', '캠핑·레저', /캠핑|접이식\s*테이블|캠핑\s*테이블|텐트|랜턴|의자|타프|버너|코펠|아이스박스|침낭|등산|자전거|낚시|골프|요가|수영/],
    ['가전·디지털', '가전·디지털', /전기포트|커피포트|에어프라이어|전자레인지|밥솥|청소기|충전기|케이블|이어폰|헤드폰|키보드|마우스|모니터|노트북|태블릿|아이폰|갤럭시|스피커|선풍기|청소기|에어컨|가습기|공기청정|필터|드라이기|에어랩|usb|hdmi|ssd|led/i],
    ['주방', '주방용품', /주걱|국자|뒤집개|집게|도마|프라이팬|냄비|도마|칼(?![가-힣])|식기|그릇|컵(?![가-힣])|텀블러|밀폐|용기|랩(?![가-힣])|호일|지퍼백|위생백|키친|수저|주방/],
    ['패션', '패션', /티셔츠|셔츠|바지|팬츠|자켓|재킷|패딩|다운|코트|니트|양말|속옷|팬티|브라|신발|운동화|슬리퍼|모자|가방|레깅스|원피스|후드/],
    ['식품', '간식·과자', /과자|스낵|초코|쿠키|파이|젤리|사탕|칩(?![가-힣])|비스킷|아이스크림|떡(?![가-힣])|꿀떡|빵(?![가-힣])|케이크|초코파이|웨하스|팝콘|견과|아몬드/],
    ['식품', '육류', /삼겹|목살|돼지|소고기|한우|갈비|등심|안심|닭|오리(?!온)|베이컨|햄(?![가-힣])|소시지|차돌|우삼겹|불고기|육포|양념육|왕구이/],
    ['식품', '수산', /새우|연어|고등어|오징어|조기|갈치|전복|굴(?![가-힣])|홍합|꼬막|멸치|김(?![가-힣])|미역|다시마|참치|어묵|명란|게(?![가-힣])|대게|문어/],
    ['식품', '과일', /사과|배(?![가-힣])|감귤|귤|한라봉|딸기|바나나|포도|샤인머스캣|복숭아|수박|참외|멜론|키위|블루베리|망고|체리|자몽|오렌지|레몬|아보카도|토마토/],
    ['식품', '채소', /양파|대파|파(?![가-힣])|마늘|감자|고구마|당근|양배추|배추|상추|버섯|팽이|애호박|호박|오이|콩나물|숙주|시금치|브로콜리|파프리카|무(?![가-힣])|알배기|깻잎|고추/],
    ['식품', '유제품·계란', /우유|요거트|이오(?![가-힣])|요구르트|치즈|버터|계란|달걀|대란|구(?![가-힣])|비요뜨|이오(?![가-힣])|생크림/],
    ['식품', '음료', /생수|삼다수|탄산|콜라|사이다|주스|음료|이온|포카리|게토레이|두유|아이시스|제로/],
    ['식품', '커피·차', /커피|원두|캡슐|드립|아메리카노|라떼|녹차|티백|보리차|커피포리/],
    ['식품', '쌀·면·빵', /쌀(?![가-힣])|현미|잡곡|라면|국수|파스타|우동|냉면|떡볶이|식빵|베이글|만두|밀떡/],
    ['식품', '간편식', /김밥|도시락|볶음밥|비빔밥|즉석|햇반|즉석밥|오뚜기밥|레토르트|밀키트|국(?![가-힣])|탕(?![가-힣])|찌개|카레|죽(?![가-힣])|피자|치킨|돈까스|너겟|삼계탕/],
    ['식품', '양념·소스', /간장|된장|고추장|소스|케첩|마요|식초|설탕|소금|참기름|들기름|올리브유|식용유|드레싱|조미료|다시/],
    ['식품', '두부·가공', /두부|햄|스팸|통조림|참치캔|김치|반찬|장아찌|젓갈|어묵/],
  ];
  const MAIN = ['식품', '영양제', '생활용품', '육아', '반려동물', '뷰티', '주방', '패션', '캠핑·레저', '가전·디지털', '기타'];
  const COLORS = { '식품': '#FF7A45', '영양제': '#9B59F6', '생활용품': '#3B82F6', '육아': '#F472B6', '반려동물': '#B45309', '뷰티': '#EC4899', '주방': '#14B8A6', '패션': '#111827', '캠핑·레저': '#16A34A', '가전·디지털': '#64748B', '기타': '#C4C2BC' };
  function categorize(name, override) {
    if (override) { const [m, s] = String(override).split('/'); return { main: m, sub: s || m }; }
    const n = String(name || '');
    for (const [m, s, re] of DICT) if (re.test(n)) return { main: m, sub: s };
    return { main: '기타', sub: '기타' };
  }

  // 상품명에서 용량·개수: "200ml* 4입" "3kg" "2.0kg" "30m 30롤" "100g 6개" "80ml*10" "600g x 4팩"
  function sizeOf(name) {
    const n = String(name || '').replace(/,/g, '');
    const m = n.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|ml|mL|l|L|리터)(?![a-z])/i);
    let amt = null, unit = null;
    if (m) { amt = +m[1]; const u = m[2].toLowerCase(); if (u === 'kg') { amt *= 1000; unit = 'g'; } else if (u === 'g') unit = 'g'; else if (u === 'mg') { amt /= 1000; unit = 'g'; } else if (u === 'ml') unit = 'ml'; else { amt *= 1000; unit = 'ml'; } }
    let cnt = 1; const c = n.match(/(?:[x×*]\s*(\d{1,3})(?:\s*(?:개|입|팩|봉|병|캔|롤|매|구|포))?)|(\d{1,3})\s*(?:개입|개|입|팩|봉|병|캔|롤|매|구|포|정|캡슐)(?![가-힣])/);
    if (c) cnt = +(c[1] || c[2]);
    if (!unit) return cnt > 1 ? { amt: cnt, unit: '개', cnt, total: cnt } : null;
    return { amt, unit, cnt, total: amt * cnt };
  }
  // 단위가격: 100g·100ml당, 개수만 있으면 1개당
  function unitPrice(name, price, qty) {
    const s = sizeOf(name); if (!s || !price) return null;
    const tot = s.total * (qty || 1), per = s.unit === '개' ? 1 : 100;
    return { value: Math.round(price / tot * per), label: s.unit === '개' ? '1개당' : `100${s.unit}당`, size: s };
  }

  const ym = d => d.slice(0, 7);
  const addM = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const sum = a => a.reduce((x, y) => x + y, 0);

  /** orders → 대시보드 데이터 */
  function insights(orders, opts) {
    opts = opts || {}; const today = opts.today || new Date().toISOString().slice(0, 10), cats = opts.cats || {}, L = root.LetsBuy;
    const os = (L ? L.dedupe(orders) : orders).filter(o => o.date && o.date <= today);
    const groups = L ? L.group(os, opts.aliases) : os.map(o => ({ key: o.name, list: [o], alias: o.name }));
    const catOfKey = {}, rows = [];
    for (const g of groups) { const nm = g.list[g.list.length - 1].name; const c = categorize(nm, cats[g.key]); catOfKey[g.key] = c; for (const o of g.list) rows.push({ ...o, key: g.key, cat: c.main, sub: c.sub, spend: o.price || 0 }); }
    // 월별 (최근 24개월)
    const end = ym(today), months = []; for (let i = 23; i >= 0; i--) months.push(addM(end, -i));
    const monthly = months.map(m => { const r = rows.filter(o => ym(o.date) === m); return { m, spend: sum(r.map(o => o.spend)), count: r.length, orders: new Set(r.map(o => o.date + o.mall)).size }; });
    // 카테고리
    const byCat = MAIN.map(c => { const r = rows.filter(o => o.cat === c); return { cat: c, color: COLORS[c], spend: sum(r.map(o => o.spend)), count: r.length, items: new Set(r.map(o => o.key)).size }; }).filter(x => x.count);
    const subs = {}; rows.forEach(o => { const k = o.cat + '/' + o.sub; subs[k] = subs[k] || { cat: o.cat, sub: o.sub, spend: 0, count: 0 }; subs[k].spend += o.spend; subs[k].count++; });
    // 쇼핑몰
    const mallMap = {}; rows.forEach(o => { const m = mallMap[o.mall] = mallMap[o.mall] || { mall: o.mall, spend: 0, count: 0 }; m.spend += o.spend; m.count++; });
    // 시즌 히트맵: 대분류·소분류 × 1~12월 (구매 건수)
    const heatCats = Object.values(subs).sort((a, b) => b.count - a.count).slice(0, 12);
    const heat = heatCats.map(s => ({ label: s.sub, cat: s.cat, color: COLORS[s.cat], v: Array.from({ length: 12 }, (_, i) => rows.filter(o => o.sub === s.sub && o.cat === s.cat && +o.date.slice(5, 7) === i + 1).length) }));
    // 장바구니(같은 날·같은 쇼핑몰 = 한 주문)
    const baskets = {}; rows.forEach(o => { const k = o.orderNo || o.date + o.mall; baskets[k] = (baskets[k] || 0) + o.spend; });
    const bv = Object.values(baskets).filter(v => v > 0);
    // 전년 비교: 최근 12개월 vs 그 전 12개월
    const cur = monthly.slice(12), prev = monthly.slice(0, 12);
    const yoy = { cur: sum(cur.map(m => m.spend)), prev: sum(prev.map(m => m.spend)), curN: sum(cur.map(m => m.count)), prevN: sum(prev.map(m => m.count)) };
    yoy.pct = yoy.prev ? Math.round((yoy.cur - yoy.prev) / yoy.prev * 100) : null;
    const c0 = months[12], catYoy = byCat.map(c => { const a = sum(rows.filter(o => o.cat === c.cat && ym(o.date) >= c0).map(o => o.spend)), b = sum(rows.filter(o => o.cat === c.cat && ym(o.date) < c0 && ym(o.date) >= months[0]).map(o => o.spend)); return { cat: c.cat, color: c.color, cur: a, prev: b, pct: b ? Math.round((a - b) / b * 100) : null }; });
    // 피크 달
    const peaks = monthly.filter(m => m.spend).slice().sort((a, b) => b.spend - a.spend).slice(0, 3);
    const moy = Array.from({ length: 12 }, (_, i) => ({ mo: i + 1, spend: sum(rows.filter(o => +o.date.slice(5, 7) === i + 1).map(o => o.spend)), count: rows.filter(o => +o.date.slice(5, 7) === i + 1).length }));
    // 많이 산 품목
    const items = groups.map(g => { const l = g.list.slice().sort((a, b) => a.date < b.date ? -1 : 1); return { key: g.key, name: l[l.length - 1].name, cat: catOfKey[g.key].main, sub: catOfKey[g.key].sub, count: new Set(l.map(o => o.date)).size, spend: sum(l.map(o => o.price || 0)), img: (l.slice().reverse().find(o => o.img) || {}).img || null, dates: [...new Set(l.map(o => o.date))], list: l }; });
    const top = items.slice().sort((a, b) => b.count - a.count || b.spend - a.spend).slice(0, 12);
    const topSpend = items.slice().sort((a, b) => b.spend - a.spend).slice(0, 8);
    // 가격 변화·슈링크플레이션 (내가 낸 가격 기준)
    const changes = [];
    for (const it of items) {
      const l = it.list.filter(o => o.price); if (l.length < 3) continue;
      const first = l[0], last = l[l.length - 1]; if (first.date === last.date) continue;
      const u0 = unitPrice(first.name, first.price, first.qty), u1 = unitPrice(last.name, last.price, last.qty);
      const p0 = first.price / (first.qty || 1), p1 = last.price / (last.qty || 1);
      const s0 = sizeOf(first.name), s1 = sizeOf(last.name);
      const shrink = s0 && s1 && s0.unit === s1.unit && s1.total < s0.total && p1 >= p0 * 0.95 ? Math.round((1 - s1.total / s0.total) * 100) : 0;
      changes.push({ key: it.key, name: it.name, img: it.img, cat: it.cat, from: first.date, to: last.date, p0: Math.round(p0), p1: Math.round(p1), pct: Math.round((p1 - p0) / p0 * 100), unitPct: u0 && u1 && u0.label === u1.label ? Math.round((u1.value - u0.value) / u0.value * 100) : null, shrink, s0, s1 });
    }
    // 시장가 비교(확장이 내 브라우저에서 모은 오늘 최저가): 작년 이맘때 낸 가격 vs 지금
    const market = [];
    const prices = opts.prices || {};
    for (const it of items) {
      const pk = prices[it.key] ? it.key : Object.keys(prices).find(k => it.name.includes(k) || k.includes(it.name)); const p = pk && prices[pk]; if (!p || !p.length) continue; const now = p[p.length - 1];
      const yearAgo = addM(ym(today), -12), near = it.list.filter(o => o.price && Math.abs((+o.date.slice(0, 4) * 12 + +o.date.slice(5, 7)) - (+yearAgo.slice(0, 4) * 12 + +yearAgo.slice(5, 7))) <= 2);
      const ref = (near.length ? near : it.list.filter(o => o.price)).slice(-1)[0]; if (!ref) continue;
      const paid = Math.round(ref.price / (ref.qty || 1));
      market.push({ key: it.key, name: it.name, img: it.img, paid, paidDate: ref.date, now: now.price, nowSrc: now.mall, nowDate: now.date, pct: Math.round((now.price - paid) / paid * 100), yearAgo: !!near.length });
    }
    return { today, months, monthly, byCat, subs: Object.values(subs).sort((a, b) => b.spend - a.spend), malls: Object.values(mallMap).sort((a, b) => b.spend - a.spend), heat, basket: { avg: bv.length ? Math.round(sum(bv) / bv.length) : 0, n: bv.length, max: bv.length ? Math.max(...bv) : 0 }, yoy, catYoy, peaks, moy, top, topSpend, items, changes: changes.filter(c => Math.abs(c.pct) <= 100).sort((a, b) => (b.shrink > 0) - (a.shrink > 0) || Math.abs(b.pct) - Math.abs(a.pct)), shrink: changes.filter(c => c.shrink > 0), market: market.sort((a, b) => b.pct - a.pct), total: { spend: sum(rows.map(o => o.spend)), count: rows.length, items: items.length, priced: rows.filter(o => o.spend).length }, catOfKey };
  }
  const api = { DICT, MAIN, COLORS, categorize, sizeOf, unitPrice, insights };
  if (typeof module !== 'undefined') module.exports = api; else root.LetsBuyInsights = api;
})(typeof window !== 'undefined' ? window : globalThis);
