(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const KEY = 'letsbuy.v1';
  let store = Object.assign({ orders: [], prices: {}, aliases: {}, cats: {}, onboarded: false }, JSON.parse(localStorage.getItem(KEY) || 'null') || {});
  store.orders = LetsBuy.dedupe(store.orders); // 예전 해석기가 남긴 잘못된 항목 정리
  let demo = false;
  let filter = 'all', catF = null;
  const save = () => { localStorage.setItem(KEY, JSON.stringify(store)); window.postMessage({ app: 'letsbuy-web', type: 'aliases', aliases: store.aliases }, location.origin); };
  const kToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  let plat = null; // 플랫폼 필터: 누르면 그 곳에서 산 것만으로 모든 화면을 다시 구성
  const platOf = m => /네이버|스마트스토어|N ?pay/i.test(m || '') ? '네이버' : /컬리/.test(m || '') ? '컬리' : /롯데ON|롯데온/i.test(m || '') ? '롯데ON' : /배민|배달의민족/.test(m || '') ? '배민' : String(m || '').replace(/\s*최저$/, '');
  const raw = () => demo ? { ...LETSBUY_SAMPLE, aliases: {} } : { ...store, today: kToday() };
  const data = () => { const d = raw(); return plat ? { ...d, orders: d.orders.filter(o => platOf(o.mall) === plat), plat } : d; };
  const items = () => { const d = data(); return LetsBuy.analyze(d.orders, d.today, d.aliases); };
  const fmt = n => n == null ? '-' : n.toLocaleString('ko-KR') + '원';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = d => { const [, m, dd] = d.split('-'); return `${+m}월 ${+dd}일`; };

  // 아이콘 (Lucide 스타일, MIT) — 이미지가 없을 때 카테고리 아이콘
  const P = {
    apple: '<path d="M12 7c-1-2-4-3-6-1-2 2-2 6 0 9 1.5 2.5 3.5 4 6 3 2.5 1 4.5-.5 6-3 2-3 2-7 0-9-2-2-5-1-6 1z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
    pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="m9.5 9.5 5 5"/>',
    baby: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/><path d="M10.5 8h.01M13.5 8h.01"/>',
    pan: '<circle cx="10" cy="13" r="6"/><path d="m15 9 6-6"/>',
    tent: '<path d="M3 20 12 4l9 16z"/><path d="M12 4v16M9 20l3-6 3 6"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>',
    pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    store: '<path d="M3 9 5 4h14l2 5"/><path d="M4 9v11h16V9"/><path d="M3 9h18M9 20v-6h6v6"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-5-5"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
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
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  };
  const svg = (k, sz = 24) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[k] || P.package}</svg>`;
  const CAT = [[/휴지|화장지|키친|타월|물티슈|티슈/, 'roll', '#E8F1FF'], [/세제|유연제|락스|세정|샴푸|린스|바디/, 'droplet', '#E6F7F1'], [/제습|습기/, 'droplet', '#EAF4FF'], [/치약|칫솔|가글|면도/, 'sparkles', '#F3EEFF'], [/커피|원두|캡슐|차 |티백/, 'coffee', '#F6EEE6'], [/물|생수|삼다수|우유|두유|음료|주스/, 'milk', '#E8F6FB'], [/필터|공기|청정/, 'wind', '#EEF2F6'], [/양말|속옷|티셔츠|의류/, 'shirt', '#FFF0EA'], [/사료|간식|고양이|강아지|모래/, 'paw', '#FFF5E0']];
  const CI2 = { '식품': 'apple', '영양제': 'pill', '생활용품': 'roll', '육아': 'baby', '반려동물': 'paw', '뷰티': 'sparkles', '주방': 'pan', '패션': 'shirt', '캠핑·레저': 'tent', '가전·디지털': 'plug' };
  const catOf = n => CAT.find(([re]) => re.test(n)) || (window.LetsBuyInsights && (c => CI2[c.main] ? [0, CI2[c.main], LetsBuyInsights.COLORS[c.main] + '1F'] : null)(LetsBuyInsights.categorize(n))) || [0, 'package', '#F1F0EC'];
  // 사진: 확장이 만든 작은 WebP(내 브라우저 보관) → 공유 캐시 → 메일 사진 → 분류 그림
  let THUMB = {}, thumbProg = null, sharedAsked = new Set();
  const imgOf = it => (it.key && THUMB[it.key]) || it.img || null;
  const thumb = (it, sz = 64) => (it = { ...it, img: imgOf(it) }).img ? `<img class="th" style="width:${sz}px;height:${sz}px" src="${esc(it.img)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;th ico&quot; style=&quot;width:${sz}px;height:${sz}px;background:${catOf(it.name)[2]}&quot;>${svg(catOf(it.name)[1], sz * .45).replace(/"/g, '&quot;')}</span>'">` : (([, k, bg]) => `<span class="th ico" style="width:${sz}px;height:${sz}px;background:${bg}">${svg(k, sz * .45)}</span>`)(catOf(it.name));
  const MC = { '쿠팡': '#E3262D', '네이버': '#03C75A', '롯데ON': '#E60012', '배민': '#2AC1BC', '메가마트': '#D7262B', '네이버페이': '#03C75A', 'G마켓': '#2E7D32', '옥션': '#D32F2F', '11번가': '#FF0038', 'SSG': '#E2007E', '마켓컬리': '#5F0080', '컬리': '#5F0080', '오늘의집': '#35C5F0', '무신사': '#000', '알리익스프레스': '#E43225' };
  const LOGO = { '쿠팡': 'coupang', '네이버': 'npay', '네이버페이': 'npay', '네이버쇼핑': 'naver', 'G마켓': 'gmarket', '옥션': 'auction', '11번가': '11st', 'SSG': 'ssg', '마켓컬리': 'kurly', '컬리': 'kurly', '롯데ON': 'lotteon', '배민': 'baemin', '메가마트': 'megamart', '오늘의집': 'ohou', '다나와': 'danawa', '에누리': 'enuri' };
  const logo = (m, sz = 18) => { const k = LOGO[m] || LOGO[platOf(m)]; return k ? `<img class="lg-i" src="logos/${k}.png" width="${sz}" height="${sz}" alt="${esc(m)}">` : `<span class="lg-i lg-t" style="width:${sz}px;height:${sz}px;background:${MC[m] || '#77777F'}">${esc(String(m || '?').slice(0, 1))}</span>`; };
  const mallName = m => m === '네이버페이' ? '네이버' : platOf(m);
  const mallChip = m => `<span class="mall" style="--c:${MC[m] || '#77777F'}">${logo(m, 14)}${esc(mallName(m))}</span>`;
  function ring(it, sz = 58) {
    const r = sz / 2 - 5, C = 2 * Math.PI * r, f = it.type === '시즌' ? 1 - Math.max(0, it.daysLeft) / 365 : 1 - it.daysLeft / (it.avgGap || 1);
    const p = Math.max(0.03, Math.min(1, f)), col = it.type !== '시즌' && it.daysLeft < -Math.max(3 * (it.avgGap || 30), 90) ? '#B5B5BC' : it.daysLeft < 0 ? '#FF5A36' : it.daysLeft <= 14 ? '#FF9F43' : '#1F9D63';
    const rest = it.daysLeft < 0 && it.type !== '시즌' && -it.daysLeft > Math.max(3 * (it.avgGap || 30), 90);
    const lbl = rest ? '쉼' : it.daysLeft < 0 ? `+${-it.daysLeft > 999 ? '999' : -it.daysLeft}` : it.daysLeft === 0 ? '오늘' : `D-${it.daysLeft > 999 ? '999' : it.daysLeft}`;
    const fs = sz / (lbl.length <= 2 ? 3.4 : lbl.length <= 3 ? 3.9 : lbl.length <= 4 ? 4.6 : 5.4);
    return `<svg class="ring" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="#EEECE7" stroke-width="6"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 ${sz / 2} ${sz / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${fs.toFixed(1)}" font-weight="800" fill="${col}">${lbl}</text></svg>`;
  }
  function timeline(it) {
    const all = [...it.dates, it.nextDate], d0 = new Date(all[0]), d1 = new Date(all[all.length - 1]), W = 640, x = d => 20 + (W - 40) * (new Date(d) - d0) / ((d1 - d0) || 1);
    return `<svg class="tline" viewBox="0 0 ${W} 64"><line x1="20" x2="${W - 20}" y1="28" y2="28" stroke="#E6E4DF" stroke-width="2"/>${it.dates.map((d, i, a) => `<circle cx="${x(d)}" cy="28" r="${a.length > 20 ? 4 : 7}" fill="#16161A" opacity="${a.length > 20 ? .75 : 1}"/>${a.length <= 8 || i === 0 || i === a.length - 1 ? `<text x="${x(d)}" y="56" font-size="11" text-anchor="${a.length > 8 ? (i ? 'end' : 'start') : 'middle'}" fill="#77777F">${d.slice(2, 7).replace('-', '.')}</text>` : ''}`).join('')}<circle cx="${x(it.nextDate)}" cy="28" r="8" fill="#fff" stroke="#FF5A36" stroke-width="2.5" stroke-dasharray="3 2"/><text x="${x(it.nextDate)}" y="14" font-size="11" font-weight="700" text-anchor="middle" fill="#FF5A36">다음</text></svg>`;
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
    $('[data-tab=prod]').style.display = $('[data-tab=items]').style.display = $('[data-tab=dash]').style.display = has ? '' : 'none';
    if (!has && cur !== 'home') go('home');
    $('#mode').innerHTML = demo ? '<b>데모</b> <button class="link" id="exitDemo">끄기</button>' : store.orders.length ? `주문 ${store.orders.length}건` : '';
    if ($('#exitDemo')) $('#exitDemo').onclick = () => { demo = false; render(); if (!store.orders.length) go('home'); };
    $('#today').textContent = md(d.today) + ' 기준';
    const due = items.filter(i => i.type !== '시즌' && i.daysLeft <= 14 && -i.daysLeft <= Math.max(3 * (i.avgGap || 30), 90)), season = items.filter(i => i.type === '시즌');
    $('#headline').textContent = due.length ? `살 때 된 물건 ${due.length}개` : '지금 살 건 없어요';
    const saved = items.reduce((a, it) => { const pv = priceVerdict(it, d); return pv && pv.paid ? a + Math.max(0, pv.paid - pv.min) : a; }, 0);
    $('#stats').innerHTML = [[items.length, '재구매 품목'], [fmt(saved), '아낄 수 있는 돈']].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
    $('#due').innerHTML = due.map(i => card(i, d)).join('') ;
    $('#season').innerHTML = season.map(i => card(i, d)).join(''); $('#seasonH').style.display = season.length ? '' : 'none';
    const q = $('#q').value.trim();
    const all = LetsBuy.analyze(d.orders, d.today, d.aliases, { all: true });
    const rows = all.filter(i => (filter === 'all' || (filter === '재구매' ? i.count >= 2 : filter === '1회' ? i.count === 1 : i.type.startsWith(filter))) && (!q || i.name.includes(q)) && (!catF || LetsBuyInsights.categorize(i.name, store.cats[i.key]).main === catF))
      .sort((x, y) => (y.count >= 2) - (x.count >= 2) || (x.count >= 2 ? x.daysLeft - y.daysLeft : (x.last < y.last ? 1 : -1)));
    $$('#filter button').forEach(b => { const f = b.dataset.f, n = f === 'all' ? all.length : f === '재구매' ? all.filter(i => i.count >= 2).length : f === '1회' ? all.filter(i => i.count === 1).length : all.filter(i => i.type.startsWith(f)).length; b.innerHTML = `<span>${b.dataset.l}</span><i class="n">${n.toLocaleString()}</i>`; });
    $('#summary').innerHTML = photoBar() + summary(d.orders) + (catF ? `<button class="catf" id="catf">${esc(catF)} ×</button>` : ''); bindPhoto($('#summary'));
    if (cur === 'dash' && window.renderDash) window.renderDash();
    if (cur === 'prod' && window.renderProd) window.renderProd();
    if ($('#itemsRange')) $('#itemsRange').innerHTML = pastTag(d.orders); if ($('#dashRange')) $('#dashRange').innerHTML = pastTag(d.orders);
    if (cur === 'items') renderList(rows);
    if ($('#failBtn')) $('#failBtn').onclick = () => { if (!extInfo) { toast('확장이 연결되어 있어야 해요'); return; } sampleMode = 'fail'; window.postMessage({ app: 'letsbuy-web', type: 'mails' }, location.origin); };
    if ($('#catf')) $('#catf').onclick = () => { catF = null; render(); };
    $$('#recs [data-k],#items [data-k]').forEach(el => el.onclick = () => { const it = all.find(i => i.key === el.dataset.k); if (it) open(it, d); });
  }

  // 구매 기록: 분류별 묶음, 묶음마다 5개 + 더보기(20개씩). 보이는 것만 그림
  let more = {};
  const dormant = i => i.count >= 2 && i.type !== '시즌' && -i.daysLeft > Math.max(3 * (i.avgGap || 30), 90);
  const ym2 = d => d ? d.slice(2, 7).replace('-', '.') : '';
  function status(i) {
    if (i.count >= 2 && !dormant(i)) return ring(i, 44);
    if (dormant(i)) return `<span class="st dim"><small>마지막</small>${ym2(i.last)}</span>`;
    return `<span class="st once"><small>${ym2(i.last)}</small>${i.prices.length ? fmt(i.prices[0].price) : ''}</span>`;
  }
  const row = i => `<div class="lrow" data-k="${esc(i.key)}">${thumb(i, 44)}<div class="lmain"><b>${esc(i.name)}</b><div class="chips">${i.malls.slice(0, 2).map(mallChip).join('')}<span class="cnt">${i.count >= 2 ? `<b>${i.count}회</b> · ${i.avgGap}일마다` : '1회'}</span></div></div>${status(i)}</div>`;
  const ymd = d => d ? d.slice(0, 7).replace('-', '.') : '?';
  const pastTag = orders => { const ds = orders.map(o => o.date).filter(Boolean).sort(); return ds.length ? `<span class="tg past">${svg('mail', 13)}내 기록 · ${ymd(ds[0])} – ${ymd(ds[ds.length - 1])}</span>` : ''; };
  const ago = () => { let t = store.pricedTs ? Date.parse(store.pricedTs) : 0; if (!t) { const all = Object.values(raw().prices || {}).flat().map(p => p.date).sort(); const l = all[all.length - 1]; if (l) t = Date.parse(l + 'T09:00:00+09:00'); } if (!t) return null; const h = Math.max(0, Math.round((Date.now() - t) / 36e5)); return h < 1 ? '방금' : h < 24 ? h + '시간 전' : Math.round(h / 24) + '일 전'; };
  const liveTag = () => { const a = ago(); return `<span class="tg live"><i></i>실시간${a ? ' · ' + a + ' 업데이트' : ' · 모으는 중'}</span>`; };
  function renderList(rows) {
    const g = {}; rows.forEach(i => { const c = LetsBuyInsights.categorize(i.name, store.cats[i.key]).main || '기타'; (g[c] = g[c] || []).push(i); });
    const cats = Object.entries(g).sort((a, b) => (a[0] === '기타') - (b[0] === '기타') || b[1].length - a[1].length);
    const ic = c => `<span class="gic" style="color:${(LetsBuyInsights.COLORS || {})[c] || '#77777F'}">${svg(CI2[c] || 'package', 22)}</span>`;
    $('#list').innerHTML = cats.length ? `<div class="grail">${cats.map(([c, l]) => `<a href="#g-${esc(c)}" class="gch" data-g="${esc(c)}">${esc(c)}<i class="n">${l.length}</i></a>`).join('')}</div>` + cats.map(([c, l]) => { const n = more[c] || 5; return `<section class="grp" id="g-${esc(c)}"><header>${ic(c)}<h3>${esc(c)}</h3><i class="n">${l.length}</i></header><div class="glist">${l.slice(0, n).map(row).join('')}</div>${l.length > n ? `<button class="gmore" data-more="${esc(c)}">더보기 <i class="n">${Math.min(20, l.length - n)}</i></button>` : ''}</section>`; }).join('') : '<div class="empty">없어요</div>';
    $$('#list [data-more]').forEach(b => b.onclick = () => { more[b.dataset.more] = (more[b.dataset.more] || 5) + 20; render(); });
    $$('#list .gch').forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById('g-' + a.dataset.g).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
  // 수집 요약: 확인한 메일 수, 기간, 쇼핑몰별 주문, 못 읽은 메일
  function summary(orders) {
    if (demo || !orders.length) return '';
    const s = store.stats || {}, ms = store.mailStats, ds = orders.map(o => o.date).filter(Boolean).sort(), pm = {};
    orders.forEach(o => { const k = platOf(o.mall) || '기타'; pm[k] = (pm[k] || 0) + 1; });
    const pl = Object.entries(pm).sort((a, b) => b[1] - a[1]), tot = orders.length, top = pl.slice(0, 6), rest = pl.slice(6).reduce((a, x) => a + x[1], 0);
    const bar = pl.map(([m, n]) => `<i style="flex:${n};background:${MC[m] || MC[Object.keys(LOGO).find(k => platOf(k) === m)] || '#C9C7C0'}" title="${esc(m)} ${n}"></i>`).join('');
    const leg = top.map(([m, n]) => `<span class="lgd">${logo(m, 18)}<b>${esc(m)}</b><em>${Math.round(n / tot * 100)}%</em></span>`).join('') + (rest ? `<span class="lgd more">외 ${pl.length - 6}곳 <em>${Math.round(rest / tot * 100)}%</em></span>` : '');
    const read = ms ? ms.parsed : s.parsed || 0, need = ms ? ms.ordersMail : (s.parsed || 0) + (s.noItems || 0), fail = ms ? ms.fail : s.noItems || 0, notice = ms ? ms.notice : s.notice || 0, rate = need ? Math.round(read / need * 100) : 0;
    const K = ms ? ms.kinds : s.kinds || {}, KL = [['cancel', '취소'], ['return', '반품·교환'], ['shipping', '발송 알림'], ['delivered', '배송완료 알림'], ['review', '리뷰 요청'], ['ad', '광고'], ['account', '계정 안내'], ['other', '기타']];
    const fm = ms ? ms.failMall : s.failMall || {}, fails = Object.entries(fm).sort((a, b) => b[1] - a[1]);
    const ym = d => d ? d.slice(0, 7).replace('-', '.') : '?';
    return `<div class="sum2">
      <div class="s2hero"><span class="tg past">내 기록 · ${ym(ds[0])} – ${ym(ds[ds.length - 1])}</span><b>${tot.toLocaleString()}<small>건</small></b><span class="s2l">메일에서 찾은 구매</span></div>
      <div class="s2kpis">
        <div><b>${(s.scanned || (ms && ms.mails) || 0).toLocaleString()}</b><span>확인한 메일</span></div>
        <div><b>${rate}<small>%</small></b><span>주문 메일 해석 ${read.toLocaleString()}/${need.toLocaleString()}</span></div>
        <div class="${fail ? 'warn' : ''}"><b>${fail.toLocaleString()}</b><span>못 읽은 주문 메일</span></div>
      </div>
      <div class="s2plat"><div class="sbar">${bar}</div><div class="lgds">${leg}</div></div>
      <details class="s2more"><summary>메일 종류 · 못 읽은 메일 자세히</summary>
        <p class="s2note">배송 알림 ${notice.toLocaleString()}통은 같은 주문을 주문 메일에서 이미 세서 실패로 치지 않아요. 취소·반품은 지출에서 뺐어요.</p>
        <div class="kinds">${KL.filter(([k]) => K[k]).map(([k, l]) => `<span class="kd ${k}">${l} <b>${K[k].toLocaleString()}</b></span>`).join('')}</div>
        ${fails.length ? `<div class="sumfail"><span>${fails.map(([m, n]) => `${esc(m)} ${n}`).join(' · ')}</span><button class="btn sm" id="failBtn">${svg('download', 15)} 가려서 내려받기</button></div>` : ''}
      </details></div>`;
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
  // 구매할 때마다 낸 가격 + 단위가격
  function buys(it, d) {
    const ns = new Set(it.names || [it.name]), l = LetsBuy.dedupe(d.orders).filter(o => ns.has(o.name) || (d.aliases[o.name] && d.aliases[o.name] === it.key)).sort((a, b) => a.date < b.date ? 1 : -1);
    if (!l.length) return '';
    return `<h3>살 때마다 낸 돈</h3><div class="buys">${l.slice(0, 30).map(o => { const u = o.price && LetsBuyInsights.unitPrice(o.name, o.price, o.qty); return `<div class="by"><span>${o.date.slice(2).replace(/-/g, '.')}</span>${mallChip(o.mall)}<b>${o.price ? fmt(o.price) : '—'}</b><small>${o.qty > 1 ? o.qty + '개 · ' : ''}${u ? u.label + ' ' + fmt(Math.round(u.value)) : ''}</small></div>`; }).join('')}</div>`;
  }
  function open(it, d) {
    const pv = priceVerdict(it, d), q = encodeURIComponent(it.name.split(' ').slice(0, 4).join(' '));
    $('#sheetBody').innerHTML = `<button class="x" id="x">×</button><div class="shead">${thumb(it, 88)}<div><div class="chips">${it.malls.map(mallChip).join('')}</div><h2>${esc(it.name)}</h2></div>${ring(it, 72)}</div>
      ${timeline(it)}
      ${pv ? chart(pv.series, pv.paid) + `<p class="meta">지금 ${fmt(pv.now)} · 기간 최저 ${fmt(pv.min)} · 평균 ${fmt(pv.avg)} → <b>${pv.v}</b></p>` : '<p class="meta">가격은 매일 자동으로 쌓여요</p>'}
      <h3>다른 곳 가격</h3><div class="links"><a target="_blank" rel="noopener" href="https://search.danawa.com/dsearch.php?query=${q}">다나와에서 보기</a><a target="_blank" rel="noopener" href="https://fallcent.com/search?keyword=${q}">폴센트에서 보기</a><a target="_blank" rel="noopener" href="https://search.shopping.naver.com/search/all?query=${q}">네이버쇼핑</a><a target="_blank" rel="noopener" href="https://www.enuri.com/search.jsp?keyword=${q}">에누리</a><a target="_blank" rel="noopener" href="https://www.coupang.com/np/search?q=${q}">쿠팡</a><a target="_blank" rel="noopener" href="https://www.gmarket.co.kr/n/search?keyword=${q}">G마켓</a><a target="_blank" rel="noopener" href="https://search.11st.co.kr/Search.tmall?kwd=${q}">11번가</a></div>
      ${buys(it, d)}
      ${demo ? '' : `<h3>분류</h3><div class="row"><select id="catSel">${LetsBuyInsights.DICT.map(x => x[0] + '/' + x[1]).filter((v, i, a) => a.indexOf(v) === i).concat(['기타/기타']).map(v => `<option ${v === (store.cats[it.key] || (c => c.main + '/' + c.sub)(LetsBuyInsights.categorize(it.name))) ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn ghost" id="saveCat">바꾸기</button></div>`}
      ${demo ? '' : `<h3>이름 정리</h3><div class="row"><input id="alias" value="${esc(it.name)}" placeholder="이 품목의 대표 이름"><button class="btn ghost" id="saveAlias">저장</button></div>
      <div class="tl">${it.names.map(n => `<span>${esc(n)}</span>`).join('')}</div>`}`;
    if ($('#saveAlias')) $('#saveAlias').onclick = () => { const v = $('#alias').value.trim(); if (!v) return; it.names.forEach(n => store.aliases[n] = v); save(); $('#sheet').classList.remove('on'); render(); toast('저장했어요'); };
    if ($('#saveCat')) $('#saveCat').onclick = () => { store.cats[it.key] = $('#catSel').value; save(); $('#sheet').classList.remove('on'); render(); toast('분류를 바꿨어요'); };
    $('#sheet').classList.add('on'); $('#x').onclick = () => $('#sheet').classList.remove('on');
  }
  $('#sheet').onclick = e => { if (e.target.id === 'sheet') e.target.classList.remove('on'); };
  let cur = 'home';
  // 로컬 AI: 확장을 거쳐 부름(웹페이지에서 직접 부르면 Ollama가 403으로 막음). 확장이 없으면 직접 시도
  let oid = 0; const owait = {};
  window.addEventListener('message', e => { if (e.source === window && e.data && e.data.app === 'letsbuy-ext' && e.data.type === 'ollama' && owait[e.data.id]) { owait[e.data.id](e.data); delete owait[e.data.id]; } });
  // v0.14.1: Ollama는 조용히 확인만. 응답하고 모델이 있을 때만 AI 기능을 드러냄 (없으면 아무것도 안 보임)
  let aiOK = false;
  async function probeAI() { if (!extInfo || aiOK) return; const r = await ollama('', '', 'ping'); const ok = !!(r && r.ok && r.models && r.models.length); if (ok !== aiOK) { aiOK = ok; const b = document.getElementById('aiBox'); if (b) b.hidden = !ok; if (cur === 'dash' && window.renderDash) window.renderDash(); } }
  async function ollama(prompt, model, op) {
    if (extInfo) return new Promise(res => { const id = ++oid; owait[id] = res; window.postMessage({ app: 'letsbuy-web', type: 'ollama', id, op, model, prompt }, location.origin); setTimeout(() => { if (owait[id]) { delete owait[id]; res({ ok: false, why: 'old' }); } }, op === 'ping' ? 4000 : 180000); });
    try { const r = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', body: JSON.stringify({ model: model || 'qwen2.5:3b', stream: false, format: 'json', messages: [{ role: 'user', content: prompt }] }) }); if (!r.ok) return { ok: false, why: r.status === 403 ? 'origin' : 'http' + r.status }; return { ok: true, content: (await r.json()).message.content }; } catch { return { ok: false, why: 'noext' }; }
  }
  const OLLAMA_HELP = { down: 'Ollama가 꺼져 있어요 · 설치 후 실행해 주세요', nomodel: '모델이 없어요 · 터미널에서 ollama pull qwen2.5:3b', origin: 'Ollama가 요청을 막았어요 · 확장 v0.11로 업데이트해 주세요', noext: '확장 v0.11을 설치하면 설정 없이 돼요', old: '확장을 v0.11로 업데이트해 주세요', ext: '확장을 다시 불러와 주세요' };
  const refreshAll = () => { render(); if (window.renderProd) window.renderProd(); if (cur === 'dash' && window.renderDash) window.renderDash(); };
  // 공유 캐시: 사진 없는 제품만, 제품 키 해시로 한 번에 물어봄 (이름 해시 외엔 아무것도 보내지 않음)
  async function sharedFill() {
    if (!window.crypto || !crypto.subtle) return;
    const items = LetsBuy.analyze(raw().orders, raw().today, raw().aliases, { all: true }).filter(it => !THUMB[it.key] && !sharedAsked.has(it.key));
    if (!items.length) return; items.forEach(it => sharedAsked.add(it.key));
    const hs = await Promise.all(items.map(it => LetsBuy.thumbHash(it.key))); let n = 0;
    for (let i = 0; i < hs.length; i += 200) {
      try { const r = await (await fetch(LetsBuy.THUMBS + '/has?h=' + hs.slice(i, i + 200).join(','))).json(); const have = new Set(r.have || []); items.slice(i, i + 200).forEach((it, j) => { if (have.has(hs[i + j])) { THUMB[it.key] = LetsBuy.THUMBS + '/t/' + hs[i + j] + '.webp'; n++; } }); } catch {}
    }
    if (n) refreshAll();
  }
  function photoBar() {
    if (demo || !store.orders.length) return '';
    const items = LetsBuy.analyze(raw().orders, raw().today, raw().aliases, { all: true }), have = items.filter(imgOf).length, pc = items.length ? Math.round(have / items.length * 100) : 0, p = thumbProg;
    const run = p && p.running;
    return `<div class="phbar"><span class="phl">${svg('image', 16)} 사진 <b>${have}/${items.length}</b></span><span class="phm"><i style="width:${run ? Math.round(p.done / (p.total || 1) * 100) : pc}%"></i></span>${run ? `<small>찾는 중 ${p.done}/${p.total}</small>` : `<button class="btn sm" id="fillImg">사진 채우기</button>`}</div>`;
  }
  function bindPhoto(el) { const b = el && el.querySelector('#fillImg'); if (b) b.onclick = () => { if (!extInfo) { toast('확장(v0.12)이 연결되어 있어야 해요'); return; } thumbProg = { running: true, done: 0, total: 1 }; refreshAll(); window.postMessage({ app: 'letsbuy-web', type: 'fillImages', force: true }, location.origin); }; }
  window.LB_UI = { aiOK: () => aiOK, refreshAll: () => refreshAll(), pastTag, liveTag, photoBar, bindPhoto, imgOf, sharedFill, toast: t => toast(t), saveStore: () => save(), fmt, svg, thumb, esc, mallChip, data, raw, logo, platOf, mallName, ollama, OLLAMA_HELP, store: () => store, isDemo: () => demo,
    plat: () => plat, setPlat: p => { plat = plat === p ? null : p; render(); if (window.renderProd) window.renderProd(); if (cur === 'dash' && window.renderDash) window.renderDash(); },
    go: t => go(t), rerender: () => render(),
    openKey: k => { const d = data(), it = LetsBuy.analyze(d.orders, d.today, d.aliases, { all: true }).find(i => i.key === k); if (it) open(it, d); },
    filterCat: c => { catF = c; filter = 'all'; $$('#filter button').forEach(b => b.classList.toggle('on', b.dataset.f === 'all')); go('items'); render(); } };
  function go(t) { cur = t; if (t === 'items') setTimeout(render); if (t === 'dash' && window.renderDash) setTimeout(window.renderDash); if (t === 'prod' && window.renderProd) setTimeout(window.renderProd); $$('#tabs button,.tab').forEach(e => e.classList.remove('on')); const tb = $('[data-tab=' + t + ']'); if (tb) tb.classList.add('on'); else $('[data-tab=prod]').classList.add('on'); $('#' + t).classList.add('on'); if (location.hash !== '#' + t) history.replaceState(null, '', '#' + t); scrollTo(0, 0); }
  addEventListener('load', () => setTimeout(() => scrollTo(0, 0), 0)); // 주소의 #prod 같은 앵커로 저절로 내려가는 것 막기
  $$('#tabs button').forEach(b => b.onclick = () => go(b.dataset.tab));
  $('.brand').onclick = e => { e.preventDefault(); go('home'); };
  $$('#filter button').forEach(b => b.onclick = () => { $$('#filter button').forEach(e => e.classList.remove('on')); b.classList.add('on'); filter = b.dataset.f; render(); });
  $('#q').oninput = render;
  function merge(orders, prices, fromExt) {
    if (fromExt) store.orders = store.orders.filter(o => o.source === 'paste');
    orders = LetsBuy.dedupe(orders || []);
    const seen = new Set(store.orders.map(o => o.date + o.name));
    for (const o of orders || []) if (!seen.has(o.date + o.name)) { store.orders.push(o); seen.add(o.date + o.name); }
    for (const [k, v] of Object.entries(prices || {})) { const id = p => p.date + '|' + (p.src || p.mall); const m = new Map((store.prices[k] || []).map(p => [id(p), p])); v.forEach(p => m.set(id(p), p)); store.prices[k] = [...m.values()].sort((a, b) => a.date < b.date ? -1 : 1); }
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
  $('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 1)], { type: 'application/json' })); a.download = 'letsbuy-backup.json'; a.click(); toast("백업 저장 (썸네일은 서버 캐시에서 채워짐)"); };
  $('#reset').onclick = () => { if (confirm('모두 지울까요?')) { store = { orders: [], prices: {}, aliases: {}, onboarded: true }; save(); demo = false; render(); } };
  $$('[data-i]').forEach(e => e.innerHTML = svg(e.dataset.i, e.classList.contains('sic') ? 26 : 18));
  $('#mallRow').innerHTML = ['쿠팡', '네이버페이', 'G마켓', '옥션', '11번가', 'SSG', '마켓컬리', '롯데ON', '오늘의집', '메가마트', '배민'].map(m => `<span class="mtile">${logo(m, 28)}${esc(mallName(m))}</span>`).join('') + '<span class="mtile more">+ Gmail · 네이버 메일</span>';
  { const sd = { ...LETSBUY_SAMPLE, aliases: {} }; $('#mockCards').innerHTML = LetsBuy.analyze(sd.orders, sd.today, {}).slice(0, 3).map(i => card(i, sd)).join(''); }
  go(store.orders.length && location.hash !== '#home' ? (['prod', 'items', 'dash'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'prod') : 'home');
  $('#demo').onclick = () => { demo = true; render(); go('prod'); };
  // 확장 연결 (확장의 content script가 이 페이지에 메시지를 보내줌)
  let extInfo = null, extLog = [];
  window.addEventListener('message', e => {
    if (e.source !== window || e.origin !== location.origin || !e.data || e.data.app !== 'letsbuy-ext') return;
    if (e.data.type === 'diag') extLog = e.data.diag;
    if (e.data.type === 'hello') { extInfo = { version: e.data.version }; setTimeout(probeAI, 300); $('#extState').textContent = '확장 연결됨'; $('#extState').classList.add('on'); window.postMessage({ app: 'letsbuy-web', type: 'pull' }, '*'); }
    if (e.data.type === 'thumbProg') { thumbProg = e.data.prog; const el = document.querySelector('.phbar'); if (el) el.outerHTML = photoBar(); bindPhoto(document); }
    if (e.data.type === 'data') { if (e.data.mailStats) store.mailStats = e.data.mailStats; if (e.data.pricedTs) store.pricedTs = e.data.pricedTs; THUMB = {}; for (const [k, v] of Object.entries(e.data.thumbs || {})) THUMB[k] = v.d || v.u; if (e.data.thumbProg) thumbProg = e.data.thumbProg; if (e.data.stats) { store.stats = e.data.stats; store.mailCount = e.data.mailCount; } merge(e.data.orders, e.data.prices, true); $('#extState').textContent = `확장 v${e.data.version} · 주문 ${e.data.orders.length}건${e.data.pricedAt ? ' · 가격 ' + e.data.pricedAt : ''}`; }
    if (e.data.type === 'data') setTimeout(sharedFill, 300);
  });
  setTimeout(sharedFill, 1200);
  $('#pullExt').onclick = () => window.postMessage({ app: 'letsbuy-web', type: 'pull' }, '*');
  setTimeout(() => { if (!$('#extState').classList.contains('on')) $('#extState').textContent = '확장 없음'; }, 1500);
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2400); }

  // 선택: 로컬 AI(Ollama)로 상품명 정리. 내 컴퓨터 안에서만 실행
  $('#aiRun').onclick = async () => {
    const model = $('#aiModel').value.trim() || 'qwen2.5:3b', names = [...new Set(store.orders.map(o => o.name))];
    if (!names.length) return toast('주문이 없어요');
    $('#aiMsg').textContent = '정리 중…';
    try {
      const rr = await ollama('다음은 한국 쇼핑몰 상품명 목록이다. 같은 물건(브랜드·제품이 같고 용량·개수·홍보문구만 다른 것)끼리 묶어 짧은 대표 이름을 정해라. JSON {"map": {"원래 상품명": "대표 이름"}} 으로만 답해라.\n' + names.join('\n'), model); if (!rr.ok) { $('#aiMsg').textContent = OLLAMA_HELP[rr.why] || 'Ollama 연결 안 됨'; return; }
      const j = JSON.parse(rr.content), map = j.map || j;
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
  let sampleMode = 'all';
  function exportFails(mails) {
    const out = {}; let n = 0;
    for (const m of mails) {
      if (n >= 300) break;
      const kind = m.kind || LetsBuy.mailKind(m.subject, ''), mall = LetsBuy.detectMall(m.subject + ' ' + String(m.html || '').replace(/<[^>]+>/g, ' ').slice(0, 3000), m.from);
      if (mall === '기타' || !LetsBuy.FAILS.has(kind) || LetsBuy.parseMail(m).length) continue;
      (out[mall] = out[mall] || []).push({ kind, subject: mask(m.subject), from: String(m.from || '').replace(/"?[가-힣]{2,4}"?\s*</, '<').replace(/[\w.+-]+@/, '***@'), date: m.date, html: mask(m.html) }); n++;
    }
    if (!n) { toast('못 읽은 주문 메일이 없어요'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ at: new Date().toISOString(), type: 'unparsed', count: n, malls: out }, null, 1)], { type: 'application/json' }));
    a.download = 'letsbuy-unparsed-mails.json'; a.click(); toast(`못 읽은 메일 ${n}통 저장 · 개인정보는 가렸어요`);
  }
  function exportSamples(mails) {
    if (sampleMode === 'fail') { sampleMode = 'all'; return exportFails(mails); }
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

  // ===== Google Drive 동기화 (옵트인) =====
  const GDRIVE_CLIENT_ID = "154827314076-66t4aaahcmpvmaua8qgnoobn2sd9a4j8.apps.googleusercontent.com";
  let gToken = null;
  async function gdriveAuth() {
    return new Promise((resolve, reject) => {
      if (!window.google) return reject(new Error("Google 스크립트 로딩 중"));
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GDRIVE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (resp) => resp.error ? reject(resp) : resolve(resp.access_token)
      });
      client.requestAccessToken();
    });
  }
  async function gdriveFindOrCreate(token, name = "letsbuy-backup.json") {
    const q = encodeURIComponent(`name='${name}' and trashed=false`);
    const list = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (list.files && list.files[0]) return list.files[0].id;
    const meta = { name, mimeType: "application/json" };
    const create = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(meta)
    }).then(r => r.json());
    return create.id;
  }
  async function gdriveSave() {
    try {
      toast("구글 로그인 중...");
      gToken = await gdriveAuth();
      const id = await gdriveFindOrCreate(gToken);
      const body = JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 1);
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
        method: "PATCH", headers: { Authorization: `Bearer ${gToken}`, "Content-Type": "application/json" }, body
      });
      $("#gdriveStatus").textContent = "구글 드라이브에 저장됨 · " + new Date().toLocaleString("ko-KR");
      toast("구글 드라이브에 저장했어요");
    } catch (e) { console.error(e); toast("구글 드라이브 저장 실패"); }
  }
  async function gdriveLoad() {
    try {
      toast("구글 로그인 중...");
      gToken = await gdriveAuth();
      const id = await gdriveFindOrCreate(gToken);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${gToken}` } });
      if (!res.ok) throw new Error("파일 없음");
      const j = await res.json();
      if (confirm(`드라이브 데이터(${j.orders?.length || 0}건)로 현재 데이터를 덮어쓸까요?\n취소하면 병합합니다.`)) {
        store = Object.assign(store, j); save(); render();
        toast("드라이브 데이터로 복원했어요");
      } else {
        merge(j.orders || [], j.prices || {});
        toast("드라이브 데이터를 병합했어요");
      }
      $("#gdriveStatus").textContent = "드라이브에서 불러옴 · " + new Date().toLocaleString("ko-KR");
    } catch (e) { console.error(e); toast("구글 드라이브에서 불러오기 실패"); }
  }
  if ($("#gdriveSave")) $("#gdriveSave").onclick = gdriveSave;
  if ($("#gdriveLoad")) $("#gdriveLoad").onclick = gdriveLoad;
