global.LetsBuy = require('../docs/core.js'); const I = require('../docs/insights.js'), synth = require('./synth.js');
let bad = 0; const eq = (a, b, m) => { if (a !== b) { bad++; console.log('FAIL', m, a, '!==', b); } else console.log('PASS', m); };
[['남양 이오 기획팩 80ml*10', '유제품·계란'], ['오리온 초코파이 정 468g 2개', '간식·과자'], ['극조생감귤 3kg/기획', '과일'], ['돼지 삼겹살 구이용 1kg', '육류'], ['종근당 락토핏 골드 50포', null], ['코디 3겹 30m 30롤', null]].forEach(([n, s]) => { const c = I.categorize(n); s ? eq(c.sub, s, n) : eq(c.main === '기타', false, n + ' → ' + c.main); });
eq(I.categorize('아무거나', '육아/기저귀').main, '육아', 'override');
const u = I.unitPrice('촌두부 550g', 3980, 2); eq(u && u.label, '100g당', 'unit label'); eq(Math.round(u.value), 362, 'unit value');
const { orders, prices } = synth(); const A = I.insights(orders, { today: '2026-10-29', prices });
eq(A.monthly.length, 24, 'monthly 24'); eq(A.byCat.length >= 6, true, 'cats ' + A.byCat.length); eq(A.heat.length, 12, 'heat');
eq(A.yoy.pct > 0, true, 'yoy ' + A.yoy.pct); eq(A.shrink.some(c => /초코파이/.test(c.name)), true, 'shrinkflation detected'); eq(A.market.length >= 4, true, 'market ' + A.market.length);
if (bad) { console.log(bad + ' FAIL'); process.exit(1); } console.log('INSIGHTS ALL PASS');
// 메일 종류·취소 차감
const K = LetsBuy.mailKind;
[['[쿠팡] 주문 취소 완료 안내', 'cancel'], ['[쿠팡] 반품 접수 안내', 'return'], ['[쿠팡] 상품은 만족하셨나요? 리뷰를 남겨주세요', 'review'], ['(광고) 로켓와우 회원 전용 쿠폰', 'ad'], ['[쿠팡] 배송이 완료되었습니다', 'delivered'], ['[쿠팡] 정기배송 결제 안내', 'sub'], ['[쿠팡] 주문하신 상품이 발송되었습니다', 'shipping']].forEach(([s, k]) => eq(K(s, ''), k, 'kind ' + s));
const bo = [{ name: '깨끗한나라 화장지 30롤', price: 19900, mall: '쿠팡', date: '2025-03-01' }, { name: '깨끗한나라 화장지 30롤', price: 19900, mall: '쿠팡', date: '2025-03-03', status: 'cancel' }, { name: '삼다수 2L 12병', price: 6900, mall: '쿠팡', date: '2025-03-01' }];
eq(LetsBuy.dedupe(bo).length, 1, 'cancel removes purchase');
eq(I.insights(bo, { today: '2025-04-01' }).total.spend, 6900, 'cancel not in spend');
if (bad) { console.log(bad + ' FAIL'); process.exit(1); } console.log('KIND ALL PASS');
const cp = '<li class="search-product"><div class="name">코디 3겹 데코 30m 30롤</div><strong class="price-value">16,900</strong></li><li class="search-product"><div class="name">깨끗한나라 화장지 30롤</div><strong class="price-value">14,200</strong></li>';
eq((LetsBuy.bestMatch('코디 3겹 30m 30롤', LetsBuy.parseSearch('쿠팡', cp)) || {}).price, 16900, 'coupang parse+match');
eq((LetsBuy.bestMatch('삼다수 2L 12병', LetsBuy.parseSearch('네이버', '{"productTitle":"제주 삼다수 2L 12병","lowPrice":"6980"}')) || {}).price, 6980, 'naver parse+match');
eq(A.notes.length >= 5, true, 'notes ' + A.notes.length); eq(A.market.some(m => m.shrink), true, 'listing shrink');
if (bad) process.exit(1); console.log('PRICE ALL PASS');

// v0.11 내 제품: 판단 배지·플랫폼 필터·사진 대체·쇼핑 분류
{
  const assert = require('assert');
  global.LetsBuy = require('../docs/core.js'); global.LetsBuyInsights = require('../docs/insights.js');
  const P = require('../docs/products.js'), d = require('./synth11.js')('2026-10-29');
  const r = P.build({ ...d, today: '2026-10-29' });
  const ks = new Set(r.map(p => p.verdict.k));
  assert(ks.has('buy') && ks.has('soon') && ks.has('wait'), 'verdict kinds ' + [...ks]);
  assert(r[0].verdict.k === 'buy', 'buy first');
  const pig = r.find(p => p.name.startsWith('피죤')); assert(pig.img && pig.img.includes('pigeon'), 'img from listing');
  assert(pig.sources.length === 4 && pig.sources[0].price <= pig.sources[3].price, 'sources sorted');
  const c = r.find(p => p.name.startsWith('쿠')); 
  const cp = P.build({ ...d, today: '2026-10-29', orders: d.orders.filter(o => o.mall === '쿠팡'), plat: '쿠팡' });
  assert(cp.every(p => p.sources.every(s => s.src === '쿠팡')), 'platform filter');
  assert.deepStrictEqual(LetsBuyInsights.categorize('프링글스 오리지널').main, '식품');
  const A = LetsBuyInsights.insights([{ name: '이름모를 상품 Z', mall: '쿠팡', price: 1000, date: '2026-01-01' }], { today: '2026-10-29', prices: { '이름모를 상품 Z': [{ date: '2026-10-28', price: 900, src: '네이버', cat: '생활/건강>세탁세제' }] } });
  assert.strictEqual(A.items[0].cat, '생활용품', 'shop category fallback');
  console.log('products OK');
}
