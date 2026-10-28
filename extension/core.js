/* 렛츠바이 core: 주문메일 파싱 + 재구매 분석 (브라우저/확장/Node 공용) */
(function (root) {
  const MALLS = [
    ['쿠팡', /coupang|쿠팡|로켓배송/i], ['네이버페이', /naver ?pay|네이버페이|navercorp|smartstore|스마트스토어/i],
    ['G마켓', /gmarket|G마켓|지마켓/i], ['옥션', /auction|옥션/i], ['11번가', /11st|11번가/i],
    ['SSG', /ssg\.com|SSG|이마트몰|신세계몰/], ['마켓컬리', /kurly|컬리/i], ['오늘의집', /오늘의집|ohou/i],
    ['위메프', /wemakeprice|위메프/i], ['티몬', /tmon|티몬/i], ['무신사', /musinsa|무신사/i], ['알리익스프레스', /aliexpress|알리익스프레스/i],
    ['롯데ON', /lotteon|롯데ON|롯데온/i], ['홈플러스', /homeplus|홈플러스/i], ['다이소', /daiso|다이소/i], ['컬리', /kurly/i],
  ];
  const ORDER_HINT = /(주문|결제|구매|배송|발송|출고)[이가을]?\s*(완료|확인|안내|내역|시작|되었|접수)/;
  const CANCEL_HINT = /(취소|환불|반품)\s*(완료|접수|안내)/;

  function detectMall(text, from) {
    const s = (from || '') + ' ' + text.slice(0, 600);
    for (const [n, re] of MALLS) if (re.test(s)) return n;
    return '기타';
  }
  const won = s => { const m = String(s).replace(/\s/g, '').match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,8})원/); return m ? +m[1].replace(/,/g, '') : null; };

  function parseDate(text, fallback) {
    let m = text.match(/(20\d{2})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    return fallback || null;
  }

  // 상품명 후보 추출: "상품명 : xxx", "상품정보 xxx", 또는 "...원" 앞줄
  function parseItems(text) {
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let m = l.match(/^(?:상품명|주문상품명?|상품정보|주문하신 상품|구매상품|상품)\s*[:：|]?\s*(.{4,120})$/);
      if (m && !/금액|가격|수량/.test(m[1])) {
        let price = won(l.replace(m[1], '')) || null;
        for (let k = 1; k <= 3 && !price && lines[i + k]; k++) if (/금액|가격|원$/.test(lines[i + k])) price = won(lines[i + k]);
        const q = (lines.slice(i, i + 4).join(' ').match(/수량\s*[:：]?\s*(\d+)/) || [])[1];
        items.push({ name: clean(m[1]), price, qty: q ? +q : 1 });
      }
    }
    if (!items.length) { // 표 형태: "상품명 | 수량 | 금액" 한 줄
      for (const l of lines) {
        const m = l.match(/^(.{6,100}?)\s*[|\t]\s*(\d+)\s*개?\s*[|\t]\s*([0-9,]+)\s*원/);
        if (m && !/상품명|합계|배송비/.test(m[1])) items.push({ name: clean(m[1]), qty: +m[2], price: +m[3].replace(/,/g, '') });
      }
    }
    if (!items.length) { // 쿠팡류: 상품명 다음 줄에 "가격 원 / 수량 개"
      for (let i = 0; i < lines.length - 1; i++) {
        const l = lines[i], n = lines[i + 1];
        if (l.length >= 8 && l.length <= 120 && !/원|주문|배송|고객|안내|번호|일시|주소|님|결제|합계|할인|적립|쿠폰|포인트|수신|문의|http/.test(l) && /원/.test(n) && /개|수량|원$/.test(n))
          items.push({ name: clean(l), price: won(n), qty: +((n.match(/(\d+)\s*개/) || [])[1] || 1) });
      }
    }
    const seen = new Set();
    return items.filter(it => it.name.length >= 4 && !seen.has(it.name) && seen.add(it.name));
  }
  const clean = s => s.replace(/\[[^\]]*\]|\([^)]*옵션[^)]*\)|\s*(옵션|선택)\s*[:：].*$|\s*\/\s*\d+\s*개\s*$/g, ' ').replace(/[★☆♥●■◆▶]+/g, ' ').replace(/\s+/g, ' ').trim();

  /** mail: {subject, from, date, body} → orders[] */
  function parseMail(mail) {
    const text = `${mail.subject || ''}\n${mail.body || ''}`;
    if (CANCEL_HINT.test(mail.subject || '')) return [];
    if (!ORDER_HINT.test(text)) return [];
    const mall = detectMall(text, mail.from);
    const date = parseDate(mail.date || '', null) || parseDate(text, null);
    return parseItems(mail.body || '').map(it => ({ ...it, mall, date, source: 'mail' }));
  }

  // 정규화 키: 용량/개수/브랜드 노이즈 제거 후 핵심 토큰
  const SYN = [[/화장지|두루마리|롤휴지|휴지/g, '휴지'], [/키친 ?타올|키친 ?타월|키친 ?페이퍼/g, '키친타월'], [/물티슈|웨트티슈/g, '물티슈'],
    [/섬유 ?유연제/g, '섬유유연제'], [/세탁 ?세제|액체 ?세제|캡슐 ?세제/g, '세탁세제'], [/제습제|습기 ?제거제/g, '제습제'],
    [/생수|먹는 ?샘물/g, '생수'], [/원두|커피 ?빈/g, '원두'], [/치약/g, '치약'], [/샴푸/g, '샴푸'], [/기저귀/g, '기저귀']];
  const NOISE = /(무료배송|정품|최신|당일발송|당일|특가|행사|국내|단독|본사|공식|인기|추천|대용량|리필|본품|1\+1|2\+1|기획|세트|증정|new|best)/g;
  function tokens(name) {
    let n = name.toLowerCase();
    for (const [re, w] of SYN) n = n.replace(re, ' ' + w + ' ');
    return [...new Set(n.replace(/[0-9]+(\.[0-9]+)?\s*(ml|l|g|kg|mm|cm|m|매|롤|개입|개|팩|입|ea|겹|매입|정|병|캔|박스|box|p|호)/gi, ' ')
      .replace(NOISE, ' ').replace(/[^가-힣a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 1 && !/^\d+$/.test(t)))];
  }
  const keyOf = name => tokens(name).slice(0, 4).sort().join(' ');
  function sim(a, b) { const A = new Set(a), i = b.filter(t => A.has(t)).length; return i / Math.min(a.length, b.length || 1); }
  /** 상품명 묶기: 핵심 토큰이 70% 이상 겹치면 같은 품목. aliases {name: groupName} 으로 수동/AI 보정 가능 */
  function group(orders, aliases) {
    aliases = aliases || {};
    const gs = [];
    for (const o of orders) {
      if (!o.date || !o.name) continue;
      const nm = aliases[o.name] || o.name, t = tokens(nm);
      let g = gs.find(g => g.alias === nm) || (!aliases[o.name] && gs.find(g => !g.forced && sim(g.t, t) >= 0.7));
      if (!g) { g = { key: keyOf(nm) || nm, t, list: [], alias: nm, forced: !!aliases[o.name] }; gs.push(g); }
      g.list.push(o);
    }
    return gs;
  }
  const day = d => Math.round(new Date(d + 'T00:00:00Z').getTime() / 864e5);

  /** orders → 재구매 분석 결과 */
  function analyze(orders, today, aliases) {
    today = today || new Date().toISOString().slice(0, 10);
    const out = [];
    for (const { key, list, alias, forced } of group(orders, aliases)) {
      list.sort((a, b) => a.date < b.date ? -1 : 1);
      const dates = [...new Set(list.map(o => o.date))].sort();
      if (dates.length < 2) continue;
      const gaps = dates.slice(1).map((d, i) => day(d) - day(dates[i]));
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - avg) ** 2, 0) / gaps.length);
      const cv = avg ? sd / avg : 0;
      const months = dates.map(d => +d.slice(5, 7));
      const years = new Set(dates.map(d => d.slice(0, 4)));
      // 시즌: 서로 다른 해에 같은 계절(±1개월)에 몰림 + 간격 대부분 300일 이상
      const span = Math.max(...months) - Math.min(...months);
      const seasonal = years.size >= 2 && (span <= 2 || span >= 10) && gaps.filter(g => g > 250).length >= gaps.length / 2;
      let type = '비정기', confidence = 0.4;
      if (seasonal) { type = '시즌'; confidence = Math.min(0.95, 0.5 + 0.15 * years.size); }
      else if (dates.length >= 3 && cv < 0.45) { type = '주기'; confidence = Math.min(0.95, 0.9 - cv); }
      else if (dates.length === 2) { type = '주기(추정)'; confidence = 0.45; }
      const last = dates[dates.length - 1];
      let nextDate;
      if (type === '시즌') { const m = Math.round(months.reduce((a, b) => a + b, 0) / months.length); const y = +today.slice(0, 4); nextDate = `${(m <= +today.slice(5, 7) ? y + 1 : y)}-${String(m).padStart(2, '0')}-01`; if (dates.some(d => d.startsWith(String(y)) && +d.slice(5,7)===m)) {} }
      else { const t = new Date(last + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + Math.round(avg)); nextDate = t.toISOString().slice(0, 10); }
      const dLeft = day(nextDate) - day(today);
      const prices = list.filter(o => o.price).map(o => ({ date: o.date, price: Math.round(o.price / (o.qty || 1)), mall: o.mall }));
      const status = dLeft < 0 ? '지금 살 때' : dLeft <= 14 ? '곧 필요' : '여유';
      out.push({ key, name: forced ? alias : list[list.length - 1].name, count: dates.length, dates, gaps, avgGap: Math.round(avg), cv: +cv.toFixed(2), type, confidence: +confidence.toFixed(2), last, nextDate, daysLeft: dLeft, status, prices, malls: [...new Set(list.map(o => o.mall))], names: [...new Set(list.map(o => o.name))] });
    }
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /** 쿠팡·네이버페이 등 '주문목록' 화면 텍스트 → orders[]. 날짜 줄 아래 상품명+가격 줄을 묶음 */
  function parseOrderList(text, mall) {
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean), out = [];
    let date = null;
    const skip = /주문상세|배송조회|교환|반품|리뷰|장바구니|재구매|구매확정|문의|판매자|도착|배송완료|결제완료|취소|더보기|선물|^\d+개$|원$/;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const dm = l.match(/^(20\d{2})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{1,2})\.?\s*(주문|결제)?/);
      if (dm && l.length < 30) { date = `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`; continue; }
      if (!date || l.length < 8 || l.length > 140 || skip.test(l)) continue;
      for (let k = 1; k <= 3 && lines[i + k]; k++) {
        const pm = lines[i + k].replace(/\s/g, '').match(/^([0-9,]+)원(?:·|\/)?(\d+)?개?$/);
        if (pm) { out.push({ name: clean(l), price: +pm[1].replace(/,/g, ''), qty: +(pm[2] || 1), mall, date, source: 'orderlist' }); i += k; break; }
      }
    }
    return out;
  }

  const api = { parseOrderList, parseMail, parseItems, analyze, keyOf, tokens, group, sim, detectMall, won };
  if (typeof module !== 'undefined') module.exports = api; else root.LetsBuy = api;
})(typeof self !== 'undefined' ? self : this);
