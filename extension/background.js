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
    fillImages().catch(e => diag('thumbs', false, e.message)); // 사진은 바로, 가격과 별개로
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
// 확장을 새로 고치거나 업데이트하면 보관한 메일로 자동 재분석
chrome.runtime.onInstalled.addListener(() => saveOrders([], []).then(() => fillImages()));

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
        arr.push({ date: today, price, mall: s.name + ' 최저', src: s.name, url: s.url(q), img: im || undefined }); ok++;
      } catch (e) { fails[s.name] = (fails[s.name] || 0) + 1; }
      await new Promise(r => setTimeout(r, 1200));
    }
    for (const s of SHOPS) {
      if (have.has(s.name)) continue;
      try {
        const m = LetsBuy.bestMatch(it.name, await shopSearch(s, q, st[s.name]));
        if (!m) throw new Error('비슷한 상품 없음');
        arr.push({ date: today, price: m.price, mall: s.name, src: s.name, title: m.title.slice(0, 120), img: m.img || undefined, url: m.url || s.url(q).replace('&lb=1', ''), cat: m.cat || undefined }); ok++;
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

// ── 사진 채우기: 가격 수집과 별개로, 수집 직후 바로 실행. 공유 캐시 → 메일 사진 → 가격 기록 사진 → 쇼핑몰 검색 순
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
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
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
let filling = false;
async function fillImages(force) {
  if (filling) return { busy: true }; filling = true;
  try {
    const st = await chrome.storage.local.get(['orders', 'prices', 'aliases', 'thumbs', 'thumbMiss']);
    const thumbs = st.thumbs || {}, miss = st.thumbMiss || {}, today = todayStr(), prices = st.prices || {};
    const items = LetsBuy.analyze(st.orders || [], today, st.aliases || {}, { all: true }).sort((a, b) => b.count - a.count);
    const todo = items.filter(it => !thumbs[it.key] && (force || !miss[it.key] || Date.parse(today) - Date.parse(miss[it.key]) > 7 * 864e5));
    const prog = async (done, extra = {}) => chrome.storage.local.set({ thumbProg: { done, total: todo.length, have: Object.keys(thumbs).length, all: items.length, running: done < todo.length, at: new Date().toISOString(), ...extra } });
    await prog(0);
    // 1) 공유 캐시를 한 번에 확인
    const hs = {}; for (const it of todo) hs[it.key] = await LetsBuy.thumbHash(it.key);
    const keys = todo.map(it => it.key);
    for (let i = 0; i < keys.length; i += 200) {
      try { const r = await (await fetch(LetsBuy.THUMBS + '/has?h=' + keys.slice(i, i + 200).map(k => hs[k]).join(','))).json(); const have = new Set(r.have || []); keys.slice(i, i + 200).forEach(k => { if (have.has(hs[k])) thumbs[k] = { u: LetsBuy.THUMBS + '/t/' + hs[k] + '.webp', from: '공유' }; }); } catch (e) { diag('thumb-has', false, e.message); }
    }
    await chrome.storage.local.set({ thumbs });
    const off = {}; let n = 0, got = 0, searched = 0;
    for (const it of todo) {
      n++; if (thumbs[it.key]) { got++; if (n % 5 === 0) await prog(n); continue; }
      const cands = [it.img, ...(prices[it.key] || []).slice().reverse().map(p => p.img)].filter(Boolean).map(u => ({ u, from: '메일' }));
      let blob = null, from = '';
      for (const c of cands) { try { blob = await toWebp(c.u); from = c.from; break; } catch {} }
      const q = encodeURIComponent(LetsBuy.tokens(it.name).slice(0, 5).join(' ') || it.name);
      for (const s of IMG_SEARCH) {
        if (blob) break; if (off[s.name] >= 3) continue; // 연속 3번 막히면 그 쇼핑몰은 이번엔 쉼
        try {
          searched++; const r = await fetch(s.url(q), { credentials: 'include' }); const h = r.ok ? await r.text() : '';
          if (!h || blocked(h)) throw new Error('막힘');
          const u = s.pick(h); if (!u) throw new Error('사진 없음');
          blob = await toWebp(u); from = s.name; off[s.name] = 0;
        } catch (e) { off[s.name] = (off[s.name] || 0) + 1; }
        await sleep(1200 + Math.random() * 800);
      }
      if (blob) {
        thumbs[it.key] = { d: await b64(blob), from }; got++;
        fetch(LetsBuy.THUMBS + '/t/' + hs[it.key] + '.webp', { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: blob }).catch(() => {}); // 제품명 해시+사진만 공유
      } else miss[it.key] = today;
      await chrome.storage.local.set({ thumbs, thumbMiss: miss }); await prog(n);
    }
    await prog(todo.length, { running: false, have: Object.keys(thumbs).length });
    diag('thumbs', true, `got=${got}/${todo.length} have=${Object.keys(thumbs).length}/${items.length} searched=${searched} off=${JSON.stringify(off)}`);
    return { got, total: todo.length };
  } finally { filling = false; }
}
chrome.runtime.onMessage.addListener((m, _s, reply) => { if (m && m.type === 'fillImages') { fillImages(m.force).then(reply); return true; } });
