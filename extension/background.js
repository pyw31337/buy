importScripts('core.js');
const diag = (step, ok, info) => chrome.storage.local.get('diag', d => { const a = (d.diag || []).slice(-199); a.push({ t: new Date().toISOString(), step, ok, info: String(info || '').slice(0, 200), where: 'background' }); chrome.storage.local.set({ diag: a }); });
const todayStr = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜

chrome.runtime.onInstalled.addListener(() => setup());
chrome.runtime.onStartup.addListener(() => setup());
function setup() { chrome.alarms.create('daily', { periodInMinutes: 6 * 60, delayInMinutes: 1 }); }
// 6시간마다 깨어나서 오늘 아직 안 했으면 실행 (브라우저가 꺼져 있던 날도 다음 실행 때 따라잡음)
chrome.alarms.onAlarm.addListener(async a => {
  if (a.name === 'daily') {
    const { pricedAt } = await chrome.storage.local.get('pricedAt');
    if (pricedAt !== todayStr()) { await collectPrices(); await notify(); }
    return;
  }
  // 긴 사진 채우기는 MV3 서비스 워커가 중간에 종료돼도 다음 묶음부터 이어 간다.
  if (a.name === 'thumb-resume') await fillImages(false);
});
// 아이콘 클릭(또는 Alt+Shift+L) 한 번 = 지금 탭에서 전부 수집
const WEB = 'https://pyw31337.github.io/buy/';
const COLLECTABLE = /^https:\/\/(mail\.naver\.com|mail\.google\.com|mc\.coupang\.com|my\.coupang\.com|www\.coupang\.com\/my|order\.pay\.naver\.com|pay\.naver\.com)/;
const badge = (text, color = '#FF5A36') => { chrome.action.setBadgeBackgroundColor({ color }); chrome.action.setBadgeText({ text: String(text) }); };
let orderSaveQueue = Promise.resolve();
const queueOrderSave = work => { const next = orderSaveQueue.then(work, work); orderSaveQueue = next.catch(() => {}); return next; };
const ORDER_PHOTO_PAGES = [
  { mall: '네이버페이', url: 'https://order.pay.naver.com/home' },
  { mall: '쿠팡', url: 'https://mc.coupang.com/ssr/desktop/mycoupang/orders/list?pageType=ORDER_HISTORY' }
];
const pendingOrderPhotoTabs = new Map();
chrome.action.onClicked.addListener(async tab => {
  if (!COLLECTABLE.test(tab.url || '')) { chrome.tabs.create({ url: WEB }); return; }
  badge('…');
  chrome.tabs.sendMessage(tab.id, { type: 'collect' }, () => {
    if (chrome.runtime.lastError) { chrome.tabs.reload(tab.id); badge('↻', '#9A9AA3'); diag('click', false, 'content script missing, reloaded'); }
  });
});
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.type === 'progress') { const n = (m.text.match(/(\d+)개/) || [])[1]; if (n) badge(n); chrome.storage.local.set({ collectProgress: { state: 'running', text: m.text, at: new Date().toISOString() } }); }
  if (m.type === 'done' && m.failed) { badge('!', '#C8321E'); chrome.storage.local.set({ collectProgress: { state: 'failed', text: '수집에 실패했어요. 메일 탭을 열고 다시 시도해 주세요.', at: new Date().toISOString() } }); }
  if (m.type === 'orders' && m.stats) chrome.storage.local.set({ collectStats: m.stats });
  if (m.type === 'orders') saveOrders(m.orders, m.mails).then(async n => {
    if (!m.done) return;
    const stopped = !!m.stats?.cancelled;
    await chrome.storage.local.set({ collectProgress: { state: stopped ? 'cancelled' : 'complete', text: stopped ? `중단됨 · 지금까지 상품 ${n}개를 저장했어요` : `완료 · 상품 ${n}개를 저장했어요`, at: new Date().toISOString() } });
    badge('✓', '#1F9D63'); setTimeout(() => badge(''), 8000);
    const [t] = await chrome.tabs.query({ url: WEB + '*' });
    if (t) { chrome.tabs.update(t.id, { active: true }); chrome.tabs.reload(t.id); } else chrome.tabs.create({ url: WEB });
    // 사진 검색은 사용자가 "사진 채우기"를 눌렀을 때만 시작한다.
    collectPrices().then(notify); // 가격은 뒤에서 조용히
  });
  if (m.type === 'orderMedia') {
    queueOrderSave(() => mergeOrderMedia(m.orders || [], m.media || [], m.meta || {})).then(async result => {
      const meta = m.meta || {};
      const matched = result.matched || 0;
      await updateOrderPhotoProgress(meta.mall, {
        state: matched ? 'complete' : 'no-match',
        text: matched ? `${meta.mall || '주문내역'} 실제 사진 ${matched}개 반영` : `${meta.mall || '주문내역'} 주문 카드를 찾았지만 기존 구매명과 일치한 사진이 없어요.`,
        ...meta, ...result
      });
      reply({ ok: true, orders: result.orders, matched, cards: result.cards });
    }).catch(e => reply({ ok: false, error: String(e?.message || e) }));
    return true;
  }
  if (m.type === 'openOrderPhotos') { openOrderPhotoPages().then(reply).catch(e => reply({ ok: false, error: String(e?.message || e) })); return true; }
  if (m.type === 'pricesNow') { collectPrices().then(r => notify().then(() => reply(r))); return true; }
  if (m.type === 'testNotify') { show('test', '렛츠바이 알림 테스트', '알림이 잘 보이면 준비 완료예요.'); reply({}); }
  if (m.type === 'health') {
    chrome.storage.local.get(['orders', 'mails', 'pricedAt', 'collectProgress', 'settings'], d => reply({ ready: true, storage: true, orders: (d.orders || []).length, mails: (d.mails || []).length, pricedAt: d.pricedAt || null, collectProgress: d.collectProgress || null, settings: d.settings || { shareThumbs: false }, version: chrome.runtime.getManifest().version }));
    return true;
  }
  if (m.type === 'settings') { chrome.storage.local.set({ settings: { shareThumbs: !!m.settings?.shareThumbs } }).then(() => reply({ ok: true })); return true; }
  if (m.type === 'cancelCollect') { cancelCollections().then(() => reply({ ok: true })); return true; }
});

