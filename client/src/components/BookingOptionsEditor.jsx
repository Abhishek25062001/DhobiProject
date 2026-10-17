import React from 'react';
import { SERVICE_CODES, IRONING_CODES } from '../../../shared/catalogContract.mjs';
import { IRONING_PRICE_KEYS } from '../../../shared/pricing.mjs';

const inputClass = 'w-full border border-slate-300 rounded-lg p-2 bg-white';
const groups = [['serviceTypes', 'Services'], ['ironingTiers', 'Ironing finishes'], ['detergentOptions', 'Detergents'], ['packagingOptions', 'Packaging'], ['homeCareOptions', 'Homepage care choices']];
export default function BookingOptionsEditor({ value, onChange }) {
  const update = (key, index, patch) => onChange({ ...value, [key]: value[key].map((option, i) => i === index ? { ...option, ...patch } : option) });
  function add(key) {
    const options = value[key] || [];
    const codes = key === 'serviceTypes' ? SERVICE_CODES : key === 'ironingTiers' ? IRONING_CODES.filter(code => code !== 'NONE') : null;
    const code = codes?.find(code => !options.some(option => option.code === code)) || `choice_${Date.now()}`;
    const option = key === 'homeCareOptions'
      ? { id: code, label: 'New care choice', shortLabel: '', icon: 'wash', service: 'WASH_AND_FOLD', ironing: 'NONE', description: '', isActive: true, sortOrder: options.length }
      : { code, name: codes ? code.replaceAll('_', ' ') : 'New choice', shortName: '', description: '', extraPricePerOrder: 0, isActive: true, sortOrder: options.length, ...(key === 'ironingTiers' ? { priceKey: IRONING_PRICE_KEYS[code] } : {}) };
    onChange({ ...value, [key]: [...options, option] });
  }
  return <section className="space-y-5">
    <h4 className="font-bold text-slate-800 uppercase tracking-wider">Booking choices</h4>
    <div className="grid sm:grid-cols-2 gap-3">
      <label>Minimum standard turnaround (hours)<input type="number" min="0" step="1" required className={inputClass} value={value.minStandardTurnaroundHours} onChange={event => onChange({ ...value, minStandardTurnaroundHours: Number(event.target.value) })} /></label>
      <label>Express turnaround (hours)<input type="number" min="0" step="1" required className={inputClass} value={value.expressTurnaroundHours ?? 24} onChange={event => onChange({ ...value, expressTurnaroundHours: Number(event.target.value) })} /></label>
      {['supportEmail', 'privacyEmail', 'legalEmail', 'supportHours', 'businessAddress'].map(key => <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input className={inputClass} value={value[key] ?? ''} onChange={event => onChange({ ...value, [key]: event.target.value })} /></label>)}
      <label>Support phone<input className={inputClass} value={value.supportPhone || ''} onChange={event => onChange({ ...value, supportPhone: event.target.value })} /></label>
    </div>
    {groups.map(([key, title]) => <fieldset key={key} className="border border-slate-200 rounded-2xl p-4 space-y-3">
      <legend className="font-bold px-2">{title}</legend>
      {(value[key] || []).map((option, index) => {
        const home = key === 'homeCareOptions';
        return <div key={option.code || option.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2"><span className="text-slate-500">{option.code || option.id}</span><label className="flex gap-2"><input type="checkbox" checked={option.isActive !== false} onChange={event => update(key, index, { isActive: event.target.checked })} />Active</label></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label>Name<input required className={inputClass} value={home ? option.label : option.name} onChange={event => update(key, index, { [home ? 'label' : 'name']: event.target.value })} /></label>
            <label>Short label<input maxLength="80" className={inputClass} value={(home ? option.shortLabel : option.shortName) || ''} onChange={event => update(key, index, { [home ? 'shortLabel' : 'shortName']: event.target.value })} /></label>
            <label className="sm:col-span-2">Description<textarea className={inputClass} value={option.description || ''} onChange={event => update(key, index, { description: event.target.value })} /></label>
            <label>Display order<input type="number" step="1" required className={inputClass} value={option.sortOrder ?? 0} onChange={event => update(key, index, { sortOrder: Number(event.target.value) })} /></label>
            {['detergentOptions', 'packagingOptions'].includes(key) && <label>Extra price per order (₹)<input type="number" min="0" step="0.01" required className={inputClass} value={option.extraPricePerOrder ?? 0} onChange={event => update(key, index, { extraPricePerOrder: Number(event.target.value) })} /></label>}
            {home && <>
              <label>Service<select className={inputClass} value={option.service} onChange={event => update(key, index, { service: event.target.value, ironing: ['WASH_AND_IRON', 'IRON_ONLY'].includes(event.target.value) ? 'STANDARD_STEAM' : 'NONE' })}>{SERVICE_CODES.map(code => <option key={code} value={code}>{value.serviceTypes?.find(entry => entry.code === code)?.name || code}</option>)}</select></label>
              <label>Finish<select className={inputClass} value={option.ironing} onChange={event => update(key, index, { ironing: event.target.value })}>{IRONING_CODES.filter(code => ['WASH_AND_IRON', 'IRON_ONLY'].includes(option.service) ? code !== 'NONE' : code === 'NONE').map(code => <option key={code} value={code}>{value.ironingTiers?.find(entry => entry.code === code)?.name || code}</option>)}</select></label>
              <label>Icon<select className={inputClass} value={option.icon || 'wash'} onChange={event => update(key, index, { icon: event.target.value })}>{['wash', 'steam', 'dry', 'starch'].map(icon => <option key={icon}>{icon}</option>)}</select></label>
            </>}
          </div>
          <button type="button" className="text-red-700" onClick={() => onChange({ ...value, [key]: value[key].filter((_, i) => i !== index) })}>Remove choice</button>
        </div>;
      })}
      {!(value[key] || []).length && <p className="text-slate-500">No choices configured. This list will remain empty on the website.</p>}
      <button type="button" className="font-bold text-indigo-700" disabled={(key === 'serviceTypes' && value[key]?.length >= SERVICE_CODES.length) || (key === 'ironingTiers' && value[key]?.length >= IRONING_CODES.length - 1)} onClick={() => add(key)}>Add choice</button>
    </fieldset>)}
  </section>;
}
