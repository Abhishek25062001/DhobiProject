import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import {
  Package, PackageCheck, WashingMachine, Sparkles, ShieldCheck, Truck, Calendar,
  Check, CheckCircle2, ChevronDown, ArrowRight, RefreshCw, Phone, KeyRound, WifiOff,
} from 'lucide-react';
import usePageCopy from '../hooks/usePageCopy';
import useActiveOrders from '../hooks/useActiveOrders';
import { TRACKING_STAGES, getTrackingState, selectTrackedOrder } from '../utils/orderTracking.mjs';
import './ActiveOrderTracker.css';

const stageIcons = { Package, PackageCheck, WashingMachine, Sparkles, ShieldCheck, Truck, Calendar, CheckCircle2 };
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
function scheduleDate(value) {
  if (!value) return 'To be confirmed';
  const date = parseISO(value);
  return isValid(date) ? format(date, 'EEE, d MMM') : value;
}

function BookingCard({ order, orders, selectOrder, feed, copy }) {
  // New bookings start minimized; updates preserve the same booking's state.
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const titleId = useId();
  const tracking = getTrackingState(order);
  const stageLabel = stage => stage ? copy('tracker_step_' + stage.id) || stage.label : 'Status unavailable';
  const currentLabel = stageLabel(tracking.stage);
  const CurrentIcon = stageIcons[tracking.stage?.icon] || Package;
  const nextStage = TRACKING_STAGES[tracking.index + 1];
  const total = order.pricingBreakdown?.grandTotal;
  const amount = Number.isFinite(total) ? currency.format(total) : 'Total pending';
  const otp = tracking.otpType ? order.verificationCodes?.[`${tracking.otpType}Otp`] || order[`${tracking.otpType}Otp`] : null;
  const paymentLabel = order.payment?.status === 'PAID' ? copy('paid_e17956e') || 'Paid'
    : order.payment?.method === 'COD' ? copy('cash_on_delivery_pending_664ede1') || 'Cash on delivery · Pending'
    : copy('payment_pending_ac3729c') || 'Payment pending';
  const paused = Boolean(feed.error);
  const freshness = paused ? feed.error === 'offline' ? 'Offline · Showing last update' : 'Updates paused · Retrying' : 'Auto-updating';

  return <section className="order-tracker" aria-labelledby={titleId}>
    <div className={`order-tracker__header${orders.length > 1 ? ' has-multiple' : ''}`}>
      <div className="order-tracker__identity">
        <span className="order-tracker__icon"><CurrentIcon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
        <div className="order-tracker__title">
          <div className="order-tracker__eyebrow">Your booking <span className={`order-tracker__live ${paused ? 'is-paused' : ''}`} title={feed.lastUpdated ? `Last checked at ${format(new Date(feed.lastUpdated), 'h:mm:ss a')}` : undefined}><i aria-hidden="true" />{freshness}</span></div>
          <h2 id={titleId}>{copy('order_a458d68') || 'Order #'}{order.orderNumber || order._id.slice(-6)}</h2>
          <p className="order-tracker__summary">{tracking.totalItems} {tracking.totalItems === 1 ? copy('garment_88a6071') || 'garment' : copy('garments_c2e31cb') || 'garments'}<span aria-hidden="true">·</span>{amount}</p>
        </div>
      </div>
      <div className="order-tracker__actions">
        {orders.length > 1 && <label className="order-tracker__switch"><span className="sr-only">Choose a booking</span><select value={order._id} onChange={event => selectOrder(event.target.value)}>{orders.map((item, index) => <option key={item._id} value={item._id}>{index + 1} of {orders.length} · #{item.orderNumber?.slice(-6) || item._id.slice(-6)}</option>)}</select></label>}
        <button type="button" className="order-tracker__toggle" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Minimize' : 'View details'}<ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
    <div className="order-tracker__progress">
      <div className="order-tracker__progress-labels">
        <p className="order-tracker__status"><span aria-hidden="true" />{currentLabel}</p>
        <span className="order-tracker__step">{tracking.stage ? `Step ${tracking.step} of ${TRACKING_STAGES.length}` : 'Checking booking status'}</span>
      </div>
      <div className="order-tracker__track" role="progressbar" aria-label="Booking progress" aria-valuemin={0} aria-valuemax={TRACKING_STAGES.length} aria-valuenow={tracking.step} aria-valuetext={tracking.stage ? `${currentLabel}, step ${tracking.step} of ${TRACKING_STAGES.length}` : currentLabel}>
        {TRACKING_STAGES.map((stage, index) => <span key={stage.id} className={index < tracking.index ? 'is-complete' : index === tracking.index ? 'is-current' : ''} />)}
      </div>
      <div className="order-tracker__progress-caption"><span>{tracking.index >= 0 && nextStage ? <>Next: {stageLabel(nextStage)}</> : tracking.stage ? 'Your booking is complete' : 'We’ll update this as soon as it is available.'}</span><span className="order-tracker__destination">Fresh clothes, back to you</span></div>
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{order.orderNumber}: {currentLabel}</p>
    {paused && <p className="order-tracker__notice" role="status"><WifiOff size={14} aria-hidden="true" />{feed.error === 'offline' ? 'You’re offline. Updates resume when you reconnect.' : 'We couldn’t get the latest status. Your last update is shown.'}<button type="button" onClick={feed.refresh} disabled={feed.refreshing}>Retry</button></p>}

    <div id={detailsId} className="order-tracker__details" hidden={!expanded}>
      {expanded && <>
        <div className="order-tracker__detail-heading"><h3>Your booking journey</h3><span><i className="order-tracker__legend" aria-hidden="true" />Completed <i className="order-tracker__legend is-current" aria-hidden="true" />Current</span></div>
        <ol className="order-tracker__stages" aria-label="Booking stages">{TRACKING_STAGES.map((stage, index) => <li key={stage.id} className={index < tracking.index ? 'is-complete' : index === tracking.index ? 'is-current' : ''} aria-current={index === tracking.index ? 'step' : undefined}>
          <span className="order-tracker__stage-number" aria-hidden="true">{index < tracking.index ? <Check size={13} strokeWidth={2.8} /> : index + 1}</span><span>{stageLabel(stage)}</span>{index < tracking.index && <span className="sr-only"> · Completed</span>}
        </li>)}</ol>
        <div className="order-tracker__info">
          {[['pickup', copy('pickup_schedule_b685a65') || 'Pickup schedule'], ['delivery', copy('delivery_schedule_38823c2') || 'Delivery schedule']].map(([leg, label]) => <div className="order-tracker__info-card" key={leg}><Calendar size={18} aria-hidden="true" /><div><h4>{label}</h4><p>{scheduleDate(order[`${leg}Schedule`]?.date)}</p><span>{order[`${leg}Schedule`]?.timeSlot || 'Time to be confirmed'}</span></div></div>)}
          <div className="order-tracker__info-card"><Truck size={18} aria-hidden="true" /><div><h4>{tracking.pickup ? 'Pickup rider' : 'Delivery rider'}</h4>{tracking.rider?.name ? <><p>{tracking.rider.name}</p>{tracking.rider.phone && <a href={`tel:${tracking.rider.phone}`} className="order-tracker__call"><Phone size={13} aria-hidden="true" />{copy('call_d6e645b') || 'Call'} {tracking.rider.name}</a>}</> : <><p>Awaiting assignment</p><span>Rider details will appear here.</span></>}</div></div>
          <div className="order-tracker__info-card order-tracker__otp"><KeyRound size={18} aria-hidden="true" /><div><h4>{tracking.otpType === 'delivery' ? copy('doorstep_delivery_otp_acc550e') || 'Delivery code' : tracking.otpType === 'pickup' ? copy('doorstep_pickup_otp_7cb30f6') || 'Pickup code' : 'Doorstep verification'}</h4>{otp ? <><p className="order-tracker__code">{otp}</p><span>{copy('share_with_rider_at_doorstep_225b531') || 'Share with your rider at the doorstep.'}</span></> : <><p>{tracking.index >= 4 ? 'Pickup complete' : 'Code pending'}</p><span>{tracking.index >= 4 && tracking.index < 7 ? 'Your delivery code appears when your clothes are ready.' : 'We’ll show your code when it is available.'}</span></>}</div></div>
        </div>
        <div className="order-tracker__footer">
          <div className="order-tracker__payment"><span className={order.payment?.status === 'PAID' ? 'is-paid' : ''}>{paymentLabel}</span><span>Order total <strong>{amount}</strong></span></div>
          <div className="order-tracker__links"><button type="button" onClick={feed.refresh} disabled={feed.refreshing} className="order-tracker__refresh"><RefreshCw size={14} className={feed.refreshing ? 'is-refreshing' : ''} aria-hidden="true" />{feed.refreshing ? 'Updating…' : copy('refresh_status_442c4b8') || 'Refresh status'}</button><Link to="/my-orders">{copy('view_full_order_details_5cd2e55') || 'View full order details'}<ArrowRight size={15} aria-hidden="true" /></Link></div>
        </div>
      </>}
    </div>
  </section>;
}

export default function ActiveOrderTracker() {
  const copy = usePageCopy('orders');
  const feed = useActiveOrders();
  const [selectedId, setSelectedId] = useState(null);
  const order = selectTrackedOrder(feed.orders, selectedId);
  useEffect(() => { setSelectedId(order?._id || null); }, [order?._id]);
  if (!feed.enabled) return null;
  if (!order) return feed.error ? <section className="order-tracker order-tracker--unavailable" aria-label="Booking status"><WifiOff size={18} aria-hidden="true" /><p role="status">{feed.error === 'auth' ? 'Sign in again to track your booking.' : feed.error === 'offline' ? 'You’re offline. Booking updates will resume when you reconnect.' : 'Booking updates are unavailable. We’ll retry automatically.'}</p>{feed.error === 'auth' ? <Link to="/login">Sign in</Link> : <button type="button" disabled={feed.refreshing} onClick={feed.refresh}>Retry</button>}</section> : null;
  return <BookingCard key={order._id} order={order} orders={feed.orders} selectOrder={setSelectedId} feed={feed} copy={copy} />;
}
