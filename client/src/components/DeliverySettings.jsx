import React, { useEffect, useState } from 'react';
import { configService } from '../services/api';
import useApiResource from '../hooks/useApiResource';
const load = signal => configService.getPublicConfig({ signal });
export default function DeliverySettings() {
  const resource = useApiResource(load, 'delivery-settings');
  const [values, setValues] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (resource.data?.config && !dirty) {
      const { freeDeliveryThreshold, deliveryFee } = resource.data.config;
      setValues({ freeDeliveryThreshold, deliveryFee });
    }
  }, [resource.data, dirty]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      const body = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]));
      if (Object.values(values).some(value => value === '') || Object.values(body).some(value => !Number.isFinite(value) || value < 0)) throw new Error('Enter a valid amount of ₹0 or more.');
      await configService.updateSettings(body);
      await resource.retry(); setDirty(false); setSaved(true);
    } catch (error) { setError(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
    <h3 className="font-bold">Pickup &amp; delivery pricing</h3>
    <p className="text-xs text-slate-600">Set the amount here or in Platform Settings → Live Pricing &amp; Order Rules. Saving updates booking totals and text that uses the delivery amount. Page content is saved separately below.</p>
    {resource.error && <p role="alert" className="text-sm text-red-700">Delivery settings could not be loaded. <button type="button" className="underline" onClick={resource.retry}>Retry</button></p>}
    {values ? <><div className="grid sm:grid-cols-2 gap-3">{[['freeDeliveryThreshold', 'Minimum order for free delivery (₹)'], ['deliveryFee', 'Delivery fee below this amount (₹)']].map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}<input type="number" min="0" step="0.01" required disabled={busy} className="w-full rounded-lg border border-slate-300 p-2 mt-1 bg-white" value={values[key]} onChange={event => { setValues({ ...values, [key]: event.target.value }); setDirty(true); setSaved(false); }} /></label>)}</div><p className="text-xs text-slate-600">Free delivery applies when the garment subtotal reaches this amount. Set the minimum to ₹0 for free delivery on every order.</p><button type="submit" disabled={busy || !dirty || !!resource.error} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save delivery pricing'}</button></> : !resource.error && <p role="status" className="text-sm">Loading delivery pricing…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{saved && <p role="status" className="text-sm text-emerald-700">Delivery pricing saved across the website.</p>}
  </form>;
}
