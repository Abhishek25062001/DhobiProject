import React, { useEffect, useRef, useState } from 'react';
import { JourneyArt } from './LaundryArtwork';

const stages = [
  { kind: 'schedule', title: 'Schedule Pickup', description: 'Pick a time that suits you.' },
  { kind: 'pickup', title: 'We Pick Up', description: 'Right from your doorstep.' },
  { kind: 'care', title: 'We Clean with Care', description: 'Wash, press or dry clean.' },
  { kind: 'delivery', title: 'Fresh Delivery', description: 'Back to you in 48 hours.' },
];

export default function LaundryJourney() {
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
    <div className="hp-journey-heading"><span className="hp-eyebrow">FROM YOUR DOOR. BACK TO YOU.</span><h2 id="hp-journey-title">How <span>IndoDhobi</span><br />{' '}Works</h2><p>Laundry, off your to-do list.</p></div>
    <ol className="hp-journey-stages">
      {stages.map((stage, index) => <li key={stage.kind} style={{ '--stage': index }}><div className="hp-journey-visual"><JourneyArt kind={stage.kind} /></div><div className="hp-journey-step-label"><span className="hp-stage-number">{index + 1}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div></div></li>)}
    </ol>
  </section>;
}
