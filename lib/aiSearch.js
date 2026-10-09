// Optional: asks /api/ai-search to understand a sentence. Returns null when AI is not set up (the normal search still works).
const cache = new Map();
export async function aiIntent(q) {
  const k = q.trim().toLowerCase();
  if (cache.has(k)) return cache.get(k);
  let out = null;
  try {
    const r = await fetch('/api/ai-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: k }) });
    if (r.ok) { const d = await r.json(); if (d.ok) out = d.intent; }
  } catch (_) { /* no AI available */ }
  cache.set(k, out);
  return out;
}
