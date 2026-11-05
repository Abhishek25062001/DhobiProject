import './SiteLoader.css';

const Shirt = () => (
  <svg className="id-loader__shirt" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path
      d="M18 16.5 32 24l14-7.5 9.5 8.2-7 5.4v22.4H15.5V22.1l-7-5.4 9.5-8.2Z"
      fill="#eef2ff"
      stroke="#5030ef"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <path
      d="M26 16.5c.4 4.2 2.7 6.8 6 6.8s5.6-2.6 6-6.8"
      stroke="#5030ef"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export default function SiteLoader({ label = 'Preparing your fresh load', screen = false }) {
  return (
    <div className={`id-loader${screen ? ' id-loader--screen' : ''}`} role="status" aria-live="polite">
      <div className="id-loader__stage" aria-hidden="true">
        <span className="id-loader__glow" />
        <span className="id-loader__orbit" />
        <span className="id-loader__door">
          <span className="id-loader__water" />
          <Shirt />
          <span className="id-loader__bubble" />
          <span className="id-loader__bubble id-loader__bubble--two" />
          <span className="id-loader__bubble id-loader__bubble--three" />
        </span>
      </div>
      <div className="id-loader__copy">
        <p className="id-loader__brand">Indo<span>Dhobi</span></p>
        <p className="id-loader__label">{label}</p>
      </div>
    </div>
  );
}
