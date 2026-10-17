import ManagedImage from '../ManagedImage';
import React, { useState } from 'react';
import { ArrowLeftRight, MoveHorizontal, Sparkles } from 'lucide-react';

export default function GarmentComparison({ care, content }) {
  const [position, setPosition] = useState(50);
  return (
    <div className={`hp-comparison hp-comparison-${care.id}`}>
      <div className="hp-comparison-art" style={{ '--reveal': `${position}%` }}>
        <div className="hp-comparison-orbit" aria-hidden="true" />
        <span className="hp-before-label">{content.beforeLabel}<svg viewBox="0 0 40 42" aria-hidden="true"><path d="M10 3c-6 19 7 27 20 30m-11-10 12 11-15 3" /></svg></span>
        <span className="hp-after-label">{content.afterLabel}<svg viewBox="0 0 40 42" aria-hidden="true"><path d="M29 3c6 19-7 27-20 30m11-10L8 34l15 3" /></svg></span>
        <div className="hp-shirt-images" aria-hidden="true">
          <ManagedImage optional reference={content.afterImage} className="hp-shirt" width="1100" height="1375" fetchpriority="high" loading="eager" draggable="false" />
          <ManagedImage optional reference={content.beforeImage} className="hp-shirt hp-shirt-before" width="1100" height="1375" draggable="false" />
        </div>
        <div className="hp-comparison-divider" aria-hidden="true"><span><MoveHorizontal size={19} /></span></div>
        <input type="range" className="hp-comparison-range" min="0" max="100" step="1" value={position} onChange={event => setPosition(Number(event.target.value))} aria-label={content.compareLabel} aria-valuetext={`${position}% ${content.beforeLabel}, ${100 - position}% ${content.afterLabel}`} aria-describedby="hp-comparison-help" />
        <div className="hp-clean-effects" key={care.id} aria-hidden="true"><span className="hp-bubble hp-bubble-one" /><span className="hp-bubble hp-bubble-two" /><Sparkles className="hp-sparkle" size={24} /><span className="hp-steam hp-steam-one" /><span className="hp-steam hp-steam-two" /></div>
      </div>
      <p id="hp-comparison-help"><ArrowLeftRight size={14} aria-hidden="true" />{content.compareLabel}<span className="hp-sr-only">. {content.compareHelp}</span></p>
    </div>
  );
}
