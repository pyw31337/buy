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
      ${monthly.map((m, i) => `<g class="mb" data-m="${m.m}"><title>${m.m} · ${won(m.spend)} · ${m.count}건</title><rect x="${(P + bw * i).toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${h - 20}" fill="transparent"/><rect x="${(P + bw * i + 2).toFixed(1)}" y="${y(m.spend).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${(h - 28 - y(m.spend)).toFixed(1)}" rx="4" fill="${i >= n - 12 ? '#FF5A36' : '#FFC2B0'}"/>${i % 3 === 0 || i === n - 1 ? `<text x="${(P + bw * i + bw / 2).toFixed(1)}" y="${h - 10}" font-size="10" fill="#77777F" text-anchor="middle">${m.m.slice(2).replace('-', '.')}</text>` : ''}</g>`).join('')}
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
    return `<div class="hm"><div class="hmr hmh"><span></span>${Array.from({ length: 12 }, (_, i) => `<em>${i + 1}</em>`).join('')}</div>${heat.map(h => `<div class="hmr" data-cat="${h.cat}"><span><i class="ci" style="color:${h.color};background:${h.color}1A">${icon(h.cat, 13)}</i>${h.label}</span>${h.v.map((v, i) => `<b title="${h.label} ${i + 1}월 ${v}건" style="background:${v ? h.color : '#F1F0EC'};opacity:${v ? (0.18 + 0.82 * v / mx).toFixed(2) : 1}">${v || ''}</b>`).join('')}</div>`).join('')}</div>`;
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
    const TN = { up: '#E5484D', down: '#1F9D63', hot: '#FF5A36', warn: '#B7791F', '': '#16161A' };
    el.innerHTML = `
      ${window.prodChips ? window.prodChips() : ''}
      ${A.notes.length ? `<div class="notes">${A.notes.map(n => `<button class="note ${n.tone}" ${n.key ? `data-k="${esc(n.key)}"` : n.cat ? `data-cat="${esc(n.cat)}"` : n.mall ? `data-plat="${esc(W('platOf')(n.mall))}"` : n.m ? `data-m="${esc(n.m)}"` : ''}><span class="ni" style="color:${TN[n.tone]}">${svg(n.icon, 18)}</span><b style="color:${TN[n.tone]}">${esc(n.big)}</b><span>${esc(n.text)}</span></button>`).join('')}</div>` : ''}
      ${(() => { const etc = A.items.filter(i => i.cat === '기타' && !st.cats[i.key]); return etc.length ? `<div class="aibar"><span>${svg('package', 16)} 분류 못 한 품목 <b>${etc.length}</b>개</span><button class="btn sm" id="aiCat">${svg('sparkles', 15)} 로컬 AI로 분류</button><button class="btn sm ghost" id="etcList">보기</button><small id="aiCatMsg">내 컴퓨터의 Ollama로 · 데이터는 밖으로 안 나가요</small></div>` : ''; })()}
      <div class="kpis">${kpi.map(([ic, l, v, s], i) => `<div class="kpi" ${i < 2 ? `data-m="${A.monthly[A.monthly.length - 1].m}"` : 'data-go="prod"'}><span class="ki">${svg(ic, 20)}</span><span class="kl">${l}</span><b>${v}</b><small>${s}</small></div>`).join('')}</div>
      <div class="dg">
        <section class="pn wide"><h3>${svg('chart', 18)} 월별 지출 <small>${peak ? `가장 많이 쓴 달 ${peak.m.replace('-', '.')} · ${won(peak.spend)}` : ''}</small></h3>${bars(A.monthly)}</section>
        <section class="pn"><h3>${svg('pie', 18)} 무엇에 썼나</h3>${donut(A.byCat, A.total.spend)}</section>
        <section class="pn"><h3>${svg('store', 18)} 어디서 샀나</h3><div class="mallbars">${hbars(A.malls.slice(0, 8).map(m => ({ ...m, color: undefined })), 'spend', m => `<button class="mlink" data-plat="${W('platOf')(m.mall)}">${mallChip(m.mall)}<small>${m.count}건</small></button>`)}</div></section>
        <section class="pn wide"><h3>${svg('flame', 18)} 언제 많이 사나 <small>품목 × 월 (2년 합계 건수)</small></h3>${heatmap(A.heat)}</section>
        <section class="pn"><h3>${svg('calendar', 18)} 달마다 지출 <small>진한 막대 = 많이 쓰는 3개월</small></h3>${moyBars(A.moy)}</section>
        <section class="pn"><h3>${svg('swap', 18)} 작년과 비교 <small>최근 12개월 vs 그 전 12개월</small></h3><div class="yoy">${A.catYoy.filter(c => c.cur || c.prev).sort((a, b) => b.cur - a.cur).slice(0, 7).map(c => `<div class="yr" data-cat="${c.cat}"><span class="ci" style="color:${c.color};background:${c.color}1A">${icon(c.cat, 14)}</span><span>${c.cat}</span><span class="yb"><i style="width:${(c.prev / Math.max(1, ...A.catYoy.map(x => Math.max(x.cur, x.prev))) * 100).toFixed(1)}%" class="p"></i><i style="width:${(c.cur / Math.max(1, ...A.catYoy.map(x => Math.max(x.cur, x.prev))) * 100).toFixed(1)}%;background:${c.color}"></i></span>${pctTag(c.pct)}</div>`).join('')}</div></section>
        <section class="pn wide"><h3>${svg('star', 18)} 자주 산 것</h3><div class="tops">${A.top.map(it => `<div class="tp" data-k="${esc(it.key)}">${thumb(it, 76)}<span class="badge">${it.count}회</span><b>${esc(it.name)}</b><small>${it.sub} · ${won(it.spend)}</small></div>`).join('')}</div></section>
        <section class="pn wide"><h3>${svg('cycle', 18)} 반복 구매 타임라인 <small>점 하나 = 한 번 구매</small></h3>${cycles(A.items, A.today)}</section>
        <section class="pn wide"><h3>${svg('tag', 18)} 내가 낸 가격 변화 <small>처음 산 가격 → 최근 가격 (1개 기준)</small></h3>${A.changes.length ? `<div class="chg">${A.changes.slice(0, 10).map(c => `<div class="cg" data-k="${esc(c.key)}">${thumb(c, 40)}<span class="cn">${esc(c.name)}<small>${c.from.slice(2).replace(/-/g, '.')} → ${c.to.slice(2).replace(/-/g, '.')}</small></span><span class="pp">${W('fmt')(c.p0)} → <b>${W('fmt')(c.p1)}</b></span>${pctTag(c.pct)}${c.shrink ? `<span class="shr">용량 ${c.shrink}%↓</span>` : ''}</div>`).join('')}</div>` : '<p class="muted">같은 물건을 가격과 함께 두 번 이상 사면 보여요</p>'}</section>
        <section class="pn wide"><h3>${svg('search', 18)} 작년 이맘때 vs 지금 최저가 <small>다나와·에누리·쿠팡·네이버 · 확장이 내 브라우저에서 하루 한 번</small></h3>${A.market.length ? `<div class="mkt">${A.market.slice(0, 12).map(c => `<div class="mk" data-k="${esc(c.key)}">${thumb(c, 52)}<div class="mkm"><b>${esc(c.name)}</b><small>${c.paidDate.slice(2).replace(/-/g, '.')} ${W('fmt')(c.paid)}${c.gap ? ` · ${c.gap}일마다` : ''}</small><div class="srcs">${c.sources.map((x, i) => `<span class="src${i ? '' : ' min'}" title="${esc(x.title || '')}">${esc(x.src)} ${W('fmt')(x.price)}</span>`).join('')}</div></div><div class="mkr">${pctTag(c.pct)}${c.unitPct != null && c.unitLabel ? `<small>${c.unitLabel} ${c.unitPct > 0 ? '+' : ''}${c.unitPct}%</small>` : ''}${c.shrink ? `<span class="shr">용량 ${c.shrink}%↓</span>` : ''}</div></div>`).join('')}</div>` : '<p class="muted">확장이 가격을 모으기 시작하면 보여요 (매일 1회, 자주 사는 품목 60개)</p>'}${A.shrink.length || A.market.some(m => m.shrink) ? `<p class="shrnote">${svg('alert', 15)} 용량이 줄어든 품목 ${A.shrink.length + A.market.filter(m => m.shrink).length}개</p>` : ''}</section>
      </div>`;
    el.querySelectorAll('[data-k]').forEach(n => n.onclick = () => window.openProduct ? window.openProduct(n.dataset.k) : W('openKey')(n.dataset.k));
    el.querySelectorAll('[data-plat]').forEach(n => n.onclick = e => { e.stopPropagation(); W('setPlat')(n.dataset.plat); });
    el.querySelectorAll('[data-p]').forEach(n => n.onclick = () => { const p = n.dataset.p || null; if (!p && !W('plat')()) return; W('setPlat')(p || W('plat')()); });
    el.querySelectorAll('[data-go]').forEach(n => n.onclick = () => W('go')(n.dataset.go));
    el.querySelectorAll('[data-m]').forEach(n => n.onclick = () => month(n.dataset.m));
    const ai = document.getElementById('aiCat'); if (ai) ai.onclick = () => aiCats(A.items.filter(i => i.cat === '기타' && !st.cats[i.key]));
    const el2 = document.getElementById('etcList'); if (el2) el2.onclick = () => W('filterCat')('기타');
    el.querySelectorAll('[data-cat]').forEach(n => n.onclick = () => window.prodFilterCat ? window.prodFilterCat(n.dataset.cat) : W('filterCat')(n.dataset.cat));
  }
  // 로컬 AI(Ollama): 기타 품목만 30개씩 보내 분류. 결과는 내 브라우저에 저장, 직접 바꾼 분류가 우선
  // 월 막대 → 그 달에 산 것 (사진 + 누르면 제품 상세)
  function month(m) {
    const d = W('data')(), esc = W('esc'), fmt = W('fmt'), rows = I.insights(d.orders, { today: d.today, cats: W('store')().cats || {}, aliases: d.aliases, prices: d.prices }).items.flatMap(it => it.list.filter(o => o.date.slice(0, 7) === m).map(o => ({ ...o, key: it.key, img: it.img, cat: it.cat }))).sort((a, b) => b.price - a.price);
    const tot = rows.reduce((a, o) => a + (o.price || 0), 0);
    document.getElementById('sheetBody').innerHTML = `<button class="x" id="x">×</button><h2>${+m.slice(0, 4)}년 ${+m.slice(5)}월 · ${won(tot)} · ${rows.length}건</h2><div class="mlist">${rows.map(o => `<button class="mrow" data-k="${esc(o.key)}">${W('thumb')(o, 48)}<span><b>${esc(o.name)}</b><small>${W('mallChip')(o.mall)} ${o.date.slice(5).replace('-', '.')}</small></span><b>${fmt(o.price)}</b></button>`).join('')}</div>`;
    const sh = document.getElementById('sheet'); sh.classList.add('on'); document.getElementById('x').onclick = () => sh.classList.remove('on');
    sh.querySelectorAll('.mrow').forEach(b => b.onclick = () => { sh.classList.remove('on'); window.openProduct(b.dataset.k); });
  }
  // 로컬 AI(Ollama): 확장을 거쳐 호출(설정 없이). 기타 품목만 30개씩. 결과는 내 브라우저에 저장, 직접 바꾼 분류가 우선
  async function aiCats(list) {
    const msg = document.getElementById('aiCatMsg'), st = W('store')(), model = (document.getElementById('aiModel') || {}).value || '', H = W('OLLAMA_HELP');
    const help = why => { msg.innerHTML = `${H[why] || 'Ollama에 연결 못 함'}${why === 'down' || why === 'noext' ? ' · <a href="https://ollama.com/download" target="_blank" rel="noopener">Ollama 받기</a>' : ''}`; msg.classList.add('err'); };
    msg.classList.remove('err'); msg.textContent = '연결 확인 중…';
    const ping = await W('ollama')('', model, 'ping'); if (!ping.ok && ping.why !== 'noext') return help(ping.why);
    const opts = [...new Set(I.DICT.map(x => x[0] + '/' + x[1]))]; let n = 0;
    for (let i = 0; i < list.length; i += 30) {
      const part = list.slice(i, i + 30); msg.textContent = `분류 중 ${i}/${list.length}`;
      const r = await W('ollama')(`한국 쇼핑몰 상품명을 아래 분류 중 하나로 나눠라. 분류: ${opts.join(', ')}. 맞는 게 없으면 "기타/기타". JSON {"상품명":"대분류/소분류"} 만 답하라.\n` + part.map(x => x.name).join('\n'), model);
      if (!r.ok) return help(r.why);
      let j = {}; try { j = JSON.parse(r.content); } catch { continue; }
      for (const it of part) { const v = j[it.name]; if (typeof v === 'string' && opts.includes(v)) { st.cats[it.key] = v; n++; } }
    }
    W('saveStore')(); render(); W('toast')(`AI가 ${n}개 분류했어요`);
  }
  window.renderDash = render;
})();
if (document.getElementById('dash') && document.getElementById('dash').classList.contains('on')) window.renderDash();
