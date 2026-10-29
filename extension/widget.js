// 렛츠바이 쇼핑 위젯 — 심플 + 심미 + 풍부한 내용
(() => {
  if (document.getElementById('letsbuy-widget')) return;
  const host = location.hostname;
  if (!/coupang\.com|gmarket\.co\.kr|shopping\.naver\.com|smartstore\.naver\.com/.test(host)) return;

  const titleEl = document.querySelector('h1, .prod-buy-header__title, .itemtit, h2.product_title, [class*="title"]');
  const title = (titleEl?.textContent || '').trim().slice(0, 100);
  if (!title || title.length < 4) return;

  chrome.runtime.sendMessage({ type: 'lookup', name: title }, res => {
    const el = document.createElement('div');
    el.id = 'letsbuy-widget';
    el.innerHTML = `
      <style>
        #letsbuy-widget {
          position: fixed; bottom: 24px; right: 24px; z-index: 999999;
          width: 280px; background: #fff; border-radius: 20px;
          box-shadow: 0 8px 32px rgba(10,28,56,.12);
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif;
          overflow: hidden; border: 1px solid #f0f0f0;
        }
        #letsbuy-widget .hd {
          display: flex; align-items: center; padding: 14px 16px 10px;
          background: linear-gradient(135deg, #0A1C38 0%, #1a3a6b 100%);
          color: #fff;
        }
        #letsbuy-widget .hd b { font-size: 14px; letter-spacing: -.3px; }
        #letsbuy-widget .close {
          margin-left: auto; width: 22px; height: 22px; border-radius: 50%;
          background: rgba(255,255,255,.15); display: grid; place-items: center;
          cursor: pointer; font-size: 14px; line-height: 1;
        }
        #letsbuy-widget .bd { padding: 14px 16px 16px; }
        #letsbuy-widget .hist { font-size: 13px; color: #333; margin-bottom: 12px; }
        #letsbuy-widget .hist b { color: #0A1C38; }
        #letsbuy-widget .sec { font-size: 12px; font-weight: 700; color: #0A1C38; margin: 10px 0 8px; }
        #letsbuy-widget .btns { display: flex; gap: 6px; }
        #letsbuy-widget .btns a {
          flex: 1; text-align: center; padding: 8px 0; border-radius: 10px;
          font-size: 12px; font-weight: 700; text-decoration: none; color: #fff;
        }
        #letsbuy-widget .ali { background: #FF4747; }
        #letsbuy-widget .temu { background: #FB7701; }
        #letsbuy-widget .amz { background: #FF9900; color: #111; }
        #letsbuy-widget .more {
          display: block; margin-top: 12px; text-align: center;
          color: #0A1C38; font-size: 12px; font-weight: 600; text-decoration: none;
        }
      </style>
      <div class="hd">
        <b>렛츠바이</b>
        <div class="close" onclick="this.closest('#letsbuy-widget').remove()">×</div>
      </div>
      <div class="bd">
        <div class="hist">
          ${res?.found
            ? `예전에 산 적 있어요 · <b>${res.count}회</b><br><span style="color:#666;font-size:12px">마지막 ${res.lastPrice ? res.lastPrice.toLocaleString()+'원' : ''}</span>`
            : '<span style="color:#888">구매 기록 없음</span>'}
        </div>
        <div class="sec">해외직구 더 싸게?</div>
        <div class="btns">
          <a class="ali" href="https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(title)}" target="_blank">알리</a>
          <a class="temu" href="https://www.temu.com/search_result.html?search_key=${encodeURIComponent(title)}" target="_blank">테무</a>
          <a class="amz" href="https://www.amazon.com/s?k=${encodeURIComponent(title)}" target="_blank">아마존</a>
        </div>
        <a class="more" href="https://pyw31337.github.io/buy/#items" target="_blank">내 구매 기록 전체 보기 →</a>
      </div>
    `;
    document.body.appendChild(el);
  });
})();
