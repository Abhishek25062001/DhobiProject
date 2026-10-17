import useServiceAreas from '../hooks/useServiceAreas';
import React from 'react';
import LaundryHero from '../components/home/LaundryHero';
import LaundryJourney from '../components/home/LaundryJourney';
import HomePageSections from '../components/home/HomePageSections';
import ApiLoadError from '../components/ApiLoadError';
import useSiteContent from '../hooks/useSiteContent';
import { useOrderBooking } from '../context/OrderBookingContext';
import '../components/home/HomePageTheme.css';

export default function HomePage() {
  const { platformConfig, catalogGarments } = useOrderBooking();
  const coverage = useServiceAreas();
  const content = useSiteContent('home', platformConfig);
  if (content.error) return <ApiLoadError message="The homepage could not be loaded." onRetry={content.retry} />;
  if (content.loading) return <div className="min-h-[70vh]" aria-busy="true" aria-label="Loading homepage" />;
  const groups = [];
  for (const section of content.sections.filter(section => section.type !== 'copy')) {
    const upper = ['hero', 'journey'].includes(section.key);
    if (!groups.length || groups.at(-1).upper !== upper) groups.push({ upper, sections: [] });
    groups.at(-1).sections.push(section);
  }
  return <div className="home-page" id="home-content">{groups.map((group, i) => group.upper ? <div className="hp-page" key={i}><div className="hp-shell">{group.sections.map(section => section.key === 'hero' ? <LaundryHero key={section.key} content={section.content} text={content.text} copy={content.t} /> : <LaundryJourney key={section.key} content={section.content} text={content.text} />)}</div></div> : <div className="home-sections" key={i}>{group.sections.map(section => <HomePageSections key={section.key} section={section} text={content.text} garments={catalogGarments} config={platformConfig} coverage={coverage} />)}</div>)}</div>;
}
