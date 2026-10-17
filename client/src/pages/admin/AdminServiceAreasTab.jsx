import React, { useEffect, useState } from 'react';
import { serviceAreaService } from '../../services/api';
import toast from 'react-hot-toast';

const blank = { timezone: 'Asia/Kolkata', slug: '', name: '', shortName: '', summary: '', footerLabel: '', badge: '', homeBadge: '', pincodeRange: '', turnaround: '', hours: '', coverage: [], pincodes: [], isActive: true, sortOrder: 0 };
const labels = { slug: 'Stable hub identifier', name: 'Full name', shortName: 'Home card name', summary: 'Home card description', footerLabel: 'Footer label', badge: 'Area page badge', homeBadge: 'Home card badge', pincodeRange: 'Display range (does not grant coverage)', turnaround: 'Displayed turnaround', hours: 'Operating hours' };
export default function AdminServiceAreasTab() {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = async () => { try { setAreas((await serviceAreaService.listAdmin()).areas); setError(''); } catch (error) { setError(error.response?.data?.message || 'Service areas could not be loaded.'); } };
  useEffect(() => { reload(); }, []);
  const save = async event => {
    event.preventDefault(); setBusy(true);
    try {
      const body = { ...form, pincodes: form.pincodeText.split(/[\s,]+/).filter(Boolean), coverage: form.coverageText.split('\n').map(line => line.trim()).filter(Boolean) };
      if (form._id) await serviceAreaService.save(form._id, body); else await serviceAreaService.create(body);
      toast.success('Service area saved.'); setForm(null); await reload();
    } catch (error) { setError(error.response?.data?.message || 'Service area could not be saved.'); }
    finally { setBusy(false); }
  };
  const edit = area => { setError(''); setForm({ ...area, pincodeText: area.pincodes.join('\n'), coverageText: area.coverage.join('\n') }); };
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Service areas</h2><p className="text-sm text-slate-500">Exact pincodes control pickup eligibility. Each pincode can belong to one active hub.</p></div><button className="btn-primary" disabled={!!form} onClick={() => edit(blank)}>Add hub</button></div>
    {error && <div role="alert" className="p-4 rounded-xl bg-red-50 text-red-700">{error} <button type="button" className="underline" onClick={reload}>Reload list</button></div>}
    {form ? <form onSubmit={save} className="bg-white p-6 rounded-2xl border space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">{Object.entries(labels).map(([key, label]) => <label className="text-sm space-y-1" key={key}><span>{label}</span><input className="input-field w-full" value={form[key]} required={['slug', 'name'].includes(key)} disabled={key === 'slug' && !!form._id} maxLength={key === 'slug' ? 100 : 500} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Exact supported pincodes (one per line)<textarea required className="input-field w-full h-40" value={form.pincodeText} onChange={event => setForm({ ...form, pincodeText: event.target.value })} /></label><label className="text-sm">Neighborhood descriptions (one per line)<textarea className="input-field w-full h-40" value={form.coverageText} onChange={event => setForm({ ...form, coverageText: event.target.value })} /></label></div>
      <p className="text-sm text-slate-500">Booking timezone: Asia/Kolkata (India Standard Time)</p>
      <label className="block text-sm">Display order <input className="input-field" type="number" min="0" max="10000" value={form.sortOrder} onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />Active and accepting bookings (uncheck to archive; existing orders remain)</label>
      <div className="flex gap-3"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save hub'}</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => { setForm(null); setError(''); }}>Cancel</button></div>
    </form> : <div className="grid md:grid-cols-2 gap-4">{areas.map(area => <article key={area._id} className="bg-white p-5 rounded-2xl border space-y-3"><h3 className="font-bold">{area.name}</h3><p className="text-sm text-slate-500">{area.isActive ? 'Active' : 'Archived'} · {area.pincodes.length} exact pincodes · Order {area.sortOrder}</p><button className="btn-secondary" onClick={() => edit(area)}>Edit {area.shortName || area.name}</button></article>)}</div>}
  </div>;
}