async function openOrderPhotoPages() {
  const opened = [];
  for (let i = 0; i < ORDER_PHOTO_PAGES.length; i++) {
    const spec = ORDER_PHOTO_PAGES[i], tab = await chrome.tabs.create({ url: spec.url, active: i === 0 });
    pendingOrderPhotoTabs.set(tab.id, spec.mall); opened.push(spec.mall);
  }
  await chrome.storage.local.set({ orderPhotoProgress: { state: 'opening', text: '네이버페이·쿠팡 주문내역에서 실제 사진을 확인하고 있어요.', malls: opened, status: Object.fromEntries(opened.map(mall => [mall, { state: 'opening' }])), at: new Date().toISOString() } });
  return { ok: true, opened };
}
async function updateOrderPhotoProgress(mall, next) {
  const { orderPhotoProgress = {} } = await chrome.storage.local.get('orderPhotoProgress');
  const status = { ...(orderPhotoProgress.status || {}), [mall || '주문내역']: { ...next, at: new Date().toISOString() } };
  const lines = Object.entries(status).map(([name, state]) => `${name}: ${state.text || (state.state === 'opening' ? '확인 중' : '')}`).filter(Boolean);
  await chrome.storage.local.set({ orderPhotoProgress: { ...orderPhotoProgress, ...next, status, text: lines.join(' · '), at: new Date().toISOString() } });
}
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== 'complete' || !pendingOrderPhotoTabs.has(tabId)) return;
  const mall = pendingOrderPhotoTabs.get(tabId); pendingOrderPhotoTabs.delete(tabId);
  // SPA가 주문 카드와 이미지를 그릴 시간을 준 뒤 현재 보이는 실제 주문을 읽는다.
  setTimeout(() => chrome.tabs.sendMessage(tabId, { type: 'collectOrderMedia' }, result => {
    const error = chrome.runtime.lastError?.message;
    if (error || !result?.ok) updateOrderPhotoProgress(mall, { state: 'needs-login', text: `${mall} 주문내역을 읽지 못했어요. 로그인·주문목록 화면을 확인해 주세요.` });
  }), 4500);
});

