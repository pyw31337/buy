// .eml 끌어다 놓기: MIME 해석(base64·quoted-printable·euc-kr·RFC2047 제목) 확인 — 합성 메일만 사용
const c = require('../docs/core.js'); let fail = 0;
const b64 = s => Buffer.from(s, 'utf8').toString('base64'), lat = b => b.toString('latin1');
const html = '<table><tr><td><img src="https://sitem.ssgcdn.com/1/item/1_i1_80.jpg" alt="상품이미지"></td></tr><tr><td>촌두부 550g</td></tr><tr><td>수량 : 2개</td></tr></table><p>결제금액</p><p>3,980원</p>';
const eml1 = `From: =?UTF-8?B?${b64('SSG.COM')}?= <ssgadmin@ssg.com>\nSubject: =?UTF-8?B?${b64('[SSG.COM] 홍*동 고객님께서 주문하신 상품내역입니다.')}?=\nDate: Fri, 29 May 2026 23:29:15 +0000\nMIME-Version: 1.0\nContent-Type: multipart/alternative; boundary="XX"\n\n--XX\nContent-Type: text/plain; charset=utf-8\n\nplain\n--XX\nContent-Type: text/html; charset=utf-8\nContent-Transfer-Encoding: base64\n\n${b64(html).replace(/(.{76})/g, '$1\n')}\n--XX--\n`;
const m1 = c.parseEml(eml1), r1 = c.parseMail(m1);
const ok1 = m1.date === '2026-05-30' && /SSG/.test(m1.from) && r1.length === 1 && r1[0].name === '촌두부 550g' && r1[0].qty === 2 && r1[0].price === 3980 && r1[0].mall === 'SSG';
console.log(ok1 ? 'PASS' : 'FAIL', 'base64+multipart', JSON.stringify([m1.subject, m1.date, r1])); if (!ok1) fail++;
const euc = Buffer.from('3c703ec1d6b9ae20b3bbbfaa3c2f703e', 'hex'); // "<p>주문 내역</p>" euc-kr
const qpBody = [...euc].map(b => b > 127 || b === 61 ? '=' + b.toString(16).toUpperCase() : String.fromCharCode(b)).join('');
const m2 = c.parseEml(`Subject: test\nDate: Mon, 31 Aug 2026 09:54:21 +0900\nContent-Type: text/html; charset=euc-kr\nContent-Transfer-Encoding: quoted-printable\n\n${qpBody}\n`);
const ok2 = m2.html.includes('주문 내역') && m2.date === '2026-08-31';
console.log(ok2 ? 'PASS' : 'FAIL', 'euc-kr+qp', m2.html.trim()); if (!ok2) fail++;
process.exit(fail ? 1 : 0);
