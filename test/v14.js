const L=require('../docs/core.js');const a=require('assert');
// 1회 품목은 all 모드에서 count 1
const o=[{name:'캠핑 의자',date:'2026-01-02',price:30000},{name:'삼다수 2L 12병',date:'2026-01-01',price:7000},{name:'[쿠팡단독] 삼다수 2L 12병',date:'2026-02-01',price:7200}];
const r=L.analyze(o,'2026-10-29',{}, {all:true});
a.strictEqual(r.filter(i=>i.count===1).length,1,'1회 1개');
a.strictEqual(r.find(i=>i.name.includes('삼다수')).count,2,'괄호 머리말 무시하고 묶기');
a.strictEqual(L.keyOf('구운란 30구'),L.keyOf('계란 30구'),'계란 동의어');
console.log('V14 ALL PASS');
