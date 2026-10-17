import React, { useEffect, useRef, useState } from 'react';
import ManagedImage from '../ManagedImage';
import { visibleContentItems } from '../../../../shared/contentSchema.mjs';

export default function LaundryJourney({ content, text }) {
  const stages = visibleContentItems(content.stages);
  const section = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.2 });
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  return <section id="how-it-works" className={`hp-journey ${visible ? 'hp-journey-visible' : ''}`} ref={section} aria-labelledby="hp-journey-title">
    <div className="hp-journey-heading"><span className="hp-eyebrow">{text(content.eyebrow)}</span><h2 id="hp-journey-title">{text(content.plain)} <span>{text(content.accent)}</span><br />{' '}{text(content.suffix)}</h2><p>{text(content.intro)}</p></div>
    <ol className="hp-journey-stages">
      {stages.map((stage, index) => <li key={stage.id} style={{ '--stage': index }}><div className="hp-journey-visual"><ManagedImage optional reference={stage.image} className="hp-garment-image hp-journey-art" width={150} height={100} /></div><div className="hp-journey-step-label"><span className="hp-stage-number">{index + 1}</span><div><h3>{text(stage.title)}</h3><p>{text(stage.description)}</p></div></div></li>)}
    </ol>
  </section>;
}
