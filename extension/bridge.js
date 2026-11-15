/* 렛츠바이 웹페이지 ↔ 확장 저장소 연결. 데이터는 사용자 브라우저 밖으로 나가지 않습니다. */
const post = (type, data = {}) => window.postMessage({ app: 'letsbuy-ext', type, ...data }, location.origin);
const send = () => chrome.storage.local.get(['orders', 'prices', 'pricedAt', 'diag', 'collectStats', 'mails', 'thumbs', 'thumbProg', 'mailStats', 'pricedTs'], d => post('data', { orders: d.orders || [], prices: d.prices || {}, pricedAt: d.pricedAt, diagCount: (d.diag || []).length, stats: d.collectStats || null, mailCount: (d.mails || []).length, thumbs: d.thumbs || {}, mailStats: d.mailStats || null, pricedTs: d.pricedTs || null, thumbProg: d.thumbProg || null, version: chrome.runtime.getManifest().version }));
const announce = () => { post('hello', { version: chrome.runtime.getManifest().version }); send(); };
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || e.data.app !== 'letsbuy-web') return;
  // 페이지가 늦게 시작해도 pull 한 번이면 hello와 저장 데이터를 모두 다시 보낸다.
  if (e.data.type === 'pull') announce();
  if (e.data.type === 'fillImages') chrome.runtime.sendMessage({ type: 'fillImages', force: !!e.data.force }, () => send());
  if (e.data.type === 'ollama') chrome.runtime.sendMessage({ type: 'ollama', op: e.data.op, model: e.data.model, prompt: e.data.prompt }, r => window.postMessage({ app: 'letsbuy-ext', type: 'ollama', id: e.data.id, ...(r || { ok: false, why: 'ext' }) }, location.origin));
  if (e.data.type === 'mails') chrome.storage.local.get('mails', d => window.postMessage({ app: 'letsbuy-ext', type: 'mails', mails: d.mails || [] }, location.origin));
  if (e.data.type === 'aliases') chrome.storage.local.set({ aliases: e.data.aliases || {} });
  if (e.data.type === 'diag') chrome.storage.local.get('diag', d => window.postMessage({ app: 'letsbuy-ext', type: 'diag', diag: d.diag || [] }, location.origin));
});
// 사진 채우는 중이면 진행률을 계속 전달(5장마다 화면 갱신)
let lastHave = -1;
chrome.storage.onChanged.addListener(c => { if (!c.thumbProg) return; const p = c.thumbProg.newValue || {}; post('thumbProg', { prog: p }); if (!p.running || p.done % 5 === 0) send(); });
announce();
