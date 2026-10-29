// 실제 메일 HTML 구조(표 레이아웃 + 상품 이미지 + 긴 법적 고지 푸터)를 흉내 낸 가상 샘플
const c = require('../docs/core.js'); let fail = 0;
const FOOT = `<table><tr><td>(주)판매자</td><td>의 주문, 배송, 환불 등과 관련된 의무와 책임은 판매자에게 있습니다.</td></tr>
<tr><td>상품</td><td>의 교환/반품 안내</td></tr><tr><td>상품</td><td>의 불량 및 오배송의 사유가 있는 경우에는 상품 수령 후 3개월 이내 또는 그 사실을 알 수 있었던 날로부터 30일 이내에 요청하실 수 있습니다.</td></tr>
<tr><td>상품</td><td>의 택(TAG) 제거/라벨 및 상품 훼손으로 상품의 가치가 현저히 감소된 경우 (예: 의류/잡화/수입명품 등)</td></tr>
<tr><td>및 구성품을 분실하였거나 취급 부주의로 인한 파손/고장/오염된 경우</td></tr><tr><td>상품</td><td>의 시리얼 넘버 유출로 내장된 소프트웨어의 가치가 감소한 경우 (예: 네비게이션, CS시리얼이 적힌 PMP, 노트북, 데스크탑PC 등)</td></tr>
<tr><td>반품 배송비 5,000원</td></tr><tr><td>고객센터 1577-0000 | 사업자등록번호 120-00-00000</td></tr></table>`;
const coupang = (status, d) => ({ from: '쿠팡 <no_reply@coupang.com>', subject: `[쿠팡] ${status}`, date: d, html: `<html><head><style>td{}</style></head><body>
<img src="https://image.coupangcdn.com/static/logo_coupang.png" width="120"><h2>주문이 완료되었습니다</h2>
<table><tr><td>주문번호</td><td>31000123456789</td></tr><tr><td>주문일시</td><td>2025.03.02</td></tr></table>
<table><tr><td><img src="https://thumbnail6.coupangcdn.com/thumbnails/remote/230x230ex/image/retail/images/123.jpg" width="80"></td>
<td><a href="https://www.coupang.com/vp/products/1"><span>깨끗한나라 3겹 데코 화장지 30m 30롤</span></a><br><span>옵션: 1팩</span></td><td>1개</td><td><b>19,900</b>원</td></tr>
<tr><td><img src="https://thumbnail6.coupangcdn.com/thumbnails/remote/230x230ex/image/retail/images/456.jpg"></td><td>페리오 46cm 치약 100g 6개</td><td>수량 1</td><td>9,900원</td></tr></table>
<table><tr><td>상품금액</td><td>29,800원</td></tr><tr><td>배송비</td><td>0원</td></tr><tr><td>총 결제금액</td><td>29,800원</td></tr></table>${FOOT}</body></html>` });
const gm = { from: 'G마켓 <gmarket@gmarket.co.kr>', subject: '[G마켓] 주문/결제가 완료되었습니다.', date: '2025-09-01', html: `<div><img src="https://pics.gmarket.co.kr/mail/logo.gif"><p>고객님의 결제가 완료되었습니다.</p>
<table><tr><th>상품정보</th><th>수량</th><th>결제금액</th></tr><tr><td><img src="https://gdimg.gmarket.co.kr/1234567890/still/300"></td><td>[무료배송] 다우니 섬유유연제 실내건조 4L<br>선택: 4L x 1개</td><td>1</td><td>15,800원</td></tr></table>${FOOT}</div>` };
const np = { from: '네이버페이 <naverpay_noreply@navercorp.com>', subject: '[네이버페이] 결제가 완료되었습니다', date: '2025-06-02', html: `<table><tr><td>주문번호 2025060212345678</td></tr><tr><td><img src="https://shop-phinf.pstatic.net/20240101_1/abc.jpg?type=f140"></td><td><strong>물먹는하마 제습제 옷장용 10개입</strong><div>옵션 : 기본</div><div>12,800원 / 1개</div></td></tr>
<tr><td>스토어</td><td>생활백화점</td></tr><tr><td>총 결제금액</td><td>12,800원</td></tr></table>${FOOT}` };
const all = [coupang('주문이 완료되었습니다', '2025-03-02'), coupang('상품이 발송되었습니다', '2025-03-03'), coupang('배송이 완료되었습니다', '2025-03-04'), gm, np].flatMap(m => c.parseMail(m));
const names = all.map(o => o.name);
console.log(JSON.stringify(all.map(o => [o.name, o.price, o.qty, o.mall, (o.img || '').slice(-12)])));
const bad = names.filter(n => /의무|교환|반품|훼손|분실|시리얼|판매자|고객센터/.test(n));
if (bad.length) { fail++; console.log('FAIL boilerplate', bad); }
for (const e of ['깨끗한나라 3겹 데코 화장지 30m 30롤', '페리오 46cm 치약 100g 6개', '다우니 섬유유연제 실내건조 4L', '물먹는하마 제습제 옷장용 10개입']) if (!names.includes(e)) { fail++; console.log('FAIL missing', e); }
if (all.some(o => /logo/.test(o.img || '')) || !all.filter(o => o.img).length) { fail++; console.log('FAIL img'); }
const d = c.dedupe(all); if (d.filter(o => o.name.startsWith('깨끗한나라')).length !== 1) { fail++; console.log('FAIL dedupe', d.length); }
const a = c.analyze(all, '2025-12-01'); if (a.length) { fail++; console.log('FAIL analyze should be empty (one order each)', a.map(x => x.name)); }
console.log(fail ? fail + ' FAILED' : 'HTML ALL PASS'); process.exit(fail ? 1 : 0);
