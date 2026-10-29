(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const KEY = 'letsbuy.v1';
  let store = Object.assign({ orders: [], prices: {}, aliases: {}, onboarded: false }, JSON.parse(localStorage.getItem(KEY) || 'null') || {});
  store.orders = LetsBuy.dedupe(store.orders); // 예전 해석기가 남긴 잘못된 항목 정리
  let demo = false;
  let filter = 'all';
  const save = () => { localStorage.setItem(KEY, JSON.stringify(store)); window.postMessage({ app: 'letsbuy-web', type: 'aliases', aliases: store.aliases }, location.origin); };
  const kToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const data = () => demo ? { ...LETSBUY_SAMPLE, aliases: {} } : { ...store, today: kToday() };
  const items = () => { const d = data(); return LetsBuy.analyze(d.orders, d.today, d.aliases); };
  const fmt = n => n == null ? '-' : n.toLocaleString('ko-KR') + '원';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = d => { const [, m, dd] = d.split('-'); return `${+m}월 ${+dd}일`; };

  // 아이콘 (Lucide 스타일, MIT) — 이미지가 없을 때 카테고리 아이콘
  const P = {
    package: '<path d="M16.5 9.4 7.5 4.2"/><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    milk: '<path d="M8 2h8"/><path d="M9 2v2.8a4 4 0 0 1-.7 2.2l-.6.9A4 4 0 0 0 7 10.2V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.8a4 4 0 0 0-.7-2.3l-.6-.9A4 4 0 0 1 15 4.8V2"/><path d="M7 15a6.5 6.5 0 0 1 10 0"/>',
    roll: '<path d="M15 12h6"/><path d="M15 6h6"/><path d="m3 13 3.6-9.7a1 1 0 0 1 1.8 0L12 13"/><path d="M3 18h18"/>',
    wind: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
    shirt: '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.2a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.4-2.2z"/>',
    paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.8 1.1A3.6 3.6 0 0 0 5 17.5 3.5 3.5 0 0 1 6.5 11 5 5 0 0 1 9 10Z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    puzzle: '<path d="M19.4 14.9a1 1 0 0 1-.7-.9V13a2.5 2.5 0 1 0 0-5V6a2 2 0 0 0-2-2h-2a2.5 2.5 0 1 0-5 0H7.7A2 2 0 0 0 5.7 6v2.3a2.5 2.5 0 1 1 0 5V16a2 2 0 0 0 2 2h2.3a2.5 2.5 0 1 1 5 0h2.4a2 2 0 0 0 2-2z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    bell: '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M3.3 15.3A1 1 0 0 0 4 17h16a1 1 0 0 0 .7-1.7C19.4 14 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.4 6-2.7 7.3"/>',
    cycle: '<path d="M21 12a9 9 0 0 0-9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.8 9.8 0 0 0 6.7-2.7L21 16"/><path d="M16 16h5v5"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  };
  const svg = (k, sz = 24) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[k] || P.package}</svg>`;
  const CAT = [[/휴지|화장지|키친|타월|물티슈|티슈/, 'roll', '#E8F1FF'], [/세제|유연제|락스|세정|샴푸|린스|바디/, 'droplet', '#E6F7F1'], [/제습|습기/, 'droplet', '#EAF4FF'], [/치약|칫솔|가글|면도/, 'sparkles', '#F3EEFF'], [/커피|원두|캡슐|차 |티백/, 'coffee', '#F6EEE6'], [/물|생수|삼다수|우유|두유|음료|주스/, 'milk', '#E8F6FB'], [/필터|공기|청정/, 'wind', '#EEF2F6'], [/양말|속옷|티셔츠|의류/, 'shirt', '#FFF0EA'], [/사료|간식|고양이|강아지|모래/, 'paw', '#FFF5E0']];
  const catOf = n => (CAT.find(([re]) => re.test(n)) || [0, 'package', '#F1F0EC']);
  const thumb = (it, sz = 64) => it.img ? `<img class="th" style="width:${sz}px;height:${sz}px" src="${esc(it.img)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;th ico&quot; style=&quot;width:${sz}px;height:${sz}px&quot;>${svg('package').replace(/"/g, '&quot;')}</span>'">` : (([, k, bg]) => `<span class="th ico" style="width:${sz}px;height:${sz}px;background:${bg}">${svg(k, sz * .45)}</span>`)(catOf(it.name));
  const MC = { '쿠팡': '#E3262D', '네이버페이': '#03C75A', 'G마켓': '#2E7D32', '옥션': '#D32F2F', '11번가': '#FF0038', 'SSG': '#E2007E', '마켓컬리': '#5F0080', '컬리': '#5F0080', '오늘의집': '#35C5F0', '무신사': '#000', '알리익스프레스': '#E43225' };
  const mallChip = m => `<span class="mall" style="--c:${MC[m] || '#77777F'}">${esc(m === '네이버페이' ? 'N pay' : m)}</span>`;
  function ring(it, sz = 58) {
    const r = sz / 2 - 5, C = 2 * Math.PI * r, f = it.type === '시즌' ? 1 - Math.max(0, it.daysLeft) / 365 : 1 - it.daysLeft / (it.avgGap || 1);
    const p = Math.max(0.03, Math.min(1, f)), col = it.daysLeft < 0 ? '#FF5A36' : it.daysLeft <= 14 ? '#FF9F43' : '#1F9D63';
    const lbl = it.daysLeft < 0 ? `+${-it.daysLeft}일` : it.daysLeft === 0 ? '오늘' : `D-${it.daysLeft}`;
    return `<svg class="ring" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="#EEECE7" stroke-width="6"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 ${sz / 2} ${sz / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${sz / 4.3}" font-weight="800" fill="${col}">${lbl}</text></svg>`;
  }
  function timeline(it) {
    const all = [...it.dates, it.nextDate], d0 = new Date(all[0]), d1 = new Date(all[all.length - 1]), W = 640, x = d => 20 + (W - 40) * (new Date(d) - d0) / ((d1 - d0) || 1);
    return `<svg class="tline" viewBox="0 0 ${W} 64"><line x1="20" x2="${W - 20}" y1="28" y2="28" stroke="#E6E4DF" stroke-width="2"/>${it.dates.map(d => `<circle cx="${x(d)}" cy="28" r="7" fill="#16161A"/><text x="${x(d)}" y="56" font-size="11" text-anchor="middle" fill="#77777F">${d.slice(2, 7).replace('-', '.')}</text>`).join('')}<circle cx="${x(it.nextDate)}" cy="28" r="8" fill="#fff" stroke="#FF5A36" stroke-width="2.5" stroke-dasharray="3 2"/><text x="${x(it.nextDate)}" y="14" font-size="11" font-weight="700" text-anchor="middle" fill="#FF5A36">다음</text></svg>`;
  }
  function pricesFor(it, d) {
    if (d.prices[it.key]) return d.prices[it.key];
    const k = Object.keys(d.prices).find(k => it.name.includes(k));
    return k ? d.prices[k] : [];
  }
  function tagOf(it) {
    if (it.type === '시즌') return `<span class="tag season">시즌 · ${+it.nextDate.slice(5, 7)}월</span>`;
    const c = it.status === '지금 살 때' ? 'due' : it.status === '곧 필요' ? 'soon' : 'ok';
    return `<span class="tag ${c}">${it.status}</span>`;
  }
  function dueText(it) {
    if (it.daysLeft < 0) return `예상 시점 ${-it.daysLeft}일 지남`;
    if (it.daysLeft === 0) return '오늘이 예상 시점';
    return `${it.daysLeft}일 남음`;
  }
  function priceVerdict(it, d) {
    const p = pricesFor(it, d); if (!p.length) return null;
    const now = p[p.length - 1].price, min = Math.min(...p.map(x => x.price)), avg = p.reduce((a, x) => a + x.price, 0) / p.length;
    const paid = it.prices.length ? it.prices.reduce((a, x) => a + x.price, 0) / it.prices.length : null;
    const v = now <= min * 1.03 ? '최저가 근처' : now < avg ? '평균보다 쌈' : '평균보다 비쌈';
    return { now, min, avg: Math.round(avg), paid: paid && Math.round(paid), v, series: p };
  }
  function card(it, d) {
    const pv = priceVerdict(it, d), last = it.prices.length ? it.prices[it.prices.length - 1].price : null;
    return `<div class="card v4" data-k="${esc(it.key)}"><div class="ctop">${thumb(it)}${ring(it)}</div>
      <div class="name">${esc(it.name)}</div>
      <div class="cbot"><span class="chips">${it.malls.map(mallChip).join('')}<span class="cnt">${svg('chart', 13)}${it.count}회 · ${it.type === '시즌' ? '매년' : it.avgGap + '일'}</span></span>${pv ? `<b class="pr">${fmt(pv.now)}</b>` : last ? `<b class="pr dim">${fmt(last)}</b>` : ''}</div></div>`;
  }
  function render() {
    const d = data(), items = LetsBuy.analyze(d.orders, d.today, d.aliases);
    const has = !!(store.orders.length || demo);
    $('[data-tab=recs]').style.display = $('[data-tab=items]').style.display = has ? '' : 'none';
    if (!has && cur !== 'home') go('home');
    $('#mode').innerHTML = demo ? '<b>데모</b> <button class="link" id="exitDemo">끄기</button>' : store.orders.length ? `주문 ${store.orders.length}건` : '';
    if ($('#exitDemo')) $('#exitDemo').onclick = () => { demo = false; render(); if (!store.orders.length) go('home'); };
    $('#today').textContent = md(d.today) + ' 기준';
    const due = items.filter(i => i.type !== '시즌' && i.daysLeft <= 14), season = items.filter(i => i.type === '시즌');
    $('#headline').textContent = due.length ? `살 때 된 물건 ${due.length}개` : '지금 살 건 없어요';
    const saved = items.reduce((a, it) => { const pv = priceVerdict(it, d); return pv && pv.paid ? a + Math.max(0, pv.paid - pv.min) : a; }, 0);
    $('#stats').innerHTML = [[items.length, '재구매 품목'], [fmt(saved), '아낄 수 있는 돈']].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
    $('#due').innerHTML = due.map(i => card(i, d)).join('') ;
    $('#season').innerHTML = season.map(i => card(i, d)).join(''); $('#seasonH').style.display = season.length ? '' : 'none';
    const q = $('#q').value.trim();
    const all = LetsBuy.analyze(d.orders, d.today, d.aliases, { all: true });
    const rows = all.filter(i => (filter === 'all' || (filter === '재구매' ? i.count >= 2 : filter === '1회' ? i.count === 1 : i.type.startsWith(filter))) && (!q || i.name.includes(q)))
      .sort((x, y) => (y.count >= 2) - (x.count >= 2) || (x.count >= 2 ? x.daysLeft - y.daysLeft : (x.last < y.last ? 1 : -1)));
    $$('#filter button').forEach(b => { const f = b.dataset.f, n = f === 'all' ? all.length : f === '재구매' ? all.filter(i => i.count >= 2).length : f === '1회' ? all.filter(i => i.count === 1).length : all.filter(i => i.type.startsWith(f)).length; b.textContent = b.dataset.l + ' ' + n; });
    $('#summary').innerHTML = summary(d.orders);
    $('#list').innerHTML = rows.map(i => `<div class="lrow" data-k="${esc(i.key)}">${thumb(i, 44)}<div class="lmain"><b>${esc(i.name)}</b><div class="chips">${i.malls.map(mallChip).join('')}<span class="cnt">${i.count >= 2 ? i.count + '회 · ' + i.avgGap + '일 간격' : '1회 · ' + i.last}</span></div></div>${i.count >= 2 ? ring(i, 44) : `<span class="once">${i.prices.length ? fmt(i.prices[0].price) : ''}</span>`}</div>`).join('') || '<div class="empty">없어요</div>';
    $$('[data-k]').forEach(el => el.onclick = () => { const it = all.find(i => i.key === el.dataset.k); if (it) open(it, d); });
  }

  // 수집 요약: 확인한 메일 수, 기간, 쇼핑몰별 주문, 못 읽은 메일
  function summary(orders) {
    if (demo || !orders.length) return '';
    const s = store.stats, ds = orders.map(o => o.date).filter(Boolean).sort(), pm = {};
    orders.forEach(o => pm[o.mall] = (pm[o.mall] || 0) + 1);
    const malls = Object.entries(pm).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${mallChip(m)}<b>${n}</b>`).join(' ');
    const fails = s && s.failMall ? Object.entries(s.failMall).map(([m, n]) => `${m} ${n}`).join(' · ') : '';
    return `<div class="sum"><div class="sumrow">
      ${s ? `<div><span>확인한 메일</span><b>${(s.scanned || 0).toLocaleString()}통</b><small>${s.oldest || '?'} ~ ${s.newest || '?'} · 최근 ${s.years || 2}년</small></div>
      <div><span>주문 메일</span><b>${(s.read || 0).toLocaleString()}통</b><small>상품 찾음 ${(s.parsed || 0).toLocaleString()} · 못 읽음 ${((s.noItems || 0) + (s.readFail || 0)).toLocaleString()}</small></div>` : '<div><span>확인한 메일</span><b>—</b><small>확장 v0.8로 다시 수집하면 보여요</small></div>'}
      <div><span>구매 기록</span><b>${orders.length.toLocaleString()}건</b><small>${ds[0] || ''} ~ ${ds[ds.length - 1] || ''}</small></div></div>
      <div class="summalls">${malls}</div>${fails ? `<p class="sumfail">상품을 못 찾은 주문 메일: ${esc(fails)} · '메일 샘플 내려받기'로 보내 주시면 고칠게요</p>` : ''}</div>`;
  }
  function chart(series, paid) {
    const W = 680, H = 200, P = 30, ps = series.map(s => s.price), mn = Math.min(...ps, paid || Infinity) * 0.97, mx = Math.max(...ps, paid || 0) * 1.03;
    const x = i => P + (W - 2 * P) * i / Math.max(1, series.length - 1), y = v => H - P - (H - 2 * P) * (v - mn) / (mx - mn || 1);
    const path = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.price).toFixed(1)}`).join('');
    const mi = ps.indexOf(Math.min(...ps));
    return `<svg class="chart" viewBox="0 0 ${W} ${H}"><path d="${path} L${x(series.length - 1)},${H - P} L${P},${H - P}Z" fill="#FF5A36" opacity=".08"/><path d="${path}" fill="none" stroke="#FF5A36" stroke-width="2.5"/>
      ${paid ? `<line x1="${P}" x2="${W - P}" y1="${y(paid)}" y2="${y(paid)}" stroke="#9A9AA3" stroke-dasharray="4 4"/><text x="${W - P}" y="${y(paid) - 6}" text-anchor="end" font-size="12" fill="#5D5D66">내가 낸 평균 ${fmt(paid)}</text>` : ''}
      <circle cx="${x(mi)}" cy="${y(ps[mi])}" r="5" fill="#FF5A36"/><text x="${x(mi)}" y="${y(ps[mi]) + 20}" text-anchor="middle" font-size="12" fill="#16161A">최저 ${fmt(ps[mi])}</text>
      <text x="${P}" y="${H - 8}" font-size="11" fill="#9A9AA3">${series[0].date}</text><text x="${W - P}" y="${H - 8}" font-size="11" fill="#9A9AA3" text-anchor="end">${series[series.length - 1].date}</text></svg>`;
  }
  function open(it, d) {
    const pv = priceVerdict(it, d), q = encodeURIComponent(it.name.split(' ').slice(0, 4).join(' '));
    $('#sheetBody').innerHTML = `<button class="x" id="x">×</button><div class="shead">${thumb(it, 88)}<div><div class="chips">${it.malls.map(mallChip).join('')}</div><h2>${esc(it.name)}</h2></div>${ring(it, 72)}</div>
      ${timeline(it)}
      ${pv ? chart(pv.series, pv.paid) + `<p class="meta">지금 ${fmt(pv.now)} · 기간 최저 ${fmt(pv.min)} · 평균 ${fmt(pv.avg)} → <b>${pv.v}</b></p>` : '<p class="meta">가격은 매일 자동으로 쌓여요</p>'}
      <h3>다른 곳 가격</h3><div class="links"><a target="_blank" rel="noopener" href="https://search.danawa.com/dsearch.php?query=${q}">다나와에서 보기</a><a target="_blank" rel="noopener" href="https://fallcent.com/search?keyword=${q}">폴센트에서 보기</a><a target="_blank" rel="noopener" href="https://search.shopping.naver.com/search/all?query=${q}">네이버쇼핑</a><a target="_blank" rel="noopener" href="https://www.enuri.com/search.jsp?keyword=${q}">에누리</a><a target="_blank" rel="noopener" href="https://www.coupang.com/np/search?q=${q}">쿠팡</a><a target="_blank" rel="noopener" href="https://www.gmarket.co.kr/n/search?keyword=${q}">G마켓</a><a target="_blank" rel="noopener" href="https://search.11st.co.kr/Search.tmall?kwd=${q}">11번가</a></div>
      ${demo ? '' : `<h3>이름 정리</h3><div class="row"><input id="alias" value="${esc(it.name)}" placeholder="이 품목의 대표 이름"><button class="btn ghost" id="saveAlias">저장</button></div>
      <div class="tl">${it.names.map(n => `<span>${esc(n)}</span>`).join('')}</div>`}`;
    if ($('#saveAlias')) $('#saveAlias').onclick = () => { const v = $('#alias').value.trim(); if (!v) return; it.names.forEach(n => store.aliases[n] = v); save(); $('#sheet').classList.remove('on'); render(); toast('저장했어요'); };
    $('#sheet').classList.add('on'); $('#x').onclick = () => $('#sheet').classList.remove('on');
  }
  $('#sheet').onclick = e => { if (e.target.id === 'sheet') e.target.classList.remove('on'); };
  let cur = 'home';
  function go(t) { cur = t; $$('#tabs button,.tab').forEach(e => e.classList.remove('on')); $('[data-tab=' + t + ']').classList.add('on'); $('#' + t).classList.add('on'); if (location.hash !== '#' + t) history.replaceState(null, '', '#' + t); scrollTo(0, 0); }
  $$('#tabs button').forEach(b => b.onclick = () => go(b.dataset.tab));
  $('.brand').onclick = e => { e.preventDefault(); go('home'); };
  $$('#filter button').forEach(b => b.onclick = () => { $$('#filter button').forEach(e => e.classList.remove('on')); b.classList.add('on'); filter = b.dataset.f; render(); });
  $('#q').oninput = render;
  function merge(orders, prices, fromExt) {
    if (fromExt) store.orders = store.orders.filter(o => o.source === 'paste');
    orders = LetsBuy.dedupe(orders || []);
    const seen = new Set(store.orders.map(o => o.date + o.name));
    for (const o of orders || []) if (!seen.has(o.date + o.name)) { store.orders.push(o); seen.add(o.date + o.name); }
    for (const [k, v] of Object.entries(prices || {})) { const m = new Map((store.prices[k] || []).map(p => [p.date, p])); v.forEach(p => m.set(p.date, p)); store.prices[k] = [...m.values()].sort((a, b) => a.date < b.date ? -1 : 1); }
    store.orders = LetsBuy.dedupe(store.orders); save(); demo = false; render();
  }

  // .eml 끌어다 놓기 — 파일은 서버로 보내지 않고 이 브라우저에서 바로 해석
  async function importEml(files) {
    files = [...files].filter(f => /\.eml$/i.test(f.name) || f.type === 'message/rfc822');
    if (!files.length) { toast('.eml 파일만 읽을 수 있어요'); return; }
    let found = [], none = 0;
    for (const f of files) {
      const buf = new Uint8Array(await f.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      const r = LetsBuy.parseMail(LetsBuy.parseEml(bin)).filter(o => o.date).map(o => ({ ...o, source: 'paste' }));
      r.length ? found.push(...r) : none++;
    }
    const msg = `${files.length}개 메일 · 상품 ${found.length}개` + (none ? ` · ${none}개는 못 읽음` : '');
    $$('.emlMsg').forEach(e => e.textContent = msg); toast(msg);
    if (found.length) { merge(found); go('items'); }
  }
  $$('.emlDrop input').forEach(i => i.onchange = () => { importEml(i.files); i.value = ''; });
  addEventListener('dragover', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); document.body.classList.add('dragging'); } });
  addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
  addEventListener('drop', e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); document.body.classList.remove('dragging'); importEml(e.dataTransfer.files); });
  $('#addPaste').onclick = () => {
    const r = LetsBuy.parseMail({ subject: $('#pSubject').value, date: $('#pDate').value, body: $('#pBody').value, from: '' });
    const ok = r.filter(o => o.date).map(o => ({ ...o, source: 'paste' }));
    $('#pasteMsg').textContent = ok.length ? `${ok.length}개 추가` : '못 찾았어요';
    if (ok.length) merge(ok);
  };
  $('#file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); merge(j.orders, j.prices); toast(`${j.orders?.length || 0}건 불러옴`); } catch { toast('파일을 못 읽었어요'); } };
  $('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 1)], { type: 'application/json' })); a.download = 'letsbuy-backup.json'; a.click(); };
  $('#reset').onclick = () => { if (confirm('모두 지울까요?')) { store = { orders: [], prices: {}, aliases: {}, onboarded: true }; save(); demo = false; render(); } };
  $$('[data-i]').forEach(e => e.innerHTML = svg(e.dataset.i, e.classList.contains('sic') ? 26 : 18));
  $('#mallRow').innerHTML = ['쿠팡', '네이버페이', 'G마켓', '옥션', '11번가', 'SSG', '마켓컬리', '오늘의집', '무신사', '알리익스프레스'].map(m => `<span class="mtile"><span class="mlogo" style="--c:${MC[m] || '#77777F'}">${esc({ '쿠팡': 'C', '네이버페이': 'N', 'G마켓': 'G', '옥션': 'A', '11번가': '11', 'SSG': 'S', '마켓컬리': 'K', '오늘의집': 'O', '무신사': 'M', '알리익스프레스': 'Ali' }[m])}</span>${esc(m)}</span>`).join('') + '<span class="mtile more">+ Gmail · 네이버 메일</span>';
  { const sd = { ...LETSBUY_SAMPLE, aliases: {} }; $('#mockCards').innerHTML = LetsBuy.analyze(sd.orders, sd.today, {}).slice(0, 3).map(i => card(i, sd)).join(''); }
  go(store.orders.length && location.hash !== '#home' ? (['recs', 'items'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'recs') : 'home');
  $('#demo').onclick = () => { demo = true; render(); go('recs'); };
  // 확장 연결 (확장의 content script가 이 페이지에 메시지를 보내줌)
  let extInfo = null, extLog = [];
  window.addEventListener('message', e => {
    if (e.source !== window || e.origin !== location.origin || !e.data || e.data.app !== 'letsbuy-ext') return;
    if (e.data.type === 'diag') extLog = e.data.diag;
    if (e.data.type === 'hello') { extInfo = { version: e.data.version }; $('#extState').textContent = '확장 연결됨'; $('#extState').classList.add('on'); window.postMessage({ app: 'letsbuy-web', type: 'pull' }, '*'); }
    if (e.data.type === 'data') { if (e.data.stats) { store.stats = e.data.stats; store.mailCount = e.data.mailCount; } merge(e.data.orders, e.data.prices, true); $('#extState').textContent = `확장 v${e.data.version} · 주문 ${e.data.orders.length}건${e.data.pricedAt ? ' · 가격 ' + e.data.pricedAt : ''}`; }
  });
  $('#pullExt').onclick = () => window.postMessage({ app: 'letsbuy-web', type: 'pull' }, '*');
  setTimeout(() => { if (!$('#extState').classList.contains('on')) $('#extState').textContent = '확장 없음'; }, 1500);
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2400); }

  // 선택: 로컬 AI(Ollama)로 상품명 정리. 내 컴퓨터 안에서만 실행
  $('#aiRun').onclick = async () => {
    const model = $('#aiModel').value.trim() || 'qwen2.5:3b', names = [...new Set(store.orders.map(o => o.name))];
    if (!names.length) return toast('주문이 없어요');
    $('#aiMsg').textContent = '정리 중…';
    try {
      const r = await fetch('http://localhost:11434/api/chat', { method: 'POST', body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: '다음은 한국 쇼핑몰 상품명 목록이다. 같은 물건(브랜드·제품이 같고 용량·개수·홍보문구만 다른 것)끼리 묶어 짧은 대표 이름을 정해라. JSON {"map": {"원래 상품명": "대표 이름"}} 으로만 답해라.\n' + names.join('\n') }] }) });
      const j = JSON.parse((await r.json()).message.content), map = j.map || j;
      let n = 0; for (const [k, v] of Object.entries(map)) if (names.includes(k) && typeof v === 'string' && v) { store.aliases[k] = v; n++; }
      save(); render(); $('#aiMsg').textContent = `${n}개 정리`;
    } catch (e) { $('#aiMsg').textContent = 'Ollama 연결 안 됨'; }
  };
  $('#aiReset').onclick = () => { store.aliases = {}; save(); render(); toast('되돌렸어요'); };
  // 메일 샘플 내려받기: 쇼핑몰별 최대 5통, 개인정보 자동 가림
  const mask = h => String(h || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '***@***')
    .replace(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, '010-****-****')
    .replace(/0\d{1,2}-\d{3,4}-\d{4}/g, '0**-****-****')
    .replace(/\d{8,}/g, m => m.slice(0, 2) + '*'.repeat(m.length - 4) + m.slice(-2))
    .replace(/([가-힣])[가-힣]{1,3}(\s*)(님|고객님)/g, '$1**$2$3')
    .replace(/(받는\s*(분|사람)|수령인|주문자|구매자|이름|성명)(\s*[:：]?\s*(<[^>]*>\s*)*)[가-힣]{2,4}/g, '$1$3***')
    .replace(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|충청|전북|전남|전라|경북|경남|경상|제주)[가-힣]*\s[^<\n]{2,80}/g, '$1 (주소 가림)')
    .replace(/\(\d{5}\)|우편번호\s*[:：]?\s*\d{5}/g, '(*****)');
  function exportSamples(mails) {
    if (!mails.length) { toast('보관된 메일이 없어요 · 메일 탭에서 L 아이콘을 다시 눌러 주세요'); return; }
    const by = {};
    for (const m of mails) { const k = LetsBuy.detectMall(m.subject + ' ' + (m.html || '').replace(/<[^>]+>/g, ' ').slice(0, 3000), m.from); (by[k] = by[k] || []).length < 5 && by[k].push({ subject: mask(m.subject), from: String(m.from || '').replace(/"?[가-힣]{2,4}"?\s*</, '<').replace(/[\w.+-]+@/, '***@'), date: m.date, html: mask(m.html) }); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ at: new Date().toISOString(), total: mails.length, malls: by }, null, 1)], { type: 'application/json' }));
    a.download = 'letsbuy-mail-samples.json'; a.click(); toast(`${Object.values(by).flat().length}통 저장 · 개인정보는 가렸어요`);
  }
  window.addEventListener('message', e => { if (e.source === window && e.data && e.data.app === 'letsbuy-ext' && e.data.type === 'mails') exportSamples(e.data.mails); });
  $$('.sampleBtn').forEach(b => b.onclick = () => { if (!extInfo) { toast('확장이 연결되어 있어야 해요'); return; } window.postMessage({ app: 'letsbuy-web', type: 'mails' }, location.origin); });
  $('#diagWeb').onclick = () => { window.postMessage({ app: 'letsbuy-web', type: 'diag' }, location.origin); setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ at: new Date().toISOString(), ua: navigator.userAgent, ext: extInfo, orders: store.orders.length, malls: [...new Set(store.orders.map(o => o.mall))], sources: [...new Set(store.orders.map(o => o.source))], priceItems: Object.keys(store.prices).length, aliases: Object.keys(store.aliases).length, extLog }, null, 1)], { type: 'application/json' })); a.download = 'letsbuy-diagnostic.json'; a.click(); }, 600); };
  render();
})();