async function cancelCollections() {
  const tabs = await chrome.tabs.query({ url: ['https://mail.naver.com/*', 'https://mail.google.com/*'] });
  for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'cancelCollect' }, () => void chrome.runtime.lastError);
  await chrome.storage.local.set({ collectProgress: { state: 'cancelled', text: '중단 요청을 보냈어요. 현재 읽은 메일까지만 저장합니다.', at: new Date().toISOString() } });
}
chrome.notifications.onClicked.addListener(() => chrome.tabs.create({ url: 'https://pyw31337.github.io/buy/' }));

// 원본 메일 HTML은 이 브라우저 안에만 보관 → 해석기가 좋아지면 다시 수집하지 않고 재분석
const slim = h => String(h || '').replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '').replace(/\s(style|class|id|bgcolor|align|valign|cellpadding|cellspacing|border)="[^"]*"/gi, '').slice(0, 400000);
async function saveOrders(list, mails) {
  const st = await chrome.storage.local.get(['orders', 'mails']);
  const box = st.mails || [], ids = new Set(box.map(m => m.id));
  for (const m of mails || []) if (m.id && !ids.has(m.id)) { box.push({ ...m, html: slim(m.html) }); ids.add(m.id); }
  const other = (st.orders || []).filter(o => o.source && o.source !== 'mail').concat((list || []).filter(o => o.source !== 'mail'));
  // 보관한 모든 메일로 개수를 다시 셈(이번 수집분만 세던 v0.12까지의 불일치 해결)
  const ms = { mails: box.length, ordersMail: 0, parsed: 0, notice: 0, fail: 0, kinds: {}, failMall: {}, noticeMall: {} };
  const fromMail = box.flatMap(m => {
    let r = []; try { r = LetsBuy.parseMail(m); } catch {}
    const kind = LetsBuy.mailKind(m.subject, ''), mall = LetsBuy.detectMall(m.subject, m.from); ms.kinds[kind] = (ms.kinds[kind] || 0) + 1;
    if (r.length) { ms.parsed++; ms.ordersMail++; }
    else if (mall !== '기타' && (kind === 'shipping' || kind === 'delivered')) { ms.notice++; ms.noticeMall[mall] = (ms.noticeMall[mall] || 0) + 1; } // 배송 알림: 같은 주문을 주문 메일에서 이미 셈
    else if (mall !== '기타' && LetsBuy.FAILS.has(kind)) { ms.fail++; ms.ordersMail++; ms.failMall[mall] = (ms.failMall[mall] || 0) + 1; m.fail = 1; }
    return r;
  });
  const orders = LetsBuy.dedupe(other.concat(fromMail));
  await chrome.storage.local.set({ orders, mails: box, mailStats: ms, parser: chrome.runtime.getManifest().version });
  diag('save', true, `mails=${box.length} orders=${orders.length}`);
  return orders.length;
}
function mediaMatch(name, text) {
  const a = new Set(LetsBuy.tokens(name || '')), b = new Set(LetsBuy.tokens(text || ''));
  if (!a.size || !b.size) return { score: 0, same: 0 };
  let same = 0; a.forEach(word => { if (b.has(word)) same++; });
  return { score: same / a.size, same };
}
const sameMall = (orderMall, sourceMall) => sourceMall === '네이버페이' ? /네이버/.test(orderMall || '') : String(orderMall || '') === sourceMall;
const enoughMedia = match => match && (match.score >= .65 || (match.same >= 2 && match.score >= .45));
// 주문 목록의 DOM은 플랫폼마다 계속 바뀐다. 행 파서 결과가 0건이어도 저장된 메일 구매명과
// 현재 보이는 주문 카드의 이름을 대조해 이미지만 보강한다.
async function mergeOrderMedia(list, media, meta) {
  if (list.length) await saveOrders(list, []);
  const st = await chrome.storage.local.get('orders');
  const cards = (media || []).filter(item => item && item.img && item.text && item.isOrder !== false);
  let matched = 0;
  const orders = (st.orders || []).map(order => {
    if (order.img || !sameMall(order.mall, meta.mall)) return order;
    const best = cards.map(card => ({ card, ...mediaMatch(order.name, card.text) })).sort((a, b) => b.score - a.score || b.same - a.same)[0];
    if (!enoughMedia(best)) return order;
    matched++;
    return { ...order, img: best.card.img, url: order.url || best.card.url || undefined, photoSource: 'orderpage' };
  });
  const saved = LetsBuy.dedupe(orders);
  await chrome.storage.local.set({ orders: saved, parser: chrome.runtime.getManifest().version });
  diag('order-media', true, `${meta.mall || 'unknown'} cards=${cards.length} parsed=${list.length} matched=${matched}`);
  return { orders: saved.length, matched, cards: cards.length };
}
// 확장을 새로 고치거나 업데이트하면 보관한 메일로 자동 재분석한다.
// 사진 검색은 사용자가 "사진 채우기"를 눌렀을 때만 수행한다.
chrome.runtime.onInstalled.addListener(() => saveOrders([], []).then(() => diag('reanalyze', true, 'mail-only')));

