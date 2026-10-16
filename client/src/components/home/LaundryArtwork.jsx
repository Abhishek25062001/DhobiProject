import React, { useId, useState } from 'react';
import { Layers, Sparkles, WashingMachine } from 'lucide-react';
import { garmentPresentation } from './homepageCatalog';

const atlasPositions = {
  kurti: '0% 0%', trousers: '50% 0%', tshirt: '100% 0%',
  linen: '0% 50%', suit: '50% 50%', saree: '100% 50%',
  pickup: '0% 100%', care: '50% 100%', delivery: '100% 100%',
};

function LaundrySprite({ kind, className = '' }) {
  return <span className={`hp-garment-image hp-sprite hp-sprite-${kind} ${className}`} style={{ backgroundPosition: atlasPositions[kind] }} aria-hidden="true" />;
}

export function CareIcon({ kind, size = 25 }) {
  if (kind === 'wash') return <WashingMachine size={size} strokeWidth={1.7} aria-hidden="true" />;
  if (kind === 'dry') return <Sparkles size={size} strokeWidth={1.7} aria-hidden="true" />;
  if (kind === 'starch') return <Layers size={size} strokeWidth={1.7} aria-hidden="true" />;
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h22l-3-10H11C7 11 4 16 3 21ZM11 11V8h8a3 3 0 0 1 3 3M3 24h22M10 3v1m5-2v2m5-1v1" /><circle cx="18" cy="17" r="1" fill="currentColor" stroke="none" /></svg>;
}

export function GarmentThumbnail({ garment, kind: suppliedKind, className = '' }) {
  const id = useId().replace(/:/g, '');
  const [failedUrl, setFailedUrl] = useState(null);
  const kind = suppliedKind || garmentPresentation(garment).kind;
  const image = garment?.imageUrl || (kind === 'shirt' ? '/images/laundry/shirt-after-480.webp' : null);
  if (image && image !== failedUrl) return <img className={`hp-garment-image ${className}`} src={image} alt="" width="100" height="100" loading="lazy" decoding="async" onError={() => setFailedUrl(image)} />;
  if (atlasPositions[kind]) return <LaundrySprite kind={kind} className={className} />;
  const pink = kind === 'kurti' || kind === 'saree';
  return <svg className={`hp-garment-image ${className}`} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-fabric`} x1=".15" y1="0" x2=".85" y2="1"><stop stopColor={pink ? '#f5d6df' : kind === 'suit' ? '#7883a2' : '#bfd5fa'} /><stop offset=".45" stopColor={pink ? '#d897ac' : kind === 'suit' ? '#475575' : '#7fa8e8'} /><stop offset="1" stopColor={pink ? '#bc7694' : kind === 'suit' ? '#263650' : '#4d79bd'} /></linearGradient><linearGradient id={`${id}-linen`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e4edfc" /><stop offset="1" stopColor="#9ebde9" /></linearGradient></defs>
    <ellipse cx="50" cy="90" rx="31" ry="4" fill="#182b5d" opacity=".07" />
    {kind === 'trousers' ? <><path d="m31 11-7 76 19 2 9-50 4 50 20-2-8-76Z" fill={`url(#${id}-fabric)`} /><path d="M31 17h37M51 17v20M33 20c-1 10-6 11-6 11m39-11c1 10 5 11 5 11M39 34l-7 49m29-49 5 49" stroke="#325583" strokeWidth="1.1" /><circle cx="53" cy="14" r="1.5" fill="#d9c29a" /></> : kind === 'linen' ? <><rect x="15" y="65" width="72" height="18" rx="5" fill="#789ad2" /><path d="M18 72h65" stroke="#b4caec" strokeWidth="2" /><path d="m15 65 12-11h51l9 11Z" fill="#adc6ed" /><rect x="12" y="47" width="72" height="19" rx="5" fill="#a2bfe8" /><path d="m12 47 13-11h48l11 11Z" fill="#d1e0f6" /><rect x="16" y="29" width="70" height="20" rx="6" fill={`url(#${id}-linen)`} /><path d="m17 31 12-12h43l13 12Z" fill="#e9f0fc" /><path d="M23 38h57M22 57h55" stroke="#e5edfc" strokeWidth="2" strokeLinecap="round" /></> : kind === 'curtain' ? <><path d="M20 14h61v72H20Z" fill={`url(#${id}-fabric)`} /><path d="M29 15v69m13-69v69m13-69v69m13-69v69" stroke="#d5e2f8" strokeWidth="4" opacity=".7" /><path d="M16 12h70" stroke="#687894" strokeWidth="3" strokeLinecap="round" /></> : kind === 'saree' ? <><path d="m29 12 37 6 16 64-50 5-12-48Z" fill={`url(#${id}-fabric)`} /><path d="m33 12 2 71m9-68 3 68m10-66 3 64m-39-44 46 42" stroke="#eebecf" strokeWidth="2" /><path d="m29 80 51-6 2 8-50 5Z" fill="#b48655" /></> : <>
      <path d={kind === 'kurti' ? 'm37 14-17 9-9 30 14 7 9-22-11 48h55L66 38l9 22 14-7-9-30-17-9Z' : kind === 'tshirt' ? 'm36 18-19 8-10 21 17 9 9-13v39h34V43l9 13 17-9-10-21-19-8Z' : 'm35 16-18 10-10 39 16 5 10-30-4 45h42l-4-45 10 30 16-5-10-39-18-10Z'} fill={`url(#${id}-fabric)`} />
      {kind === 'tshirt' ? <path d="M36 18c1 16 27 16 28 0" stroke="#d8e4f6" strokeWidth="4" /> : kind === 'suit' ? <><path d="m35 16 15 17 15-17-15 47Z" fill="#f4f6fc" /><path d="m35 16-7 17 14 26 8-26-15-17Zm30 0 7 17-14 26-8-26Z" fill="#33415c" /></> : <><path d="m37 14 13 13 13-13-7 21-6-8-6 8Z" fill={pink ? '#f2ccd9' : '#dfebfb'} /><path d="M50 28v53" stroke={pink ? '#b97493' : '#668bc2'} /><circle cx="53" cy="40" r="1.3" fill="#f7f9ff" /><circle cx="53" cy="52" r="1.3" fill="#f7f9ff" /><circle cx="53" cy="64" r="1.3" fill="#f7f9ff" /></>}
      <path d="m36 45-3 32m32-32 3 32" stroke={pink ? '#f4c4d6' : '#c3d7f6'} opacity=".6" strokeWidth="2" />
    </>}
  </svg>;
}

