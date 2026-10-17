import React, { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { GarmentThumbnail } from '../home/LaundryArtwork';
import { useOrderBooking, calculateItemUnitPrice } from '../../context/OrderBookingContext';
import './BookingGarmentCard.css';
import { availableServices, availableFinishes, preferredFinish, selectionAvailable } from '../../../../shared/pricing.mjs';

export default function BookingGarmentCard({ garment, cartItem, addItem, updateQuantity, updateServiceType, updateIroningType, fallbackIcon, copy }) {
  const [draftService, setDraftService] = useState('WASH_AND_IRON');
  const [draftFinish, setDraftFinish] = useState('STANDARD_STEAM');
  const [editingFinish, setEditingFinish] = useState(false);
  const { platformConfig } = useOrderBooking();
  const services = availableServices(garment, platformConfig).map(option => [option.code, option.shortName || option.name]);
  const finishes = availableFinishes(garment, platformConfig).map(option => [option.code, option.shortName || option.name]);
  const service = cartItem?.serviceType || (services.some(([code]) => code === draftService) ? draftService : services[0]?.[0]);
  const finish = cartItem?.ironingType || preferredFinish(garment, platformConfig, service, draftFinish);
  const available = selectionAvailable(garment, platformConfig, service, finish);
  const quantity = cartItem?.quantity || 0;
  const itemId = cartItem?.cartItemId || garment._id;
  const ironing = service === 'WASH_AND_IRON' || service === 'IRON_ONLY';
  const unitPrice = available ? calculateItemUnitPrice(garment, service, finish) : null;
  const finishLabel = finishes.find(([id]) => id === finish)?.[1] || 'Unavailable';


  function chooseService(value) {
    setDraftService(value);
    setDraftFinish(preferredFinish(garment, platformConfig, value, finish));
    if (cartItem) updateServiceType(itemId, value);
    setEditingFinish(false);
  }
  function chooseFinish(value) {
    setDraftFinish(value);
    if (cartItem) updateIroningType(itemId, value);
    setEditingFinish(false);
  }

  return (
    <article className={`booking-garment-card bg-white rounded-2xl p-4 border ${quantity ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'border-slate-200/90 shadow-xs'}`} aria-label={garment.name}>
      <div className="booking-garment-main">
        <div className="booking-garment-photo">
          <GarmentThumbnail garment={garment} />
        </div>
        <div className="booking-garment-details">
          <h3 title={garment.description || garment.name} className="text-sm font-bold text-slate-900 leading-snug break-words">{garment.name}</h3>
          <p className="text-xs text-slate-500 mt-1"><strong className="text-sm font-extrabold text-slate-900">{available ? `₹${unitPrice}` : copy('unavailable_ca18449')}</strong>{copy('piece_350128b')}</p>
          <div className="booking-garment-services" role="group" aria-label={`Service for ${garment.name}`}>
            {services.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={service === id} onClick={() => chooseService(id)} title={`${label}: ₹${calculateItemUnitPrice(garment, id, preferredFinish(garment, platformConfig, id, finish))} per piece`} className={`booking-garment-service text-xs font-semibold ${service === id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                <span>{label}</span>{service === id && <Check size={12} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="booking-garment-footer">
        <div className="text-[11px] text-slate-500">
          {ironing ? <>{copy('finish_b8c20c0')}<span className="text-slate-700">{finishLabel}{copy('included_28da654')}</span> · <button type="button" className="text-primary-700 font-semibold" aria-expanded={editingFinish} onClick={() => setEditingFinish(!editingFinish)}>{editingFinish ? copy('close_7d9eb7a') : copy('change_c0bf75b')}</button></> : <span>{service === 'DRY_CLEAN' ? copy('dry_cleaning_45459d4') : copy('washed_folded_31a49a5')}</span>}
          {quantity > 1 && <span className="block mt-1">{copy('line_total_3b4dc3d')}{cartItem.lineTotal}</span>}
        </div>
        {quantity > 0 ? <div className="booking-garment-quantity" role="group" aria-label={`Quantity for ${garment.name}`}>
          <button type="button" className="booking-garment-minus" disabled={!quantity} aria-label={`Decrease ${garment.name} quantity`} onClick={() => updateQuantity(itemId, quantity - 1)}><Minus size={15} /></button>
          <span className="text-xs font-bold text-slate-900" aria-live="polite">{quantity}</span>
          <button type="button" disabled={!available} className="booking-garment-plus bg-indigo-600 text-white hover:bg-indigo-700" aria-label={quantity ? `Increase ${garment.name} quantity` : `Add ${garment.name}`} onClick={() => quantity ? updateQuantity(itemId, quantity + 1) : addItem(garment, service, finish)}><Plus size={15} /></button>
        </div> : <button type="button" disabled={!available} className="booking-garment-add bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold" aria-label={`Add ${garment.name}`} onClick={() => addItem(garment, service, finish)}>{copy('add_8d89e4a')}<Plus size={15} aria-hidden="true" /></button>}
      </div>
      {ironing && editingFinish && <div className="booking-garment-finishes" role="group" aria-label={`Ironing finish for ${garment.name}`}>
        {finishes.map(([id, label]) => <button key={id} type="button" aria-pressed={finish === id} onClick={() => chooseFinish(id)} className={`border rounded-lg p-2 text-[11px] ${finish === id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-700'}`}>{label}<span className="block mt-1">₹{calculateItemUnitPrice(garment, service, id)}{copy('piece_350128b')}</span></button>)}
      </div>}
    </article>
  );
}
