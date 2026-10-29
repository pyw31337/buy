// 실제 쇼핑몰 주문 메일 5종(개인정보 가림) — 상품명·가격·수량·날짜·이미지 정확히 확인
const c = require('../docs/core.js'), fs = require('fs'), meta = require('./real/meta.json'); let fail = 0;
const CASES = {
  coupang: { date: '2026-10-26', mall: '쿠팡', items: [['스낵 16종 봉지과자 세트(포카칩+꼬북칩+썬칩+죠리퐁+카라멜콘땅콩+콘칲+오감자+꼬깔콘+치토스+신짱+꿀꽈배기+감자깡+자갈치+고구마깡)', 19900, 1], ['[안녕골목마켓] 안녕종합스낵(곽과자) 3번세트 쵸코파이12입+몽쉘생크림+몽쉘카카오+카스타드+후레쉬베리, 곽과자 5종', 20800, 1]] },
  gmarket: { date: '2026-10-05', mall: 'G마켓', items: [['신라면10입 +안성탕면5입 +너구리5입 (총 20봉)', null, 1]] },
  '11st': { date: '2026-07-14', mall: '11번가', items: [['호주산 냉장 소 찜갈비 2.0kg', 84660, 2]], img: /cdn\.011st\.com\/11dims\/resize\/80\/11src\/product\/6677562781\/B\.webp/ },
  megamart: { date: '2026-10-27', mall: '메가마트', items: [['돼지 냉장 삼겹살', 31580, 20]], img: /static\.megamart\.com\/product\/image\/1375\/13757212\/13757212_1_960\.jpg/ },
  baemin: { date: '2026-10-18', mall: '배민', items: [['알배기(봉)', 3580, 1], ['파머스픽 팽이버섯(봉)', 1480, 1], ['남양 이오 기획팩 80ml*10', 3480, 1], ['풀무원 소가 찌개두부 300g', 1600, 1], ['서울우유 비요뜨 초코링 138g*2', 2480, 1], ['5K프라이스 맛있는 콩나물 400g', 980, 1], ['극조생감귤 3kg/기획', 16900, 1], ['애호박(개)', 1480, 1], ['(A)못난이 한입감자(2kg/봉)', 5980, 1], ['한입 우유빵 200g', 5480, 1]] },
  naverpay: { date: '2026-10-15', mall: '네이버페이', no: '2026101595102361', items: [['헥사 CL6 접이식 캠핑 랜턴 테이블 무드 조명 LED', 76000, 1]], img: /phinf\/shop1\/20260118_201\/.*2090008000\.png/ },
  auction: { date: '2026-08-31', mall: '옥션', nos: ['2569371774', '2569371773'], items: [['태능배밭 돼지왕구이 1kg+1kg/ 달큰짭쪼롬 칼집왕구이/ 인위적인 단맛없이~ 국산배를 듬뿍', 17760, 1], ['춘천양념 닭갈비 600g x 4팩/ 닭다리순살/ 밥까지 싹 비비는 듬뿍양념-', 22680, 1]] },
  ssg: { date: '2026-05-29', mall: 'SSG', no: '202605293120C7', items: [['[서울우유] 커피포리 200ml* 4입', null, 1], ['촌두부 550g', null, 1], ['5K프라이스 맛있는 콩나물 400g', null, 1], ['간편삼계탕재료 90g', null, 1], ['[하림] 토종닭 (백숙용) (1,050g)', null, 2]], img: /sitem\.ssgcdn\.com\/91\/73\/64\/item\/1000103647391_i1_80\.jpg/ },
  lotteon: { date: '2026-06-15', mall: '롯데ON', no: '2026061518190791', items: [['[남성] 아이스 리저브 롱 구스다운 자켓 YMP354', 168630, 1]], img: /LE1218412105_1308889007_M\.jpg/ },
  lotteon2: { date: '2024-08-09', mall: '롯데ON', no: '2024080916674334', items: [['김밥&유부&롤 한판세트 (1팩)', null, 1], ['마늘 치킨구이 (1팩)', null, 1], ['남해바다 새꼬막 비빔밥(대) (1팩)', null, 1], ['무항생제 무항생제 통오리 (1.6KG)', null, 1]], img: /LM2700000058282_001_M\.jpg/ },
  gmarket2: { date: '2026-09-15', mall: 'G마켓', no: '5529305604', items: [['(신선집중) 신세계푸드 직수입 허니듀멜론 대과 특대과 2개입 (3.4~4.4KG 내외) 선물세트', 22690, 1]] },
};
for (const [k, e] of Object.entries(CASES)) {
  const r = c.parseMail({ ...meta[k], date: e.date, html: fs.readFileSync(__dirname + '/real/' + k + '.html', 'utf8') });
  const got = r.map(o => [o.name, o.price, o.qty]);
  let ok = JSON.stringify(got) === JSON.stringify(e.items) && r.every(o => o.date === e.date && o.mall === e.mall);
  if (e.no && !r.every(o => o.orderNo === e.no)) ok = false;
  if (e.nos && JSON.stringify(r.map(o => o.orderNo)) !== JSON.stringify(e.nos)) ok = false;
  if (e.img && !(r[0] && e.img.test(r[0].img || ''))) ok = false;
  if (r.some(o => o.img && /logo|banner|footer/i.test(o.img))) ok = false;
  if (!ok) { fail++; console.log('FAIL', k, JSON.stringify(r.map(o => [o.name, o.price, o.qty, o.mall, o.date, o.img]))); } else console.log('PASS', k, r.length + '개');
}
console.log(fail ? fail + ' FAILED' : 'REAL ALL PASS'); process.exit(fail ? 1 : 0);