export function JourneyArt({ kind }) {
  const id = useId().replace(/:/g, '');
  if (atlasPositions[kind]) return <LaundrySprite kind={kind} className="hp-journey-art" />;
  return <svg className="hp-journey-art" viewBox="0 0 150 100" fill="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#c6d3ec" /></linearGradient></defs>
    <ellipse cx="75" cy="90" rx="49" ry="5" fill="#183266" opacity=".08" />
    {kind === 'schedule' ? <><circle cx="75" cy="49" r="42" fill="#ebe9ff" /><rect x="52" y="9" width="45" height="79" rx="8" fill="#263462" /><rect x="56" y="16" width="37" height="64" rx="4" fill="#f4f6ff" /><rect x="67" y="13" width="15" height="3" rx="1.5" fill="#152143" /><rect x="62" y="31" width="25" height="25" rx="5" fill="#e4e0ff" /><path d="m68 43 5 5 9-10" stroke="#6354df" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M64 64h20m-16 5h12" stroke="#b0b9d3" strokeWidth="2" strokeLinecap="round" /></> : kind === 'pickup' ? <><path d="M13 29a10 10 0 0 1 10-10h62v62H13Z" fill={`url(#${id})`} /><path d="M85 35h23l25 27v19H85Z" fill="#d9e2f4" /><path d="M93 41h12l17 20H93Z" fill="#7889ad" /><path d="M15 70h117v10H15Z" fill="#a5b3d0" /><path d="M90 37v34M101 66h7" stroke="#acb9d1" strokeWidth="2" /><rect x="24" y="35" width="50" height="22" rx="5" fill="#f1efff" /><text x="49" y="49" textAnchor="middle" fill="#4f46e5" fontSize="9" fontWeight="700">IndoDhobi</text><circle cx="35" cy="80" r="12" fill="#26334e" /><circle cx="35" cy="80" r="6" fill="#a7b3cd" /><circle cx="111" cy="80" r="12" fill="#26334e" /><circle cx="111" cy="80" r="6" fill="#a7b3cd" /></> : <><rect x="42" y="13" width="66" height="76" rx="9" fill={`url(#${id})`} /><path d="M43 31h64" stroke="#b6c4dd" /><rect x="50" y="21" width="18" height="4" rx="2" fill="#a5b5d2" /><circle cx="97" cy="23" r="4" fill="#7789b1" /><circle cx="75" cy="57" r="23" fill="#a8b8dd" /><circle cx="75" cy="57" r="18" fill="#4e638f" /><path d="M59 56c10-8 18 15 33 2a18 18 0 0 1-33 4" fill="#bfd4f3" /><path d="M63 45a16 16 0 0 1 12-5" stroke="#ecf4ff" strokeWidth="2.5" strokeLinecap="round" /><circle cx="123" cy="24" r="8" fill="#dfecfb" stroke="#a6c9e8" /><circle cx="25" cy="61" r="5" fill="#edf5fc" stroke="#b8d5ef" /></>}
  </svg>;
}
