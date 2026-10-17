import React, { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { GarmentThumbnail } from '../home/LaundryArtwork';
import { calculateItemUnitPrice } from '../../context/OrderBookingContext';
import './BookingGarmentCard.css';

const services = [
  ['WASH_AND_FOLD', 'Wash & Fold'], ['WASH_AND_IRON', 'Wash & Iron'],
  ['IRON_ONLY', 'Iron Only'], ['DRY_CLEAN', 'Dry Clean'],
];
const finishes = [
  ['STANDARD_STEAM', 'Steam', 'standardSteamIron'],
  ['CRISP_STARCH', 'Crisp starch', 'crispStarchPress'],
  ['DELICATE_PRESS', 'Delicate', 'delicatePress'],
];

export default function BookingGarmentCard({ garment, cartItem, addItem, updateQuantity, updateServiceType, updateIroningType, fallbackIcon }) {
  const [draftService, setDraftService] = useState('WASH_AND_IRON');
  const [draftFinish, setDraftFinish] = useState('STANDARD_STEAM');
  const [editingFinish, setEditingFinish] = useState(false);
  const service = cartItem?.serviceType || draftService;
  const finish = cartItem?.ironingType || draftFinish;
  const quantity = cartItem?.quantity || 0;
  const itemId = cartItem?.cartItemId || garment._id;
  const ironing = service === 'WASH_AND_IRON' || service === 'IRON_ONLY';
  const unitPrice = calculateItemUnitPrice(garment, service, finish);
  const finishLabel = finishes.find(([id]) => id === finish)?.[1] || 'Steam';
  const knownArtwork = garment.imageUrl || /shirt|polo|trouser|jeans|kurta|kurti|saree|blazer|bedsheet|towel|curtain|quilt|comforter|rajai/i.test(garment.name);

  function chooseService(value) {
    setDraftService(value);
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
          {knownArtwork ? <GarmentThumbnail garment={garment} /> : fallbackIcon}
        </div>
        <div className="booking-garment-details">
          <h3 className="text-sm font-bold text-slate-900 leading-snug break-words">{garment.name}</h3>
          <p className="text-xs text-slate-500 mt-1"><strong className="text-sm font-extrabold text-slate-900">₹{unitPrice}</strong> / piece</p>
          <div className="booking-garment-services" role="group" aria-label={`Service for ${garment.name}`}>
            {services.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={service === id} onClick={() => chooseService(id)} title={`${label}: ₹${calculateItemUnitPrice(garment, id, finish)} per piece`} className={`booking-garment-service text-xs font-semibold ${service === id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                <span>{label}</span>{service === id && <Check size={12} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="booking-garment-footer">
        <div className="text-[11px] text-slate-500">
          {ironing ? <>Finish: <span className="text-slate-700">{finishLabel} included</span> · <button type="button" className="text-primary-700 font-semibold" aria-expanded={editingFinish} onClick={() => setEditingFinish(!editingFinish)}>{editingFinish ? 'Close' : 'Change'}</button></> : <span>{service === 'DRY_CLEAN' ? 'Dry cleaning' : 'Washed & folded'}</span>}
          {quantity > 1 && <span className="block mt-1">Line total: ₹{cartItem.lineTotal}</span>}
        </div>
        {quantity > 0 ? <div className="booking-garment-quantity" role="group" aria-label={`Quantity for ${garment.name}`}>
          <button type="button" className="booking-garment-minus" disabled={!quantity} aria-label={`Decrease ${garment.name} quantity`} onClick={() => updateQuantity(itemId, quantity - 1)}><Minus size={15} /></button>
          <span className="text-xs font-bold text-slate-900" aria-live="polite">{quantity}</span>
          <button type="button" className="booking-garment-plus bg-indigo-600 text-white hover:bg-indigo-700" aria-label={quantity ? `Increase ${garment.name} quantity` : `Add ${garment.name}`} onClick={() => quantity ? updateQuantity(itemId, quantity + 1) : addItem(garment, service, finish)}><Plus size={15} /></button>
        </div> : <button type="button" className="booking-garment-add bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold" aria-label={`Add ${garment.name}`} onClick={() => addItem(garment, service, finish)}>Add <Plus size={15} aria-hidden="true" /></button>}
      </div>
      {ironing && editingFinish && <div className="booking-garment-finishes" role="group" aria-label={`Ironing finish for ${garment.name}`}>
        {finishes.map(([id, label]) => <button key={id} type="button" aria-pressed={finish === id} onClick={() => chooseFinish(id)} className={`border rounded-lg p-2 text-[11px] ${finish === id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-700'}`}>{label}<span className="block mt-1">₹{calculateItemUnitPrice(garment, service, id)} / piece</span></button>)}
      </div>}
    </article>
  );
}
