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
  const overlap = (name, text) => {
    const a = tokens(name), b = tokens(text); if (!a.size || !b.size) return 0;
    let same = 0; a.forEach(word => { if (b.has(word)) same++; });
    return same / a.size;
  };
  function visibleMedia() {
    const seen = new Set(), out = [];
    for (const image of document.images) {
      const img = imageUrl(image); if (!img) continue;
      const w = image.naturalWidth || image.clientWidth || 0, h = image.naturalHeight || image.clientHeight || 0;
      if ((w && w < 36) || (h && h < 36)) continue;
      const holder = image.closest('li,article,[class*="product"],[class*="Product"],[class*="order"],[class*="Order"]') || image.parentElement;
      const text = clean(holder?.innerText || image.alt || '');
      if (!text || text.length < 6) continue;
      const anchor = image.closest('a[href]') || holder?.querySelector('a[href*="product"],a[href*="goods"],a[href*="item"],a[href*="vp/"]');
      const url = anchor?.href && /^https?:\/\//.test(anchor.href) ? anchor.href : '';
      const key = `${img}|${text.slice(0, 100)}`; if (seen.has(key)) continue;
      seen.add(key); out.push({ img, text: text.slice(0, 900), url });
    }
    return out;
  }
  function enrich(rows) {
    const media = visibleMedia(); let matched = 0;
    const orders = rows.map(order => {
      const best = media.map(candidate => ({ candidate, score: overlap(order.name, candidate.text) })).sort((a, b) => b.score - a.score)[0];
      if (!best || best.score < .5) return order;
      matched++;
      return { ...order, img: best.candidate.img, url: best.candidate.url || undefined, source: 'orderpage' };
    });
    return { orders, matched, media: media.length };
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
    if (!rows.length) { b.disabled = false; b.textContent = '주문을 못 찾았어요'; diag('orderlist', false, `${mall} items=0`); return { ok: false }; }
    const result = enrich(rows);
    const reply = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'orderMedia', orders: result.orders, meta: { mall, matched: result.matched, visible: result.media } }, resolve));
    const n = reply?.orders || result.orders.length;
    b.textContent = result.matched ? `실제 사진 ${result.matched}개 담음` : `${n}개 주문 담음 · 사진은 다음 화면에서`;
    diag('orderlist', !!reply?.ok, `${mall} items=${result.orders.length} images=${result.matched}/${result.media}`);
    return { ok: !!reply?.ok, matched: result.matched, orders: result.orders.length };
  }
  b.onclick = () => collect();
  document.body.appendChild(b);
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m.type === 'collect' || m.type === 'collectOrderMedia') { collect().then(reply); return true; }
  });
})();
