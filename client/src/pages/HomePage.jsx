import React from 'react';
import LaundryHero from '../components/home/LaundryHero';
import HomePageSections from '../components/home/HomePageSections';
import '../components/home/HomePageTheme.css';

export default function HomePage() {
  return <div className="home-page" id="home-content">
    <LaundryHero />
    <HomePageSections />
  </div>;
}
