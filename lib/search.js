// Forgiving product search: matches parts of words and tolerates small spelling mistakes ("shoos" finds "shoes").
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]+/g, ' ').trim();

function dist1(a, b) { // true when edit distance <= 1 (or 2 for long words)
  const max = a.length > 6 ? 2 : 1;
  if (Math.abs(a.length - b.length) > max) return false;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length] <= max;
}

export function searchProducts(list, q, limit = 6) {
  const toks = norm(q).split(' ').filter(Boolean);
  if (!toks.length) return [];
  const scored = [];
  for (const p of list) {
    const hay = norm(`${p.name} ${p.category}`);
    const words = hay.split(' ');
    let score = 0; let ok = true;
    for (const t of toks) {
      if (hay.startsWith(t)) score += 5;
      else if (words.some((w) => w.startsWith(t))) score += 4;
      else if (hay.includes(t)) score += 2;
      else if (t.length >= 4 && words.some((w) => dist1(t, w))) score += 1;
      else { ok = false; break; }
    }
    if (ok) scored.push([score, p]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map((x) => x[1]);
}
