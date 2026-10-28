const c = require('../docs/core.js'), F = require('./fixtures.js'); let fail = 0;
for (const f of F) {
  const r = c.parseMail(f.mail), names = r.map(x => x.name);
  const ok = f.expect.length === names.length && f.expect.every(e => names.some(n => f.loose ? n.includes(e.replace(/^\[[^\]]*\]\s*/, '')) : n === e)) && r.every(x => x.date && x.mall === (f.expect.length ? f.mall : x.mall));
  if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', f.mall, JSON.stringify(r.map(x => [x.name, x.price, x.qty, x.mall])));
}
const OL = c.parseOrderList(`주문목록\n2025. 10. 3 주문\n배송완료\n10/4(토) 도착\n깨끗한나라 3겹 데코 화장지 30m 30롤\n19,900 원 · 1 개\n장바구니 담기\n2025. 9. 1 주문\n다우니 섬유유연제 실내건조 4L\n15,800원 1개\n구매확정`, '쿠팡');
console.log('orderlist', JSON.stringify(OL.map(x => [x.date, x.name, x.price])));
if (OL.length !== 2 || OL[0].date !== '2025-10-03') { fail++; console.log('FAIL orderlist'); }
// 묶기·분석
const S = [['2025-01-01','깨끗한나라 3겹 데코 화장지 30m 30롤'],['2025-03-05','[무료배송] 깨끗한나라 데코 두루마리 휴지 27m 30롤'],['2025-05-03','깨끗한나라 데코 화장지 30롤 1팩'],['2024-06-01','물먹는하마 제습제 10개입'],['2025-06-10','물먹는하마 옷장 습기제거제 10개입']].map(([date,name])=>({date,name,price:10000,mall:'쿠팡'}));
const a = c.analyze(S, '2025-07-01'); console.log(a.map(x => [x.name, x.count, x.type, x.avgGap]));
if (a.length !== 2 || !a.find(x => x.type === '시즌') || !a.find(x => x.type === '주기')) { fail++; console.log('FAIL analyze'); }
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
