/* 렛츠바이 core: 주문메일 파싱 + 재구매 분석 (브라우저/확장/Node 공용) */
(function (root) {
  const MALLS = [
    ['쿠팡', /coupang|쿠팡|로켓배송/i], ['네이버페이', /naver ?pay|네이버페이|navercorp|smartstore|스마트스토어/i],
    ['G마켓', /gmarket|G마켓|지마켓/i], ['옥션', /auction|옥션/i], ['11번가', /11st|11번가/i],
    ['SSG', /ssg\.com|SSG|이마트몰|신세계몰/], ['마켓컬리', /kurly|컬리/i], ['오늘의집', /오늘의집|ohou/i],
    ['위메프', /wemakeprice|위메프/i], ['티몬', /tmon|티몬/i], ['무신사', /musinsa|무신사/i], ['알리익스프레스', /aliexpress|알리익스프레스/i],
    ['롯데ON', /lotteon|롯데ON|롯데온/i], ['홈플러스', /homeplus|홈플러스/i], ['다이소', /daiso|다이소/i], ['컬리', /kurly/i], ['메가마트', /megamart|메가마트/i], ['배민', /woowahan|배민|배달의민족/i],
  ];
  const ORDER_HINT = /(주문|결제|구매|배송|발송|출고)(준비)?\s*[이가을]?\s*(완료|확인|안내|내역|시작|되었|접수)|주문하신\s*(상품|내역)/;
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
  const BAD = /(교환|반품|환불|판매자|의무|책임|안내|경우|약관|고객센터|문의|규정|정책|동의|개인정보|수신|거부|발송|배송지|배송비|배송|배달|주문번호|주문일|결제|합계|할인|적립|쿠폰|포인트|금액|사유|훼손|분실|유출|부담|요청|가치|감소|청약|철회|소비자|분쟁|보상|기준|법|저작|copyright|all rights|무단|본 메일|이 메일|발신전용|회신|확인하기|바로가기|자세히|클릭|로그인|회원|가격|주식회사|\(주\)|㈜|미니샵|tbody|thead|수량|옵션|스토어|판매처|상점|사업자|대표|이벤트|혜택|광고|구독|주소|연락처|휴대폰|전화|이메일|받는 ?분|수령|도착|예정|영수증|카드|일시불|할부|입금|계좌|무통장|처리|완료|접수|상태|조회|변경|취소|택배|운송장|송장)/i;
  function isProductName(s) {
    s = String(s || '').trim();
    if (s.length < 4 || s.length > 90) return false;
    if (BAD.test(s) || /[<>{}=]/.test(s)) return false;
    if (/(다|요|니다|세요|시오|함|음)\s*[.!?]?$|[.!?]$/.test(s)) return false;          // 문장
    if (/^(의|및|을|를|이|가|은|는|와|과|에|로|으로|또는|단)\s|^[※*\-·•]/.test(s)) return false;   // 조각
    if (/특별시|광역시|\(\d{5}\)|^\[\d{5}\]|^주문\s*(상품|내역)|보기$|상세\s*내역|구매\s*내역|주문\s*내역|^구매\s*상세|\d+\s*건$/.test(s)) return false;
    if (/https?:|www\.|@|\.com|\.co\.kr/i.test(s)) return false;
    if (!/[가-힣A-Za-z]{2,}/.test(s)) return false;
    if (/^[\d\s,.:\-\/원개()]+$/.test(s)) return false;
    if ((s.match(/\s/g) || []).length > 14) return false;
    return true;
  }
  const BAD_IMG = /logo|banner|icon|btn|button|spacer|blank|pixel|track|open\?|1x1|bg_|arrow|bullet|line|footer|header|sns|facebook|kakao|insta|youtube|badge|ship-to|cart_|billing|stamp|_tit|title|common/i;

  // HTML → 순서대로 텍스트 칸/이미지 토큰 (DOM 없이 동작: 확장·웹·Node 공용)
  function htmlTokens(html) {
    html = String(html || '').replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
    const out = []; const re = /<img\b[^>]*>|<\/?([a-z][a-z0-9]*)\b[^>]*>|([^<]+)|</gi; let m;
    let buf = '';
    const flush = () => { const t = decode(buf).replace(/\s+/g, ' ').trim(); if (t) out.push({ t }); buf = ''; };
    while ((m = re.exec(html))) {
      if (m[0].startsWith('<img')) { flush(); const src = (m[0].match(/src\s*=\s*["']([^"']+)/i) || [])[1] || ''; const w = +((m[0].match(/width\s*=\s*["']?(\d+)/i) || [])[1] || 0); const alt = decode((m[0].match(/alt\s*=\s*["']([^"']*)/i) || [])[1] || '').trim(); out.push({ img: decode(src), w, alt }); }
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
    // 상품 이미지 alt = 상품명인 경우가 많음 → 이름 칸이 없으면 alt를 이름 칸으로 끼워 넣음
    toks = toks.flatMap((t, i) => goodImg(t) && t.alt && isProductName(clean(t.alt)) && !toks.slice(i + 1, i + 4).some(x => x.t && x.t.includes(t.alt)) ? [t, { t: t.alt }] : [t]);
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
        const pc0 = priceCell(t); if (pc0 && pc0.q) qty = pc0.q;
        const p = won(t) || (pc0 && /,/.test(t) ? pc0.p : null); if (p && p >= 100) { if (/(총|합계|배송비|할인|적립|결제\s*금액)/.test(t)) break; price = p; const q2 = (t.replace(/[0-9,]+\s*원/, '') + ' ' + ((toks[i + k + 1] || {}).t || '')).match(/(?:^|\s)(\d{1,3})\s*개(?![가-힣])/); if (q2) qty = +q2[1]; break; }
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

  // 숫자만 있는 가격 칸: "84,660 (2개)", "3580", "19,900원"
  const priceCell = t => { const m = String(t).trim().match(/^([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,7})\s*원?\s*(?:\((\d+)\s*개\))?$/); return m ? { p: +m[1].replace(/,/g, ''), q: m[2] ? +m[2] : null } : null; };
  // 배민류 "이름 이름 바코드" → 이름
  const normName = s => { s = clean(String(s).replace(/\s\d{8,14}$/, '').replace(/\/?\s*선택정보\s*[:：].*$/, '').replace(/,\s*\d+\s*(세트|개|팩|봉|박스|병|캔)$/, '')); const h = s.split(' '), n = h.length; if (n % 2 === 0 && h.slice(0, n / 2).join(' ') === h.slice(n / 2).join(' ')) s = h.slice(0, n / 2).join(' '); return s; };
  const STOP = /^(결제\s*정보|배송지\s*정보|배송\s*정보|받으시는 분|받는 사람|판매자\s*정보|총\s*결제|결제방법|상품\s*가격|상품\s*금액|주문\s*금액)/;
  // ① 표 머리(상품명/쿠팡가/수량/금액…) 뒤 행 읽기 — 쿠팡·배민·11번가형
  function tableItems(toks) {
    const T = toks.map(t => (t.t || '').trim()), out = [];
    for (let h = 0; h < T.length; h++) {
      if (!/^(상품명|쿠팡가|상품정보|상품)$/.test(T[h])) continue;
      const win = T.slice(h, h + 5).join('|');
      if (!/(상품명|쿠팡가|상품정보)/.test(win) || !/수량/.test(win) || !/(가|금액|가격)/.test(win.replace(/상품명/g, ''))) continue;
      let i = h + 1; while (i < T.length && /^(상품명|수량|쿠팡가|구매금액|판매자|정상가.*|판매가|금액|배송정보|상품정보|가격)$/.test(T[i])) i++;
      for (; i < T.length && !STOP.test(T[i]); i++) {
        const name = normName(T[i]); if (!isProductName(name)) continue;
        let price = null, qty = null, img = null;
        for (let k = i + 1; k < Math.min(T.length, i + 7); k++) {
          if (STOP.test(T[k])) break;
          const pc = priceCell(T[k]);
          if (/^\d{1,3}$/.test(T[k]) && qty == null) { qty = +T[k]; continue; }
          if (pc && price == null) { price = pc.p; if (pc.q) qty = pc.q; continue; }
          if (isProductName(normName(T[k])) && price != null) break;
        }
        for (let k = 1; k <= 3; k++) { const t = toks[i - k]; if (t && goodImg(t)) { img = t.img; break; } }
        if (price != null) out.push({ name, price, qty: qty || 1, img: img || undefined });
      }
      if (out.length) return out;
    }
    return out;
  }
  // ② "상품명" 라벨 다음 칸 — G마켓 발송 메일형 (가격 없을 수 있음)
  function labelItems(toks) {
    const out = [];
    for (let i = 0; i < toks.length - 1; i++) if (/^(상품명|주문\s*상품명|구매\s*상품)$/.test((toks[i].t || '').trim())) {
      const name = normName(toks[i + 1].t || ''); if (!isProductName(name)) continue;
      let price = null; for (let k = 2; k <= 4 && toks[i + k]; k++) { const p = won(toks[i + k].t || ''); if (p) { price = p; break; } }
      out.push({ name, price, qty: 1 });
    }
    return out;
  }
  // ③ 상품 사진 뒤 블록 — 네이버페이·SSG·롯데ON형 (사진 → [판매처] → 상품명 → 옵션/수량/금액)
  function imgBlockItems(toks) {
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      if (!goodImg(toks[i])) continue;
      let j = -1, name = '';
      for (let k = 1; k <= 3 && toks[i + k]; k++) { const t = toks[i + k]; if (t.img) break; const n = normName(t.t); if (isProductName(n)) { j = i + k; name = n; break; } }
      if (j < 0 && toks[i].alt && isProductName(clean(toks[i].alt))) { j = i; name = clean(toks[i].alt); }
      if (j < 0) continue;
      let price = null, qty = 1;
      for (let k = j + 1; k < Math.min(toks.length, j + 9); k++) {
        if (goodImg(toks[k])) break; const t = (toks[k].t || '').trim(); if (!t) continue;
        if (/^결제\s*금액/.test(t)) break;
        if (STOP.test(t) && !/^(상품\s*금액|주문\s*금액)$/.test(t)) break;
        const q = t.match(/수량\s*[:：]?\s*(\d+)/); if (q) qty = +q[1];
        if (/^수량$/.test(t) && /^\d{1,3}$/.test((toks[k + 1] || {}).t || '')) qty = +toks[k + 1].t;
        if (/^(주문\s*금액|상품\s*금액|판매가)$/.test(t) && price == null) { const p = won((toks[k + 1] || {}).t || ''); if (p) price = p; }
        const pc = priceCell(t); if (pc && price == null && /,/.test(t)) { price = pc.p; if (pc.q) qty = pc.q; }
        const pq = t.match(/^([0-9,]+)\s*원\s*\/?\s*(\d+)\s*개$/); if (pq) { price = +pq[1].replace(/,/g, ''); qty = +pq[2]; }
      }
      if (j === i && price == null) continue;
      out.push({ name, price, qty, img: toks[i].img });
      i = j;
    }
    return out;
  }
  // ④ 주문번호 → 결제금액 → 상품명 반복 — 옥션 발송 메일형 (주문번호가 상품마다 다름)
  function orderBlockItems(toks) {
    const T = toks.map(t => (t.t || '').trim()), out = [];
    for (let i = 0; i + 4 < T.length; i++) if (/^주문\s*번호$/.test(T[i]) && /^[0-9A-Z\-]{8,24}$/.test(T[i + 1]) && /^결제\s*금액$/.test(T[i + 2]) && won(T[i + 3])) {
      const name = normName(T[i + 4]); if (isProductName(name)) out.push({ name, price: won(T[i + 3]), qty: 1, orderNo: T[i + 1] });
    }
    return out;
  }
  const totalOf = T => { for (let i = 0; i < T.length - 1; i++) if (/^(총\s*결제\s*금액|최종\s*결제\s*금액|결제\s*금액)$/.test(T[i])) { const p = won(T[i + 1]) || won(T[i + 1] + (T[i + 2] === '원' ? '원' : '')) || won(T[i + 2] || ''); if (p) return p; } return null; };
  function parseItems(text) { return itemsFromTokens(String(text || '').split(/\n+/).flatMap(l => l.includes('|') ? l.split('|') : [l]).map(t => ({ t: t.trim() })).filter(t => t.t)); }
  const clean = s => String(s).replace(/\[[^\]]*(무료|특가|배송|당일|단독|행사)[^\]]*\]|\([^)]*옵션[^)]*\)|\s*(옵션|선택)\s*[:：].*$|\s*\/\s*\d+\s*개\s*$|\s*발송일\s*[:：].*$/g, ' ').replace(/[★☆♥●■◆▶]+/g, ' ').replace(/\s+/g, ' ').trim();
  const orderNoOf = t => (t.match(/주문\s*번호\s*[:：│|]?\s*([0-9A-Z\-]{8,24})/) || t.match(/장바구니\s*번호\s*[:：]?\s*([0-9]{8,20})/) || [])[1] || null;

  /** mail: {subject, from, date, body?, html?} → orders[] */
  // quoted-printable(=3D, =EC=82=BC ...) 원문 디코딩
  function decodeQP(h) {
    if (!/=3D|=\r?\n|=[0-9A-F]{2}=[0-9A-F]{2}/.test(h)) return h;
    const raw = h.replace(/=\r?\n/g, '');
    const bytes = []; for (let i = 0; i < raw.length; i++) { if (raw[i] === '=' && /^[0-9A-F]{2}$/i.test(raw.substr(i + 1, 2))) { bytes.push(parseInt(raw.substr(i + 1, 2), 16)); i += 2; } else { const c = raw.charCodeAt(i); if (c < 128) bytes.push(c); else bytes.push(...new TextEncoder().encode(raw[i])); } }
    try { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); } catch { return h; }
  }

  // .eml 원문(바이트를 latin1 문자열로) → {subject, from, date, html|body} — 브라우저 안에서만 처리
  function parseEml(raw) {
    raw = String(raw).replace(/\r\n/g, '\n');
    const bytesTo = (bin, cs) => { const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i) & 255; try { return new TextDecoder(/euc-?kr|ks_c_5601|cp949/i.test(cs || '') ? 'euc-kr' : (cs || 'utf-8')).decode(u); } catch { return new TextDecoder('utf-8').decode(u); } };
    const qp = s => s.replace(/=\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    const b64 = s => { try { return atob(s.replace(/[^A-Za-z0-9+/=]/g, '')); } catch { return ''; } };
    const split = part => { const i = part.indexOf('\n\n'); const hd = (i < 0 ? part : part.slice(0, i)).replace(/\n[ \t]+/g, ' '); const H = {}; hd.split('\n').forEach(l => { const m = l.match(/^([\w-]+):\s*(.*)$/); if (m) H[m[1].toLowerCase()] = m[2]; }); return { H, body: i < 0 ? '' : part.slice(i + 2) }; };
    const word = v => String(v || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, cs, e, t) => bytesTo(/b/i.test(e) ? b64(t) : qp(t.replace(/_/g, ' ')), cs));
    const decodeBody = (H, body) => { const te = (H['content-transfer-encoding'] || '').toLowerCase(); const cs = ((H['content-type'] || '').match(/charset="?([^";\s]+)/i) || [])[1]; const bin = te.includes('base64') ? b64(body) : te.includes('quoted') ? qp(body) : body; return bytesTo(bin, cs); };
    let html = null, text = null;
    const walk = part => { const { H, body } = split(part); const ct = H['content-type'] || 'text/plain'; const bd = (ct.match(/boundary="?([^";]+)"?/i) || [])[1];
      if (/multipart\//i.test(ct) && bd) { body.split('--' + bd).slice(1).forEach(p => { if (!/^--/.test(p)) walk(p.replace(/^\n/, '')); }); return; }
      if (/text\/html/i.test(ct) && html == null) html = decodeBody(H, body); else if (/text\/plain/i.test(ct) && text == null) text = decodeBody(H, body); };
    walk(raw);
    const { H } = split(raw); const d = new Date(H.date || '');
    const date = isNaN(d) ? '' : new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 시간 기준
    return { subject: word(H.subject), from: word(H.from), date, html: html || undefined, body: html ? undefined : (text || '') };
  }
  function parseMail(mail) {
    const toks = mail.html ? htmlTokens(decodeQP(String(mail.html))) : null;
    const body = toks ? toks.map(t => t.t || '').filter(Boolean).join('\n') : (mail.body || '');
    const text = `${mail.subject || ''}\n${body}`;
    const kind = mailKind(mail.subject, body);
    if (kind === 'ad' || kind === 'review' || kind === 'account' || kind === 'other') return [];
    const back = kind === 'cancel' || kind === 'return';
    if (!back && !ORDER_HINT.test(text)) return [];
    const mall = detectMall(text, mail.from);
    const date = parseDate(mail.date || '', null) || parseDate(text, null);
    const orderNo = orderNoOf(body);
    let items = toks ? orderBlockItems(toks) : [];
    if (!items.length && toks) items = tableItems(toks);
    if (!items.length && toks) items = imgBlockItems(toks);
    if (!items.length && toks) items = itemsFromTokens(toks);
    if (!items.length && toks) items = labelItems(toks);
    if (!items.length) items = parseItems(body);
    if (items.length === 1 && items[0].price == null && toks) { const p = totalOf(toks.map(t => (t.t || '').trim())); if (p) items[0].price = p; }
    return items.map(it => ({ ...it, mall, date, orderNo: it.orderNo || orderNo || undefined, source: 'mail', ...(back ? { status: kind } : {}) }));
  }
  // 메일 종류: order(주문·결제) shipping(발송) delivered(배송완료) sub(정기배송) cancel return review ad account other
  function mailKind(subject, body) {
    const s = String(subject || ''), b = String(body || '').slice(0, 4000);
    if (/(주문|결제)\s*(이\s*)?취소|취소\s*(완료|접수|요청|안내|처리)|환불|결제\s*취소/.test(s)) return 'cancel';
    if (/반품|교환|회수/.test(s)) return 'return';
    if (/리뷰|후기|상품평|평가|만족하셨|어떠셨/.test(s)) return 'review';
    if (/비밀번호|로그인|인증\s*번호|회원\s*가입|개인정보|약관|휴면|본인\s*확인|이용\s*내역\s*안내|명세서/.test(s)) return 'account';
    if (/정기\s*배송|정기\s*구독|구독\s*(결제|배송)/.test(s)) return 'sub';
    if (/배송\s*(이\s*)?완료|도착\s*(했|완료|예정)|배달\s*완료/.test(s)) return 'delivered';
    if (/발송|출고|배송\s*(시작|중|안내|준비)/.test(s)) return 'shipping';
    if (ORDER_HINT.test(s) || /주문|결제|구매/.test(s)) return 'order';
    if (/\(광고\)|\[광고\]|광고|쿠폰|혜택|이벤트|특가|세일|할인|초대|멤버십|와우|뉴스레터|적립|포인트|당첨|기획전|오픈|신상|한정|타임딜|추천|알림\s*신청|소식/.test(s)) return 'ad';
    if (ORDER_HINT.test(b)) return 'order';
    return 'other';
  }
  // 쇼핑 검색 결과에서 [{title, price}] 뽑기 (확장이 내 브라우저에서 받은 HTML)
  const unesc = t => String(t).replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  function parseSearch(src, html) {
    const h = String(html || ''), out = [];
    if (src === '쿠팡') {
      const parts = h.split(/<li[^>]+class="[^"]*(?:search-product|ProductUnit_productUnit)[^"]*"/).slice(1);
      for (const p of parts) {
        if (/ad-badge|AdMark|광고/.test(p.slice(0, 1500)) && out.length) continue;
        const t = (p.match(/class="[^"]*(?:\bname\b|productName)[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1];
        const v = (p.match(/class="[^"]*(?:price-value|priceValue|Price_priceValue)[^"]*"[^>]*>\s*([0-9,]+)/) || p.match(/<strong[^>]*>\s*([0-9]{1,3}(?:,[0-9]{3})+)\s*<\/strong>\s*원?/) || [])[1];
        if (t && v) out.push({ title: unesc(t), price: +v.replace(/,/g, '') });
      }
    } else if (src === '네이버') {
      const re = /"productTitle"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]{0,2500}?"(?:lowPrice|price|mobileLowPrice)"\s*:\s*"?(\d{3,})/g; let m;
      while ((m = re.exec(h)) && out.length < 20) out.push({ title: unesc(m[1]), price: +m[2] });
      if (!out.length) { const re2 = /class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>[\s\S]{0,3000}?class="[^"]*price_num[^"]*"[^>]*>[\s\S]*?([0-9]{1,3}(?:,[0-9]{3})+)/g; while ((m = re2.exec(h)) && out.length < 20) out.push({ title: unesc(m[1]), price: +m[2].replace(/,/g, '') }); }
    }
    return out.filter(x => x.title && x.price >= 100).slice(0, 20);
  }
  // 내 품목과 가장 비슷한 검색 결과 중 최저가 (토큰 절반 이상 겹침)
  function bestMatch(name, list) {
    const a = tokens(name); if (!a.length) return null;
    const ok = list.map(x => ({ ...x, s: sim(a, tokens(x.title)) })).filter(x => x.s >= 0.5);
    if (!ok.length) return null;
    const top = Math.max(...ok.map(x => x.s)); return ok.filter(x => x.s >= top - 0.25).sort((x, y) => x.price - y.price)[0];
  }
  const FAILS = new Set(['order', 'shipping', 'delivered', 'sub']);
  // 같은 주문이 주문완료·발송·배송완료 메일로 여러 번 → 하나로. 주문번호 같으면 같은 주문, 없으면 같은 쇼핑몰·이름 5일 이내
  // 취소·반품: 같은 주문번호+이름, 없으면 같은 쇼핑몰·이름 45일 안의 가장 최근 구매를 지움
  function backouts(orders) {
    const back = orders.filter(o => o && o.status), buy = orders.filter(o => o && !o.status), gone = new Set();
    for (const c of back) {
      const n = clean(c.name || ''); const m = buy.filter(o => !gone.has(o) && clean(o.name || '') === n && (c.orderNo && o.orderNo ? o.orderNo === c.orderNo : o.mall === c.mall && day(c.date) - day(o.date) >= -1 && day(c.date) - day(o.date) <= 45)).sort((a, b) => a.date < b.date ? 1 : -1)[0];
      if (m) gone.add(m);
    }
    return { kept: buy.filter(o => !gone.has(o)), removed: [...gone] };
  }
  function dedupe(orders) {
    const out = [], byNo = new Map();
    const bo = orders.some(o => o && o.status) ? backouts(orders) : null; if (bo) orders = bo.kept;
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
  function analyze(orders, today, aliases, opts) {
    const all = opts && opts.all;
    today = today || new Date().toISOString().slice(0, 10);
    const out = [];
    for (const { key, list, alias, forced } of group(dedupe(orders), aliases)) {
      list.sort((a, b) => a.date < b.date ? -1 : 1);
      const dates = [...new Set(list.map(o => o.date))].sort();
      if (dates.length < 2) { if (all && dates.length) { const prices = list.filter(o => o.price).map(o => ({ date: o.date, price: Math.round(o.price / (o.qty || 1)), mall: o.mall })); out.push({ key, name: forced ? alias : list[list.length - 1].name, count: 1, dates, gaps: [], avgGap: 0, cv: 0, type: '1회', confidence: 0, last: dates[0], nextDate: null, daysLeft: 9999, status: '1회 구매', prices, malls: [...new Set(list.map(o => o.mall))], img: (list.slice().reverse().find(o => o.img) || {}).img || null, names: [...new Set(list.map(o => o.name))] }); } continue; }
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
    return out.sort((a, b) => a.daysLeft - b.daysLeft || (a.last < b.last ? 1 : -1));
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

  const api = { parseSearch, bestMatch, mailKind, FAILS, backouts, parseEml, imgBlockItems, orderBlockItems, tableItems, labelItems, normName, decodeQP, isProductName, htmlTokens, dedupe, parseOrderList, parseMail, parseItems, analyze, keyOf, tokens, group, sim, detectMall, won };
  if (typeof module !== 'undefined') module.exports = api; else root.LetsBuy = api;
})(typeof self !== 'undefined' ? self : this);
