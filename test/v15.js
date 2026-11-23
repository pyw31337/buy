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
assert(/const REQUIRED_EXTENSION_VERSION = '0\.\d+\.\d+'/.test(app), '웹이 필요한 확장 버전을 명시한다');
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
assert(background.includes('www.coupang.com/np/mycoupang/orderlist') && !background.includes('mc.coupang.com/ssr/desktop/mycoupang/orders/list'), '차단되는 쿠팡 SSR 대신 일반 주문목록을 연다');
assert(background.includes('resumeThumbJob') && background.includes("chrome.alarms.create('thumb-resume'"), '업데이트 뒤에도 멈춘 사진 대기열을 재개한다');
assert(background.includes('profileWithCategory') && background.includes('policyVersion: 2'), '사진·가격·알림 대상을 품목 정책에 따라 제한한다');
assert(app.includes('실물 사진') && app.includes('결제·상품권·디지털은 대상에서 제외'), '사진 대상 범위를 실제 상품으로 명시한다');
assert(app.includes("filter === '검토'") && app.includes('자동 추정'), '자동 추정 품목을 별도 검토하는 흐름을 제공한다');
const orderList = fs.readFileSync(require('path').join(__dirname, '../extension/order-list.js'), 'utf8');
assert(orderList.includes('visibleMedia') && orderList.includes("type: 'orderMedia'"), '주문목록의 실제 이미지와 링크를 수집한다');
assert(orderList.includes('!rows.length && !media.length'), '주문 텍스트 행이 없어도 실제 카드 사진 수집을 계속한다');
assert(orderList.includes('yearNodes') && orderList.includes('pagerNodes') && /MAX_VIEWS = \d+/.test(orderList), '실제 주문 화면의 연도·페이지를 순차 수집한다');
assert(app.includes('자동 재개가 멈췄어요') && app.includes('중단된 검색 이어서'), '멈춘 사진 수집을 진행 중이라고 표시하지 않고 재개 버튼을 보여준다');
const actualOrder = LetsBuy.dedupe([
  { name: '테스트 화장지 30롤', mall: '쿠팡', date: '2026-03-01', price: 18000, source: 'mail' },
  { name: '테스트 화장지 30롤', mall: '쿠팡', date: '2026-03-01', price: 18000, source: 'orderpage', img: 'https://img.example/item.webp', url: 'https://shop.example/item' }
]);
assert.strictEqual(actualOrder[0].img, 'https://img.example/item.webp');
assert.strictEqual(actualOrder[0].url, 'https://shop.example/item');

// v0.18.3: 수집 안전장치 및 분석 품질 고도화 검증
assert(LetsBuy.isProductName('[로켓배송] 삼다수 2L 6개입'), '로켓배송 상품명을 정상 품목으로 인식한다');
assert(LetsBuy.isProductName('로켓배송 삼다수 2L 6개입'), '접두사 없는 로켓배송 상품명을 정상 품목으로 인식한다');
assert(LetsBuy.isProductName('(새벽배송) 신선 대란 30구'), '새벽배송 괄호 상품명을 정상 품목으로 인식한다');
assert(LetsBuy.itemProfile('크리넥스 3겹 키친타월 6롤').recommend, '키친타월 등 확장된 생활 소모품을 재구매 후보로 판정한다');
assert(LetsBuy.itemProfile('삼육두유 검은콩 190ml 24팩').recommend, '두유/음료 소모품을 재구매 후보로 판정한다');
assert(LetsBuy.itemProfile('반려견 배변패드 100매').recommend, '반려동물 소모품을 재구매 후보로 판정한다');

assert(orderList.includes('isBlocked') && orderList.includes('findNextPagerNode'), '주문목록 순회 시 보안 차단 감지 및 안전 페이지네이션 탐색을 수행한다');
const widget = fs.readFileSync(require('path').join(__dirname, '../extension/widget.js'), 'utf8');
assert(widget.includes('moved permanently') && widget.includes('cloudfront') && widget.includes('isCoupangProd'), '위젯이 에러 화면에서 오작동하지 않고 상품 상세에서만 동작한다');

// v0.18.4: PB(자체 브랜드) 인식 및 플랫폼별 세분화/리셀러 폭리 필터링 검증
const pbGomgom = LetsBuy.detectPB('쿠팡 곰곰 신선한 우유 900ml');
assert(pbGomgom.isPB && pbGomgom.mall === '쿠팡' && pbGomgom.brand === '곰곰', '쿠팡 곰곰 PB 제품을 감지한다');
const pbTamsa = LetsBuy.detectPB('탐사 스파클링 탄산수 500ml 20개');
assert(pbTamsa.isPB && pbTamsa.mall === '쿠팡' && pbTamsa.brand === '탐사', '쿠팡 탐사 PB 제품을 감지한다');
const pbComet = LetsBuy.detectPB('코멧 아기 물티슈 100매');
assert(pbComet.isPB && pbComet.mall === '쿠팡' && pbComet.brand === '코멧', '쿠팡 코멧 PB 제품을 감지한다');
const pbKurly = LetsBuy.detectPB('[KF365] 1+등급 무항생제 대란 30구');
assert(pbKurly.isPB && pbKurly.mall === '마켓컬리' && pbKurly.brand === 'KF365', '마켓컬리 KF365 PB 제품을 감지한다');
const pbSSG = LetsBuy.detectPB('이마트 노브랜드 버터쿠키 400g');
assert(pbSSG.isPB && pbSSG.mall === 'SSG' && pbSSG.brand === '노브랜드', '이마트 노브랜드 PB 제품을 감지한다');
const nonPB = LetsBuy.detectPB('서울우유 1L');
assert(!nonPB.isPB, '일반 제조사 브랜드는 PB로 오인하지 않는다');

