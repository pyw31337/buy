/* 로그인된 쿠팡·네이버페이 주문목록에서 실제 주문 사진과 상품 링크를 우선 수집합니다. */
(() => {
  const mall = /coupang/.test(location.host) ? '쿠팡' : '네이버페이';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const imageUrl = image => {
    const value = image.currentSrc || image.getAttribute('data-src') || image.src || '';
    return /^https?:\/\//i.test(value) && !/(?:logo|icon|sprite|blank|loading|profile)/i.test(value) ? value : '';
  };
  const tokens = value => new Set(LetsBuy.tokens(clean(value)).filter(word => word.length > 1));
  const match = (name, text) => {
    const a = tokens(name), b = tokens(text); if (!a.size || !b.size) return { score: 0, same: 0 };
    let same = 0; a.forEach(word => { if (b.has(word)) same++; });
    return { score: same / a.size, same };
  };
  const enough = best => !!best && (best.score >= .65 || (best.same >= 2 && best.score >= .45));
  function cardFor(image) {
    let node = image.parentElement, fallback = node;
    for (let depth = 0; node && depth < 8 && node !== document.body; depth++, node = node.parentElement) {
      const text = clean(node.innerText || '');
      const role = `${node.className || ''} ${node.id || ''}`;
      const orderish = /주문|구매|배송|결제|구매확정|결제완료|주문일/.test(text);
      const cardish = /product|order|item|goods|purchase|payment|history|list|card/i.test(role);
      if (text.length >= 6 && text.length <= 1800 && (orderish || cardish)) return node;
      if (text.length >= 6 && text.length <= 900) fallback = node;
    }
    return fallback;
  }
  function visibleMedia() {
    const seen = new Set(), raw = [], counts = new Map();
    for (const image of document.images) {
      const img = imageUrl(image); if (!img) continue;
      const w = image.naturalWidth || image.clientWidth || 0, h = image.naturalHeight || image.clientHeight || 0;
      if ((w && w < 36) || (h && h < 36)) continue;
      const holder = image.closest('li,article,[class*="product"],[class*="Product"],[class*="order"],[class*="Order"],[class*="item"],[class*="Item"]') || cardFor(image);
      const text = clean(holder?.innerText || image.alt || '');
      if (!text || text.length < 6) continue;
      const anchor = image.closest('a[href]') || holder?.querySelector('a[href*="product"],a[href*="goods"],a[href*="item"],a[href*="vp/"]');
      const url = anchor?.href && /^https?:\/\//.test(anchor.href) ? anchor.href : '';
      const key = `${img}|${text.slice(0, 100)}`; if (seen.has(key)) continue;
      seen.add(key); counts.set(img, (counts.get(img) || 0) + 1);
      raw.push({ img, text: text.slice(0, 900), url, isOrder: /주문|구매|배송|결제|구매확정|결제완료|주문일/.test(text) });
    }
    // 여러 카드에 반복되는 기본 큐브·로고는 상품 사진이 아니므로 버린다.
    const unique = raw.filter(item => (counts.get(item.img) || 0) <= 2);
    const actual = unique.filter(item => item.isOrder);
    return actual.length ? actual : unique;
  }
  function enrich(rows, media) {
    let matched = 0;
    const orders = rows.map(order => {
      const best = media.map(candidate => ({ candidate, ...match(order.name, candidate.text) })).sort((a, b) => b.score - a.score || b.same - a.same)[0];
      if (!enough(best)) return order;
      matched++;
      return { ...order, img: best.candidate.img, url: best.candidate.url || undefined, source: 'orderpage' };
    });
    return { orders, matched };
  }
  const b = document.createElement('button');
  b.textContent = '실제 주문 사진 담기';
  Object.assign(b.style, { position: 'fixed', right: '20px', bottom: '20px', zIndex: 2147483647, background: '#FF5A36', color: '#fff', border: '0', borderRadius: '999px', padding: '12px 18px', font: '700 14px system-ui', boxShadow: '0 8px 24px rgba(0,0,0,.18)', cursor: 'pointer' });
  async function collect() {
    b.disabled = true; b.textContent = '주문 사진 읽는 중…';
    let rows = [];
    // SPA 주문목록은 늦게 그려진다. 사진이 실제로 나타날 시간을 짧게 준다.
    for (let attempt = 0; attempt < 5; attempt++) {
      rows = LetsBuy.parseOrderList(document.body.innerText, mall);
      if (rows.length) break;
      await sleep(1400);
    }
    // 날짜·금액 텍스트가 바뀌어도, 현재 보이는 실제 주문 카드의 사진은 그대로 활용한다.
    const media = visibleMedia();
    if (!rows.length && !media.length) { b.disabled = false; b.textContent = '주문 카드가 안 보여요'; diag('orderlist', false, `${mall} rows=0 cards=0`); return { ok: false }; }
    const result = enrich(rows, media);
    const reply = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'orderMedia', orders: result.orders, media, meta: { mall, parsed: result.orders.length, directMatched: result.matched, visible: media.length } }, resolve));
    const matched = reply?.matched || result.matched;
    const n = reply?.orders || result.orders.length;
    b.textContent = matched ? `실제 사진 ${matched}개 담음` : `${n}개 확인 · 일치 사진 없음`;
    diag('orderlist', !!reply?.ok, `${mall} rows=${result.orders.length} cards=${media.length} matched=${matched}`);
    return { ok: !!reply?.ok, matched, orders: n };
  }
  b.onclick = () => collect();
  document.body.appendChild(b);
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m.type === 'collect' || m.type === 'collectOrderMedia') { collect().then(reply); return true; }
  });
})();