// 가격 소스: 순서대로 시도. 모두 사용자 브라우저(국내 IP)에서 품목당 하루 1회만 요청
const SOURCES = [
  { name: '다나와', url: q => 'https://search.danawa.com/dsearch.php?query=' + q,
    parse: h => (h.match(/class="price_sect"[\s\S]{0,500}?<strong>([0-9,]+)<\/strong>/) || h.match(/<em class="prc_c">([0-9,]+)<\/em>/) || [])[1],
    img: h => { const m = h.match(/class="thumb_image"[\s\S]{0,400}?<img[^>]+(?:data-original|src)="([^"]+)"/); return m && !/noImg|blank/i.test(m[1]) ? (m[1].startsWith('//') ? 'https:' + m[1] : m[1]) : null; } },
  { name: '에누리', url: q => 'https://www.enuri.com/search.jsp?keyword=' + q,
    parse: h => (h.match(/"minprice"\s*:\s*"?([0-9]+)/i) || h.match(/class="tx--price"[^>]*>\s*([0-9,]+)/) || [])[1] },
];
async function fetchText(u) { const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000); try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); } finally { clearTimeout(t); } }

// 쿠팡·네이버쇼핑: 내 브라우저에서 검색 결과를 읽음. 먼저 조용히 요청, 막히면 비활성 탭으로 열어 읽고 닫음
const SHOPS = [
  { name: '쿠팡', url: q => 'https://www.coupang.com/np/search?q=' + q + '&lb=1' },
  { name: '네이버', url: q => 'https://search.shopping.naver.com/search/all?query=' + q + '&lb=1' },
];
const waiters = {};
chrome.runtime.onMessage.addListener((m, s) => { if (m && m.type === 'searchHtml' && s.tab && waiters[s.tab.id]) { waiters[s.tab.id](m.html); delete waiters[s.tab.id]; } });
async function viaTab(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  try { return await new Promise((res, rej) => { waiters[tab.id] = res; setTimeout(() => rej(new Error('시간 초과')), 20000); }); }
  finally { delete waiters[tab.id]; chrome.tabs.remove(tab.id).catch(() => {}); }
}
const blocked = h => /Access Denied|captcha|보안 확인|비정상적인 접근|자동입력 방지/i.test(h.slice(0, 5000));
async function shopSearch(shop, q, state) {
  if (state.off) throw new Error('오늘은 쉼');
  let html = '';
  if (!state.tab) { try { const r = await fetch(shop.url(q), { credentials: 'include' }); html = r.ok ? await r.text() : ''; } catch { html = ''; } }
  let list = html && !blocked(html) ? LetsBuy.parseSearch(shop.name, html) : [];
  if (!list.length) { state.tab = true; if (state.tabs++ >= 25) { state.off = true; throw new Error('탭 한도'); } html = await viaTab(shop.url(q)); if (blocked(html)) { state.off = true; throw new Error('차단'); } list = LetsBuy.parseSearch(shop.name, html); }
  return list;
}

async function collectPrices() {
  const { orders = [], prices = {}, aliases = {} } = await chrome.storage.local.get(['orders', 'prices', 'aliases']);
  const today = todayStr(), items = LetsBuy.analyze(orders, today, aliases).sort((a, b) => b.count - a.count).slice(0, 60); let ok = 0; const fails = {}, st = {};
  SHOPS.forEach(s => st[s.name] = { tab: false, tabs: 0, off: false });
  for (const it of items) {
    const q = encodeURIComponent(LetsBuy.tokens(it.name).slice(0, 5).join(' ') || it.name);
    const arr = (prices[it.key] || []).slice(), have = new Set(arr.filter(p => p.date === today).map(p => p.src || p.mall));
    for (const s of SOURCES) {
      if (have.has(s.name) || have.has(s.name + ' 최저')) continue;
      try {
        const html = await fetchText(s.url(q)), v = s.parse(html), im = s.img && s.img(html);
        const price = v ? +String(v).replace(/,/g, '') : 0;
        if (!price || price < 100) throw new Error('가격을 못 찾음');
        arr.push({ date: today, price, mall: s.name + ' 최저', src: s.name, url: s.url(q), img: im || undefined, matchLevel: 'query' }); ok++;
      } catch (e) { fails[s.name] = (fails[s.name] || 0) + 1; }
      await new Promise(r => setTimeout(r, 1200));
    }
    for (const s of SHOPS) {
      if (have.has(s.name)) continue;
      try {
        const m = LetsBuy.bestMatch(it.name, await shopSearch(s, q, st[s.name]));
        if (!m) throw new Error('비슷한 상품 없음');
        arr.push({ date: today, price: m.price, mall: s.name, src: s.name, title: m.title.slice(0, 120), img: m.img || undefined, url: m.url || s.url(q).replace('&lb=1', ''), cat: m.cat || undefined, matchScore: m.matchScore, matchLevel: m.matchLevel }); ok++;
      } catch (e) { fails[s.name] = (fails[s.name] || 0) + 1; }
      await new Promise(r => setTimeout(r, 2500 + Math.random() * 1500));
    }
    prices[it.key] = arr.slice(-1500);
  }
  await chrome.storage.local.set({ prices, pricedAt: today, pricedTs: new Date().toISOString() });
  diag('prices', ok > 0 || !items.length, `ok=${ok}/${items.length} fails=${JSON.stringify(fails)} shops=${JSON.stringify(st)}`);
  return { ok, total: items.length, fails };
}

function show(id, title, message) { chrome.notifications.create('lb-' + id + '-' + Date.now(), { type: 'basic', iconUrl: 'icons/icon128.png', title, message, priority: 1 }); }
async function notify() {
  const { orders = [], prices = {}, aliases = {}, notified = {}, settings = { due: true, drop: true } } = await chrome.storage.local.get(['orders', 'prices', 'aliases', 'notified', 'settings']);
  const today = todayStr(), items = LetsBuy.analyze(orders, today, aliases);
  for (const it of items) {
    if (settings.due && it.type !== '비정기' && it.type !== '시즌' && it.daysLeft <= 3 && notified['due:' + it.key] !== it.nextDate) {
      show('due', '다시 살 때가 됐어요', `${it.name} · 평균 ${it.avgGap}일마다 사셨어요`); notified['due:' + it.key] = it.nextDate;
    }
    if (settings.due && it.type === '시즌' && it.daysLeft <= 21 && it.daysLeft >= 0 && notified['season:' + it.key] !== it.nextDate) {
      show('season', '곧 시즌이에요', `${it.name} · 매년 ${+it.nextDate.slice(5, 7)}월쯤 사셨어요`); notified['season:' + it.key] = it.nextDate;
    }
    const p = prices[it.key] || [];
    if (settings.drop && p.length >= 7 && p[p.length - 1].date === today) {
      const now = p[p.length - 1].price, past = p.slice(-31, -1), avg = past.reduce((a, x) => a + x.price, 0) / past.length, min = Math.min(...past.map(x => x.price));
      if (now <= min && now < avg * 0.93 && notified['drop:' + it.key] !== today) {
        show('drop', '가격이 내려갔어요', `${it.name} · ${now.toLocaleString()}원 (최근 평균보다 ${Math.round(100 - now / avg * 100)}% 쌈)`); notified['drop:' + it.key] = today;
      }
    }
  }
  await chrome.storage.local.set({ notified });
}

// 로컬 AI(Ollama): 웹페이지(https)에서 바로 부르면 Ollama가 낯선 주소라며 403으로 막음.
// 확장이 대신 부르고, 요청 주소(Origin)는 규칙으로 지워서 설정 없이 동작
chrome.runtime.onInstalled.addListener(() => chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [11434], addRules: [{ id: 11434, priority: 1, action: { type: 'modifyHeaders', requestHeaders: [{ header: 'origin', operation: 'remove' }] }, condition: { urlFilter: '|http://127.0.0.1:11434/', resourceTypes: ['xmlhttprequest', 'other'] } }] }).catch(e => diag('ollama-rule', false, e)));
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (!m || m.type !== 'ollama') return;
  (async () => {
    const base = 'http://127.0.0.1:11434';
    try {
      const t0 = await fetch(base + '/api/tags'); if (t0.status === 403) return reply({ ok: false, why: 'origin' });
      const tags = await t0.json(), have = (tags.models || []).map(x => x.name);
      if (m.op === 'ping') return reply({ ok: true, models: have });
      const model = m.model && have.includes(m.model) ? m.model : (have.find(n => /qwen|gemma|llama|exaone/i.test(n)) || have[0]);
      if (!model) return reply({ ok: false, why: 'nomodel' });
      const r = await fetch(base + '/api/chat', { method: 'POST', body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: m.prompt }] }) });
      if (!r.ok) return reply({ ok: false, why: 'http' + r.status });
      reply({ ok: true, model, content: (await r.json()).message.content });
    } catch (e) { reply({ ok: false, why: 'down' }); }
  })();
  return true;
});

