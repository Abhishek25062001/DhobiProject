import React, { useState } from 'react';
import { fieldLabel } from './ContentFields';
export default function CopyFields({ content, onChange }) {
  const [search, setSearch] = useState('');
  return <div className="space-y-4"><label className="block text-sm font-bold">Find text<input type="search" className="block w-full border rounded-lg p-2 font-normal mt-1" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by wording or placement" /></label><div className="grid sm:grid-cols-2 gap-4">{content.entries.filter(entry => `${entry.id} ${entry.value}`.toLowerCase().includes(search.toLowerCase())).map(entry => <label key={entry.id} className="block text-xs text-slate-600 space-y-1"><span>{fieldLabel(entry.id.replace(/_[a-f0-9]{7}$/, ''))}</span><textarea className="block w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900" rows={entry.value.length > 100 ? 4 : 2} maxLength="5000" value={entry.value} onChange={event => onChange({ entries: content.entries.map(old => old.id === entry.id ? { ...old, value: event.target.value } : old) })} /></label>)}</div></div>;
}
