import React from 'react';
import useApiResource from '../hooks/useApiResource';
import { mediaService } from '../services/api';
import ApiLoadError from './ApiLoadError';

const load = signal => mediaService.list(false, { signal });
export default function ProductMediaFields({ value, onChange }) {
  const resource = useApiResource(load);
  const assets = resource.data?.data || [];
  if (resource.error) return <ApiLoadError message="The image library could not be loaded." onRetry={resource.retry} />;
  const setPrimary = id => {
    const asset = assets.find(item => item._id === id);
    onChange({ ...value, primaryImage: asset ? { assetId: id, asset } : null, imageUrl: asset?.url || '', cloudinaryPublicId: asset?.publicId || '' });
  };
  return <div className="space-y-3">
    <label className="block font-bold text-slate-700">Choose a library image<select className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white" value={value.primaryImage?.assetId || ''} onChange={e => setPrimary(e.target.value)} disabled={resource.loading}><option value="">No library image selected</option>{assets.map(asset => <option key={asset._id} value={asset._id}>{asset.name}</option>)}</select></label>
    {value.primaryImage && <label className="block">Image description<input className="w-full px-3 py-2 rounded-xl border border-slate-300" maxLength={300} value={value.primaryImage.alt ?? ''} placeholder="Use the library description" onChange={e => onChange({ ...value, primaryImage: { ...value.primaryImage, alt: e.target.value } })} /></label>}
    <fieldset><legend className="font-bold text-slate-700">Gallery images</legend><div className="max-h-32 overflow-auto space-y-1">{assets.map(asset => <label key={asset._id} className="flex gap-2 items-center text-xs"><input type="checkbox" checked={(value.gallery || []).some(ref => ref.assetId === asset._id)} onChange={e => onChange({ ...value, gallery: e.target.checked ? [...(value.gallery || []), { assetId: asset._id }] : (value.gallery || []).filter(ref => ref.assetId !== asset._id) })} />{asset.name}</label>)}</div></fieldset>
    <p className="text-xs text-slate-500">Save the product to publish image selections. Replacing a library image updates every placement using it.</p>
  </div>;
}
