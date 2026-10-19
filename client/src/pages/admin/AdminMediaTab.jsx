import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import useApiResource from '../../hooks/useApiResource';
import { mediaService } from '../../services/api';
import ApiLoadError from '../../components/ApiLoadError';
import ManagedImage from '../../components/ManagedImage';

import { imageFileData } from '../../utils/imageFileData';
import ImageUpload from '../../components/ImageUpload';

function MediaCard({ asset }) {
  const [name, setName] = useState(asset.name);
  const [alt, setAlt] = useState(asset.defaultAlt || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(asset.name); setAlt(asset.defaultAlt || ''); }, [asset]);
  async function act(action) {
    setBusy(true);
    try { await action(); toast.success('Image library updated.'); }
    catch (error) { toast.error(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }
  return <article className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
    <div className="h-32 flex items-center justify-center overflow-hidden"><ManagedImage reference={{ asset }} className="hp-garment-image max-h-32 object-contain" /></div>
    <label className="block text-xs">Name<input className="w-full border rounded-lg p-2" value={name} maxLength={160} onChange={e => setName(e.target.value)} /></label>
    <label className="block text-xs">Image description<input className="w-full border rounded-lg p-2" value={alt} maxLength={300} onChange={e => setAlt(e.target.value)} /></label>
    {asset.status === 'archived' ? <button disabled={busy} onClick={() => act(() => mediaService.restore(asset._id))}>Restore image</button> : <>
      <div className="flex gap-3 text-xs"><button disabled={busy} className="btn-primary" onClick={() => act(() => mediaService.update(asset._id, { name, defaultAlt: alt, version: asset.version }))}>Save details</button><button disabled={busy} onClick={() => act(() => mediaService.archive(asset._id))}>Archive</button></div>
      <label className="block text-xs font-bold">Replace this image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { const file = e.target.files[0]; e.target.value = ''; if (file) act(async () => mediaService.update(asset._id, { version: asset.version, imageBase64: await imageFileData(file) })); }} /></label>
      <p className="text-xs text-slate-500">Replacement updates all linked placements. Files remain available for recovery.</p>
    </>}
  </article>;
}
export default function AdminMediaTab() {
  const [archived, setArchived] = useState(false);
  const load = useCallback(signal => mediaService.list(archived, { signal }), [archived]);
  const resource = useApiResource(load);
  return <div className="space-y-4"><h2 className="text-xl font-bold">Media library</h2><div className="flex flex-wrap gap-4 items-center"><ImageUpload /><label className="text-sm"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} /> Include archived images</label></div>
    {resource.error ? <ApiLoadError message="The media library could not be loaded." onRetry={resource.retry} /> : resource.loading ? <p>Loading images…</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{resource.data.data.map(asset => <MediaCard key={asset._id} asset={asset} />)}</div>}
  </div>;
}
