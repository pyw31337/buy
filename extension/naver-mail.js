/* 네이버 메일 페이지 안에서만 실행. 로그인 세션을 그대로 쓰고, 비밀번호는 다루지 않습니다. */
const QUERIES = ['주문', '결제', '배송', '구매', '쿠팡', '네이버페이', 'G마켓', '옥션', '11번가', 'SSG', '컬리'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = text => chrome.runtime.sendMessage({ type: 'progress', text }).catch(() => {});
let stopFlag = false;

function toText(html) { const d = document.createElement('div'); d.innerHTML = String(html || '').replace(/<(br|\/p|\/tr|\/div|\/li|\/td|\/th|\/h\d)[^>]*>/gi, '\n').replace(/<(td|th)[^>]*>/gi, ' | '); d.querySelectorAll('script,style').forEach(x => x.remove()); return d.textContent || ''; }

async function call(path, params, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch('https://mail.naver.com' + path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: new URLSearchParams(params) });
      if (r.status === 401 || r.status === 403) throw Object.assign(new Error('로그인이 풀렸거나 접근이 막혔어요 (' + r.status + ')'), { fatal: true });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text();
      try { return JSON.parse(t); } catch { throw Object.assign(new Error('응답 형식이 바뀌었어요 (JSON 아님)'), { fatal: true }); }
    } catch (e) { if (e.fatal || i === tries - 1) throw e; await sleep(800 * (i + 1)); }
  }
}
const LIST_VARIANTS = [
  (q, page) => ['/json/list', { page, sortField: 1, sortType: 0, folderSN: -1, type: '', isUnread: false, keyword: q, isSearchMode: true }],
  (q, page) => ['/json/search', { page, keyword: q, folderSN: -1, sortField: 1, sortType: 0 }],
  (q, page) => ['/json/list', { page, folderSN: 0, keyword: q }],
];
const pickList = j => j && (j.mailData || j.mailList || (j.result && (j.result.mailData || j.result.mailList)) || []);
const pickTime = m => { const v = m.receivedTime || m.sentTime || m.receiveTime || m.date; if (!v) return 0; const n = +v; return n ? (n < 1e12 ? n * 1000 : n) : Date.parse(v) || 0; };

async function strategyApi() {
  const since = Date.now() - 2 * 365 * 864e5, orders = [], seen = new Set();
  let variant = null;
  for (let v = 0; v < LIST_VARIANTS.length && variant === null; v++) {
    try { const [p, prm] = LIST_VARIANTS[v]('주문', 1); const j = await call(p, prm, 1); if (pickList(j).length) variant = v; else diag('api-list', false, `variant${v} empty keys=${Object.keys(j || {}).join(',')}`); }
    catch (e) { diag('api-list', false, `variant${v} ${e.message}`); if (e.message.includes('로그인')) throw e; }
  }
  if (variant === null) throw new Error('네이버 메일 목록을 읽는 방법이 모두 막혔어요');
  diag('api-list', true, 'variant' + variant);
  let readFail = 0;
  for (const q of QUERIES) {
    for (let page = 1; page <= 40 && !stopFlag; page++) {
      let mails;
      try { const [p, prm] = LIST_VARIANTS[variant](q, page); mails = pickList(await call(p, prm)); } catch (e) { diag('api-page', false, `${q} p${page} ${e.message}`); break; }
      if (!mails.length) break;
      let old = false;
      for (const m of mails) {
        const t = pickTime(m), sn = m.mailSN || m.mailSn || m.id;
        if (t && t < since) { old = true; continue; }
        if (!sn || seen.has(sn)) continue; seen.add(sn);
        const subject = m.subject || '';
        if (!/주문|결제|구매|배송|발송|출고|접수/.test(subject)) continue; // 본문 읽기 전 제목으로 거르기 (속도·부담 감소)
        try {
          const r = await call('/json/read', { mailSN: sn, previewMode: 1, isUnreadMail: false });
          const mi = r.mailInfo || r.result || r;
          orders.push(...LetsBuy.parseMail({ subject: mi.subject || subject, from: JSON.stringify(mi.from || m.from || ''), date: t ? new Date(t).toISOString().slice(0, 10) : '', body: toText(mi.body || mi.contents || mi.html || '') }));
        } catch (e) { if (++readFail <= 5) diag('api-read', false, e.message); }
        await sleep(200);
      }
      say(`"${q}" 검색 ${page}쪽 · 지금까지 상품 ${orders.length}개`);
      if (old) break;
    }
  }
  diag('api-done', true, `mails=${seen.size} orders=${orders.length} readFail=${readFail}`);
  return orders;
}

// 열린 메일(본문 iframe 포함) 읽기
function readOpenMail() {
  const docs = [document, ...[...document.querySelectorAll('iframe')].map(f => { try { return f.contentDocument; } catch { return null; } }).filter(Boolean)];
  let best = '', subj = '';
  for (const d of docs) {
    const cand = d.querySelector('.mail_view_contents, .mail_view_body, [class*="mail_view_contents"], [class*="mailView"], #mailViewer, .mail_body, article') || d.body;
    const t = cand ? cand.innerText : ''; if (t.length > best.length) best = t;
    const s = d.querySelector('.mail_title, .mail_subject, [class*="mail_title"], [class*="subject"] strong, h3'); if (s && !subj) subj = s.innerText;
  }
  subj = subj || document.title;
  const dm = (best + ' ' + document.body.innerText.slice(0, 2000)).match(/(20\d{2})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})/);
  const r = LetsBuy.parseMail({ subject: subj, from: best.slice(0, 300), date: dm ? `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}` : '', body: best });
  diag('open-mail', r.length > 0, `len=${best.length} items=${r.length}`);
  return r;
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg.type === 'collect') {
    stopFlag = false;
    strategyApi()
      .then(o => chrome.runtime.sendMessage({ type: 'orders', orders: o, mode: 'auto' }))
      .catch(e => { diag('collect', false, e.message); chrome.runtime.sendMessage({ type: 'error', text: `자동 수집 실패: ${e.message}. 주문 메일을 하나 열고 "지금 열린 메일 담기"를 눌러 주세요. 문제가 계속되면 "진단 정보 내보내기" 파일을 보내 주세요.` }); });
    reply({ ok: true });
  }
  if (msg.type === 'stop') { stopFlag = true; reply({ ok: true }); }
  if (msg.type === 'readOpen') reply({ orders: readOpenMail() });
  return true;
});
diag('mail-page', true, 'content script loaded');
