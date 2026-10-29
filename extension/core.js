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

  // ── 상품명 판정: 약관·안내 문장 걸러내기 ──
  const BAD = /(교환|반품|환불|판매자|의무|책임|안내|경우|약관|고객센터|문의|규정|정책|동의|개인정보|수신|거부|발송|배송지|배송비|배송|주문번호|주문일|결제|합계|할인|적립|쿠폰|포인트|금액|사유|훼손|분실|유출|부담|요청|가치|감소|청약|철회|소비자|분쟁|보상|기준|법|저작|copyright|all rights|무단|본 메일|이 메일|발신전용|회신|확인하기|바로가기|자세히|클릭|로그인|회원|가격|tbody|thead|수량|옵션|스토어|판매처|상점|사업자|대표|이벤트|혜택|광고|구독|주소|연락처|휴대폰|전화|이메일|받는 ?분|수령|도착|예정|영수증|카드|일시불|할부|입금|계좌|무통장|처리|완료|접수|상태|조회|변경|취소|택배|운송장|송장)/i;
  function isProductName(s) {
    s = String(s || '').trim();
    if (s.length < 4 || s.length > 90) return false;
    if (BAD.test(s) || /[<>{}=]/.test(s)) return false;
    if (/(다|요|니다|세요|시오|함|음)\s*[.!?]?$|[.!?]$/.test(s)) return false;          // 문장
    if (/^(의|및|을|를|이|가|은|는|와|과|에|로|으로|또는|단)\s|^[※*\-·•]/.test(s)) return false;   // 조각
    if (/https?:|www\.|@|\.com|\.co\.kr/i.test(s)) return false;
    if (!/[가-힣A-Za-z]{2,}/.test(s)) return false;
    if (/^[\d\s,.:\-\/원개()]+$/.test(s)) return false;
    if ((s.match(/\s/g) || []).length > 14) return false;
    return true;
  }
  const BAD_IMG = /logo|banner|icon|btn|button|spacer|blank|pixel|track|open\?|1x1|bg_|arrow|bullet|line|footer|header|sns|facebook|kakao|insta|youtube|badge|stamp|_tit|title|common/i;

  // HTML → 순서대로 텍스트 칸/이미지 토큰 (DOM 없이 동작: 확장·웹·Node 공용)
  function htmlTokens(html) {
    html = String(html || '').replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
    const out = []; const re = /<img\b[^>]*>|<\/?([a-z][a-z0-9]*)\b[^>]*>|([^<]+)|</gi; let m;
    let buf = '';
    const flush = () => { const t = decode(buf).replace(/\s+/g, ' ').trim(); if (t) out.push({ t }); buf = ''; };
    while ((m = re.exec(html))) {
      if (m[0].startsWith('<img')) { flush(); const src = (m[0].match(/src\s*=\s*["']([^"']+)/i) || [])[1] || ''; const w = +((m[0].match(/width\s*=\s*["']?(\d+)/i) || [])[1] || 0); out.push({ img: decode(src), w }); }
      else if (m[2] !== undefined) buf += m[2];
      else if (m[0] === '<') buf += ' ';
      else if (/^<\/?(span|a|strong|b|font|em|i|u|small|label)\b/i.test(m[0])) buf += ' ';
      else flush();
    }
    flush(); return out;
  }
  const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
  const goodImg = t => t && t.img && /^https?:\/\//.test(t.img) && !BAD_IMG.test(t.img) && !(t.w && t.w < 40);

  // 상품 블록: [이미지] 상품명 (옵션) 수량 가격 — 이름 뒤 6칸 안에 가격이 있어야 인정
  function itemsFromTokens(toks) {
    const items = [];
    for (let i = 0; i < toks.length; i++) {
      let name = toks[i].t; if (!name) continue;
      const lab = name.match(/^(?:상품명|주문\s*상품명?|상품\s*정보|구매\s*상품|주문하신\s*상품)\s*(?:[:：|]\s*|\s+)(.+)$/);
      if (lab) name = lab[1];
      name = clean(name);
      if (!isProductName(name)) continue;
      let price = null, qty = 1, opt = '';
      for (let k = 1; k <= 6 && toks[i + k]; k++) {
        const t = toks[i + k].t; if (!t) continue;
        if (/^(옵션|선택)\s*[:：]/.test(t)) { opt = t.replace(/^(옵션|선택)\s*[:：]\s*/, ''); continue; }
        const q = t.match(/(?:수량\s*[:：]?\s*(\d+)|(\d+)\s*개(?![가-힣]))/); if (q) qty = +(q[1] || q[2]);
        if (/(총|합계|배송비|할인|적립|결제\s*금액|상품\s*금액|주문\s*금액)/.test(t) && !won(t)) break;
        const p = won(t); if (p && p >= 100) { if (/(총|합계|배송비|할인|적립|결제\s*금액)/.test(t)) break; price = p; break; }
        if (isProductName(clean(t)) && !/^(옵션|선택)/.test(t)) break; // 다음 상품명이 먼저 나오면 중단
      }
      if (!price) continue;
      let img = null;
      for (let k = 1; k <= 5 && i - k >= 0; k++) { const t = toks[i - k]; if (goodImg(t)) { img = t.img; break; } if (t.t && won(t.t)) break; }
      items.push({ name, price, qty, opt: opt || undefined, img: img || undefined });
    }
    const seen = new Set();
    return items.filter(it => !seen.has(it.name) && seen.add(it.name));
  }
  function parseItems(text) { return itemsFromTokens(String(text || '').split(/\n+/).flatMap(l => l.includes('|') ? l.split('|') : [l]).map(t => ({ t: t.trim() })).filter(t => t.t)); }
  const clean = s => String(s).replace(/\[[^\]]*(무료|특가|배송|당일|단독|행사)[^\]]*\]|\([^)]*옵션[^)]*\)|\s*(옵션|선택)\s*[:：].*$|\s*\/\s*\d+\s*개\s*$/g, ' ').replace(/[★☆♥●■◆▶]+/g, ' ').replace(/\s+/g, ' ').trim();
  const orderNoOf = t => (t.match(/주문\s*번호\s*[:：]?\s*([0-9A-Z\-]{8,24})/) || [])[1] || null;

  /** mail: {subject, from, date, body?, html?} → orders[] */
  function parseMail(mail) {
    const toks = mail.html ? htmlTokens(mail.html) : null;
    const body = toks ? toks.map(t => t.t || '').filter(Boolean).join('\n') : (mail.body || '');
    const text = `${mail.subject || ''}\n${body}`;
    if (/(취소|환불|반품|교환)/.test(mail.subject || '')) return [];
    if (!ORDER_HINT.test(text)) return [];
    const mall = detectMall(text, mail.from);
    const date = parseDate(mail.date || '', null) || parseDate(text, null);
    const orderNo = orderNoOf(body);
    const items = toks ? itemsFromTokens(toks) : parseItems(body);
    return items.map(it => ({ ...it, mall, date, orderNo: orderNo || undefined, source: 'mail' }));
  }
  // 같은 주문이 주문완료·발송·배송완료 메일로 여러 번 → 하나로. 주문번호 같으면 같은 주문, 없으면 같은 쇼핑몰·이름 5일 이내
  function dedupe(orders) {
    const out = [], byNo = new Map();
    for (const o of [...orders].filter(o => o && o.date && isProductName(clean(o.name))).sort((a, b) => a.date < b.date ? -1 : 1)) {
      const k = o.orderNo ? o.orderNo + '|' + o.name : null;
      if (k && byNo.has(k)) { const p = byNo.get(k); p.img = p.img || o.img; continue; }
      const near = !k && out.find(p => p.name === o.name && p.mall === o.mall && Math.abs(day(p.date) - day(o.date)) <= 5);
      if (near) { near.img = near.img || o.img; continue; }
      out.push({ ...o }); if (k) byNo.set(k, out[out.length - 1]);
    }
    return out;
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
    for (const { key, list, alias, forced } of group(dedupe(orders), aliases)) {
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
      out.push({ key, name: forced ? alias : list[list.length - 1].name, count: dates.length, dates, gaps, avgGap: Math.round(avg), cv: +cv.toFixed(2), type, confidence: +confidence.toFixed(2), last, nextDate, daysLeft: dLeft, status, prices, malls: [...new Set(list.map(o => o.mall))], img: (list.slice().reverse().find(o => o.img) || {}).img || null, names: [...new Set(list.map(o => o.name))] });
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
      if (!date || l.length < 8 || l.length > 140 || skip.test(l) || !isProductName(clean(l))) continue;
      for (let k = 1; k <= 3 && lines[i + k]; k++) {
        const pm = lines[i + k].replace(/\s/g, '').match(/^([0-9,]+)원(?:·|\/)?(\d+)?개?$/);
        if (pm) { out.push({ name: clean(l), price: +pm[1].replace(/,/g, ''), qty: +(pm[2] || 1), mall, date, source: 'orderlist' }); i += k; break; }
      }
    }
    return out;
  }

  const api = { isProductName, htmlTokens, dedupe, parseOrderList, parseMail, parseItems, analyze, keyOf, tokens, group, sim, detectMall, won };
  if (typeof module !== 'undefined') module.exports = api; else root.LetsBuy = api;
})(typeof self !== 'undefined' ? self : this);
