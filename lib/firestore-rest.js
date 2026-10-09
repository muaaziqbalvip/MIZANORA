// Reads PUBLIC collections (products, banners) straight from Firestore's REST API.
// It needs only the public Firebase web config, no service-account key, so the shop keeps working
// even when FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL are missing or pasted wrongly in Vercel.
// Firestore rules already allow everyone to read products and banners.
const PID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export const restReady = () => Boolean(PID && KEY);
const base = () => `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;

function val(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue) || 0;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  if ('mapValue' in v) return fields(v.mapValue.fields);
  return null;
}
function fields(f = {}) {
  const o = {};
  for (const k of Object.keys(f)) o[k] = val(f[k]);
  return o;
}
const toDoc = (d) => ({ id: String(d.name).split('/').pop(), data: fields(d.fields) });

export async function restList(collection) {
  const out = [];
  let token = '';
  for (let page = 0; page < 8; page++) {
    const url = `${base()}/${collection}?pageSize=300&key=${KEY}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`Firestore REST ${collection}: HTTP ${res.status}`);
    const j = await res.json();
    (j.documents || []).forEach((d) => out.push(toDoc(d)));
    token = j.nextPageToken || '';
    if (!token) break;
  }
  return out;
}

export async function restGet(collection, id) {
  const res = await fetch(`${base()}/${collection}/${encodeURIComponent(id)}?key=${KEY}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore REST ${collection}/${id}: HTTP ${res.status}`);
  return toDoc(await res.json());
}
