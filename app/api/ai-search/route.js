import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// OPTIONAL real-AI helper. Only works when ANTHROPIC_API_KEY is set in Vercel; otherwise the shop uses its built-in smart search.
// It turns a messy sentence ("mere bhai ke liye sasta kala joota") into keywords + filters. It never sees customer data.
const hits = new Map();
export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ ok: false }, { status: 501 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000); arr.push(now); hits.set(ip, arr);
  if (hits.size > 3000) hits.clear();
  if (arr.length > 12) return NextResponse.json({ ok: false }, { status: 429 });

  let q = '';
  try { q = String((await req.json()).q || '').slice(0, 120); } catch { /* ignore */ }
  if (q.trim().length < 3) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(7000),
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.AI_SEARCH_MODEL || 'claude-haiku-5-5', max_tokens: 200,
        system: 'You turn a shopper\'s search sentence (English, Roman Urdu or Hindi) into JSON for a Pakistani online shop. Reply with JSON only: {"keywords":["english product words"],"colors":["english colour names"],"minPrice":number or 0,"maxPrice":number or 0,"sort":"low"|"high"|"new"|""}. Translate Roman Urdu to English product words (joota = shoes, kapray = clothes, ghari = watch). Prices are in Pakistani rupees.',
        messages: [{ role: 'user', content: q }],
      }),
    });
    if (!r.ok) return NextResponse.json({ ok: false }, { status: 502 });
    const j = await r.json();
    const txt = (j.content || []).map((c) => c.text || '').join('');
    const m = txt.match(/\{[\s\S]*\}/);
    const o = m ? JSON.parse(m[0]) : null;
    if (!o) return NextResponse.json({ ok: false });
    const arrS = (v) => (Array.isArray(v) ? v.map((x) => String(x).toLowerCase().slice(0, 30)).slice(0, 8) : []);
    return NextResponse.json({ ok: true, intent: { words: arrS(o.keywords), colors: arrS(o.colors), min: Math.max(0, Number(o.minPrice) || 0), max: Math.max(0, Number(o.maxPrice) || 0), sort: ['low', 'high', 'new'].includes(o.sort) ? o.sort : '' } });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
