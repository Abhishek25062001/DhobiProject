import React from 'react';
import ManagedImage from '../ManagedImage';
import { Layers, Sparkles, WashingMachine } from 'lucide-react';

export function CareIcon({ kind, size = 25 }) {
  if (kind === 'wash') return <WashingMachine size={size} strokeWidth={1.7} aria-hidden="true" />;
  if (kind === 'dry') return <Sparkles size={size} strokeWidth={1.7} aria-hidden="true" />;
  if (kind === 'starch') return <Layers size={size} strokeWidth={1.7} aria-hidden="true" />;
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h22l-3-10H11C7 11 4 16 3 21ZM11 11V8h8a3 3 0 0 1 3 3M3 24h22M10 3v1m5-2v2m5-1v1" /><circle cx="18" cy="17" r="1" fill="currentColor" stroke="none" /></svg>;
}

export function GarmentThumbnail({ garment, className = '' }) {
  return <ManagedImage reference={garment?.primaryImage} className={`hp-garment-image ${className}`} />;
}
