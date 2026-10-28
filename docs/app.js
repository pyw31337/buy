(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const KEY = 'letsbuy.v1';
  let store = JSON.parse(localStorage.getItem(KEY) || 'null') || { orders: [], prices: {} };
  let demo = !store.orders.length;
  let filter = 'all';
  const save = () => localStorage.setItem(KEY, JSON.stringify(store));
  const data = () => demo ? LETSBUY_SAMPLE : { ...store, today: new Date().toISOString().slice(0, 10) };
  const fmt = n => n == null ? '-' : n.toLocaleString('ko-KR') + '원';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = d => { const [, m, dd] = d.split('-'); return `${+m}월 ${+dd}일`; };

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
    const pv = priceVerdict(it, d);
    const pct = it.type === '시즌' ? 0 : Math.max(4, Math.min(100, 100 * (1 - it.daysLeft / it.avgGap)));
    return `<div class="card" data-k="${esc(it.key)}">${tagOf(it)}<div class="name">${esc(it.name)}</div>
      <div class="meta">${it.count}번 구매 · ${it.type === '시즌' ? '매년 이맘때' : `평균 ${it.avgGap}일마다`}</div>
      ${it.type !== '시즌' ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="meta">${dueText(it)} · 다음 ${md(it.nextDate)}</div>` : `<div class="meta">다음 시즌 ${it.nextDate.slice(0, 7).replace('-', '년 ')}월</div>`}
      ${pv ? `<div><span class="big">${fmt(pv.now)}</span> <span class="meta">${pv.v}</span></div>` : ''}</div>`;
  }
  function render() {
    const d = data(), items = LetsBuy.analyze(d.orders, d.today);
    $('#mode').innerHTML = demo ? '<b>데모 모드</b> · 가상 데이터' : `내 데이터 · 주문 ${store.orders.length}건`;
    $('#today').textContent = md(d.today) + ' 기준';
    const due = items.filter(i => i.type !== '시즌' && i.daysLeft <= 14), season = items.filter(i => i.type === '시즌');
    $('#headline').textContent = due.length ? `다시 살 때가 된 물건 ${due.length}개` : '당장 살 물건은 없어요';
    $('#subline').textContent = `2번 이상 산 품목 ${items.length}개를 지켜보고 있어요.`;
    const saved = items.reduce((a, it) => { const pv = priceVerdict(it, d); return pv && pv.paid ? a + Math.max(0, pv.paid - pv.min) : a; }, 0);
    $('#stats').innerHTML = [[d.orders.length, '수집한 주문'], [items.length, '재구매 품목'], [items.filter(i => i.type.startsWith('주기')).length, '주기 품목'], [fmt(saved), '최저가 대비 아낄 여지']].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
    $('#due').innerHTML = due.map(i => card(i, d)).join('') || '<div class="empty">2주 안에 필요한 품목이 없어요.</div>';
    $('#season').innerHTML = season.map(i => card(i, d)).join('') || '<div class="empty">시즌 품목은 2년 이상 쌓이면 보여요.</div>';
    const q = $('#q').value.trim();
    const rows = items.filter(i => (filter === 'all' || (filter === '기타' ? !/주기|시즌/.test(i.type) : i.type.startsWith(filter))) && (!q || i.name.includes(q)));
    $('#list').innerHTML = rows.map(i => `<div class="lrow" data-k="${esc(i.key)}"><div><b>${esc(i.name)}</b><div class="meta">${i.malls.join(' · ')} · 마지막 ${i.last}</div></div><div class="meta">${i.count}회 · ${i.avgGap}일</div>${tagOf(i)}</div>`).join('') || '<div class="empty">조건에 맞는 품목이 없어요.</div>';
    $$('[data-k]').forEach(el => el.onclick = () => open(items.find(i => i.key === el.dataset.k), d));
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
    $('#sheetBody').innerHTML = `<button class="x" id="x">×</button>${tagOf(it)}<h2 style="margin:10px 0 4px">${esc(it.name)}</h2>
      <p class="meta">${it.type} 품목 (확신도 ${Math.round(it.confidence * 100)}%) · ${it.count}번 구매 · 평균 ${it.avgGap}일 간격 · 다음 예상 ${it.nextDate}</p>
      <h3>구매 기록</h3><div class="tl">${it.dates.map((dt, i) => `<span>${dt}${i ? ` · +${it.gaps[i - 1]}일` : ''}</span>`).join('')}</div>
      ${it.prices.length ? `<p class="meta">내가 낸 가격: ${it.prices.map(p => `${fmt(p.price)}(${p.mall})`).join(', ')}</p>` : ''}
      <h3>가격 추이</h3>${pv ? chart(pv.series, pv.paid) + `<p class="meta">지금 ${fmt(pv.now)} · 기간 최저 ${fmt(pv.min)} · 평균 ${fmt(pv.avg)} → <b>${pv.v}</b></p>` : '<p class="meta">아직 수집된 가격이 없어요. 확장이 매일 한 번 가격을 기록하면 이곳에 쌓입니다.</p>'}
      <h3>과거 가격 더 보기</h3><div class="links"><a target="_blank" rel="noopener" href="https://search.danawa.com/dsearch.php?query=${q}">다나와에서 보기</a><a target="_blank" rel="noopener" href="https://fallcent.com/search?keyword=${q}">폴센트에서 보기</a><a target="_blank" rel="noopener" href="https://search.shopping.naver.com/search/all?query=${q}">네이버쇼핑</a><a target="_blank" rel="noopener" href="https://www.coupang.com/np/search?q=${q}">쿠팡</a></div>`;
    $('#sheet').classList.add('on'); $('#x').onclick = () => $('#sheet').classList.remove('on');
  }
  $('#sheet').onclick = e => { if (e.target.id === 'sheet') e.target.classList.remove('on'); };
  $$('#tabs button').forEach(b => b.onclick = () => { $$('#tabs button,.tab').forEach(e => e.classList.remove('on')); b.classList.add('on'); $('#' + b.dataset.tab).classList.add('on'); });
  $$('#filter button').forEach(b => b.onclick = () => { $$('#filter button').forEach(e => e.classList.remove('on')); b.classList.add('on'); filter = b.dataset.f; render(); });
  $('#q').oninput = render;
  function merge(orders, prices) {
    const seen = new Set(store.orders.map(o => o.date + o.name));
    for (const o of orders || []) if (!seen.has(o.date + o.name)) { store.orders.push(o); seen.add(o.date + o.name); }
    for (const [k, v] of Object.entries(prices || {})) { const m = new Map((store.prices[k] || []).map(p => [p.date, p])); v.forEach(p => m.set(p.date, p)); store.prices[k] = [...m.values()].sort((a, b) => a.date < b.date ? -1 : 1); }
    save(); demo = !store.orders.length; render();
  }
  $('#addPaste').onclick = () => {
    const r = LetsBuy.parseMail({ subject: $('#pSubject').value, date: $('#pDate').value, body: $('#pBody').value, from: '' });
    const ok = r.filter(o => o.date);
    $('#pasteMsg').textContent = ok.length ? `${ok.length}개 상품을 찾았어요: ${ok.map(o => o.name).join(', ')}` : '주문 상품을 찾지 못했어요. 제목에 "주문 완료" 같은 말과 날짜가 있는지 확인해 주세요.';
    if (ok.length) merge(ok);
  };
  $('#file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); merge(j.orders, j.prices); alert(`주문 ${j.orders?.length || 0}건을 불러왔어요.`); } catch { alert('JSON 파일을 읽지 못했어요.'); } };
  $('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 1)], { type: 'application/json' })); a.download = 'letsbuy-backup.json'; a.click(); };
  $('#reset').onclick = () => { if (confirm('이 브라우저에 저장된 렛츠바이 데이터를 모두 지울까요?')) { store = { orders: [], prices: {} }; save(); demo = true; render(); } };
  $('#demo').onclick = () => { demo = true; render(); $('#tabs button').click(); };
  // 확장 연결 (확장의 content script가 이 페이지에 메시지를 보내줌)
  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || e.data.app !== 'letsbuy-ext') return;
    if (e.data.type === 'hello') { $('#extState').textContent = '확장 연결됨'; $('#extState').classList.add('on'); window.postMessage({ app: 'letsbuy-web', type: 'pull' }, '*'); }
    if (e.data.type === 'data') { merge(e.data.orders, e.data.prices); $('#extState').textContent = `확장 연결됨 · 주문 ${e.data.orders.length}건 동기화`; }
  });
  $('#pullExt').onclick = () => window.postMessage({ app: 'letsbuy-web', type: 'pull' }, '*');
  setTimeout(() => { if (!$('#extState').classList.contains('on')) $('#extState').textContent = '확장이 아직 연결되지 않았어요'; }, 1500);
  render();
})();
