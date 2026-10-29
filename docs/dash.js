/* 렛츠바이 분석 대시보드 — 순수 SVG 차트, 서버 없음 */
(function () {
  const I = window.LetsBuyInsights;
  const W = (k) => window.LB_UI[k];
  const man = n => n >= 1e8 ? (n / 1e8).toFixed(1) + '억' : n >= 1e4 ? Math.round(n / 1e4).toLocaleString() + '만' : Math.round(n).toLocaleString();
  const won = n => man(n) + '원';
  const CI = { '식품': 'apple', '영양제': 'pill', '생활용품': 'roll', '육아': 'baby', '반려동물': 'paw', '뷰티': 'sparkles', '주방': 'pan', '패션': 'shirt', '캠핑·레저': 'tent', '가전·디지털': 'plug', '기타': 'package' };
  const icon = (c, sz = 18) => W('svg')(CI[c] || 'package', sz);
  const pctTag = (p, inv) => p == null ? '<span class="pct">–</span>' : `<span class="pct ${(inv ? -p : p) > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '▲' : p < 0 ? '▼' : ''}${Math.abs(p)}%</span>`;

  function bars(monthly) {
    const w = 720, h = 220, P = 34, n = monthly.length, mx = Math.max(1, ...monthly.map(m => m.spend)), mc = Math.max(1, ...monthly.map(m => m.count));
    const bw = (w - P * 2) / n, y = v => h - 28 - (h - 50) * v / mx, yc = v => h - 28 - (h - 50) * v / mc;
    const line = monthly.map((m, i) => `${i ? 'L' : 'M'}${(P + bw * i + bw / 2).toFixed(1)},${yc(m.count).toFixed(1)}`).join('');
    return `<svg class="ch" viewBox="0 0 ${w} ${h}">${[0.5, 1].map(f => `<line x1="${P}" x2="${w - P}" y1="${y(mx * f)}" y2="${y(mx * f)}" stroke="#EEECE7"/><text x="${P - 6}" y="${y(mx * f) + 4}" font-size="10" fill="#9A9AA3" text-anchor="end">${man(mx * f)}</text>`).join('')}
      ${monthly.map((m, i) => `<g><title>${m.m} · ${won(m.spend)} · ${m.count}건</title><rect x="${(P + bw * i + 2).toFixed(1)}" y="${y(m.spend).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${(h - 28 - y(m.spend)).toFixed(1)}" rx="4" fill="${i >= n - 12 ? '#FF5A36' : '#FFC2B0'}"/>${i % 3 === 0 || i === n - 1 ? `<text x="${(P + bw * i + bw / 2).toFixed(1)}" y="${h - 10}" font-size="10" fill="#77777F" text-anchor="middle">${m.m.slice(2).replace('-', '.')}</text>` : ''}</g>`).join('')}
      <path d="${line}" fill="none" stroke="#16161A" stroke-width="1.6" stroke-dasharray="3 3"/>${monthly.map((m, i) => `<circle cx="${(P + bw * i + bw / 2).toFixed(1)}" cy="${yc(m.count).toFixed(1)}" r="2.6" fill="#16161A"/>`).join('')}</svg>
      <div class="lg"><span><i style="background:#FFC2B0"></i>작년</span><span><i style="background:#FF5A36"></i>최근 12개월</span><span><i class="dot"></i>주문 건수</span></div>`;
  }
  function donut(byCat, total) {
    const R = 70, r = 46, cx = 90, cy = 90; let a = -Math.PI / 2; const t = byCat.reduce((s, c) => s + c.spend, 0) || 1;
    const arcs = byCat.filter(c => c.spend).map(c => { const da = c.spend / t * Math.PI * 2, a2 = a + da, big = da > Math.PI ? 1 : 0;
      const p = [[R, a], [R, a2], [r, a2], [r, a]].map(([rr, aa]) => [cx + rr * Math.cos(aa), cy + rr * Math.sin(aa)].map(v => v.toFixed(2)));
      const d = `M${p[0]}A${R},${R} 0 ${big} 1 ${p[1]}L${p[2]}A${r},${r} 0 ${big} 0 ${p[3]}Z`; a = a2; return `<path d="${d}" fill="${c.color}"><title>${c.cat} ${won(c.spend)}</title></path>`; }).join('');
    return `<div class="donut"><svg viewBox="0 0 180 180" width="180" height="180">${arcs}<text x="90" y="86" text-anchor="middle" font-size="12" fill="#77777F">2년 지출</text><text x="90" y="106" text-anchor="middle" font-size="18" font-weight="800">${won(total)}</text></svg>
      <div class="leg">${byCat.slice().sort((x, y) => y.spend - x.spend).map(c => `<button class="li" data-cat="${c.cat}"><span class="ci" style="color:${c.color};background:${c.color}1A">${icon(c.cat, 16)}</span><b>${c.cat}</b><span>${Math.round(c.spend / t * 100)}%</span><small>${c.items}종</small></button>`).join('')}</div></div>`;
  }
  function hbars(list, key, lab) {
    const mx = Math.max(1, ...list.map(x => x[key]));
    return list.map(x => `<div class="hb"><span class="hl">${lab(x)}</span><span class="ht"><i style="width:${(x[key] / mx * 100).toFixed(1)}%;background:${x.color || 'var(--c,#FF5A36)'}"></i></span><b>${won(x[key])}</b></div>`).join('');
  }
  function heatmap(heat) {
    const mx = Math.max(1, ...heat.flatMap(h => h.v));
    return `<div class="hm"><div class="hmr hmh"><span></span>${Array.from({ length: 12 }, (_, i) => `<em>${i + 1}</em>`).join('')}</div>${heat.map(h => `<div class="hmr"><span><i class="ci" style="color:${h.color};background:${h.color}1A">${icon(h.cat, 13)}</i>${h.label}</span>${h.v.map((v, i) => `<b title="${h.label} ${i + 1}월 ${v}건" style="background:${v ? h.color : '#F1F0EC'};opacity:${v ? (0.18 + 0.82 * v / mx).toFixed(2) : 1}">${v || ''}</b>`).join('')}</div>`).join('')}</div>`;
  }
  function moyBars(moy, peaks) {
    const mx = Math.max(1, ...moy.map(m => m.spend)), top = new Set(moy.slice().sort((a, b) => b.spend - a.spend).slice(0, 3).map(m => m.mo));
    return `<div class="moy">${moy.map(m => `<div title="${m.mo}월 ${won(m.spend)}"><i style="height:${(8 + 92 * m.spend / mx).toFixed(0)}%" class="${top.has(m.mo) ? 'hot' : ''}"></i><span>${m.mo}</span></div>`).join('')}</div>`;
  }
  function cycles(items, today) {
    const rep = items.filter(i => i.count >= 3).sort((a, b) => b.count - a.count).slice(0, 10); if (!rep.length) return '<p class="muted">3번 이상 산 품목이 생기면 보여요</p>';
    const t1 = new Date(today), t0 = new Date(t1); t0.setMonth(t0.getMonth() - 24); const x = d => ((new Date(d) - t0) / (t1 - t0) * 100).toFixed(2);
    return `<div class="cyc">${rep.map(it => `<div class="cr" data-k="${W('esc')(it.key)}">${W('thumb')(it, 34)}<span class="cn">${W('esc')(it.name)}</span><span class="ctr">${it.dates.filter(d => new Date(d) >= t0).map(d => `<i style="left:${x(d)}%" title="${d}"></i>`).join('')}</span><b>${it.count}회</b></div>`).join('')}
      <div class="cr axis"><span></span><span></span><span class="ctr">${[0, 6, 12, 18, 24].map(k => { const d = new Date(t0); d.setMonth(d.getMonth() + k); return `<em style="left:${k / 24 * 100}%">${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}</em>`; }).join('')}</span><b></b></div></div>`;
  }
  function render() {
    const el = document.getElementById('dashBody'); if (!el) return;
    const d = W('data')(), st = W('store')();
    if (!d.orders.length) { el.innerHTML = '<div class="empty">구매 기록이 생기면 분석이 보여요</div>'; return; }
    const A = I.insights(d.orders, { today: d.today, cats: st.cats || {}, aliases: d.aliases, prices: d.prices });
    const thumb = W('thumb'), esc = W('esc'), mallChip = W('mallChip'), svg = W('svg');
    const last12 = A.monthly.slice(12), avgM = Math.round(last12.reduce((s, m) => s + m.spend, 0) / 12);
    const kpi = [['wallet', '최근 12개월 지출', won(A.yoy.cur), pctTag(A.yoy.pct) + ' 작년 대비'], ['calendar', '한 달 평균', won(avgM), `주문 ${Math.round(A.yoy.curN / 12)}건/월`], ['cart', '한 번 주문할 때', won(A.basket.avg), `총 ${A.basket.n.toLocaleString()}번 주문`], ['package', '산 물건', A.total.items.toLocaleString() + '종', `${A.total.count.toLocaleString()}건 구매`]];
    const peak = A.peaks[0];
    el.innerHTML = `
      <div class="kpis">${kpi.map(([ic, l, v, s]) => `<div class="kpi"><span class="ki">${svg(ic, 20)}</span><span class="kl">${l}</span><b>${v}</b><small>${s}</small></div>`).join('')}</div>
      <div class="dg">
        <section class="pn wide"><h3>${svg('chart', 18)} 월별 지출 <small>${peak ? `가장 많이 쓴 달 ${peak.m.replace('-', '.')} · ${won(peak.spend)}` : ''}</small></h3>${bars(A.monthly)}</section>
        <section class="pn"><h3>${svg('pie', 18)} 무엇에 썼나</h3>${donut(A.byCat, A.total.spend)}</section>
        <section class="pn"><h3>${svg('store', 18)} 어디서 샀나</h3>${hbars(A.malls.slice(0, 8).map(m => ({ ...m, color: undefined })), 'spend', m => mallChip(m.mall) + `<small>${m.count}건</small>`)}</section>
        <section class="pn wide"><h3>${svg('flame', 18)} 언제 많이 사나 <small>품목 × 월 (2년 합계 건수)</small></h3>${heatmap(A.heat)}</section>
        <section class="pn"><h3>${svg('calendar', 18)} 달마다 지출 <small>진한 막대 = 많이 쓰는 3개월</small></h3>${moyBars(A.moy)}</section>
        <section class="pn"><h3>${svg('swap', 18)} 작년과 비교 <small>최근 12개월 vs 그 전 12개월</small></h3><div class="yoy">${A.catYoy.filter(c => c.cur || c.prev).sort((a, b) => b.cur - a.cur).slice(0, 7).map(c => `<div class="yr"><span class="ci" style="color:${c.color};background:${c.color}1A">${icon(c.cat, 14)}</span><span>${c.cat}</span><span class="yb"><i style="width:${(c.prev / Math.max(1, ...A.catYoy.map(x => Math.max(x.cur, x.prev))) * 100).toFixed(1)}%" class="p"></i><i style="width:${(c.cur / Math.max(1, ...A.catYoy.map(x => Math.max(x.cur, x.prev))) * 100).toFixed(1)}%;background:${c.color}"></i></span>${pctTag(c.pct)}</div>`).join('')}</div></section>
        <section class="pn wide"><h3>${svg('star', 18)} 자주 산 것</h3><div class="tops">${A.top.map(it => `<div class="tp" data-k="${esc(it.key)}">${thumb(it, 76)}<span class="badge">${it.count}회</span><b>${esc(it.name)}</b><small>${it.sub} · ${won(it.spend)}</small></div>`).join('')}</div></section>
        <section class="pn wide"><h3>${svg('cycle', 18)} 반복 구매 타임라인 <small>점 하나 = 한 번 구매</small></h3>${cycles(A.items, A.today)}</section>
        <section class="pn wide"><h3>${svg('tag', 18)} 내가 낸 가격 변화 <small>처음 산 가격 → 최근 가격 (1개 기준)</small></h3>${A.changes.length ? `<div class="chg">${A.changes.slice(0, 10).map(c => `<div class="cg" data-k="${esc(c.key)}">${thumb(c, 40)}<span class="cn">${esc(c.name)}<small>${c.from.slice(2).replace(/-/g, '.')} → ${c.to.slice(2).replace(/-/g, '.')}</small></span><span class="pp">${W('fmt')(c.p0)} → <b>${W('fmt')(c.p1)}</b></span>${pctTag(c.pct)}${c.shrink ? `<span class="shr">용량 ${c.shrink}%↓</span>` : ''}</div>`).join('')}</div>` : '<p class="muted">같은 물건을 가격과 함께 두 번 이상 사면 보여요</p>'}</section>
        <section class="pn wide"><h3>${svg('search', 18)} 작년 이맘때 vs 지금 시장가 <small>확장이 내 브라우저에서 매일 모은 최저가</small></h3>${A.market.length ? `<div class="chg">${A.market.slice(0, 10).map(c => `<div class="cg" data-k="${esc(c.key)}">${thumb(c, 40)}<span class="cn">${esc(c.name)}<small>${c.paidDate.slice(2).replace(/-/g, '.')}에 샀음 · 지금 ${esc(c.nowSrc || '')}</small></span><span class="pp">${W('fmt')(c.paid)} → <b>${W('fmt')(c.now)}</b></span>${pctTag(c.pct)}</div>`).join('')}</div>` : '<p class="muted">확장이 가격을 모으기 시작하면 보여요 (매일 1회, 재구매 품목)</p>'}${A.shrink.length ? `<p class="shrnote">${svg('alert', 15)} 용량이 줄었는데 값은 그대로이거나 오른 품목 ${A.shrink.length}개</p>` : ''}</section>
      </div>`;
    el.querySelectorAll('[data-k]').forEach(n => n.onclick = () => W('openKey')(n.dataset.k));
    el.querySelectorAll('[data-cat]').forEach(n => n.onclick = () => W('filterCat')(n.dataset.cat));
  }
  window.renderDash = render;
})();
if (document.getElementById('dash') && document.getElementById('dash').classList.contains('on')) window.renderDash();
