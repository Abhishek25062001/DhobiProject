import usePageCopy from '../hooks/usePageCopy';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/api';
import {
  Sparkles,
  Truck,
  Phone,
  KeyRound,
  Calendar,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const STAGES = [
  { id: 'ORDER_PLACED', label: 'Order Placed', aliases: ['BOOKED', 'ORDER_PLACED'] },
  { id: 'CONFIRMED', label: 'Confirmed', aliases: ['CONFIRMED'] },
  { id: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', aliases: ['PICKUP_SCHEDULED', 'PICKUP_ASSIGNED'] },
  { id: 'OUT_FOR_PICKUP', label: 'Out for Pickup', aliases: ['OUT_FOR_PICKUP'] },
  { id: 'PICKED_UP', label: 'Picked Up', aliases: ['PICKED_UP'] },
  { id: 'IN_WASH', label: 'In Wash', aliases: ['IN_WASH', 'IN_WASHING'] },
  { id: 'IN_IRONING', label: 'Steam Press', aliases: ['IN_IRONING'] },
  { id: 'READY', label: 'Ready & QC', aliases: ['READY', 'QUALITY_CHECK'] },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', aliases: ['OUT_FOR_DELIVERY'] },
  { id: 'DELIVERED', label: 'Delivered', aliases: ['DELIVERED'] }
];

const getStageIndex = (status) => {
  if (!status) return 0;
  const normalized = status.toUpperCase();
  const idx = STAGES.findIndex((s) => s.aliases.includes(normalized) || s.id === normalized);
  return idx !== -1 ? idx : 0;
};

const ActiveOrderTracker = () => {
  const copy = usePageCopy('orders');
  const { user, isAuthenticated } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchActiveOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await orderService.getMyActiveOrders();
      if (res.success && Array.isArray(res.activeOrders)) {
        setActiveOrders(res.activeOrders);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('[ActiveOrderTracker] Failed to load active orders:', err.message);
    }
  }, [isAuthenticated]);

  // Initial load + 15s interval polling + window focus polling
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveOrders([]);
      return;
    }

    fetchActiveOrders();

    const interval = setInterval(fetchActiveOrders, 15000);

    const onFocus = () => {
      fetchActiveOrders();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, fetchActiveOrders]);

  // Safe boundary check for selected order tab
  useEffect(() => {
    if (selectedIndex >= activeOrders.length && activeOrders.length > 0) {
      setSelectedIndex(0);
    }
  }, [activeOrders.length, selectedIndex]);

  if (!isAuthenticated || activeOrders.length === 0) {
    return null;
  }

  const currentOrder = activeOrders[selectedIndex] || activeOrders[0];
  const currentStageIdx = getStageIndex(currentOrder?.orderStatus);
  const totalItems = (currentOrder?.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
  const isPaid = currentOrder?.payment?.status === 'PAID';
  const isCOD = currentOrder?.payment?.method === 'COD';

  const rider = currentOrder?.logistics?.assignedRider;
  const isPickupPhase = currentStageIdx < 5;
  const showDeliveryOtp = currentStageIdx >= 7;

  return (
    <div className="w-full mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-indigo-500/20">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar: Live indicator + Multiple orders switcher + Refresh */}
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">{copy('live_order_in_progress_a3bf0f5')}</span>
            {lastUpdated && (
              <span className="text-[10px] text-slate-400 hidden sm:inline">{copy('synced_0fc24d7')}{format(lastUpdated, 'hh:mm:ss a')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Multiple Orders Switcher Pills */}
            {activeOrders.length > 1 && (
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-xl p-0.5 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedIndex((prev) => (prev > 0 ? prev - 1 : activeOrders.length - 1))}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
                  title={copy('previous_order_4102dd7')}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex gap-1">
                  {activeOrders.map((ord, idx) => (
                    <button
                      key={ord._id}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] ${
                        selectedIndex === idx
                          ? 'bg-primary-500 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      #{ord.orderNumber.slice(-6)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIndex((prev) => (prev < activeOrders.length - 1 ? prev + 1 : 0))}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
                  title={copy('next_order_46d70cf')}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchActiveOrders().finally(() => setLoading(false));
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-slate-300 hover:text-white"
              title={copy('refresh_status_442c4b8')}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-3.5 sm:p-5 space-y-3">
          
          {/* Order Header / Meta Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">{copy('order_a458d68')}{currentOrder.orderNumber}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {currentOrder.orderStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{totalItems} {totalItems === 1 ? copy('garment_88a6071') : copy('garments_c2e31cb')}</span>
                <span>•</span>
                <span>{copy('grand_total_ce7c777')}{currentOrder.pricingBreakdown?.grandTotal}</span>
                <span>•</span>
                <span className={isPaid ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {isPaid ? copy('paid_online_5cbec54') : isCOD ? copy('cash_on_delivery_pending_664ede1') : copy('payment_pending_ac3729c')}
                </span>
              </p>
            </div>

            <Link
              to="/my-orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 font-bold text-[11px] hover:bg-slate-100 shadow-sm hover:shadow-md transition-all self-start sm:self-auto shrink-0"
            >
              <span>{copy('view_full_order_details_5cd2e55')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 10-Stage Visual Step Progress Bar */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1 text-primary-300 font-bold">
                <Sparkles className="w-3 h-3 text-primary-400" />{copy('current_stage_635305b')}{copy('tracker_step_' + STAGES[currentStageIdx]?.id)}
              </span>
              <span className="text-[10px] text-slate-400">{copy('step_474a987')}{currentStageIdx + 1}{copy('of_a4282e4')}{STAGES.length}</span>
            </div>

            {/* Continuous Progress Track */}
            <div className="relative w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-primary-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(10, ((currentStageIdx + 1) / STAGES.length) * 100))}%` }}
              />
            </div>

            {/* Horizontal Scrollable Stage Milestones */}
            <div className="pt-1 flex items-center justify-between gap-1 overflow-x-auto pb-0.5 no-scrollbar text-center">
              {STAGES.map((stage, idx) => {
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col items-center min-w-[58px] sm:min-w-[72px] px-0.5 shrink-0"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-primary-500 text-white ring-2 ring-primary-500/40 scale-105 shadow-sm'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> : idx + 1}
                    </div>
                    <span
                      className={`mt-1 text-[9px] font-medium leading-none line-clamp-1 max-w-[65px] ${
                        isCurrent
                          ? 'text-white font-bold'
                          : isPassed
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                      title={copy('tracker_step_' + stage.id)}
                    >
                      {copy('tracker_step_' + stage.id)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logistics & Action Grid: Compact 3-Column Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
            
            {/* Slot Card */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary-500/20 text-primary-400 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isPickupPhase ? copy('pickup_schedule_b685a65') : copy('delivery_schedule_38823c2')}
                </p>
                <p className="text-xs font-bold text-white truncate">
                  {isPickupPhase ? currentOrder.pickupSchedule?.date : currentOrder.deliverySchedule?.date}
                  <span className="text-[10px] text-slate-300 font-normal ml-1">
                    ({isPickupPhase ? currentOrder.pickupSchedule?.timeSlot : currentOrder.deliverySchedule?.timeSlot})
                  </span>
                </p>
              </div>
            </div>

            {/* Assigned Rider Card */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 grow">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{copy('assigned_doorstep_rider_acd731d')}</p>
                {rider?.name ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{rider.name}</span>
                    {rider.phone && (
                      <a
                        href={`tel:${rider.phone}`}
                        className="inline-flex items-center gap-1 text-[10px] text-teal-300 hover:text-teal-200 font-semibold"
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>{copy('call_d6e645b')}</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic truncate">{copy('rider_will_be_assigned_1_hour_before_slot_b387c68')}</p>
                )}
              </div>
            </div>

            {/* Doorstep Verification OTP Card */}
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/30 text-indigo-300 shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 grow">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  {showDeliveryOtp ? copy('doorstep_delivery_otp_acc550e') : copy('doorstep_pickup_otp_7cb30f6')}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-black tracking-widest text-white px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
                    {showDeliveryOtp
                      ? currentOrder.verificationCodes?.deliveryOtp || currentOrder.deliveryOtp || '----'
                      : currentOrder.verificationCodes?.pickupOtp || currentOrder.pickupOtp || '----'}
                  </span>
                  <span className="text-[9px] text-slate-300 truncate">{copy('share_with_rider_at_doorstep_225b531')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default ActiveOrderTracker;
