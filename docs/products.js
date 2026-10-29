/* 렛츠바이 「내 제품」: 자주 사는 제품 → 지금 얼마 → 살까 말까. 상세 화면 포함. 서버 없음 */
(function (root) {
  const day = d => Math.round(new Date(d + 'T00:00:00Z').getTime() / 864e5);
  const iso = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const SRCURL = { '쿠팡': q => 'https://www.coupang.com/np/search?q=' + q, '네이버': q => 'https://search.shopping.naver.com/search/all?query=' + q, '다나와': q => 'https://search.danawa.com/dsearch.php?query=' + q, '에누리': q => 'https://www.enuri.com/search.jsp?keyword=' + q, 'G마켓': q => 'https://www.gmarket.co.kr/n/search?keyword=' + q, '11번가': q => 'https://search.11st.co.kr/Search.tmall?kwd=' + q, '옥션': q => 'https://www.auction.co.kr/n/search?keyword=' + q, 'SSG': q => 'https://www.ssg.com/search.ssg?query=' + q, '컬리': q => 'https://www.kurly.com/search?sword=' + q, '롯데ON': q => 'https://www.lotteon.com/search/search/search.ecn?render=search&q=' + q };
  const srcOf = x => x.src || String(x.mall || '').replace(/\s*최저$/, '');
  const pricesOf = (it, P) => P[it.key] || P[it.name] || (k => k ? P[k] : [])(Object.keys(P).find(k => it.name.includes(k) || k.includes(it.name))) || [];

  /** 한 제품의 판단: 지금 사세요 / 기다리세요 / 곧 떨어져요(D-n) */
  function model(it, P, today, plat) {
    let p = pricesOf(it, P).filter(x => x.price);
    if (plat) p = p.filter(x => srcOf(x) === plat || ['다나와', '에누리'].includes(srcOf(x)) && false);
    const byDay = {}; p.forEach(x => { const d = x.date; if (!byDay[d] || x.price < byDay[d].price) byDay[d] = x; });
    const series = Object.keys(byDay).sort().map(d => ({ date: d, price: byDay[d].price, src: srcOf(byDay[d]) })).filter(x => day(today) - day(x.date) <= 120);
    const last = p.reduce((m, x) => x.date > m ? x.date : m, '');
    const cur = {}; p.filter(x => day(last) - day(x.date) <= 3).forEach(x => { const s = srcOf(x); if (!cur[s] || x.date > cur[s].date || x.date === cur[s].date && x.price < cur[s].price) cur[s] = x; });
    const q = encodeURIComponent(it.name.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').trim().split(/\s+/).slice(0, 5).join(' '));
    const sources = Object.values(cur).map(x => ({ src: srcOf(x), price: x.price, date: x.date, title: x.title, url: x.url || (SRCURL[srcOf(x)] || SRCURL['네이버'])(q) })).sort((a, b) => a.price - b.price);
    const img = it.img || (p.slice().reverse().find(x => x.img) || {}).img || null;
    const mine = it.prices || [], myLast = mine.length ? mine[mine.length - 1] : null;
    const ya = mine.filter(x => Math.abs(day(today) - day(x.date) - 365) <= 60).slice(-1)[0] || null;
    const now = sources[0] || null;
    const ps = series.slice(-30).map(x => x.price), avg = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null, min = ps.length ? Math.min(...ps) : null;
    // 반복되는 할인: 평균보다 3% 넘게 싼 날들의 시작점 간격 → 다음 할인 예상일
    let nextDip = null;
    if (series.length >= 14 && avg) { const st = []; series.forEach((x, i) => { const low = x.price <= avg * 0.97, prevLow = i && series[i - 1].price <= avg * 0.97; if (low && !prevLow) st.push(day(x.date)); }); if (st.length >= 2) { const gs = st.slice(1).map((v, i) => v - st[i]), g = Math.round(gs.reduce((a, b) => a + b, 0) / gs.length); let n = st[st.length - 1] + g; while (n <= day(today)) n += g; if (g >= 4) nextDip = { date: iso(n), d: n - day(today), gap: g }; } }
    const ref = myLast ? myLast.price : null, vsMine = now && ref ? Math.round((now.price - ref) / ref * 100) : null, vsYear = now && ya ? Math.round((now.price - ya.price) / ya.price * 100) : null;
    let v;
    if (now) {
      if (now.price <= min * 1.02 || (ref && now.price <= ref * 0.95)) v = { k: 'buy', t: '지금 사세요' };
      else if (nextDip && nextDip.d <= 21) v = { k: 'soon', t: `곧 떨어져요 D-${nextDip.d}` };
      else if (avg && now.price > avg * 1.03) v = { k: 'wait', t: '기다리세요' };
      else v = it.daysLeft <= 7 ? { k: 'buy', t: '지금 사세요' } : { k: 'ok', t: '보통 가격' };
    } else v = it.count >= 2 && it.daysLeft <= 7 ? { k: 'due', t: '살 때 됐어요' } : it.count >= 2 && it.daysLeft < 9999 ? { k: 'ok', t: `D-${it.daysLeft} 후 필요` } : { k: 'ok', t: '가격 모으는 중' };
    const urg = it.count >= 2 ? Math.max(0, 30 - Math.max(0, it.daysLeft)) : 0;
    const score = ({ buy: 100, soon: 70, due: 60, wait: 40, ok: 10 })[v.k] + urg + Math.min(20, it.count) + (vsMine != null && vsMine < 0 ? -vsMine : 0);
    // 추천 문장
    const won = n => n.toLocaleString('ko-KR') + '원';
    let say = '';
    if (now) say = v.k === 'buy' ? `${now.src} ${won(now.price)} — ${ref ? (now.price <= ref ? `지난번보다 ${won(ref - now.price)} 싸요` : `최근 ${series.length}일 중 가장 싼 편이에요`) : '최근 최저가 근처예요'}.` : v.k === 'soon' ? `${nextDip.gap}일마다 값이 내려가요. ${+nextDip.date.slice(5, 7)}월 ${+nextDip.date.slice(8)}일쯤 기다려 보세요.` : v.k === 'wait' ? `지금은 최근 평균(${won(Math.round(avg))})보다 비싸요.` : `평소 가격이에요.`;
    else say = it.count >= 2 ? `평균 ${it.avgGap}일마다 사셨어요. 현재가는 확장이 매일 모아요.` : '현재가는 확장이 매일 모아요.';
    if (it.count >= 2 && it.daysLeft <= 7 && v.k !== 'wait') say += it.daysLeft < 0 ? ' 다시 살 때가 지났어요.' : ' 곧 다시 살 때예요.';
    return { ...it, img, sources, now, series, avg: avg && Math.round(avg), min, myLast, yearAgo: ya, vsMine, vsYear, nextDip, verdict: v, score, say };
  }
  function build(d, opt) {
    const L = root.LetsBuy, I = root.LetsBuyInsights; opt = opt || {};
    const all = L.analyze(d.orders, d.today, d.aliases, { all: true });
    const A = I ? I.insights(d.orders, { today: d.today, cats: opt.cats || {}, aliases: d.aliases, prices: d.prices }) : null;
    return all.map(it => { const m = model(it, d.prices || {}, d.today, d.plat); const c = A && A.catOfKey[it.key]; return { ...m, cat: c ? c.main : '기타', sub: c ? c.sub : '' }; }).sort((a, b) => b.score - a.score);
  }
  const api = { model, build, pricesOf };
  if (typeof module !== 'undefined') { module.exports = api; return; }
  root.LetsBuyProducts = api;

  /* ───────── 화면 ───────── */
  const W = k => root.LB_UI[k];
  const VC = { buy: '#1F9D63', soon: '#2F6FEB', due: '#FF5A36', wait: '#E5484D', ok: '#77777F' };
  let catF = null, view = 'rep', lastList = [];
  const pct = (p, lab) => p == null ? '' : `<span class="pc ${p > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '▲' : p < 0 ? '▼' : ''}${Math.abs(p)}%<small>${lab}</small></span>`;
  function spark(s, w = 120, h = 34) {
    if (s.length < 2) return `<svg class="spk" viewBox="0 0 ${w} ${h}"></svg>`;
    const v = s.map(x => x.price), mn = Math.min(...v), mx = Math.max(...v), x = i => (i / (s.length - 1) * (w - 4) + 2).toFixed(1), y = p => (h - 3 - (h - 6) * (p - mn) / ((mx - mn) || 1)).toFixed(1);
    const d = s.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.price)}`).join('');
    return `<svg class="spk" viewBox="0 0 ${w} ${h}"><path d="${d}L${x(s.length - 1)},${h}L2,${h}Z" fill="#FF5A36" opacity=".1"/><path d="${d}" fill="none" stroke="#FF5A36" stroke-width="1.8"/><circle cx="${x(s.length - 1)}" cy="${y(v[v.length - 1])}" r="3" fill="#FF5A36"/></svg>`;
  }
  const photo = (p, sz) => W('thumb')({ key: p.key, img: p.img, name: p.name }, sz);
  function card(p) {
    const fmt = W('fmt'), esc = W('esc'), lg = W('logo'), sp = p.series.length >= 2 ? p.series.slice(-30) : (p.prices || []).slice(-12);
    return `<button class="pc-card" data-k="${esc(p.key)}">
      <span class="vb" style="--v:${VC[p.verdict.k]}">${esc(p.verdict.t)}</span>
      <span class="pimg">${photo(p, 148)}</span>
      <b class="pname">${esc(p.name)}</b>
      <span class="pmeta">${p.count}회 구매 · 내 마지막 ${p.myLast ? fmt(p.myLast.price) : '–'}</span>
      ${p.now ? `<span class="pnow">${lg(p.now.src, 20)}<b>${fmt(p.now.price)}</b>${pct(p.vsMine, '내 가격')}</span>` : `<span class="pnow none">${W('svg')('search', 16)} 현재가 모으는 중</span>`}
      ${spark(sp)}
    </button>`;
  }
  function chips(d) {
    const esc = W('esc'), lg = W('logo'), pl = W('plat')(), cnt = {};
    W('raw')().orders.forEach(o => { const k = W('platOf')(o.mall); cnt[k] = (cnt[k] || 0) + 1; });
    const list = Object.entries(cnt).filter(([k]) => k && k !== '기타').sort((a, b) => b[1] - a[1]).slice(0, 10);
    return `<div class="plats"><button class="plc ${pl ? '' : 'on'}" data-p="">전체</button>${list.map(([k, n]) => `<button class="plc ${pl === k ? 'on' : ''}" data-p="${esc(k)}">${lg(k, 22)}<span>${esc(k)}</span><small>${n}</small></button>`).join('')}</div>`;
  }
  function render() {
    const el = document.getElementById('prodBody'); if (!el || !root.LB_UI) return;
    const d = W('data')(), esc = W('esc'), svg = W('svg');
    if (!d.orders.length) { el.innerHTML = chips(d) + '<div class="empty">이 플랫폼 구매 기록이 없어요</div>'; bind(el); return; }
    const all = build(d, { cats: W('store')().cats }); lastList = all;
    const rep = all.filter(p => p.count >= 2), base = view === 'rep' && rep.length ? rep : all;
    const list = base.filter(p => !catF || p.cat === catF);
    const nb = list.filter(p => p.verdict.k === 'buy').length, ns = list.filter(p => p.verdict.k === 'soon').length, nw = list.filter(p => p.verdict.k === 'wait').length;
    const cats = [...new Set(base.map(p => p.cat))];
    el.innerHTML = `${chips(d)}${W('photoBar')()}
      <div class="phead"><h1>${W('plat')() ? `${W('logo')(W('plat')(), 28)} ${esc(W('plat')())}에서 ` : ''}자주 사는 제품</h1>
        <div class="vsum"><span style="--v:${VC.buy}"><b>${nb}</b>지금 사세요</span><span style="--v:${VC.soon}"><b>${ns}</b>곧 떨어져요</span><span style="--v:${VC.wait}"><b>${nw}</b>기다리세요</span></div></div>
      <div class="ctabs"><button class="ct ${catF ? '' : 'on'}" data-c="">전체 ${base.length}</button>${cats.map(c => `<button class="ct ${catF === c ? 'on' : ''}" data-c="${esc(c)}">${esc(c)} ${base.filter(p => p.cat === c).length}</button>`).join('')}<span class="sp"></span><button class="ct" id="viewT">${view === 'rep' ? '1번 산 것도 보기' : '자주 산 것만'}</button></div>
      <div class="pgrid">${list.slice(0, 120).map(card).join('') || '<div class="empty">없어요</div>'}</div>`;
    bind(el); W('bindPhoto')(el);
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { catF = b.dataset.c || null; render(); });
    el.querySelector('#viewT').onclick = () => { view = view === 'rep' ? 'all' : 'rep'; render(); };
  }
  function bind(el) {
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const p = b.dataset.p || null; if (!p && !W('plat')()) return; W('setPlat')(p || W('plat')()); });
    el.querySelectorAll('.pc-card[data-k]').forEach(b => b.onclick = () => detail(b.dataset.k));
  }
  function chart(p) {
    const fmt = W('fmt'), w = 760, h = 260, P = 44, t1 = day(root.LB_UI.data().today);
    const mine = p.prices || [], t0 = t1 - 180;
    const pts = mine.filter(x => day(x.date) >= t0), vals = pts.map(x => x.price).concat(p.series.map(x => x.price));
    if (!vals.length) return '<div class="empty sm">가격 기록이 쌓이면 그래프가 보여요</div>';
    const mn = Math.min(...vals) * 0.95, mx = Math.max(...vals) * 1.05, x = t => (P + (w - P - 16) * (t - t0) / ((t1 - t0) || 1)).toFixed(1), y = v => (h - 30 - (h - 50) * (v - mn) / ((mx - mn) || 1)).toFixed(1);
    const line = p.series.map((s, i) => `${i ? 'L' : 'M'}${x(day(s.date))},${y(s.price)}`).join('');
    const ticks = []; for (let k = 0; k <= 4; k++) ticks.push(Math.round(t0 + (t1 - t0) * k / 4));
    return `<svg class="pchart" viewBox="0 0 ${w} ${h}">
      ${[0, .5, 1].map(f => { const v = mn + (mx - mn) * f; return `<line x1="${P}" x2="${w - 16}" y1="${y(v)}" y2="${y(v)}" stroke="#EEECE7"/><text x="${P - 6}" y="${+y(v) + 4}" font-size="11" text-anchor="end" fill="#9A9AA3">${Math.round(v / 100) * 100 >= 1e4 ? (v / 1e4).toFixed(1) + '만' : Math.round(v).toLocaleString()}</text>`; }).join('')}
      ${ticks.map(t => `<text x="${x(t)}" y="${h - 8}" font-size="11" text-anchor="middle" fill="#9A9AA3">${iso(t).slice(2, 7).replace('-', '.')}</text>`).join('')}
      ${line ? `<path d="${line}" fill="none" stroke="#FF5A36" stroke-width="2.4"/>` : ''}
      ${p.avg ? `<line x1="${x(day(p.series[0].date))}" x2="${w - 16}" y1="${y(p.avg)}" y2="${y(p.avg)}" stroke="#FF5A36" stroke-dasharray="3 4" opacity=".5"/>` : ''}
      ${pts.map(o => `<g><title>${o.date} ${o.mall} ${fmt(o.price)}</title><circle cx="${x(day(o.date))}" cy="${y(o.price)}" r="6" fill="#16161A" stroke="#fff" stroke-width="2"/></g>`).join('')}
      ${p.nextDip ? `<line x1="${x(t1)}" x2="${x(t1)}" y1="14" y2="${h - 30}" stroke="#2F6FEB" stroke-dasharray="2 3"/>` : ''}
    </svg><div class="lg"><span><i class="dot"></i>내가 산 가격</span><span><i style="background:#FF5A36"></i>현재 최저가(매일)</span>${p.avg ? '<span><i class="dash"></i>최근 평균</span>' : ''}</div>`;
  }
  function detail(key) {
    const p = lastList.find(x => x.key === key) || build(W('data')(), { cats: W('store')().cats }).find(x => x.key === key); if (!p) return;
    const fmt = W('fmt'), esc = W('esc'), lg = W('logo'), svg = W('svg'), I = root.LetsBuyInsights;
    const u = I && p.myLast ? I.unitPrice(p.name, p.myLast.price, 1) : null, s0 = I && I.sizeOf(p.name), sh = p.sources.find(x => x.title && I && I.sizeOf(x.title)), s1 = sh && I.sizeOf(sh.title);
    const shrink = s0 && s1 && s0.unit === s1.unit && s1.total < s0.total ? Math.round((1 - s1.total / s0.total) * 100) : 0;
    const el = document.getElementById('pdBody');
    el.innerHTML = `<button class="back" id="pdBack">← 내 제품</button>
      <div class="pdtop"><div class="pdimg">${photo(p, 260)}</div>
        <div class="pdinfo"><span class="vb lg" style="--v:${VC[p.verdict.k]}">${esc(p.verdict.t)}</span><h1>${esc(p.name)}</h1>
          <p class="say">${esc(p.say)}</p>
          <div class="pdk">
            <div><span>지금 최저</span><b>${p.now ? lg(p.now.src, 20) + fmt(p.now.price) : '–'}</b></div>
            <div><span>내 마지막</span><b>${p.myLast ? fmt(p.myLast.price) : '–'}</b>${pct(p.vsMine, '')}</div>
            <div><span>작년 이맘때</span><b>${p.yearAgo ? fmt(p.yearAgo.price) : '–'}</b>${pct(p.vsYear, '')}</div>
            <div><span>사는 주기</span><b>${p.count >= 2 ? p.avgGap + '일' : '1회'}</b><small>${p.count}회 · ${p.count >= 2 ? (p.daysLeft < 0 ? -p.daysLeft + '일 지남' : 'D-' + p.daysLeft) : ''}</small></div>
            ${u ? `<div><span>${u.label}</span><b>${fmt(u.value)}</b></div>` : ''}
          </div>
          ${p.now ? `<a class="cta buy" target="_blank" rel="noopener" href="${esc(p.now.url)}">${lg(p.now.src, 22)} ${esc(p.now.src)}에서 ${fmt(p.now.price)}에 사기</a>` : ''}
          ${shrink ? `<p class="shrnote">${svg('alert', 16)} 지금 파는 상품은 용량이 ${shrink}% 적어요 (${esc(sh.title)})</p>` : ''}
        </div></div>
      <section class="pn"><h3>${svg('chart', 18)} 가격 추이</h3>${chart(p)}</section>
      <div class="dg">
        <section class="pn"><h3>${svg('store', 18)} 플랫폼별 지금 가격</h3>${p.sources.length ? `<div class="ptab">${p.sources.map((x, i) => `<a class="pr ${i ? '' : 'min'}" target="_blank" rel="noopener" href="${esc(x.url)}">${lg(x.src, 28)}<span class="pt"><b>${esc(x.src)}</b><small>${esc(x.title || '')}</small></span><b class="pp">${fmt(x.price)}</b>${i ? `<small class="gap">+${fmt(x.price - p.sources[0].price)}</small>` : '<span class="best">최저</span>'}<span class="go">사러 가기 ›</span></a>`).join('')}</div>` : `<div class="empty sm">확장이 하루 한 번 쿠팡·네이버·다나와·에누리 가격을 모아요</div>`}</section>
        <section class="pn"><h3>${svg('cart', 18)} 내 구매 기록</h3><div class="hist">${(p.prices || []).slice().reverse().slice(0, 20).map(o => `<div class="hr">${lg(o.mall, 20)}<span>${o.date.replace(/-/g, '.')}</span><b>${fmt(o.price)}</b></div>`).join('') || '<div class="empty sm">가격이 없는 구매예요</div>'}</div></section>
      </div>
      <button class="btn ghost" id="pdEdit">이름·분류 고치기</button>`;
    W('go')('pd');
    el.querySelector('#pdBack').onclick = () => W('go')('prod');
    el.querySelector('#pdEdit').onclick = () => W('openKey')(p.key);
  }
  root.renderProd = render; root.prodChips = () => chips(); root.openProduct = detail; root.prodFilterCat = c => { catF = c; view = 'all'; W('go')('prod'); render(); };
  if (document.getElementById('prod') && document.getElementById('prod').classList.contains('on')) render();
})(typeof window !== 'undefined' ? window : globalThis);
