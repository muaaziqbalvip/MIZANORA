import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status });

// Admin-only image upload. The ImgBB key stays on the server (IMGBB_API_KEY), never in the browser or GitHub.
export async function POST(req) {
  const admin = await verifyAdmin(req);
  if (!admin.ok) return json({ ok: false, error: admin.error, uid: admin.uid }, admin.status);

  const key = process.env.IMGBB_API_KEY;
  if (!key) return json({ ok: false, error: 'Image upload is not set up. Add IMGBB_API_KEY in Vercel and redeploy.' }, 503);

  let form;
  try { form = await req.formData(); } catch { return json({ ok: false, error: 'Invalid upload.' }, 400); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: 'No image received.' }, 400);
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return json({ ok: false, error: 'Please upload a JPG, PNG, WebP or GIF image.' }, 400);
  if (file.size > 4 * 1024 * 1024) return json({ ok: false, error: 'Image is too large (max 4 MB).' }, 413);

  try {
    const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    const fd = new FormData();
    fd.append('image', b64);
    fd.append('name', `mizanora-${Date.now()}`);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.success || !data.data) {
      const why = data && data.error && data.error.message ? data.error.message : `ImgBB error ${res.status}`;
      return json({ ok: false, error: `ImgBB: ${why}` }, 502);
    }
    return json({ ok: true, url: data.data.url });
  } catch (e) {
    console.error('upload failed', e);
    return json({ ok: false, error: 'Upload failed. Please try again.' }, 500);
  }
}
