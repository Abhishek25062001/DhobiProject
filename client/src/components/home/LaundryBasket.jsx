import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Grid2X2, Minus, Plus, RotateCw, ShoppingBag, X } from 'lucide-react';
import { calculateItemUnitPrice, useOrderBooking } from '../../context/OrderBookingContext';
import { catalogueCategories, formatRupees, garmentPresentation, itemCareLabel } from './homepageCatalog';
import { GarmentThumbnail } from './LaundryArtwork';

export default function LaundryBasket({ garments, status, onRetry, care }) {
  const booking = useOrderBooking();
  const { cartItems, addItem, updateQuantity, removeItem, itemCount, subtotal, grandTotal, taxAmount, pickupDeliveryFee, expressSurcharge, discountAmount, platformConfig, loadingConfig } = booking;
  const [category, setCategory] = useState('Men');
  const headingId = useId();
  const categories = catalogueCategories(garments);
  const activeCategory = categories.some(tab => tab.value === category) ? category : categories[0]?.value;
  const visible = garments.filter(garment => garment.category === activeCategory);
  const preferenceFee = grandTotal - subtotal - pickupDeliveryFee - expressSurcharge + discountAmount - taxAmount;
  const gstPercentage = platformConfig?.gstPercentage ?? 5;

  return <aside id="laundry-basket" className="hp-live-basket" aria-labelledby={headingId}>
    <div className="hp-basket-title"><h2 id={headingId}>What would you like to clean?</h2><ShoppingBag size={19} aria-hidden="true" /></div>
    <div className="hp-categories" role="group" aria-label="Garment category">
      {categories.map(tab => <button type="button" key={tab.value} aria-pressed={activeCategory === tab.value} onClick={() => setCategory(tab.value)}>{tab.label}</button>)}
      {status === 'loading' && <span className="hp-loading-label">Loading your wardrobe…</span>}
    </div>
    <div className="hp-garment-grid" aria-busy={status === 'loading'}>
      {status === 'loading' ? Array.from({ length: 6 }, (_, index) => <div className="hp-garment-skeleton" key={index} aria-hidden="true" />) : status === 'error' ? <div className="hp-catalog-fallback" role="status"><ShoppingBag size={28} aria-hidden="true" /><strong>We couldn’t load the prices.</strong><span>Your basket is still here.</span><button type="button" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />Try again</button></div> : visible.length === 0 ? <div className="hp-catalog-fallback"><ShoppingBag size={28} aria-hidden="true" /><strong>No items available here yet.</strong><Link to="/book">Explore booking <ArrowRight size={15} /></Link></div> : <>
        {visible.map(garment => {
          const item = cartItems.find(entry => !entry.isCustomItem && entry.garment._id === garment._id);
          const quantity = item?.quantity || 0;
          const presentation = garmentPresentation(garment);
          const unitPrice = calculateItemUnitPrice(garment, item?.serviceType || care.service, item?.ironingType || care.ironing);
          return <article className={`hp-garment-card ${quantity ? 'hp-garment-selected' : ''}`} key={garment._id} aria-label={`${garment.name}, ${formatRupees(unitPrice)} per piece`}>
            <GarmentThumbnail garment={garment} />
            <h3 title={garment.name}>{presentation.name}</h3>
            <div className="hp-garment-price">{formatRupees(unitPrice)}<span>/ pc</span></div>
            <div className="hp-quantity" role="group" aria-label={`${garment.name} quantity`}>
              <button type="button" disabled={!quantity} aria-label={`Remove one ${garment.name}`} onClick={() => updateQuantity(item.cartItemId || garment._id, quantity - 1)}><Minus size={13} aria-hidden="true" /></button>
              <span className="hp-quantity-number" key={quantity}>{quantity}</span>
              <button type="button" aria-label={`Add one ${garment.name}`} onClick={() => item ? updateQuantity(item.cartItemId || garment._id, quantity + 1) : addItem(garment, care.service, care.ironing)}><Plus size={15} aria-hidden="true" /></button>
            </div>
          </article>;
        })}
        <Link className="hp-more-items" to="/book" state={{ startAtBeginning: true }}><Grid2X2 size={25} strokeWidth={1.5} aria-hidden="true" /><span>More items</span><ArrowRight size={15} aria-hidden="true" /></Link>
      </>}
    </div>

    <section className="hp-basket-items" aria-label="Your selected garments">
      <div className="hp-basket-items-heading"><h3>Your basket</h3><span>{itemCount} {itemCount === 1 ? 'piece' : 'pieces'}</span></div>
      {cartItems.length === 0 ? <div className="hp-empty-basket"><span><ShoppingBag size={23} strokeWidth={1.4} aria-hidden="true" /></span><p>A fresh start for your favourites.<small>Add a piece above to see your estimate.</small></p></div> : <ul className="hp-basket-item-list" tabIndex={cartItems.length > 3 ? 0 : undefined} aria-label="Basket items">
        {cartItems.map(item => <li key={item.cartItemId || item.garment._id}>
          <GarmentThumbnail garment={item.garment} />
          <div><span>{item.quantity} × {item.isCustomItem ? item.customDescription || item.garment.name : garmentPresentation(item.garment).name}</span><small>{itemCareLabel(item)}</small></div>
          <strong>{formatRupees(item.lineTotal)}</strong>
          <button type="button" aria-label={`Remove ${item.isCustomItem ? item.customDescription || item.garment.name : item.garment.name} from basket`} onClick={() => removeItem(item.cartItemId || item.garment._id)}><X size={13} aria-hidden="true" /></button>
        </li>)}
      </ul>}
    </section>

    <dl className="hp-estimate-lines">
      <div><dt>Subtotal</dt><dd>{formatRupees(subtotal)}</dd></div>
      <div><dt>Pickup & delivery</dt><dd>{itemCount ? pickupDeliveryFee ? formatRupees(pickupDeliveryFee) : <span className="hp-free">Free</span> : '—'}</dd></div>
      {expressSurcharge > 0 && <div><dt>Express service</dt><dd>{formatRupees(expressSurcharge)}</dd></div>}
      {preferenceFee > 0 && <div><dt>Care extras</dt><dd>{formatRupees(preferenceFee)}</dd></div>}
      {discountAmount > 0 && <div><dt>Discount</dt><dd>−{formatRupees(discountAmount)}</dd></div>}
      <div><dt>GST ({gstPercentage}%)</dt><dd>{formatRupees(taxAmount)}</dd></div>
      <div className="hp-grand-total"><dt>Estimated total</dt><dd><output key={grandTotal} className="hp-price-update" aria-live="polite" aria-label={`Estimated total for ${itemCount} pieces`}>{loadingConfig ? '…' : formatRupees(grandTotal)}</output></dd></div>
    </dl>
    <Link className="hp-button hp-basket-cta" to="/book" state={{ startAtBeginning: true }}>Book Pickup <ArrowRight size={18} aria-hidden="true" /></Link>
    <p className="hp-booking-note"><CalendarDays size={15} aria-hidden="true" />Choose your pickup date & time in booking</p>
  </aside>;
}
