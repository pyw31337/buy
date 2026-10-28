/* 화면 오른쪽 아래 작은 진행 표시 하나 */
function lbToast(text, done) {
  let el = document.getElementById('letsbuy-toast');
  if (!el) { el = document.createElement('div'); el.id = 'letsbuy-toast'; Object.assign(el.style, { position: 'fixed', right: '20px', bottom: '20px', zIndex: 2147483647, background: '#16161A', color: '#fff', padding: '10px 14px', borderRadius: '12px', font: '600 13px system-ui,sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,.2)', transition: 'opacity .3s' }); document.documentElement.appendChild(el); }
  el.innerHTML = '<span style="color:#FF5A36">●</span> ' + text; el.style.opacity = 1;
  clearTimeout(lbToast.h); if (done) lbToast.h = setTimeout(() => el.style.opacity = 0, 4000);
}
