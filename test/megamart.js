// 실제 메가마트몰 주문 메일 구조를 본뜬 가상 샘플(개인정보 제거). quoted-printable 포함
const c = require('../docs/core.js'); let fail = 0;
const html = `<html><body><table><tr><td><img src="https://static.megamart.com/mail/logo.png" alt="메가마트몰"></td></tr>
<tr><th>주문일자</th><td>2026.10.27</td></tr><tr><th>주문번호</th><td>20261027000000000</td></tr><tr><th>주문자</th><td>홍길동</td></tr></table>
<h3>상품 정보</h3><table><tbody><tr><td><img src="https://static.megamart.com/product/image/0001/00000001_1.jpg" alt="돼지 냉장 삼겹살" width="80"></td>
<td><p>돼지 냉장 삼겹살</p><p>손질요청 : 구이용</p><p><strong>31,580</strong>원 <strong>20개</strong></p></td></tr>
<tr><td><img src="https://static.megamart.com/product/image/0002/00000002_1.jpg" alt="국산 양파 1.5kg"></td><td><span>1,980</span>원 <span>1개</span></td></tr></tbody></table>
<h3>결제 정보</h3><table><tr><th>상품금액</th><td>59,600원</td></tr><tr><th>할인 금액</th><td>28,020원</td></tr><tr><th>총 결제 금액</th><td>31,580원</td></tr></table>
<p>본 메일은 발신전용입니다. 상품의 교환/반품 안내는 고객센터로 문의해 주세요.</p></body></html>`;
const qp = html.replace(/=/g, '=3D').replace(/[^\x00-\x7F]/g, ch => [...Buffer.from(ch)].map(b => '=' + b.toString(16).toUpperCase().padStart(2, '0')).join('')).replace(/(.{70})/g, '$1=\n');
for (const [label, h] of [['plain', html], ['qp', qp]]) {
  const r = c.parseMail({ from: 'shopping@megamart.com', subject: '[메가마트몰] 주문 내역 안내', date: '', html: h });
  console.log(label, JSON.stringify(r.map(o => [o.name, o.price, o.qty, o.mall, o.date, o.orderNo, !!o.img])));
  const a = r.find(o => o.name === '돼지 냉장 삼겹살'), b = r.find(o => o.name === '국산 양파 1.5kg');
  if (r.length !== 2 || !a || a.price !== 31580 || a.qty !== 20 || !a.img || a.mall !== '메가마트' || a.date !== '2026-10-27' || !b || b.price !== 1980) { fail++; console.log('FAIL', label); }
}
console.log(fail ? fail + ' FAILED' : 'MEGAMART PASS'); process.exit(fail ? 1 : 0);
