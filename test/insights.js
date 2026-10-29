global.LetsBuy = require('../docs/core.js'); const I = require('../docs/insights.js'), synth = require('./synth.js');
let bad = 0; const eq = (a, b, m) => { if (a !== b) { bad++; console.log('FAIL', m, a, '!==', b); } else console.log('PASS', m); };
[['남양 이오 기획팩 80ml*10', '유제품·계란'], ['오리온 초코파이 정 468g 2개', '간식·과자'], ['극조생감귤 3kg/기획', '과일'], ['돼지 삼겹살 구이용 1kg', '육류'], ['종근당 락토핏 골드 50포', null], ['코디 3겹 30m 30롤', null]].forEach(([n, s]) => { const c = I.categorize(n); s ? eq(c.sub, s, n) : eq(c.main === '기타', false, n + ' → ' + c.main); });
eq(I.categorize('아무거나', '육아/기저귀').main, '육아', 'override');
const u = I.unitPrice('촌두부 550g', 3980, 2); eq(u && u.label, '100g당', 'unit label'); eq(Math.round(u.value), 362, 'unit value');
const { orders, prices } = synth(); const A = I.insights(orders, { today: '2026-10-29', prices });
eq(A.monthly.length, 24, 'monthly 24'); eq(A.byCat.length >= 6, true, 'cats ' + A.byCat.length); eq(A.heat.length, 12, 'heat');
eq(A.yoy.pct > 0, true, 'yoy ' + A.yoy.pct); eq(A.shrink.some(c => /초코파이/.test(c.name)), true, 'shrinkflation detected'); eq(A.market.length >= 4, true, 'market ' + A.market.length);
if (bad) { console.log(bad + ' FAIL'); process.exit(1); } console.log('INSIGHTS ALL PASS');
