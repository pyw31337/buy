/* Gmail: 로그인된 세션에서 검색 결과 스레드를 인쇄용 화면으로 읽음. API 키 없음. (실험적) */
const GQ = 'newer_than:2y (주문 OR 결제 OR 구매 OR 배송 OR order OR receipt) -취소 -환불';
const gsleep = ms => new Promise(r => setTimeout(r, ms));
function gIk() {
  const h = document.documentElement.innerHTML;
  return (h.match(/"ik"\s*:\s*"([0-9a-f]{6,})"/) || h.match(/GM_ID_KEY\s*=\s*"([0-9a-f]+)"/) || h.match(/\["ik","([0-9a-f]+)"\]/) || [])[1]
    || (window.GLOBALS && window.GLOBALS[9]) || '';
}
const gBase = () => location.pathname.match(/^\/mail\/u\/\d+\//)?.[0] || '/mail/u/0/';
async function waitRows(prev, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { const ids = threadIds(); if (ids.length && ids.join() !== prev) return ids; await gsleep(300); }
  return threadIds();
}
function threadIds() {
  return [...new Set([...document.querySelectorAll('[data-legacy-thread-id], [data-thread-id]')].map(e => e.getAttribute('data-legacy-thread-id') || (e.getAttribute('data-thread-id') || '').replace(/^#?thread-f:/, '')).filter(Boolean))];
}
async function gCollect() {
  const ik = gIk(); diag('gmail-ik', !!ik, ik ? 'found' : 'missing');
  location.hash = '#search/' + encodeURIComponent(GQ);
  let ids = await waitRows(''), all = new Set(ids), page = 1;
  while (page < 400) {
    const older = document.querySelector('[aria-label="이전"][role="button"]:not([aria-disabled="true"]), [aria-label="Older"][role="button"]:not([aria-disabled="true"]), [data-tooltip="이전"]:not([aria-disabled="true"])');
    if (!older) break;
    older.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); older.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const next = await waitRows(ids.join()); if (next.join() === ids.join()) break;
    ids = next; ids.forEach(i => all.add(i)); page++; lbToast(`렛츠바이 수집 중 · 메일 ${all.size}개`);
  }
  diag('gmail-list', all.size > 0, `threads=${all.size} pages=${page}`);
  if (!all.size) throw new Error('Gmail 검색 결과를 읽지 못했어요');
  const orders = []; let n = 0, fail = 0;
  for (const th of all) {
    try {
      const r = await fetch(`${gBase()}?ik=${ik}&view=pt&search=all&permthid=thread-f:${th}&th=${th}`, { credentials: 'include' });
      const html = await r.text(), d = new DOMParser().parseFromString(html, 'text/html');
      const subject = (d.querySelector('.maincontent font b, h2, title') || {}).textContent || '';
      const body = d.body.textContent || '';
      const dm = body.match(/(20\d{2})[.\-년\s]+(\d{1,2})[.\-월\s]+(\d{1,2})/) || html.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/);
      const mail = { id: 'g' + th, subject, from: body.slice(0, 400), date: dm ? `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}` : '', html: (d.querySelector('.maincontent') || d.body).innerHTML };
      GRAW.push(mail); orders.push(...LetsBuy.parseMail(mail));
    } catch (e) { fail++; }
    if (++n % 10 === 0) lbToast(`렛츠바이 분석 중 · ${n}/${all.size}`);
    await gsleep(150);
  }
  const ds = GRAW.map(m => m.date).filter(Boolean).sort(), pm = {}; orders.forEach(o => pm[o.mall] = (pm[o.mall] || 0) + 1);
  GSTATS = { src: 'gmail', at: new Date().toISOString(), years: 2, scanned: all.size, candidates: all.size, read: n - fail, parsed: new Set(orders.map(o => o.date + o.mall)).size, readFail: fail, oldest: ds[0] || null, newest: ds[ds.length - 1] || null, perMall: pm, failMall: {} };
  diag('gmail-done', true, `threads=${all.size} orders=${orders.length} fail=${fail}`);
  return orders;
}
let grunning = false, GRAW = [], GSTATS = null;
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m.type === 'collect' && !grunning) {
    grunning = true; GRAW = []; lbToast('렛츠바이 수집 시작');
    gCollect().then(o => { chrome.runtime.sendMessage({ type: 'orders', orders: o, mails: GRAW, stats: GSTATS, done: true }); lbToast(`완료 · 상품 ${o.length}개`, true); })
      .catch(e => { diag('gmail', false, e.message); lbToast('Gmail 수집이 막혔어요', true); chrome.runtime.sendMessage({ type: 'done', count: 0, failed: true }); })
      .finally(() => grunning = false);
    reply({ ok: true });
  }
  return true;
});
diag('mail-page', true, 'gmail');
