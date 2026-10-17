import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock3, CreditCard, Leaf, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { calculateItemUnitPrice, useOrderBooking } from '../../context/OrderBookingContext';
import useGarments from '../../hooks/useGarments';
import ActiveOrderTracker from '../ActiveOrderTracker';
import GarmentComparison from './GarmentComparison';
import LaundryBasket from './LaundryBasket';
import LaundryJourney from './LaundryJourney';
import { CareIcon } from './LaundryArtwork';
import { HOME_CARE_OPTIONS, formatRupees } from './homepageCatalog';
import './LaundryHero.css';

export default function LaundryHero() {
  const { cartItems, setCartItems, freeDeliveryThreshold, platformConfig } = useOrderBooking();
  const [care, setCare] = useState(() => HOME_CARE_OPTIONS.find(option => option.service === cartItems[0]?.serviceType && option.ironing === cartItems[0]?.ironingType) || HOME_CARE_OPTIONS[0]);
  const catalog = useGarments();
  const garments = catalog.garments.filter(garment => garment.isActive !== false && !garment.isCustom);
  const status = catalog.loading ? 'loading' : catalog.error ? 'error' : 'ready';

  const isCareAvailable = option => platformConfig?.serviceTypes?.find(service => service.code === option.service)?.isActive !== false && platformConfig?.ironingTiers?.find(tier => tier.code === option.ironing)?.isActive !== false;
  const chooseCare = option => {
    setCare(option);
    setCartItems(items => items.map(item => {
      if (item.isCustomItem) return item;
      const unitPrice = calculateItemUnitPrice(item.garment, option.service, option.ironing);
      return { ...item, serviceType: option.service, ironingType: option.ironing, unitPrice, lineTotal: unitPrice * item.quantity };
    }));
  };
  const cashAvailable = platformConfig?.companyPaymentConfig?.allowCashOnDelivery !== false;

  return <div className="hp-page">
    <div className="hp-shell">
      <ActiveOrderTracker />
      <section className="hp-hero" aria-labelledby="hp-hero-title">
        <div className="hp-brand-message">
          <span className="hp-eyebrow">FRESH CLOTHES. BRIGHTER DAYS.</span>
          <h1 id="hp-hero-title">Laundry,<br /><span>Sorted.</span></h1>
          <p className="hp-sr-only">Doorstep laundry, steam pressing and dry cleaning. Choose your care, build your basket and schedule a pickup.</p>
        </div>
        <div className="hp-visual-center"><GarmentComparison care={care} /><span className="hp-fresh-note" aria-hidden="true">Same clothes.<br /><span>New confidence.</span></span></div>
        <div className="hp-hero-actions">
          <Link to="/book" state={{ startAtBeginning: true }} className="hp-button hp-main-cta">Schedule Pickup <ArrowRight size={21} aria-hidden="true" /></Link>
          <div className="hp-compact-trust"><span><Truck size={14} aria-hidden="true" />Free pickup from {formatRupees(freeDeliveryThreshold)}</span><span><Clock3 size={14} aria-hidden="true" />48 hours</span><span><CreditCard size={14} aria-hidden="true" />{cashAvailable ? 'COD / UPI' : 'UPI'}</span></div>
          <Link className="hp-coverage-link" to="/operational-areas"><MapPin size={14} aria-hidden="true" />Check pickup availability <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        <fieldset className="hp-service-picker" id="services"><legend className="hp-sr-only">Choose your care</legend><div className="hp-service-buttons">{HOME_CARE_OPTIONS.map(option => <button type="button" key={option.id} aria-pressed={care.id === option.id} disabled={!isCareAvailable(option)} onClick={() => chooseCare(option)}><CareIcon kind={option.id} size={30} /><span>{option.label}</span><Check className="hp-service-check" size={12} aria-hidden="true" /></button>)}</div><p aria-live="polite"><strong>{care.description}</strong><span className="hp-sr-only">Applies to standard items in your basket.</span></p></fieldset>
        <LaundryBasket garments={garments} status={status} onRetry={catalog.retry} care={care} />
        <div className="hp-benefits">
          <div><span className="hp-benefit-icon"><Truck size={30} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>Free<br />Pickup</strong><small>From {formatRupees(freeDeliveryThreshold)}</small></span></div>
          <div><span className="hp-benefit-icon"><Clock3 size={30} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>48-Hour<br />Turnaround</strong><small>Fresh clothes, less waiting</small></span></div>
          <div><span className="hp-benefit-icon hp-benefit-teal"><ShieldCheck size={30} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>Professional<br />Care</strong><small>A finish for every fabric</small></span></div>
          <div><span className="hp-benefit-icon hp-benefit-teal"><Leaf size={30} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>Your Clothes,<br />Your Way</strong><small>Choose your wash care</small></span></div>
        </div>
      </section>
      <LaundryJourney />
    </div>
  </div>;
}
