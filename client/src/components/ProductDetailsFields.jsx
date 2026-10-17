import React from 'react';
import { SERVICE_CODES, IRONING_CODES } from '../../../shared/catalogContract.mjs';

export default function ProductDetailsFields({ value, onChange }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const inputClass = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white';
  const choices = (key, codes, label) => <fieldset><legend className="font-bold text-slate-700 mb-2">{label}</legend><div className="flex flex-wrap gap-3">{codes.map(code => <label className="flex items-center gap-2 text-xs" key={code}><input type="checkbox" checked={(value[key] ?? codes).includes(code)} onChange={e => set(key, e.target.checked ? [...(value[key] ?? codes), code] : (value[key] ?? codes).filter(item => item !== code))} />{code.toLowerCase().replaceAll('_', ' ')}</label>)}</div></fieldset>;
  return <div className="space-y-4">
    <label className="block font-bold text-slate-700">Short display name<input className={inputClass} maxLength={80} value={value.shortName || ''} onChange={e => set('shortName', e.target.value)} placeholder="Leave empty to use the product name" /></label>
    <label className="block font-bold text-slate-700">Description<textarea className={inputClass} maxLength={2000} rows={3} value={value.description || ''} onChange={e => set('description', e.target.value)} /></label>
    <label className="block font-bold text-slate-700">Display order<input className={inputClass} type="number" step="1" value={value.sortOrder ?? 0} onChange={e => set('sortOrder', Number(e.target.value))} /></label>
    {choices('allowedServices', SERVICE_CODES, 'Available services')}
    {choices('allowedIroningTiers', IRONING_CODES.filter(code => code !== 'NONE'), 'Available finishes')}
  </div>;
}