// ── 사진 채우기: 사용자가 눌렀을 때만 실행. 메일 사진 → 가격 기록 사진 → 쇼핑몰 검색 순
const IMG_SEARCH = [
  { name: '네이버', url: q => 'https://search.shopping.naver.com/search/all?query=' + q, pick: h => (LetsBuy.parseSearch('네이버', h).find(x => x.img) || {}).img || LetsBuy.findImg('네이버', h) },
  { name: '다나와', url: q => 'https://search.danawa.com/dsearch.php?query=' + q, pick: h => LetsBuy.findImg('다나와', h) },
  { name: '쿠팡', url: q => 'https://www.coupang.com/np/search?q=' + q, pick: h => (LetsBuy.parseSearch('쿠팡', h).find(x => x.img) || {}).img || LetsBuy.findImg('쿠팡', h) },
  { name: '11번가', url: q => 'https://search.11st.co.kr/Search.tmall?kwd=' + q, pick: h => LetsBuy.findImg('11번가', h) },
  { name: 'G마켓', url: q => 'https://browse.gmarket.co.kr/search?keyword=' + q, pick: h => LetsBuy.findImg('G마켓', h) },
  { name: '컬리', url: q => 'https://www.kurly.com/search?sword=' + q, pick: h => LetsBuy.findImg('컬리', h) },
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function toWebp(url) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 6000);
  try {
    const r = await fetch(url, { signal: c.signal, referrerPolicy: 'no-referrer', credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status);
    const bm = await createImageBitmap(await r.blob()); if (bm.width < 40 || bm.height < 40) throw new Error('작음');
    const S = 240, k = Math.min(1, S / Math.max(bm.width, bm.height)), cv = new OffscreenCanvas(Math.round(bm.width * k), Math.round(bm.height * k));
    cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
    for (const q of [0.78, 0.6, 0.42]) { const b = await cv.convertToBlob({ type: 'image/webp', quality: q }); if (b.size <= 58000 && b.type === 'image/webp') return b; }
    throw new Error('큼');
  } finally { clearTimeout(t); }
}
const b64 = async b => { const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return 'data:image/webp;base64,' + btoa(s); };
const THUMB_BATCH_SIZE = 12, THUMB_CONCURRENCY = 3, THUMB_ALARM = 'thumb-resume', SOURCE_FAILURE_LIMIT = 3;
async function thumbSearchText(url) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 5500);
  try {
    const r = await fetch(url, { credentials: 'include', cache: 'no-store', signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}
function imageSourcesFor(item) {
  const mall = String(item.malls?.[0] || item.mall || '');
  const primary = /네이버|스마트/.test(mall) ? '네이버'
    : /쿠팡/.test(mall) ? '쿠팡'
    : /11번가/.test(mall) ? '11번가'
    : /G마켓|옥션/.test(mall) ? 'G마켓'
    : /컬리/.test(mall) ? '컬리' : '네이버';
  return [IMG_SEARCH.find(s => s.name === primary), ...IMG_SEARCH.filter(s => s.name !== primary)].filter(Boolean).slice(0, 3);
}
let filling = false;
async function fillImages(force) {
  if (filling) return { busy: true }; filling = true;
  let lastProgress = null, priorProgress = null;
  try {
    const st = await chrome.storage.local.get(['orders', 'prices', 'aliases', 'thumbs', 'thumbMiss', 'settings', 'thumbJob', 'thumbProg']);
    priorProgress = st.thumbProg || null;
    const thumbs = st.thumbs || {}, miss = st.thumbMiss || {}, today = todayStr(), prices = st.prices || {};
    const items = LetsBuy.analyze(st.orders || [], today, st.aliases || {}, { all: true }).sort((a, b) => b.count - a.count);
    // 주문 메일에 이미 담긴 사진은 다시 검색하지 않는다.
    for (const it of items) if (!thumbs[it.key] && it.img) thumbs[it.key] = { u: it.img, from: '메일' };
    let job = !force && st.thumbJob?.keys?.length ? st.thumbJob : null;
    if (!job) {
      const todo = items.filter(it => !thumbs[it.key] && (force || !miss[it.key] || Date.parse(today) - Date.parse(miss[it.key]) > 7 * 864e5));
      job = { keys: todo.map(it => it.key), cursor: 0, total: todo.length, found: 0, searched: 0, sources: {}, startedAt: new Date().toISOString() };
      await chrome.alarms.clear(THUMB_ALARM);
    }
    job.found = Number(job.found) || 0;
    job.searched = Number(job.searched) || 0;
    job.sources = job.sources && typeof job.sources === 'object' ? job.sources : {};
    const byKey = new Map(items.map(it => [it.key, it]));
    const batchKeys = job.keys.slice(job.cursor, job.cursor + THUMB_BATCH_SIZE);
    const progress = async (done, extra = {}) => {
      lastProgress = { done, total: job.total, have: Object.keys(thumbs).length, all: items.length, found: job.found, searched: job.searched, sources: job.sources, running: done < job.total, at: new Date().toISOString(), ...extra };
      await chrome.storage.local.set({ thumbProg: lastProgress });
    };
    if (!batchKeys.length) {
      await chrome.storage.local.set({ thumbs, thumbJob: null }); await progress(job.total, { running: false });
      return { got: 0, total: job.total };
    }
    await progress(job.cursor, { queued: job.cursor > 0 });
    const off = {}; let done = job.cursor, batchGot = 0, batchSearched = 0, next = 0;
    const source = name => job.sources[name] || (job.sources[name] = { tried: 0, success: 0, blocked: 0, network: 0, noImage: 0, image: 0, skipped: 0 });
    const processOne = async key => {
      const it = byKey.get(key); if (!it || thumbs[key]) return;
      const cands = (prices[key] || []).slice().reverse().map(p => p.img).filter(Boolean).map(u => ({ u, from: '가격 기록' }));
      let blob = null, from = '', hash = '';
      if (st.settings?.shareThumbs) {
        try {
          hash = await LetsBuy.thumbHash(key);
          const r = await fetch(LetsBuy.THUMBS + '/has?h=' + hash).then(x => x.ok ? x.json() : { have: [] });
          if ((r.have || []).includes(hash)) thumbs[key] = { u: LetsBuy.THUMBS + '/t/' + hash + '.webp', from: '공유' };
        } catch (e) { diag('thumb-has', false, e.message); }
      }
      if (thumbs[key]) { batchGot++; job.found++; return; }
      for (const c of cands) {
        try { blob = await toWebp(c.u); from = c.from; source('가격 기록').success++; break; }
        catch { source('가격 기록').image++; }
      }
      const q = encodeURIComponent(LetsBuy.tokens(it.name).slice(0, 5).join(' ') || it.name);
      for (const s of imageSourcesFor(it)) {
        if (blob) break;
        const stat = source(s.name);
        // 한 검색원이 실제로 막혀도 다른 검색원은 끝까지 시도한다.
        if (off[s.name] >= SOURCE_FAILURE_LIMIT) { stat.skipped++; continue; }
        let h = '', u = '';
        try {
          stat.tried++; batchSearched++; job.searched++; h = await thumbSearchText(s.url(q));
        } catch { stat.network++; off[s.name] = (off[s.name] || 0) + 1; continue; }
        if (!h || blocked(h)) { stat.blocked++; off[s.name] = (off[s.name] || 0) + 1; continue; }
        try { u = s.pick(h); } catch { u = ''; }
        if (!u) { stat.noImage++; continue; }
        try { blob = await toWebp(u); from = s.name; stat.success++; off[s.name] = 0; }
        catch { stat.image++; }
        await sleep(140 + Math.random() * 120);
      }
      if (blob) {
        thumbs[key] = { d: await b64(blob), from }; batchGot++; job.found++;
        if (st.settings?.shareThumbs && hash) fetch(LetsBuy.THUMBS + '/t/' + hash + '.webp', { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: blob }).catch(() => {});
      } else miss[key] = today;
    };
    const worker = async () => {
      while (true) {
        const key = batchKeys[next++]; if (!key) return;
        try { await processOne(key); } catch (e) { miss[key] = today; diag('thumb-item', false, e.message); }
        done++; await progress(done, { queued: done < job.total });
      }
    };
    await Promise.all(Array.from({ length: Math.min(THUMB_CONCURRENCY, batchKeys.length) }, worker));
    job.cursor = done;
    const more = done < job.total;
    await chrome.storage.local.set({ thumbs, thumbMiss: miss, thumbJob: more ? job : null });
    await progress(done, { running: more, queued: more });
    if (more) chrome.alarms.create(THUMB_ALARM, { when: Date.now() + 15_000 });
    diag('thumbs', true, `got=${batchGot}/${batchKeys.length} done=${done}/${job.total} have=${Object.keys(thumbs).length}/${items.length} searched=${batchSearched} queued=${more} sources=${JSON.stringify(job.sources)}`);
    return { got: batchGot, done, total: job.total, queued: more, searched: job.searched, sources: job.sources };
  } catch (e) {
    const message = String(e?.message || e || '알 수 없는 오류').slice(0, 120);
    diag('thumbs', false, message);
    await chrome.storage.local.set({ thumbProg: { ...(lastProgress || priorProgress || {}), running: false, error: message, at: new Date().toISOString() } });
    return { error: message };
  } finally { filling = false; }
}
chrome.runtime.onMessage.addListener((m, _s, reply) => { if (m && m.type === 'fillImages') { fillImages(m.force).then(reply); return true; } });

// 쇼핑 위젯용 조회
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m && m.type === 'lookup' && m.name) {
    chrome.storage.local.get(['orders'], ({ orders = [] }) => {
      const name = m.name.toLowerCase();
      const matches = orders.filter(o => o.name && o.name.toLowerCase().includes(name.slice(0, 20)));
      if (!matches.length) return reply({ found: false });
      const last = matches[matches.length - 1];
      reply({ found: true, count: matches.length, lastPrice: last.price, lastDate: last.date });
    });
    return true;
  }
});
