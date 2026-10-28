importScripts('core.js');
chrome.runtime.onInstalled.addListener(() => chrome.alarms.create('price', { periodInMinutes: 24 * 60, delayInMinutes: 1 }));
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'price') collectPrices(); });
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.type === 'orders') saveOrders(m.orders).then(n => chrome.runtime.sendMessage({ type: 'saved', total: n }).catch(() => {}));
  if (m.type === 'pricesNow') { collectPrices().then(r => reply(r)); return true; }
});
async function saveOrders(list) {
  const { orders = [] } = await chrome.storage.local.get('orders');
  const seen = new Set(orders.map(o => o.date + o.name));
  for (const o of list) if (o.date && !seen.has(o.date + o.name)) { orders.push(o); seen.add(o.date + o.name); }
  await chrome.storage.local.set({ orders });
  return orders.length;
}
// 다나와 검색결과 첫 상품의 최저가를 하루 1회 기록 (사용자 브라우저에서, 품목당 1요청)
async function collectPrices() {
  const { orders = [], prices = {} } = await chrome.storage.local.get(['orders', 'prices']);
  const items = LetsBuy.analyze(orders);
  const today = new Date().toISOString().slice(0, 10); let ok = 0;
  for (const it of items) {
    try {
      const q = it.name.split(' ').slice(0, 5).join(' ');
      const html = await (await fetch('https://search.danawa.com/dsearch.php?query=' + encodeURIComponent(q))).text();
      const m = html.match(/class="price_sect"[\s\S]{0,400}?<strong>([0-9,]+)<\/strong>/) || html.match(/<strong>([0-9]{1,3}(?:,[0-9]{3})+)<\/strong>\s*원/);
      if (!m) continue;
      const arr = (prices[it.key] || []).filter(p => p.date !== today);
      arr.push({ date: today, price: +m[1].replace(/,/g, ''), mall: '다나와 최저' });
      prices[it.key] = arr.slice(-730); ok++;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  await chrome.storage.local.set({ prices, pricedAt: today });
  return { ok, total: items.length };
}
