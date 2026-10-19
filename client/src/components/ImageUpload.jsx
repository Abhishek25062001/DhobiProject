import React, { useEffect, useRef, useState } from 'react';
import { mediaService } from '../services/api';
import { imageFileData } from '../utils/imageFileData';

export default function ImageUpload({ onUploaded, label = 'Upload new image' }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const callback = useRef(onUploaded); callback.current = onUploaded;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function upload(file) {
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const imageBase64 = await imageFileData(file);
      if (mounted.current) setPreview(imageBase64);
      const result = await mediaService.upload({ name: file.name.slice(0, 160), imageBase64 });
      if (mounted.current) { callback.current?.(result.data); setMessage('Uploaded and optimized as WebP.'); }
    } catch (error) { if (mounted.current) setError(error.response?.data?.message || error.message); }
    finally { if (mounted.current) { setBusy(false); setPreview(''); } }
  }
  return <div className="space-y-2">
    <label className="block text-sm font-semibold text-indigo-700">{label}<input className="block w-full mt-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-700" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { const file = event.target.files[0]; event.target.value = ''; upload(file); }} /></label>
    <p className="text-xs text-slate-500">PNG, JPEG or WebP, up to 6 MB. Automatically compressed and converted to WebP.</p>
    {busy && <div role="status" className="flex items-center gap-3 text-xs text-indigo-700">{preview && <img src={preview} alt="New image preview" className="w-16 h-16 object-contain rounded-lg border" />}Uploading and optimizing…</div>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
