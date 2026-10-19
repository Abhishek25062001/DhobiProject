import React from 'react';
import { Package, PackageCheck, WashingMachine, Sparkles, ShieldCheck, Truck, Calendar, Check, CheckCircle2, Ban, CircleHelp } from 'lucide-react';
import usePageCopy from '../hooks/usePageCopy';
import { TRACKING_STAGES, getTrackingState } from '../utils/orderTracking.mjs';
import './OrderProgress.css';

const icons = { Package, PackageCheck, WashingMachine, Sparkles, ShieldCheck, Truck, Calendar, CheckCircle2 };
export function OrderStageIcon({ order, ...props }) {
  const tracking = getTrackingState(order);
  const Icon = tracking.cancelled ? Ban : icons[tracking.stage?.icon] || CircleHelp;
  return <Icon aria-hidden="true" {...props} />;
}

function useProgress(order) {
  // Every customer surface reads the same managed labels, including history.
  const copy = usePageCopy('orders');
  const tracking = getTrackingState(order);
  const label = stage => stage ? copy(`tracker_step_${stage.id}`) || stage.label : tracking.cancelled ? 'Cancelled' : 'Status unavailable';
  return { ...tracking, label, currentLabel: label(tracking.stage) };
}

export function OrderStatusBadge({ order }) {
  const tracking = useProgress(order);
  return <span className={`booking-status ${tracking.cancelled ? 'is-cancelled' : tracking.delivered ? 'is-delivered' : ''}`}><OrderStageIcon order={order} size={14} />{tracking.currentLabel}</span>;
}

export function OrderProgressBar({ order }) {
  const tracking = useProgress(order);
  const next = TRACKING_STAGES[tracking.index + 1];
  return <div className={`booking-progress ${tracking.cancelled ? 'is-cancelled' : tracking.delivered ? 'is-delivered' : ''}`} aria-label={`Progress for ${order.orderNumber || 'booking'}`}>
    <div className="booking-progress__labels">
      <p className="booking-progress__status"><OrderStageIcon order={order} size={16} />{tracking.currentLabel}</p>
      {tracking.stage && <span className="booking-progress__step">Step {tracking.step} of {TRACKING_STAGES.length}</span>}
    </div>
    {!tracking.cancelled && <div className="booking-progress__track" style={{ '--stage-count': TRACKING_STAGES.length }} role="progressbar" aria-label="Booking progress" aria-valuemin={0} aria-valuemax={TRACKING_STAGES.length} aria-valuenow={tracking.step} aria-valuetext={tracking.stage ? `${tracking.currentLabel}, step ${tracking.step} of ${TRACKING_STAGES.length}` : tracking.currentLabel}>
      {TRACKING_STAGES.map((stage, index) => <span key={stage.id} className={tracking.delivered || index < tracking.index ? 'is-complete' : index === tracking.index ? 'is-current' : ''} />)}
    </div>}
    <div className="booking-progress__caption">{tracking.cancelled ? 'This booking was cancelled.' : tracking.delivered ? 'Your booking is complete.' : tracking.stage && next ? `Next: ${tracking.label(next)}` : 'We’ll update this as soon as the status is available.'}</div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{order.orderNumber}: {tracking.currentLabel}</p>
  </div>;
}

export function OrderProgressStages({ order }) {
  const tracking = useProgress(order);
  if (!tracking.stage) return null;
  return <div className="booking-progress booking-progress--stages">
    <div className="booking-progress__heading"><h3>Your booking journey</h3><span><i className="booking-progress__legend" aria-hidden="true" />Completed <i className="booking-progress__legend is-current" aria-hidden="true" />Current</span></div>
    <ol className="booking-progress__stages" aria-label="Booking stages">{TRACKING_STAGES.map((stage, index) => {
      const completed = tracking.delivered || index < tracking.index;
      return <li key={stage.id} className={completed ? 'is-complete' : index === tracking.index ? 'is-current' : ''} aria-current={index === tracking.index ? 'step' : undefined}>
        <span className="booking-progress__number" aria-hidden="true">{completed ? <Check size={13} strokeWidth={2.8} /> : index + 1}</span><span>{tracking.label(stage)}</span>{completed && <span className="sr-only"> · Completed</span>}
      </li>;
    })}</ol>
  </div>;
}

export default function OrderProgress({ order, showStages = true }) {
  return <div className="booking-progress-panel"><OrderProgressBar order={order} />{showStages && <OrderProgressStages order={order} />}</div>;
}
