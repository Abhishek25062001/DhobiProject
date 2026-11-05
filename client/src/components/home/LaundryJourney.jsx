import React from 'react';
import ManagedImage from '../ManagedImage';
import { visibleContentItems } from '../../../../shared/contentSchema.mjs';

export default function LaundryJourney({ content, text }) {
  const stages = visibleContentItems(content.stages);
  return <section id="how-it-works" className="hp-journey" aria-labelledby="hp-journey-title">
    <div className="hp-journey-heading" data-scroll-reveal="rise" data-reveal-key="heading-journey"><span className="hp-eyebrow">{text(content.eyebrow)}</span><h2 id="hp-journey-title">{text(content.plain)} <span>{text(content.accent)}</span><br />{' '}{text(content.suffix)}</h2><p>{text(content.intro)}</p></div>
    <ol className="hp-journey-stages" data-scroll-reveal="connector" data-reveal-key="journey-connector">
      {stages.map((stage, index) => <li key={stage.id} data-scroll-reveal="rise" data-reveal-key={`journey-${stage.id}`}><div className="hp-journey-visual"><ManagedImage optional reference={stage.image} className="hp-garment-image hp-journey-art" width={150} height={100} /></div><div className="hp-journey-step-label"><span className="hp-stage-number">{index + 1}</span><div><h3>{text(stage.title)}</h3><p>{text(stage.description)}</p></div></div></li>)}
    </ol>
  </section>;
}
