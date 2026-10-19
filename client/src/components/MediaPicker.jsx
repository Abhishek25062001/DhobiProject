import React, { useState } from 'react';
import useMediaLibrary from '../hooks/useMediaLibrary';
import ManagedImage from './ManagedImage';
import ImageUpload from './ImageUpload';

const previewBackground = { backgroundColor: '#e2e8f0', backgroundImage: 'repeating-conic-gradient(#f8fafc 0% 25%, #e2e8f0 0% 50%)', backgroundSize: '16px 16px' };

export default function MediaPicker({ value, onChange, label = 'Image', maxAltLength = 500 }) {
  const library = useMediaLibrary();
  const [uploaded, setUploaded] = useState(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const assets = library.data?.data || [];
  const selected = assets.find(asset => asset._id === value?.assetId) || (uploaded?._id === value?.assetId ? uploaded : value?.asset);
  function choose(asset) {
    onChange(asset ? { assetId: asset._id, decorative: Boolean(value?.decorative) } : null, asset);
    setOpen(false);
  }
  return <fieldset className="min-w-0 border border-slate-200 rounded-xl p-3 space-y-3">
    <legend className="px-2 font-semibold text-sm">{label}</legend>
    {value ? <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><ManagedImage reference={{ ...value, asset: selected }} className="h-24 w-24 object-contain shrink-0 rounded-lg" style={previewBackground} /><div className="min-w-0"><p className="text-sm font-semibold break-words">{selected?.name || 'Selected image'}</p>{selected?.mimeType && <p className="text-xs text-slate-500">{selected.mimeType.replace('image/', '').toUpperCase()}{selected.bytes ? ` · ${Math.ceil(selected.bytes / 1024)} KB` : ''}</p>}<button type="button" className="text-xs text-red-700 mt-2 underline" onClick={() => choose(null)}>Remove image</button></div></div> : <p className="text-xs text-slate-500">No image selected.</p>}
    <ImageUpload onUploaded={asset => { setUploaded(asset); choose(asset); }} />
    <button type="button" aria-expanded={open} className="border border-indigo-200 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700" onClick={() => setOpen(!open)}>{open ? 'Close image library' : 'Choose from image library'} ({assets.length})</button>
    {open && <div className="space-y-3">
      <label className="block text-xs">Search images<input type="search" className="w-full border rounded-lg p-2 mt-1" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or description" /></label>
      {library.error ? <p role="alert" className="text-xs text-red-700">Images could not be loaded. <button type="button" className="underline" onClick={library.retry}>Retry</button></p> : library.loading ? <p role="status" className="text-xs">Loading images…</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto p-1">{assets.filter(asset => `${asset.name} ${asset.defaultAlt}`.toLowerCase().includes(search.toLowerCase())).map(asset => <button key={asset._id} type="button" aria-pressed={value?.assetId === asset._id} className={`min-w-0 rounded-xl border p-2 text-left focus-visible:ring-2 focus-visible:ring-indigo-500 ${value?.assetId === asset._id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`} onClick={() => choose(asset)}><ManagedImage reference={{ asset, decorative: true }} className="h-20 w-full object-contain rounded-md" style={previewBackground} /><span className="block text-xs mt-2 break-words">{asset.name}</span></button>)}</div>}
      {!library.loading && !library.error && !assets.some(asset => `${asset.name} ${asset.defaultAlt}`.toLowerCase().includes(search.toLowerCase())) && <p className="text-xs text-slate-500">No matching images. Upload a new image above.</p>}
    </div>}
    {value && <><label className="block text-xs">Image description<input className="w-full border border-slate-300 rounded-lg p-2 mt-1" maxLength={maxAltLength} placeholder={selected?.defaultAlt || 'Describe this image'} value={value.alt ?? ''} onChange={event => onChange({ assetId: value.assetId, decorative: Boolean(value.decorative), alt: event.target.value }, selected)} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(value.decorative)} onChange={event => onChange({ assetId: value.assetId, ...(value.alt !== undefined ? { alt: value.alt } : {}), decorative: event.target.checked }, selected)} />Decorative image</label></>}
  </fieldset>;
}
