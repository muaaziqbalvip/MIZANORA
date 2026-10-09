'use client';
import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { authClient } from '@/lib/firebase-client';
import { compressImage } from '@/lib/image';

// Pick photos from the phone/PC gallery. They are shrunk, uploaded through /api/upload, and the links are handed back.
export default function ImageUploader({ onUploaded, multiple = true, max = 1600, label = 'Upload photos' }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function onPick(e) {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true); setMsg('');
    const urls = [];
    try {
      const token = await authClient().currentUser.getIdToken();
      for (let i = 0; i < files.length; i++) {
        setMsg(`Uploading ${i + 1} of ${files.length}...`);
        const small = await compressImage(files[i], { max });
        const fd = new FormData();
        fd.append('file', small);
        const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          if (data.error === 'not_admin') throw new Error('This account is not the admin in your Firestore rules. Paste your UID or Google email in firestore.rules, click Publish, then sign in again.');
          if (res.status === 413) throw new Error('Photo is too big for the server. Pick a smaller photo.');
          throw new Error(data.error || `Upload failed (HTTP ${res.status}). Open /api/health to check IMGBB_API_KEY.`);
        }
        urls.push(data.url);
      }
      onUploaded(urls);
      setMsg(`${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded. Now click Save.`);
    } catch (err) {
      if (urls.length) onUploaded(urls);
      setMsg(err.message || 'Upload failed.');
    }
    setBusy(false);
  }

  return (
    <div>
      <label className={`btn-ghost cursor-pointer !py-2.5 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        <input type="file" accept="image/*" multiple={multiple} onChange={onPick} disabled={busy} className="sr-only" />
        <ImagePlus size={18} /> {busy ? 'Uploading...' : label}
      </label>
      {msg && <p role="status" className="mt-2 break-words text-sm text-dim">{msg}</p>}
    </div>
  );
}
