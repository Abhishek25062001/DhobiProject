import useServiceAreas from '../hooks/useServiceAreas';
import React from 'react';
import LaundryHero from '../components/home/LaundryHero';
import LaundryJourney from '../components/home/LaundryJourney';
import HomePageSections from '../components/home/HomePageSections';
import ContentBlocks from '../components/ContentBlocks';
import ActiveOrderTracker from '../components/ActiveOrderTracker';
import ApiLoadError from '../components/ApiLoadError';
import useSiteContent from '../hooks/useSiteContent';
import { useOrderBooking } from '../context/OrderBookingContext';
import '../components/home/HomePageTheme.css';

export default function HomePage() {
  const { platformConfig, catalogGarments } = useOrderBooking();
  const coverage = useServiceAreas();
  const content = useSiteContent('home', platformConfig);
  const groups = [];
  for (const section of content.sections.filter(section => section.type !== 'copy')) {
    const upper = ['hero', 'journey'].includes(section.key);
    if (!groups.length || groups.at(-1).upper !== upper) groups.push({ upper, sections: [] });
    groups.at(-1).sections.push(section);
  }
  return <div className="home-page" id="home-content">
    <div className="hp-shell"><ActiveOrderTracker /></div>
    {content.error && !content.page ? <ApiLoadError message="The homepage could not be loaded." onRetry={content.retry} />
      : content.loading && !content.page ? <div className="min-h-[70vh]" aria-busy="true" aria-label="Loading homepage" />
      : groups.map((group, index) => group.upper
        ? <div className="hp-page" key={index}><div className="hp-shell">{group.sections.map(section => section.key === 'hero'
          ? <LaundryHero key={section.key} content={section.content} text={content.text} copy={content.t} />
          : <LaundryJourney key={section.key} content={section.content} text={content.text} />
        )}</div></div>
        : <div className="home-sections" key={index}>{group.sections.map(section => section.type === 'textBlocks'
          ? <div key={section.key} className="max-w-6xl mx-auto px-4 py-8"><ContentBlocks content={section.content} text={content.text} /></div>
          : <HomePageSections key={section.key} section={section} text={content.text} garments={catalogGarments} config={platformConfig} coverage={coverage} />
        )}</div>
      )}
  </div>;
}
