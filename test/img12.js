// v0.12 사진: 원본 주소 풀기, 검색 결과 사진 찾기, 공유 해시
const c = require('../docs/core.js'); let f = 0; const eq = (a, b, n) => { if (a !== b) { f++; console.log('FAIL', n, a); } };
eq(c.imgSrc('<img data-src="//img.x.com/a.jpg" src="blank.gif">'), 'https://img.x.com/a.jpg', 'data-src');
eq(c.imgSrc('<img src=http://ex.com/b.jpg width=80>'), 'https://ex.com/b.jpg', 'unquoted+https');
eq(c.imgSrc('<img src="https://mail.naver.com/read/image?src=https%3A%2F%2Fthumbnail.coupangcdn.com%2Fx.jpg">'), 'https://thumbnail.coupangcdn.com/x.jpg', 'naver proxy');
eq(c.imgSrc('<img src="cid:abc">'), '', 'cid');
eq(c.findImg('11번가', '<img src="//cdn.011st.com/11dims/resize/200/11src/product/1/B.jpg">'), 'https://cdn.011st.com/11dims/resize/200/11src/product/1/B.jpg', '11st');
eq(c.findImg('컬리', '{"u":"https:\\/\\/product-image.kurly.com\\/p\\/a.jpg"}'), 'https://product-image.kurly.com/p/a.jpg', 'kurly');
c.thumbHash('서울우유').then(h => { eq(h.length, 32, 'hash'); console.log(f ? f + ' FAILED' : 'IMG ALL PASS'); process.exit(f ? 1 : 0); });
