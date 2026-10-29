/* 네이버 메일 페이지 안에서만 실행. 로그인 세션을 그대로 쓰고, 비밀번호는 다루지 않습니다. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = text => { lbToast(text); chrome.runtime.sendMessage({ type: 'progress', text }).catch(() => {}); };
let stopFlag = false;
let RAW = [];

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
// 목록 읽기: ① 전체 메일함을 최신순으로 2년 전까지 넘김(검색어 없음) ② 막히면 쇼핑몰·주문 검색어로
const LIST_VARIANTS = [
  (q, page) => ['/json/list', { page, sortField: 1, sortType: 0, folderSN: -1, type: '', isUnread: false, ...(q ? { keyword: q, isSearchMode: true } : {}) }],
  (q, page) => ['/json/search', { page, keyword: q || '', folderSN: -1, sortField: 1, sortType: 0 }],
  (q, page) => ['/json/list', { page, folderSN: 0, ...(q ? { keyword: q } : {}) }],
];
const QUERIES = ['주문', '결제', '배송', '발송', '구매', '쿠팡', '네이버페이', 'G마켓', '옥션', '11번가', 'SSG', '컬리', '롯데ON', '배민', '메가마트', '오늘의집', '무신사', '알리', '홈플러스', '다이소'];
const pickList = j => j && (j.mailData || j.mailList || (j.result && (j.result.mailData || j.result.mailList)) || []);
const pickTime = m => { const v = m.receivedTime || m.sentTime || m.receiveTime || m.date; if (!v) return 0; const n = +v; return n ? (n < 1e12 ? n * 1000 : n) : Date.parse(v) || 0; };
const fromOf = m => { const f = m.from || m.sender || ''; return typeof f === 'string' ? f : [f.name, f.email || f.address].filter(Boolean).join(' <') + (f.email || f.address ? '>' : ''); };
const SUBJ = /주문|결제|구매|배송|발송|출고|접수|영수증|구입/;
const isCandidate = (subject, from) => SUBJ.test(subject) || LetsBuy.detectMall(subject, from) !== '기타';
const YEARS = 2, MAX_PAGES = 3000;
let STATS = null;

async function readBody(sn) {
  // 미리보기(previewMode=1)는 본문이 잘릴 수 있어 전체 본문을 먼저 요청
  for (const pm of [0, 1]) {
    try { const r = await call('/json/read', { mailSN: sn, previewMode: pm, isUnreadMail: false }); const mi = r.mailInfo || r.result || r; const html = String(mi.body || mi.contents || mi.html || ''); if (html.length > 200 || pm === 1) return { mi, html }; } catch (e) { if (pm === 1) throw e; }
  }
}
async function strategyApi() {
  const since = Date.now() - YEARS * 365 * 864e5, orders = [], seen = new Set(), cand = [];
  STATS = { scanned: 0, candidates: 0, read: 0, parsed: 0, noItems: 0, readFail: 0, oldest: null, newest: null, years: YEARS, mode: '', perMall: {}, failMall: {}, kinds: {}, backs: 0 };
  let variant = null;
  for (let v = 0; v < LIST_VARIANTS.length && variant === null; v++) {
    try { const [p, prm] = LIST_VARIANTS[v]('', 1); const j = await call(p, prm, 1); if (pickList(j).length) variant = v; else diag('api-list', false, `variant${v} empty keys=${Object.keys(j || {}).join(',')}`); }
    catch (e) { diag('api-list', false, `variant${v} ${e.message}`); if (e.message.includes('로그인')) throw e; }
  }
  if (variant === null) throw new Error('네이버 메일 목록을 읽는 방법이 모두 막혔어요');
  const scan = async q => {
    let lastFirst = null;
    for (let page = 1; page <= MAX_PAGES && !stopFlag; page++) {
      let mails;
      try { const [p, prm] = LIST_VARIANTS[variant](q, page); mails = pickList(await call(p, prm)); } catch (e) { diag('api-page', false, `${q || '전체'} p${page} ${e.message}`); break; }
      if (!mails.length) break;
      const first = mails[0].mailSN || mails[0].mailSn || mails[0].id; if (first && first === lastFirst) break; lastFirst = first; // 쪽 번호를 무시하는 응답 방지
      let old = false;
      for (const m of mails) {
        const t = pickTime(m), sn = m.mailSN || m.mailSn || m.id;
        if (t && t < since) { old = true; continue; }
        if (!sn || seen.has(sn)) continue; seen.add(sn); STATS.scanned++;
        if (t) { const d = new Date(t + 9 * 3600e3).toISOString().slice(0, 10); if (!STATS.oldest || d < STATS.oldest) STATS.oldest = d; if (!STATS.newest || d > STATS.newest) STATS.newest = d; }
        const subject = m.subject || '', from = fromOf(m);
        if (isCandidate(subject, from)) cand.push({ sn, t, subject, from });
      }
      if (page % 5 === 0) say(`렛츠바이 · 메일 ${STATS.scanned}통 확인 · 주문 메일 ${cand.length}통`);
      if (old) break;
      await sleep(120);
    }
  };
  await scan('');
  STATS.mode = 'full';
  if (STATS.oldest && Date.parse(STATS.oldest) > since + 30 * 864e5) { STATS.mode = 'full+search'; for (const q of QUERIES) await scan(q); } // 전체 넘김이 중간에 멈췄으면 검색어로 보충
  STATS.candidates = cand.length;
  for (let i = 0; i < cand.length && !stopFlag; i += 3) {
    await Promise.all(cand.slice(i, i + 3).map(async c => {
      try {
        const { mi, html } = await readBody(c.sn); STATS.read++;
        const mail = { id: 'n' + c.sn, subject: mi.subject || c.subject, from: c.from || JSON.stringify(mi.from || ''), date: c.t ? new Date(c.t + 9 * 3600e3).toISOString().slice(0, 10) : '', html };
        const r = LetsBuy.parseMail(mail); const mall = LetsBuy.detectMall(mail.subject, mail.from);
        RAW.push(mail); orders.push(...r);
        const kind = LetsBuy.mailKind(mail.subject, ''); STATS.kinds[kind] = (STATS.kinds[kind] || 0) + 1; mail.kind = kind;
        if (r.length) { STATS.parsed++; if (r[0].status) STATS.backs++; STATS.perMall[r[0].mall] = (STATS.perMall[r[0].mall] || 0) + r.length; }
        else if (mall !== '기타' && LetsBuy.FAILS.has(kind)) { STATS.noItems++; mail.fail = 1; STATS.failMall[mall] = (STATS.failMall[mall] || 0) + 1; }
      } catch (e) { if (++STATS.readFail <= 5) diag('api-read', false, e.message); }
    }));
    if (i % 15 === 0) say(`렛츠바이 · 주문 메일 ${Math.min(i + 3, cand.length)}/${cand.length}통 읽음 · 상품 ${orders.length}개`);
    await sleep(150);
  }
  diag('api-done', true, JSON.stringify(STATS));
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

let running = false;
async function collectAll() {
  if (running) return; running = true; stopFlag = false; RAW = []; STATS = null;
  say('렛츠바이 수집 시작');
  let orders = [];
  try { orders = await strategyApi(); }
  catch (e) { diag('collect', false, e.message); orders = readOpenMail(); if (!orders.length) { lbToast('자동 수집이 막혔어요 · 주문 메일을 열고 다시 눌러 주세요', true); running = false; chrome.runtime.sendMessage({ type: 'done', count: 0, failed: true }); return; } }
  chrome.runtime.sendMessage({ type: 'orders', orders, mails: RAW, stats: STATS && { ...STATS, at: new Date().toISOString(), src: 'naver' }, done: true });
  lbToast(`완료 · 상품 ${orders.length}개`, true); running = false;
}
chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg.type === 'collect') { collectAll(); reply({ ok: true }); }
  if (msg.type === 'readOpen') reply({ orders: readOpenMail() });
  return true;
});
diag('mail-page', true, 'naver');
