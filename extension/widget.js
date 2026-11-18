// 렛츠바이 쇼핑 도우미 위젯 — 상품 상세 페이지에서 구매 기록 및 직구 가격 비교 안내
(() => {
  if (document.getElementById('letsbuy-widget')) return;
  const host = location.hostname;
  const path = location.pathname;

  // 1. 주문목록, 장바구니, 결제, 로그인, 오류 화면에서는 실행하지 않는다
  if (/(?:mycoupang|purchase|order|cart|checkout|login|member|error|signin)/i.test(path + location.search)) return;

  // 2. 실제 상품 상세 페이지(PDP)에서만 동작한다
  const isCoupangProd = /coupang\.com$/.test(host) && /\/(?:vp\/products|products|np\/products)\//.test(path);
  const isGmarketProd = /gmarket\.co\.kr$/.test(host) && /\/item/i.test(path);
  const isNaverProd = /(?:shopping\.naver\.com|smartstore\.naver\.com)$/.test(host) && (/\/products\//.test(path) || /\/detail\//.test(path));
  if (!isCoupangProd && !isGmarketProd && !isNaverProd) return;

  // 3. 에러 문구나 시스템 텍스트는 상품명에서 배제한다
  const titleEl = document.querySelector('h1.prod-buy-header__title, h1.itemtit, h2.product_title, .itemtit, h1');
  const title = (titleEl?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  if (!title || title.length < 4) return;
  if (/(?:301|403|404|500|moved permanently|cloudfront|access denied|오류|로그인|장바구니|주문내역|구매목록)/i.test(title)) return;

  chrome.runtime.sendMessage({ type: 'lookup', name: title }, res => {
    if (chrome.runtime.lastError || !res) return;
    const el = document.createElement('div');
    el.id = 'letsbuy-widget';
    el.innerHTML = `
      <style>
        #letsbuy-widget {
          position: fixed; bottom: 24px; right: 24px; z-index: 999990;
          width: 284px; background: #ffffff; border-radius: 18px;
          box-shadow: 0 10px 36px rgba(10,28,56,.16), 0 2px 8px rgba(10,28,56,.06);
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard", system-ui, sans-serif;
          overflow: hidden; border: 1px solid #e9ecef;
          transition: transform .2s ease, opacity .2s ease;
        }
        #letsbuy-widget .hd {
          display: flex; align-items: center; padding: 12px 16px 10px;
          background: linear-gradient(135deg, #0A1C38 0%, #1e3a6d 100%);
          color: #fff;
        }
        #letsbuy-widget .hd b { font-size: 13px; font-weight: 700; letter-spacing: -.2px; }
        #letsbuy-widget .hd .tag {
          font-size: 11px; background: rgba(255,255,255,.18); padding: 2px 7px;
          border-radius: 999px; margin-left: 8px; font-weight: 500;
        }
        #letsbuy-widget .close {
          margin-left: auto; width: 22px; height: 22px; border-radius: 50%;
          background: rgba(255,255,255,.18); display: grid; place-items: center;
          cursor: pointer; font-size: 14px; line-height: 1; transition: background .15s;
        }
        #letsbuy-widget .close:hover { background: rgba(255,255,255,.3); }
        #letsbuy-widget .bd { padding: 13px 16px 15px; }
        #letsbuy-widget .hist {
          font-size: 13px; line-height: 1.45; color: #1e293b; margin-bottom: 12px;
          padding: 8px 10px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;
        }
        #letsbuy-widget .hist b { color: #0f172a; }
        #letsbuy-widget .sec { font-size: 12px; font-weight: 700; color: #475569; margin: 10px 0 8px; }
        #letsbuy-widget .btns { display: flex; gap: 6px; }
        #letsbuy-widget .btns a {
          flex: 1; text-align: center; padding: 8px 0; border-radius: 9px;
          font-size: 12px; font-weight: 700; text-decoration: none; color: #fff;
          transition: opacity .15s, transform .1s;
        }
        #letsbuy-widget .btns a:hover { opacity: .9; transform: translateY(-1px); }
        #letsbuy-widget .ali { background: #FF4747; }
        #letsbuy-widget .temu { background: #FB7701; }
        #letsbuy-widget .amz { background: #FF9900; color: #111 !important; }
        #letsbuy-widget .more {
          display: block; margin-top: 11px; text-align: center;
          color: #2563eb; font-size: 12px; font-weight: 600; text-decoration: none;
        }
        #letsbuy-widget .more:hover { text-decoration: underline; }
      </style>
      <div class="hd">
        <b>렛츠바이</b>
        <span class="tag">구매 비서</span>
        <div class="close" onclick="this.closest('#letsbuy-widget').remove()">×</div>
      </div>
      <div class="bd">
        <div class="hist">
          ${res?.found
            ? `이전에 구매한 품목이에요 · <b>${res.count}회</b><br><span style="color:#64748b;font-size:12px">마지막 결제 ${res.lastPrice ? Number(res.lastPrice).toLocaleString() + '원' : ''}</span>`
            : '<span style="color:#64748b;font-size:12px">수집된 이전 구매 기록에는 없는 상품이에요</span>'}
        </div>
        <div class="sec">해외직구 더 싸게?</div>
        <div class="btns">
          <a class="ali" href="https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(title)}" target="_blank" rel="noopener">알리</a>
          <a class="temu" href="https://www.temu.com/search_result.html?search_key=${encodeURIComponent(title)}" target="_blank" rel="noopener">테무</a>
          <a class="amz" href="https://www.amazon.com/s?k=${encodeURIComponent(title)}" target="_blank" rel="noopener">아마존</a>
        </div>
        <a class="more" href="https://pyw31337.github.io/buy/#items" target="_blank" rel="noopener">내 구매 기록 전체 보기 →</a>
      </div>
    `;
    document.body.appendChild(el);
  });
})();
