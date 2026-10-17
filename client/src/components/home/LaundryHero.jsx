import ContentIcon from '../ContentIcon';
import { visibleContentItems } from '../../../../shared/contentSchema.mjs';
import { selectionAvailable } from '../../../../shared/pricing.mjs';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock3, CreditCard, Leaf, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { calculateItemUnitPrice, useOrderBooking } from '../../context/OrderBookingContext';
import useGarments from '../../hooks/useGarments';
import ActiveOrderTracker from '../ActiveOrderTracker';
import GarmentComparison from './GarmentComparison';
import LaundryBasket from './LaundryBasket';
import { CareIcon } from './LaundryArtwork';
import { formatRupees } from './homepageCatalog';
import './LaundryHero.css';

export default function LaundryHero({ content, text, copy }) {
  const { cartItems, setCartItems, freeDeliveryThreshold, platformConfig } = useOrderBooking();
  const options = (platformConfig?.homeCareOptions || []).filter(option => option.isActive !== false && platformConfig.serviceTypes.some(service => service.code === option.service && service.isActive !== false) && (option.ironing === 'NONE' || platformConfig.ironingTiers.some(tier => tier.code === option.ironing && tier.isActive !== false))).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const [careId, setCareId] = useState(() => options.find(option => option.service === cartItems[0]?.serviceType && option.ironing === cartItems[0]?.ironingType)?.id || options[0]?.id);
  const care = options.find(option => option.id === careId) || options[0] || { id: '', service: '', ironing: 'NONE', description: copy('unavailableServices') };
  const catalog = useGarments();
  const garments = catalog.garments.filter(garment => garment.isActive !== false && !garment.isCustom);
  const status = catalog.loading ? 'loading' : catalog.error ? 'error' : 'ready';

  const isCareAvailable = option => platformConfig?.serviceTypes?.find(service => service.code === option.service)?.isActive !== false && platformConfig?.ironingTiers?.find(tier => tier.code === option.ironing)?.isActive !== false;
  const chooseCare = option => {
    setCareId(option.id);
    setCartItems(items => items.map(item => {
      if (item.isCustomItem || !selectionAvailable(item.garment, platformConfig, option.service, option.ironing)) return item;
      const unitPrice = calculateItemUnitPrice(item.garment, option.service, option.ironing);
      return { ...item, serviceType: option.service, ironingType: option.ironing, unitPrice, unavailableReason: '', lineTotal: Math.round(unitPrice * item.quantity * 100) / 100 };
    }));
  };
  const cashAvailable = platformConfig?.companyPaymentConfig?.allowCashOnDelivery !== false;

  return <>
      <ActiveOrderTracker />
      <section className="hp-hero" aria-labelledby="hp-hero-title">
        <div className="hp-brand-message">
          <span className="hp-eyebrow">{text(content.eyebrow)}</span>
          <h1 id="hp-hero-title">{text(content.plain)}<br /><span>{text(content.accent)}</span></h1>
          <p className="hp-sr-only">{text(content.description)}</p>
        </div>
        <div className="hp-visual-center"><GarmentComparison care={care} content={content} /><span className="hp-fresh-note" aria-hidden="true">{text(content.notePlain)}<br /><span>{text(content.noteAccent)}</span></span></div>
        <div className="hp-hero-actions">
          <Link to={content.actionHref || "/book"} state={{ startAtBeginning: true }} className="hp-button hp-main-cta">{text(content.actionLabel)} <ArrowRight size={21} aria-hidden="true" /></Link>
          <div className="hp-compact-trust"><span><Truck size={14} aria-hidden="true" />{text(content.pickupText)}</span><span><Clock3 size={14} aria-hidden="true" />{content.turnaroundHours} hours</span><span><CreditCard size={14} aria-hidden="true" />{cashAvailable ? text(content.paymentText) : 'UPI'}</span></div>
          <Link className="hp-coverage-link" to={content.coverageHref || "/operational-areas"}><MapPin size={14} aria-hidden="true" />{text(content.coverageLabel)} <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        <fieldset className="hp-service-picker" id="services"><legend className="hp-sr-only">{copy('chooseCare')}</legend><div className="hp-service-buttons">{options.map(option => <button type="button" key={option.id} aria-pressed={care.id === option.id} disabled={!isCareAvailable(option)} onClick={() => chooseCare(option)}><CareIcon kind={option.icon || option.id} size={30} /><span>{option.label}</span><Check className="hp-service-check" size={12} aria-hidden="true" /></button>)}</div><p aria-live="polite"><strong>{care.description}</strong><span className="hp-sr-only">{copy('careApplies')}</span></p></fieldset>
        <LaundryBasket garments={garments} status={status} onRetry={catalog.retry} care={care} copy={copy} />
        <div className="hp-benefits">
          {visibleContentItems(content.benefits).map((benefit, index) => <div key={benefit.id}><span className={`hp-benefit-icon${index > 1 ? ' hp-benefit-teal' : ''}`}><ContentIcon name={benefit.icon} size={30} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>{text(benefit.title).split('\n').map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>)}</strong><small>{text(benefit.subtitle)}</small></span></div>)}
        </div>
      </section>
  </>;
}
