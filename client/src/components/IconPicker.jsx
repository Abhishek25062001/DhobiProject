import React, { useState } from 'react';
import { CONTENT_ICONS } from '../../../shared/contentSchema.mjs';
import ContentIcon from './ContentIcon';
import MediaPicker from './MediaPicker';
import useMediaLibrary from '../hooks/useMediaLibrary';
const labelFor = name => name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\d+$/, '');
export default function IconPicker({ value, onChange, label }) {
  const library = useMediaLibrary();
  const selected = typeof value === 'object' && value ? { ...value, asset: library.data?.data?.find(asset => asset._id === value.assetId) } : value;
  const [custom, setCustom] = useState(typeof value === 'object');
  const [search, setSearch] = useState('');
  return <fieldset className="min-w-0 border rounded-xl p-3 space-y-3"><legend className="px-2 font-semibold">{label}</legend>
    <div className="flex items-center gap-2 text-sm"><ContentIcon name={selected} size={28} aria-hidden="true" /><span>{typeof value === 'string' ? labelFor(value) : 'Custom icon'}</span></div>
    <div className="flex gap-2"><button type="button" aria-pressed={!custom} className={`rounded-lg border px-3 py-2 text-xs ${!custom ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : ''}`} onClick={() => setCustom(false)}>Built-in icons</button><button type="button" aria-pressed={custom} className={`rounded-lg border px-3 py-2 text-xs ${custom ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : ''}`} onClick={() => setCustom(true)}>Custom icon</button></div>
    {custom ? <MediaPicker label="Custom icon image" value={typeof value === 'object' ? value : null} onChange={next => onChange(next || 'Shirt')} /> : <><label className="block text-xs">Find an icon<input type="search" className="mt-1 w-full border rounded-lg p-2" value={search} onChange={event => setSearch(event.target.value)} placeholder="Truck, leaf, heart…" /></label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">{CONTENT_ICONS.filter(name => labelFor(name).toLowerCase().includes(search.toLowerCase())).map(name => <button key={name} type="button" aria-pressed={name === value} onClick={() => onChange(name)} className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs focus-visible:ring-2 focus-visible:ring-indigo-500 ${name === value ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200'}`}><ContentIcon name={name} size={24} aria-hidden="true" />{labelFor(name)}</button>)}</div></>}
  </fieldset>;
}
