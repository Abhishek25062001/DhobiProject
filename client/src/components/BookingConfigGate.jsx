import React from 'react';
import { useOrderBooking } from '../context/OrderBookingContext';
import ApiLoadError from './ApiLoadError';
import SiteLoader from './SiteLoader';

export default function BookingConfigGate({ children }) {
  const { loadingConfig, configError, platformConfig, fetchPlatformConfig } = useOrderBooking();
  if (loadingConfig) return <SiteLoader label="Loading booking information" />;
  if (configError || !platformConfig) return <div className="max-w-3xl mx-auto px-4 py-12 min-h-[60vh]">
    <ApiLoadError message="We couldn’t load booking information." onRetry={fetchPlatformConfig} />
  </div>;
  return children;
}