// 리셀러 폭리 가격 차단 검증
const gomgomItem = { name: '쿠팡 곰곰 신선한 우유 900ml', prices: [{ price: 2500, date: '2026-03-01' }] };
assert(LetsBuy.isResellerPrice({ price: 11900, src: '다나와' }, gomgomItem), '쿠팡 PB를 다나와 오픈마켓에서 폭리로 판매하는 가격을 리셀러로 차단한다');
assert(!LetsBuy.isResellerPrice({ price: 2490, src: '쿠팡' }, gomgomItem), '쿠팡 PB의 쿠팡 공식 가격은 정상 수용한다');

const pbOrders = [{ name: '쿠팡 곰곰 신선한 우유 900ml', mall: '쿠팡', date: '2026-03-01', price: 2500 }];
const pbKey = LetsBuy.analyze(pbOrders, '2026-03-05', {}, { all: true })[0].key;
const pbBuilt = Products.build({
  orders: pbOrders,
  aliases: {},
  today: '2026-03-05',
  prices: {
    [pbKey]: [
      { date: '2026-03-05', price: 12000, src: '다나와', isReseller: true, title: '곰곰 우유 11번가 리셀러' },
      { date: '2026-03-05', price: 2450, src: '쿠팡', title: '곰곰 신선한 우유 900ml' }
    ]
  }
})[0];
assert.strictEqual(pbBuilt.now.price, 2450, 'PB 상품은 다나와 11번가 리셀러 가격(12,000원)을 배제하고 쿠팡 공식 가격(2,450원)을 최저가로 채택한다');
assert.strictEqual(pbBuilt.now.src, '쿠팡', 'PB 상품의 최저가 출처가 쿠팡으로 정상 연결된다');

// v0.18.5: 다나와 기준 + 쿠팡, 네이버, G마켓, 11번가 등 다중 플랫폼 가격 수집 검증
const gmHtml = `<div class="box__item-container"><span class="text__item">삼다수 2L 6병</span><span class="text__value">5,900</span><a href="http://item.gmarket.co.kr/Item?goodscode=12345"></a></div>`;
const gmList = LetsBuy.parseSearch('G마켓', gmHtml);
assert(gmList.length > 0 && gmList[0].price === 5900 && gmList[0].mall === 'G마켓', 'G마켓 검색 결과를 올바르게 파싱한다');

const elHtml = `<li class="c_card_item"><strong class="c_card_item_title">삼다수 2L 6병</strong><span class="c_card_price_value">5,800</span><a href="https://www.11st.co.kr/products/12345"></a></li>`;
const elList = LetsBuy.parseSearch('11번가', elHtml);
assert(elList.length > 0 && elList[0].price === 5800 && elList[0].mall === '11번가', '11번가 검색 결과를 올바르게 파싱한다');

const dnwHtml = `\\"productTitle\\":\\"제주 삼다수 2L 6개\\",\\"minPrice\\":5980`;
const dnwList = LetsBuy.parseSearch('다나와', dnwHtml);
assert(dnwList.length > 0 && dnwList[0].price === 5980, '다나와 상품 검색 결과를 올바르게 파싱한다');

const samdasooOrders = [{ name: '제주 삼다수 2L 6병', mall: '쿠팡', date: '2026-03-01', price: 6000 }];
const samKey = LetsBuy.analyze(samdasooOrders, '2026-03-05', {}, { all: true })[0].key;
const samBuilt = Products.build({
  orders: samdasooOrders,
  aliases: {},
  today: '2026-03-05',
  prices: {
    [samKey]: [
      { date: '2026-03-05', price: 5900, src: '다나와', title: '다나와 최저가' },
      { date: '2026-03-05', price: 5800, src: '쿠팡', title: '쿠팡 로켓배송' },
      { date: '2026-03-05', price: 6100, src: 'G마켓', title: 'G마켓 무료배송' },
      { date: '2026-03-05', price: 6200, src: '11번가', title: '11번가 단독특가' }
    ]
  }
})[0];
assert(samBuilt.danawaRef && samBuilt.danawaRef.price === 5900, '다나와 가격을 기준가(danawaRef)로 식별한다');
assert.strictEqual(samBuilt.sources.length, 4, '다나와 기준 쿠팡, G마켓, 11번가 등 다양한 플랫폼 가격을 모두 수집/유지한다');

console.log('V15 SAFETY PASS');
