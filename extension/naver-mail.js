/* 네이버 메일 페이지 안에서만 실행. 로그인 세션을 그대로 쓰고, 비밀번호는 다루지 않습니다. */
const QUERIES = ['주문', '결제완료', '배송', '구매', '쿠팡', '네이버페이', 'G마켓', '옥션', '11번가'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 실험적: 네이버 웹메일 내부 JSON 엔드포인트 (비공개, 바뀔 수 있음)
async function post(path, params) {
  const r = await fetch('https://mail.naver.com' + path, { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: new URLSearchParams(params) });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}
function toText(html) { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<(br|\/p|\/tr|\/div|\/li|\/td)[^>]*>/gi, '\n'); return d.innerText || d.textContent || ''; }

async function autoCollect(progress) {
  const since = Date.now() - 2 * 365 * 864e5, orders = [], seen = new Set();
  for (const q of QUERIES) {
    for (let page = 1; page <= 30; page++) {
      let list;
      try { list = await post('/json/list', { page, sortField: 1, sortType: 0, folderSN: -1, type: '', isUnread: false, keyword: q, isSearchMode: true }); }
      catch (e) { if (page === 1 && q === QUERIES[0]) throw e; break; }
      const mails = list.mailData || list.mailList || [];
      if (!mails.length) break;
      let old = false;
      for (const m of mails) {
        const sn = m.mailSN, t = (m.receivedTime || m.sentTime || 0) * (String(m.receivedTime).length <= 10 ? 1000 : 1);
        if (t && t < since) { old = true; continue; }
        if (seen.has(sn)) continue; seen.add(sn);
        try {
          const r = await post('/json/read', { mailSN: sn, previewMode: 1 });
          const mi = r.mailInfo || r;
          const date = t ? new Date(t).toISOString().slice(0, 10) : '';
          orders.push(...LetsBuy.parseMail({ subject: mi.subject || m.subject, from: (mi.from && mi.from.email) || m.from || '', date, body: toText(mi.body || mi.contents) }));
        } catch (_) {}
        await sleep(250); // 서버 부담 줄이기
      }
      progress(`"${q}" ${page}쪽 · 상품 ${orders.length}개`);
      if (old) break;
    }
  }
  return orders;
}

function readOpenMail() {
  const subj = (document.querySelector('[class*="subject"], h3') || {}).innerText || document.title;
  const body = (document.querySelector('[class*="mail_view"], [class*="mailView"], #readFrame, .mail_body') || document.body).innerText;
  const dm = body.match(/(20\d{2})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})/);
  return LetsBuy.parseMail({ subject: subj, from: body.slice(0, 300), date: dm ? `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}` : '', body });
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg.type === 'collect') {
    autoCollect(p => chrome.runtime.sendMessage({ type: 'progress', text: p }))
      .then(o => chrome.runtime.sendMessage({ type: 'orders', orders: o, mode: 'auto' }))
      .catch(e => chrome.runtime.sendMessage({ type: 'error', text: '자동 수집이 막혔어요(' + e.message + '). 메일을 하나씩 열고 "열린 메일 담기"를 써 주세요.' }));
    reply({ ok: true });
  }
  if (msg.type === 'readOpen') reply({ orders: readOpenMail() });
  return true;
});
