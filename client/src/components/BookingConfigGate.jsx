import React from 'react';
import { useOrderBooking } from '../context/OrderBookingContext';
import ApiLoadError from './ApiLoadError';

export default function BookingConfigGate({ children }) {
  const { loadingConfig, configError, platformConfig, fetchPlatformConfig } = useOrderBooking();
  if (loadingConfig) return <div role="status" className="min-h-[60vh] flex items-center justify-center gap-3 text-sm text-slate-500">
    <span className="h-5 w-5 rounded-full border-2 border-primary-200 border-t-primary-600 motion-safe:animate-spin" aria-hidden="true" />Loading booking information…
  </div>;
  if (configError || !platformConfig) return <div className="max-w-3xl mx-auto px-4 py-12 min-h-[60vh]">
    <ApiLoadError message="We couldn’t load booking information." onRetry={fetchPlatformConfig} />
  </div>;
  return children;
}
