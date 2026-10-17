import React, { createContext, useContext } from 'react';
import useSiteContent from '../hooks/useSiteContent';
import { useOrderBooking } from './OrderBookingContext';

const SiteContentContext = createContext(null);
export function SiteContentProvider({ children }) {
  const { platformConfig } = useOrderBooking();
  const home = useSiteContent('home', platformConfig);
  const bindings = { 'home.turnaroundHours': home.section('hero')?.turnaroundHours };
  const global = useSiteContent('global', platformConfig, bindings);
  return <SiteContentContext.Provider value={{ global, bindings, config: platformConfig }}>{children}</SiteContentContext.Provider>;
}
export const useGlobalContent = () => useContext(SiteContentContext);
