// 렛츠바이 쇼핑 위젯 — 상품 페이지에서 과거 구매 정보 표시
(() => {
  if (document.getElementById('letsbuy-widget')) return;
  const host = location.hostname;
  const isCoupang = /coupang\.com/.test(host);
  const isGmarket = /gmarket\.co\.kr/.test(host);
  const isNaver = /shopping\.naver\.com|smartstore\.naver\.com/.test(host);
  if (!isCoupang && !isGmarket && !isNaver) return;

  // 상품명 추출 (간단)
  const title = (document.querySelector('h1, .prod-buy-header__title, .itemtit, h2.product_title') || {}).textContent || '';
  if (!title || title.length < 4) return;

  // 확장에 문의
  chrome.runtime.sendMessage({ type: 'lookup', name: title.trim().slice(0, 80) }, res => {
    if (!res || !res.found) return;
    const el = document.createElement('div');
    el.id = 'letsbuy-widget';
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.15);padding:14px 16px;font-size:13px;max-width:280px;font-family:system-ui;';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <b style="color:#0A1C38">렛츠바이</b>
        <span style="margin-left:auto;cursor:pointer;font-size:16px" onclick="this.parentElement.parentElement.remove()">×</span>
      </div>
      <div>예전에 산 적 있어요 · ${res.count || 1}회</div>
      <div style="margin-top:4px;color:#555">마지막 구매가 ${res.lastPrice ? res.lastPrice.toLocaleString()+'원' : ''}</div>
      <a href="https://pyw31337.github.io/buy/#items" target="_blank" style="display:inline-block;margin-top:8px;color:#0A1C38;font-weight:700">자세히 보기</a>
    `;
    document.body.appendChild(el);
  });
})();
