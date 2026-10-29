// 렛츠바이 쇼핑 위젯 — 과거 구매 + 해외직구 저가 검사
(() => {
  if (document.getElementById('letsbuy-widget')) return;
  const host = location.hostname;
  const isCoupang = /coupang\.com/.test(host);
  const isGmarket = /gmarket\.co\.kr/.test(host);
  const isNaver = /shopping\.naver\.com|smartstore\.naver\.com/.test(host);
  if (!isCoupang && !isGmarket && !isNaver) return;

  const titleEl = document.querySelector('h1, .prod-buy-header__title, .itemtit, h2.product_title, [class*="title"]');
  const title = (titleEl?.textContent || '').trim().slice(0, 100);
  if (!title || title.length < 4) return;

  const imgEl = document.querySelector('img[src*="product"], img[src*="item"], .prod-image img, img');
  const imgUrl = imgEl?.src || '';

  chrome.runtime.sendMessage({ type: 'lookup', name: title }, res => {
    const el = document.createElement('div');
    el.id = 'letsbuy-widget';
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.15);padding:14px 16px;font-size:13px;max-width:300px;font-family:system-ui;line-height:1.4';
    const history = res?.found
      ? `<div style="margin-bottom:8px">예전에 산 적 있어요 · <b>${res.count}회</b><br><small style="color:#555">마지막 ${res.lastPrice ? res.lastPrice.toLocaleString()+'원' : ''}</small></div>`
      : '<div style="margin-bottom:8px;color:#777">구매 기록 없음</div>';

    // 해외 검색 링크 (상품명 기반, 무료)
    const q = encodeURIComponent(title);
    const ali = `https://www.aliexpress.com/wholesale?SearchText=${q}`;
    const temu = `https://www.temu.com/search_result.html?search_key=${q}`;
    const amazon = `https://www.amazon.com/s?k=${q}`;

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <b style="color:#0A1C38">렛츠바이</b>
        <span style="margin-left:auto;cursor:pointer;font-size:18px" onclick="this.closest('#letsbuy-widget').remove()">×</span>
      </div>
      ${history}
      <div style="font-weight:700;margin:8px 0 4px">해외직구 더 싸게?</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <a href="${ali}" target="_blank" style="background:#FF4747;color:#fff;padding:6px 10px;border-radius:8px;text-decoration:none;font-size:12px">알리</a>
        <a href="${temu}" target="_blank" style="background:#FB7701;color:#fff;padding:6px 10px;border-radius:8px;text-decoration:none;font-size:12px">테무</a>
        <a href="${amazon}" target="_blank" style="background:#FF9900;color:#000;padding:6px 10px;border-radius:8px;text-decoration:none;font-size:12px">아마존</a>
      </div>
      ${imgUrl ? `<div style="margin-top:8px;font-size:11px;color:#999">썸네일 기반 검색은 준비 중</div>` : ''}
      <a href="https://pyw31337.github.io/buy/#items" target="_blank" style="display:inline-block;margin-top:10px;color:#0A1C38;font-weight:700;font-size:12px">내 구매 기록 보기</a>
    `;
    document.body.appendChild(el);
  });
})();
