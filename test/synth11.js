// v0.11 화면 테스트용 합성 데이터: 상품 사진(test/img, 직접 그린 가상 이미지)·4곳 현재가·할인 주기 포함. 개인정보 없음
const synth = require('./synth.js');
module.exports = function (today = '2026-10-29', imgBase = 'https://img.test/') {
  const s = synth(today);
  const IMG = { '삼다수 2L 12병': 'samdasoo', '코디 3겹 30m 30롤': 'kodi', '서울우유 1L 2개': 'milk', '풀무원 국산콩 두부 300g': 'tofu', '한우 1등급 등심 300g': 'hanwoo', '돼지 삼겹살 구이용 1kg': 'pork', '종근당 락토핏 골드 50포': 'lacto', '고려은단 비타민C 1000 300정': 'vitc', '피죤 섬유유연제 2.5L': 'pigeon', '하기스 맥스드라이 4단계 76매': 'huggies', '오리온 초코파이 정 444g': 'chocopie', '스타벅스 캡슐 커피 10개입': 'sbux', '로얄캐닌 인도어 4kg': 'royal', 'CJ 햇반 210g 24개': 'hetbahn', '페리오 치약 120g 5개': 'perio', '나이키 스포츠 양말 6켤레': 'socks' };
  const fromMail = new Set(['삼다수 2L 12병', '서울우유 1L 2개', '한우 1등급 등심 300g', '종근당 락토핏 골드 50포', '하기스 맥스드라이 4단계 76매', '오리온 초코파이 정 444g', '로얄캐닌 인도어 4kg', 'CJ 햇반 210g 24개', '스타벅스 캡슐 커피 10개입', '나이키 스포츠 양말 6켤레']);
  s.orders.forEach(o => { if (fromMail.has(o.name)) o.img = imgBase + IMG[o.name] + '.jpg'; });
  const base = {}; s.orders.forEach(o => { if (IMG[o.name]) base[o.name] = o.price; });
  const t1 = new Date(today), iso = d => d.toISOString().slice(0, 10), SRC = ['쿠팡', '네이버', '다나와', '에누리'];
  const CAT = { '피죤 섬유유연제 2.5L': '생활/건강>세탁세제' };
  const prices = {};
  Object.keys(IMG).forEach((n, i) => {
    const arr = [], mode = i % 4; // 0 지금 쌈 · 1 주기적 할인 · 2 비쌈 · 3 보통
    for (let j = 0; j < 60; j++) SRC.forEach((src, si) => {
      const dip = mode === 1 && (j % 14) < 3 ? 0.9 : 1, trend = mode === 2 ? 1 + j * 0.004 : 1, last = mode === 0 && j >= 58 ? 0.88 : 1;
      const p = Math.round(base[n] * (1.02 + 0.03 * Math.sin(i + j / 3)) * dip * trend * last * (1 + (si - 1) * 0.025) / 10) * 10;
      arr.push({ date: iso(new Date(+t1 - (59 - j) * 864e5)), price: p, mall: si > 1 ? src + ' 최저' : src, src, title: n.startsWith('CJ 햇반') && src === '쿠팡' ? 'CJ 햇반 200g 24개' : n + (si < 2 ? ' 1세트' : ''), url: undefined, img: !fromMail.has(n) && si === 0 ? imgBase + IMG[n] + '.jpg' : undefined, cat: CAT[n] && si === 1 ? CAT[n] : undefined });
    });
    prices[n] = arr;
  });
  return { orders: s.orders, prices, cats: {}, aliases: {}, onboarded: true };
};
