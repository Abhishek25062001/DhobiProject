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
    <div className="w-full mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-2xl border border-indigo-500/20">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar: Live indicator + Multiple orders switcher + Refresh */}
        <div className="p-4 sm:p-6 pb-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Live Order In Progress
            </span>
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Synced {format(lastUpdated, 'hh:mm:ss a')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Multiple Orders Switcher Pills */}
            {activeOrders.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/10 text-xs">
                <button
                  onClick={() => setSelectedIndex((prev) => (prev > 0 ? prev - 1 : activeOrders.length - 1))}
                  className="p-1 rounded-xl hover:bg-white/20 transition-colors text-white"
                  title="Previous order"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {activeOrders.map((ord, idx) => (
                    <button
                      key={ord._id}
                      onClick={() => setSelectedIndex(idx)}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs ${
                        selectedIndex === idx
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      #{ord.orderNumber.slice(-6)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedIndex((prev) => (prev < activeOrders.length - 1 ? prev + 1 : 0))}
                  className="p-1 rounded-xl hover:bg-white/20 transition-colors text-white"
                  title="Next order"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setLoading(true);
                fetchActiveOrders().finally(() => setLoading(false));
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-slate-300 hover:text-white"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 sm:pt-4 space-y-6">
          
          {/* Order Header / Meta Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Order #{currentOrder.orderNumber}
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {currentOrder.orderStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <span>{totalItems} {totalItems === 1 ? 'Garment' : 'Garments'}</span>
                <span>•</span>
                <span>Grand Total: ₹{currentOrder.pricingBreakdown?.grandTotal}</span>
                <span>•</span>
                <span className={isPaid ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {isPaid ? 'Paid Online' : isCOD ? 'Cash on Delivery (Pending)' : 'Payment Pending'}
                </span>
              </p>
            </div>

            <Link
              to="/my-orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-md hover:shadow-lg transition-all self-start sm:self-auto shrink-0"
            >
              <span>View Full Order Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 10-Stage Visual Step Progress Bar */}
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 text-primary-300 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                Current Stage: {STAGES[currentStageIdx]?.label}
              </span>
              <span>Step {currentStageIdx + 1} of {STAGES.length}</span>
            </div>

            {/* Continuous Progress Track */}
            <div className="relative w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-primary-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(10, ((currentStageIdx + 1) / STAGES.length) * 100))}%` }}
              />
            </div>

            {/* Horizontal Scrollable Stage Milestones */}
            <div className="pt-2 flex items-center justify-between gap-1 overflow-x-auto pb-1 no-scrollbar text-center">
              {STAGES.map((stage, idx) => {
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col items-center min-w-[70px] sm:min-w-[85px] px-1 shrink-0"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isCurrent
                          ? 'bg-primary-500 text-white ring-4 ring-primary-500/30 scale-110 shadow-lg'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                    </div>
                    <span
                      className={`mt-1.5 text-[10px] font-semibold leading-tight line-clamp-2 ${
                        isCurrent
                          ? 'text-white font-black'
                          : isPassed
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logistics & Action Grid: Slots, Rider, Doorstep OTP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            
            {/* Slot Card */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {isPickupPhase ? 'Pickup Schedule' : 'Delivery Schedule'}
                </p>
                <p className="text-xs font-bold text-white">
                  {isPickupPhase ? currentOrder.pickupSchedule?.date : currentOrder.deliverySchedule?.date}
                </p>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{isPickupPhase ? currentOrder.pickupSchedule?.timeSlot : currentOrder.deliverySchedule?.timeSlot}</span>
                </p>
              </div>
            </div>

            {/* Assigned Rider Card */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="space-y-1 grow">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Doorstep Rider
                </p>
                {rider?.name ? (
                  <>
                    <p className="text-xs font-bold text-white">{rider.name}</p>
                    {rider.phone && (
                      <a
                        href={`tel:${rider.phone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-teal-300 hover:text-teal-200 font-semibold"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{rider.phone}</span>
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Rider will be assigned 1 hour before slot.
                  </p>
                )}
              </div>
            </div>

            {/* Doorstep Verification OTP Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/30 text-indigo-300 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="space-y-1 grow">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  {showDeliveryOtp ? 'Doorstep Delivery OTP' : 'Doorstep Pickup OTP'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black tracking-widest text-white px-2.5 py-0.5 rounded-lg bg-black/40 border border-white/10">
                    {showDeliveryOtp
                      ? currentOrder.verificationCodes?.deliveryOtp || '----'
                      : currentOrder.verificationCodes?.pickupOtp || '----'}
                  </span>
                  <span className="text-[10px] text-slate-300 leading-tight">
                    Share with rider at doorstep
                  </span>
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
