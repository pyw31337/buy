const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(rootDir, file), 'utf8');

// 1. LDS CSS 파일 검증
const ldsCss = read('docs/css/lets-design-system.css');
assert(ldsCss.includes('--lds-version: "3.5.0"'), 'LDS v3.5 버전 명시 필요');
assert(ldsCss.includes('--font-family-base'), 'Pretendard 기본 폰트 패밀리 토큰 정의 필요');
assert(ldsCss.includes('--fs-xs') && ldsCss.includes('--fs-display'), '타이포그래피 스케일 토큰 정의 필요');
assert(ldsCss.includes('--space-1') && ldsCss.includes('--space-16'), '8-Point Grid Spacing 토큰 체계 정의 필요');
assert(ldsCss.includes('--color-buy:        #FF5A36'), '렛츠바이 시그니처 컬러 토큰 정의 필요');
assert(ldsCss.includes('--bg-page') && ldsCss.includes('--text-primary'), 'LDS 고대비 뉴트럴 캔버스 토큰 정의 필요');
assert(ldsCss.includes('--status-normal') && ldsCss.includes('--status-danger'), 'LDS 시맨틱 상태 컬러 정의 필요');
assert(ldsCss.includes('--lds-safe-top'), 'PWA Safe Area 여백 토큰 정의 필요');

// 2. LDS 디자인 토큰 JSON 검증
const tokensRaw = read('docs/tokens/lets-design-tokens.json');
const tokens = JSON.parse(tokensRaw);
assert.strictEqual(tokens.version, '3.5.0');
assert.strictEqual(tokens.brand.primary, '#FF5A36');
assert(tokens.spacing['8'] === 32);
assert(tokens.typography.scale.md === 15);
assert(tokens.rules.antiBox.nestedBoxesForbidden, '안티 박스 규율 명시 필요');

// 3. index.html 연동 검증
const indexHtml = read('docs/index.html');
assert(indexHtml.includes('css/lets-design-system.css'), 'index.html에서 LDS CSS를 로드해야 함');
assert(indexHtml.includes('viewport-fit=cover'), 'PWA Safe Area를 위한 viewport-fit 속성 필요');

// 4. style.css LDS 토큰 연동 검증
const styleCss = read('docs/style.css');
assert(styleCss.includes('--bg: var(--bg-page'), 'style.css에서 LDS 캔버스 배경 토큰 매핑 필요');
assert(styleCss.includes('--ink: var(--text-primary'), 'style.css에서 LDS 텍스트 토큰 매핑 필요');
assert(styleCss.includes('--accent: var(--color-buy'), 'style.css에서 LDS 시그니처 컬러 토큰 매핑 필요');
assert(styleCss.includes('--line: var(--border-subtle'), 'style.css에서 LDS 보더 토큰 매핑 필요');

console.log('LDS DESIGN SYSTEM PASS');
