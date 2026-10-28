/* 렛츠바이 웹페이지 ↔ 확장 저장소 연결. 데이터는 사용자 브라우저 밖으로 나가지 않습니다. */
const send = () => chrome.storage.local.get(['orders', 'prices', 'pricedAt', 'diag'], d => window.postMessage({ app: 'letsbuy-ext', type: 'data', orders: d.orders || [], prices: d.prices || {}, pricedAt: d.pricedAt, diagCount: (d.diag || []).length, version: chrome.runtime.getManifest().version }, location.origin));
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || e.data.app !== 'letsbuy-web') return;
  if (e.data.type === 'pull') send();
  if (e.data.type === 'aliases') chrome.storage.local.set({ aliases: e.data.aliases || {} });
  if (e.data.type === 'diag') chrome.storage.local.get('diag', d => window.postMessage({ app: 'letsbuy-ext', type: 'diag', diag: d.diag || [] }, location.origin));
});
window.postMessage({ app: 'letsbuy-ext', type: 'hello', version: chrome.runtime.getManifest().version }, location.origin);
