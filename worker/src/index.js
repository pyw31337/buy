// 렛츠바이 공유 썸네일 캐시: 제품명 해시 → 작은 WebP 한 장. 사용자·주문 정보는 받지도 저장하지도 않음
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const HASH = /^[0-9a-f]{32}$/, MAX = 60 * 1024;
const j = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...CORS, ...h } });
export default {
  async fetch(req, env) {
    const u = new URL(req.url), m = u.pathname.match(/^\/t\/([0-9a-f]{32})\.webp$/);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
    if (req.method === 'GET' && u.pathname === '/has') {
      const hs = (u.searchParams.get('h') || '').split(',').filter(h => HASH.test(h)).slice(0, 300);
      const got = await Promise.all(hs.map(h => env.B.head(h + '.webp').then(o => o ? h : null)));
      return j({ have: got.filter(Boolean) }, 200, { 'Cache-Control': 'public, max-age=300' });
    }
    if (m && (req.method === 'GET' || req.method === 'HEAD')) {
      const o = await env.B.get(m[1] + '.webp');
      if (!o) return new Response('none', { status: 404, headers: { ...CORS, 'Cache-Control': 'public, max-age=600' } });
      return new Response(o.body, { headers: { ...CORS, 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    if (m && req.method === 'PUT') {
      const ip = req.headers.get('CF-Connecting-IP') || '?';
      const { success } = await env.RL.limit({ key: ip }); if (!success) return j({ ok: false, why: 'rate' }, 429);
      if ((req.headers.get('Content-Type') || '') !== 'image/webp') return j({ ok: false, why: 'type' }, 415);
      if (+(req.headers.get('Content-Length') || 0) > MAX) return j({ ok: false, why: 'size' }, 413);
      const b = new Uint8Array(await req.arrayBuffer());
      if (b.length > MAX || b.length < 30) return j({ ok: false, why: 'size' }, 413);
      const tag = s => String.fromCharCode(...b.slice(s, s + 4));
      if (tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return j({ ok: false, why: 'notwebp' }, 415);
      if (await env.B.head(m[1] + '.webp')) return j({ ok: true, exists: true }); // 먼저 올린 것 유지(덮어쓰기 불가)
      await env.B.put(m[1] + '.webp', b, { httpMetadata: { contentType: 'image/webp' } });
      return j({ ok: true }, 201);
    }
    return j({ ok: false }, 404);
  },
};
