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
  b.textContent = '전체 주문 사진 담기';
  Object.assign(b.style, { position: 'fixed', right: '20px', bottom: '20px', zIndex: 2147483647, background: '#FF5A36', color: '#fff', border: '0', borderRadius: '999px', padding: '12px 18px', font: '700 14px system-ui', boxShadow: '0 8px 24px rgba(0,0,0,.18)', cursor: 'pointer' });
  // 대형 주문목록은 연도·페이지가 많다. 화면당 실제 카드만 읽으므로 600면까지 허용한다.
  const MAX_VIEWS = 600;
  let crawling = false;
  const isVisible = el => { const r = el?.getBoundingClientRect?.(); return !!r && r.width > 0 && r.height > 0; };
  const textOf = el => clean(el?.innerText || el?.textContent || '');
  const signature = () => `${clean(document.body.innerText).slice(0, 1400)}|${[...document.images].slice(0, 12).map(image => image.currentSrc || image.src).join('|')}`;
  async function waitForChange(before) {
    for (let n = 0; n < 12; n++) { await sleep(650); if (signature() !== before) { await sleep(500); return true; } }
    return false;
  }
  function active(el) { return el?.getAttribute('aria-current') === 'page' || /active|selected|on|current/i.test(`${el?.className || ''} ${el?.getAttribute('aria-selected') || ''}`); }
  function yearNodes() {
    return [...document.querySelectorAll('button,a')].filter(el => isVisible(el) && /^20(?:1\d|2\d)$/.test(textOf(el)));
  }
  function pagerNodes() {
    return [...document.querySelectorAll('button,a')].filter(el => {
      const label = textOf(el); if (!isVisible(el) || !/^[1-9]\d?$/.test(label)) return false;
      let box = el.parentElement;
      for (let depth = 0; box && depth < 4; depth++, box = box.parentElement) if (/이전|다음|prev|next/i.test(textOf(box))) return true;
      return false;
    });
  }
  async function clickLabel(label, nodes) {
    const el = nodes().find(node => textOf(node) === label);
    if (!el || active(el)) return !!el;
    const before = signature();
    el.scrollIntoView?.({ block: 'center' }); el.click();
    return waitForChange(before);
  }
  const tell = (text, state = 'running') => new Promise(resolve => chrome.runtime.sendMessage({ type: 'orderPhotoProgress', mall, text, state }, () => resolve()));
  async function collect(options = {}) {
    if (!options.silent) { b.disabled = true; b.textContent = '주문 사진 읽는 중…'; }
    let rows = [];
    // 전체 순회 중에는 이미 카드가 열린 각 화면을 한 번씩만 빠르게 읽는다.
    const attempts = options.fast ? 1 : 5;
    for (let attempt = 0; attempt < attempts; attempt++) {
      rows = LetsBuy.parseOrderList(document.body.innerText, mall);
      if (rows.length) break;
      if (attempt + 1 < attempts) await sleep(1400);
    }
    // 날짜·금액 텍스트가 바뀌어도, 현재 보이는 실제 주문 카드의 사진은 그대로 활용한다.
    const media = visibleMedia();
    if (!rows.length && !media.length) {
      if (!options.silent) { b.disabled = false; b.textContent = '주문 카드가 안 보여요'; }
      diag('orderlist', false, `${mall} rows=0 cards=0`); return { ok: false };
    }
    const result = enrich(rows, media);
    const reply = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'orderMedia', orders: result.orders, media, meta: { mall, parsed: result.orders.length, directMatched: result.matched, visible: media.length, scan: !!options.scan } }, resolve));
    const matched = reply?.matched || result.matched;
    const n = reply?.orders || result.orders.length;
    if (!options.silent) b.textContent = matched ? `실제 사진 ${matched}개 담음` : `${n}개 확인 · 일치 사진 없음`;
    diag('orderlist', !!reply?.ok, `${mall} rows=${result.orders.length} cards=${media.length} matched=${matched}`);
    return { ok: !!reply?.ok, matched, orders: n };
  }
  async function scanAll() {
    if (crawling) return { ok: true, busy: true };
    crawling = true; b.disabled = true;
    let views = 0, any = false, limited = false;
    const years = [...new Set(yearNodes().map(textOf))];
    const periods = years.length ? years : [null];
    try {
      for (const year of periods) {
        if (views >= MAX_VIEWS) { limited = true; break; }
        if (year) await clickLabel(year, yearNodes);
        // 페이지 번호는 SPA에서 일부만 보이는 경우가 많다. 현재 화면을 읽고
        // “다음”을 눌러 DOM 서명이 바뀌는지 확인하는 방식으로 끝까지 순회한다.
        let page = 0, seen = new Set();
        while (views < MAX_VIEWS) {
          const sig = signature(); if (seen.has(sig)) break; seen.add(sig);
          page++; views++; b.textContent = `${year || mall} ${page}쪽 사진 ${views}면째 읽는 중…`;
          const result = await collect({ fast: true, silent: true, scan: true }); any = any || result.ok;
          await tell(`${mall} ${year ? year + '년 ' : ''}${page}쪽 ${views}면 확인 중`, 'running');
          const next = [...document.querySelectorAll('button,a')].find(el => {
            if (!isVisible(el) || active(el)) return false;
            const label = textOf(el), aria = el.getAttribute('aria-label') || '';
            return /^(다음|다음 페이지|next|›|>)$/i.test(label) || /다음|next/i.test(aria);
          });
          if (!next) break;
          const before = signature(); next.scrollIntoView?.({ block: 'center' }); next.click();
          if (!await waitForChange(before)) break;
        }
        if (views >= MAX_VIEWS) limited = true;
        if (limited) break;
      }
      // 페이지 번호가 없는 무한 목록도 현재 탭에서 계속 아래로 내려가며 실제 카드를 읽는다.
      if (!years.length && !pagerNodes().length) {
        let still = 0;
        while (views < MAX_VIEWS && still < 3) {
          const before = signature(), y = scrollY, h = document.documentElement.scrollHeight;
          scrollBy({ top: Math.max(innerHeight * 1.6, 700), behavior: 'auto' }); await sleep(900);
          if (scrollY === y && document.documentElement.scrollHeight === h) still++; else still = 0;
          if (signature() === before && still >= 2) break;
          views++; b.textContent = `${mall} 주문 목록 ${views}면째 읽는 중…`;
          const result = await collect({ fast: true, silent: true, scan: true }); any = any || result.ok;
          await tell(`${mall} 주문 목록 ${views}면 확인 중`, 'running');
        }
        if (views >= MAX_VIEWS) limited = true;
      }
      const tail = limited ? `안전 한도 ${MAX_VIEWS}면에서 멈췄어요. 다시 누르면 이어서 읽습니다.` : `${views}면 실제 주문 카드 확인을 마쳤어요.`;
      b.textContent = tail; b.disabled = false;
      await tell(`${mall} ${tail}`, any ? 'complete' : 'no-match');
      return { ok: any, views, limited };
    } catch (error) {
      const message = String(error?.message || error || '알 수 없는 오류');
      b.disabled = false; b.textContent = '주문 사진 다시 시도';
      await tell(`${mall} 주문 사진 수집이 중단됐어요. 다시 눌러 이어서 시도해 주세요.`, 'failed');
      diag('orderlist', false, `${mall} scan ${message}`);
      return { ok: any, views, error: message };
    } finally { crawling = false; }
  }
  b.onclick = () => scanAll();
  document.body.appendChild(b);
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m.type === 'collect' || m.type === 'collectOrderMedia') { scanAll().then(reply); return true; }
  });
})();
