import { HANGER_PATH } from '../branding/identity.mjs';
import './SiteLoader.css';

export default function SiteLoader({ label = 'Preparing your fresh load', screen = false }) {
  return (
    <div className={`id-loader${screen ? ' id-loader--screen' : ''}`} role="status" aria-live="polite">
      <div className="id-loader__stage" aria-hidden="true">
        <svg className="id-loader__mark" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round">
          <path className="id-loader__outline" d={HANGER_PATH} />
          <path className="id-loader__trace" d={HANGER_PATH} pathLength="1" />
        </svg>
      </div>
      <div className="id-loader__copy">
        <p className="id-loader__brand">Indo<span>Dhobi</span></p>
        <p className="id-loader__label">{label}</p>
      </div>
      <div className="id-loader__progress" aria-hidden="true"><span /></div>
    </div>
  );
}
