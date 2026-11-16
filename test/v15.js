const assert = require('assert');
const LetsBuy = require('../docs/core.js');

// 가격 검색 결과에는 매칭 근거를 남기고, 낮은 유사도는 강한 구매 추천을 막는다.
const high = LetsBuy.bestMatch('코디 데코 화장지 30m 30롤', [
  { title: '코디 데코 화장지 30m 30롤', price: 15900 }
]);
assert.strictEqual(high.matchLevel, 'high');
assert(high.matchScore >= .8);

global.LetsBuy = LetsBuy;
global.LetsBuyInsights = require('../docs/insights.js');
const Products = require('../docs/products.js');
const orders = [
  { name: '테스트 화장지 30롤', mall: '쿠팡', date: '2026-01-01', price: 18000 },
  { name: '테스트 화장지 30롤', mall: '쿠팡', date: '2026-02-01', price: 18000 },
  { name: '테스트 화장지 30롤', mall: '쿠팡', date: '2026-03-01', price: 18000 }
];
const key = LetsBuy.analyze(orders, '2026-03-05', {}, { all: true })[0].key;
const product = Products.build({ orders, aliases: {}, today: '2026-03-05', prices: {
  [key]: [{ date: '2026-03-05', price: 8900, src: '네이버', title: '비슷하지만 다른 구성', matchLevel: 'low' }]
} })[0];
assert.strictEqual(product.verdict.t, '상품 확인 필요');
console.log('V15 SAFETY PASS');
