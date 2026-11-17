const assert = require('assert');
const fs = require('fs');
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
const app = fs.readFileSync(require('path').join(__dirname, '../docs/app.js'), 'utf8');
assert(app.includes("const REQUIRED_EXTENSION_VERSION = '0.16.1'"), '웹이 필요한 확장 버전을 명시한다');
assert(app.includes('function versionAtLeast(actual, required)'), '구버전 연결을 판별한다');
assert(app.includes('확장 업데이트 필요'), '구버전의 업데이트 안내를 표시한다');
const background = fs.readFileSync(require('path').join(__dirname, '../extension/background.js'), 'utf8');
assert(background.includes("THUMB_ALARM = 'thumb-resume'"), '사진 채우기 대기열을 저장한다');
assert(background.includes('thumbSearchText'), '사진 검색 요청에 시간 제한을 둔다');
assert(background.includes('error: message'), '사진 수집 오류를 진행 상태에 남긴다');
assert(background.includes('SOURCE_FAILURE_LIMIT = 3'), '검색원 장애를 개별적으로 제한한다');
assert(background.includes('if (off[s.name] >= SOURCE_FAILURE_LIMIT) { stat.skipped++; continue; }'), '막힌 검색원을 건너뛰고 다음 검색원을 시도한다');
assert(!background.includes('if (blob || off[s.name] >= 3) break;'), '한 검색원 실패가 전체 검색을 중단하지 않는다');
assert(background.includes('openOrderPhotoPages'), '실제 주문 사진 수집 탭을 연다');
assert(background.includes('mergeOrderMedia') && background.includes('mediaMatch'), '주문 행 파서와 별개로 실제 카드 사진을 기존 구매명에 대조한다');
const orderList = fs.readFileSync(require('path').join(__dirname, '../extension/order-list.js'), 'utf8');
assert(orderList.includes('visibleMedia') && orderList.includes("type: 'orderMedia'"), '주문목록의 실제 이미지와 링크를 수집한다');
assert(orderList.includes('!rows.length && !media.length'), '주문 텍스트 행이 없어도 실제 카드 사진 수집을 계속한다');
const actualOrder = LetsBuy.dedupe([
  { name: '테스트 화장지 30롤', mall: '쿠팡', date: '2026-03-01', price: 18000, source: 'mail' },
  { name: '테스트 화장지 30롤', mall: '쿠팡', date: '2026-03-01', price: 18000, source: 'orderpage', img: 'https://img.example/item.webp', url: 'https://shop.example/item' }
]);
assert.strictEqual(actualOrder[0].img, 'https://img.example/item.webp');
assert.strictEqual(actualOrder[0].url, 'https://shop.example/item');
console.log('V15 SAFETY PASS');
