import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function ApiLoadError({ message = 'We couldn’t load the garment catalog.', onRetry }) {
  return <div role="alert" className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
    <p className="font-bold text-sm text-slate-800">{message}</p>
    <p className="text-xs text-slate-500">Please try again. Your saved basket has been kept.</p>
    <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs">
      <RefreshCw size={14} aria-hidden="true" />Try again
    </button>
  </div>;
}
