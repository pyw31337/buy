/* 렛츠바이 웹페이지 ↔ 확장 저장소 연결. 데이터는 사용자 브라우저 밖으로 나가지 않습니다. */
const send = () => chrome.storage.local.get(['orders', 'prices'], d => window.postMessage({ app: 'letsbuy-ext', type: 'data', orders: d.orders || [], prices: d.prices || {} }, location.origin));
window.addEventListener('message', e => { if (e.source === window && e.data && e.data.app === 'letsbuy-web' && e.data.type === 'pull') send(); });
window.postMessage({ app: 'letsbuy-ext', type: 'hello' }, location.origin);
