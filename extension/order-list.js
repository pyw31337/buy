/* 쿠팡·네이버페이 주문목록 화면에 '렛츠바이에 담기' 버튼을 띄워, 보이는 목록을 읽습니다. */
(() => {
  const mall = /coupang/.test(location.host) ? '쿠팡' : '네이버페이';
  const b = document.createElement('button');
  b.textContent = '렛츠바이에 담기';
  Object.assign(b.style, { position: 'fixed', right: '20px', bottom: '20px', zIndex: 2147483647, background: '#FF5A36', color: '#fff', border: '0', borderRadius: '999px', padding: '12px 18px', font: '700 14px system-ui', boxShadow: '0 8px 24px rgba(0,0,0,.18)', cursor: 'pointer' });
  b.onclick = () => {
    const r = LetsBuy.parseOrderList(document.body.innerText, mall);
    diag('orderlist', r.length > 0, `${mall} items=${r.length}`);
    if (!r.length) { b.textContent = '주문을 못 찾았어요 · 주문목록 화면인지 확인'; return; }
    chrome.runtime.sendMessage({ type: 'orders', orders: r });
    b.textContent = `${r.length}개 담았어요 · 아래로 더 내리고 다시 눌러도 돼요`;
  };
  document.body.appendChild(b);
})();
