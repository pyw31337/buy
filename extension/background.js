importScripts('core.js');
const diag = (step, ok, info) => chrome.storage.local.get('diag', d => { const a = (d.diag || []).slice(-199); a.push({ t: new Date().toISOString(), step, ok, info: String(info || '').slice(0, 200), where: 'background' }); chrome.storage.local.set({ diag: a }); });
const todayStr = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜

chrome.runtime.onInstalled.addListener(() => setup());
chrome.runtime.onStartup.addListener(() => setup());
function setup() { chrome.alarms.create('daily', { periodInMinutes: 6 * 60, delayInMinutes: 1 }); }
// 6시간마다 깨어나서 오늘 아직 안 했으면 실행 (브라우저가 꺼져 있던 날도 다음 실행 때 따라잡음)
chrome.alarms.onAlarm.addListener(async a => {
  if (a.name !== 'daily') return;
  const { pricedAt } = await chrome.storage.local.get('pricedAt');
  if (pricedAt !== todayStr()) { await collectPrices(); await notify(); }
});
// 아이콘 클릭(또는 Alt+Shift+L) 한 번 = 지금 탭에서 전부 수집
const WEB = 'https://pyw31337.github.io/buy/';
const COLLECTABLE = /^https:\/\/(mail\.naver\.com|mail\.google\.com|mc\.coupang\.com|my\.coupang\.com|www\.coupang\.com\/my|order\.pay\.naver\.com|pay\.naver\.com)/;
const badge = (text, color = '#FF5A36') => { chrome.action.setBadgeBackgroundColor({ color }); chrome.action.setBadgeText({ text: String(text) }); };
chrome.action.onClicked.addListener(async tab => {
  if (!COLLECTABLE.test(tab.url || '')) { chrome.tabs.create({ url: WEB }); return; }
  badge('…');
  chrome.tabs.sendMessage(tab.id, { type: 'collect' }, () => {
    if (chrome.runtime.lastError) { chrome.tabs.reload(tab.id); badge('↻', '#9A9AA3'); diag('click', false, 'content script missing, reloaded'); }
  });
});
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.type === 'progress') { const n = (m.text.match(/(\d+)개/) || [])[1]; if (n) badge(n); }
  if (m.type === 'done' && m.failed) badge('!', '#C8321E');
  if (m.type === 'orders' && m.stats) chrome.storage.local.set({ collectStats: m.stats });
  if (m.type === 'orders') saveOrders(m.orders, m.mails).then(async n => {
    if (!m.done) return;
    badge('✓', '#1F9D63'); setTimeout(() => badge(''), 8000);
    const [t] = await chrome.tabs.query({ url: WEB + '*' });
    if (t) { chrome.tabs.update(t.id, { active: true }); chrome.tabs.reload(t.id); } else chrome.tabs.create({ url: WEB });
    collectPrices().then(notify); // 가격은 뒤에서 조용히
  });
  if (m.type === 'pricesNow') { collectPrices().then(r => notify().then(() => reply(r))); return true; }
  if (m.type === 'testNotify') { show('test', '렛츠바이 알림 테스트', '알림이 잘 보이면 준비 완료예요.'); reply({}); }
});
chrome.notifications.onClicked.addListener(() => chrome.tabs.create({ url: 'https://pyw31337.github.io/buy/' }));

// 원본 메일 HTML은 이 브라우저 안에만 보관 → 해석기가 좋아지면 다시 수집하지 않고 재분석
const slim = h => String(h || '').replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '').replace(/\s(style|class|id|bgcolor|align|valign|cellpadding|cellspacing|border)="[^"]*"/gi, '').slice(0, 400000);
async function saveOrders(list, mails) {
  const st = await chrome.storage.local.get(['orders', 'mails']);
  const box = st.mails || [], ids = new Set(box.map(m => m.id));
  for (const m of mails || []) if (m.id && !ids.has(m.id)) { box.push({ ...m, html: slim(m.html) }); ids.add(m.id); }
  const other = (st.orders || []).filter(o => o.source && o.source !== 'mail').concat((list || []).filter(o => o.source !== 'mail'));
  const fromMail = box.flatMap(m => { try { return LetsBuy.parseMail(m); } catch { return []; } });
  const orders = LetsBuy.dedupe(other.concat(fromMail));
  await chrome.storage.local.set({ orders, mails: box, parser: chrome.runtime.getManifest().version });
  diag('save', true, `mails=${box.length} orders=${orders.length}`);
  return orders.length;
}
// 확장을 새로 고치거나 업데이트하면 보관한 메일로 자동 재분석
chrome.runtime.onInstalled.addListener(() => saveOrders([], []));

// 가격 소스: 순서대로 시도. 모두 사용자 브라우저(국내 IP)에서 품목당 하루 1회만 요청
const SOURCES = [
  { name: '다나와', url: q => 'https://search.danawa.com/dsearch.php?query=' + q,
    parse: h => (h.match(/class="price_sect"[\s\S]{0,500}?<strong>([0-9,]+)<\/strong>/) || h.match(/<em class="prc_c">([0-9,]+)<\/em>/) || [])[1] },
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
        const v = s.parse(await fetchText(s.url(q)));
        const price = v ? +String(v).replace(/,/g, '') : 0;
        if (!price || price < 100) throw new Error('가격을 못 찾음');
        arr.push({ date: today, price, mall: s.name + ' 최저', src: s.name }); ok++;
      } catch (e) { fails[s.name] = (fails[s.name] || 0) + 1; }
      await new Promise(r => setTimeout(r, 1200));
    }
    for (const s of SHOPS) {
      if (have.has(s.name)) continue;
      try {
        const m = LetsBuy.bestMatch(it.name, await shopSearch(s, q, st[s.name]));
        if (!m) throw new Error('비슷한 상품 없음');
        arr.push({ date: today, price: m.price, mall: s.name, src: s.name, title: m.title.slice(0, 120) }); ok++;
      } catch (e) { fails[s.name] = (fails[s.name] || 0) + 1; }
      await new Promise(r => setTimeout(r, 2500 + Math.random() * 1500));
    }
    prices[it.key] = arr.slice(-1500);
  }
  await chrome.storage.local.set({ prices, pricedAt: today });
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
