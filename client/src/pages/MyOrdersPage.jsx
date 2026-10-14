import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import GstInvoiceModal from '../components/GstInvoiceModal';
import { useAuth } from '../context/AuthContext';
import { launchRazorpayCheckout } from '../utils/razorpayCheckout';
import { 
  Package, 
  Clock, 
  MapPin, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ArrowRight,
  Loader2,
  RefreshCw,
  Receipt,
  Bike,
  KeyRound,
  ShieldCheck,
  Tag,
  FileText,
  Ban,
  Zap,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';


const ORDER_STEPS = [
  { key: 'BOOKED', label: 'Booked' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_WASHING', label: 'Washing' },
  { key: 'IN_IRONING', label: 'Steam Iron' },
  { key: 'QUALITY_CHECK', label: 'Quality Check' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const getStepIndex = (status) => {
  if (status === 'PICKUP_ASSIGNED') return 0;
  const idx = ORDER_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
};

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Online payment modal for unpaid orders
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // GST Invoice modal state
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this order? This action cannot be undone and your slot capacity will be released.'
    );
    if (!confirmed) return;

    setCancellingOrderId(orderId);
    try {
      const res = await orderService.cancelOrder(orderId, 'Cancelled by customer before pickup');
      if (res.success && res.order) {
        toast.success('Order cancelled successfully.');
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? res.order : o))
        );
      } else {
        toast.error(res.message || 'Failed to cancel order.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };


  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getMyOrders();
      if (res.success) {
        setOrders(res.orders);
        if (res.orders.length > 0 && !expandedOrderId) {
          setExpandedOrderId(res.orders[0]._id);
        }
      }
    } catch (err) {
      console.error('[My Orders Error]:', err);
      toast.error('Could not fetch your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleExpand = (id) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  const { user } = useAuth();
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleRetryOnlinePayment = async (order) => {
    setActionLoadingId(order._id);
    try {
      const res = await orderService.retryPayment(order._id);
      if (res.success && res.razorpay) {
        launchRazorpayCheckout({
          order: res.order || order,
          razorpayPayload: res.razorpay,
          user,
          onSuccess: (updatedOrder) => {
            setOrders((prev) =>
              prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
            );
          },
          onDismiss: () => {},
          onFallback: () => {
            setSelectedOrderForPayment(res.order || order);
            setShowPaymentModal(true);
          }
        });
      } else {
        setSelectedOrderForPayment(order);
        setShowPaymentModal(true);
      }
    } catch (err) {
      setSelectedOrderForPayment(order);
      setShowPaymentModal(true);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSwitchToCod = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      const res = await orderService.switchToCod(orderId);
      if (res.success && res.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? res.order : o))
        );
        toast.success('Successfully switched order to Cash on Delivery (COD)!');
      } else {
        toast.error(res.message || 'Failed to switch payment method.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error while switching to COD.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePaymentSuccess = (updatedOrder) => {
    setShowPaymentModal(false);
    setOrders((prev) =>
      prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
    );
    toast.success('Payment updated successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Laundry Orders &amp; Live Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track individual garment progress from hub pickup to doorstep delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/book"
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Retrieving your order history...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Orders Placed Yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            You haven't scheduled any laundry or steam press pickups yet. Book your first wash load now!
          </p>
          <div className="pt-2">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 text-white font-bold text-xs shadow-md shadow-primary-600/30 hover:bg-primary-700"
            >
              <span>Schedule First Wash (From ₹30)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order._id;
            const currentStepIdx = getStepIndex(order.orderStatus);
            const isCancelled = order.orderStatus === 'CANCELLED';

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
              >
                {/* Order Summary Top Bar */}
                <div
                  onClick={() => toggleExpand(order._id)}
                  className="p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none hover:bg-slate-50/50"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                      <Receipt className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900 font-mono">
                          {order.orderNumber}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          order.orderStatus === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-primary-100 text-primary-800'
                        }`}>
                          {order.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })} • {order.items?.length || 0} Garments
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    {/* Payment Badge */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 sm:justify-end">
                        <span className={`w-2 h-2 rounded-full ${
                          order.payment?.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
                        }`} />
                        <span className="text-xs font-bold text-slate-800">
                          {order.payment?.status === 'PAID' ? 'PAID' : `${order.payment?.method} - PENDING`}
                        </span>
                      </div>
                      <span className="text-sm font-black text-slate-900 block mt-0.5">
                        ₹{order.pricingBreakdown?.grandTotal}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-6">
                    
                    {/* Doorstep OTP Verification Banners */}
                    {['BOOKED', 'PICKUP_ASSIGNED'].includes(order.orderStatus) && order.verificationCodes?.pickupOtp && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <KeyRound className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">
                              Doorstep Pickup OTP
                            </span>
                            <p className="text-xs text-amber-900 font-medium">
                              Share this 4-digit code verbally with our pickup rider at your doorstep.
                            </p>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-white border-2 border-amber-400 text-center font-mono font-black text-xl text-amber-950 shadow-xs tracking-widest shrink-0">
                          {order.verificationCodes.pickupOtp}
                        </div>
                      </div>
                    )}

                    {order.orderStatus === 'OUT_FOR_DELIVERY' && order.verificationCodes?.deliveryOtp && (
                      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-300 text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 block">
                              Doorstep Delivery Confirmation OTP
                            </span>
                            <p className="text-xs text-teal-900 font-medium">
                              Verify and inspect your clean garments, then share this 4-digit code verbally with the rider.
                            </p>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-white border-2 border-teal-500 text-center font-mono font-black text-xl text-teal-950 shadow-xs tracking-widest shrink-0">
                          {order.verificationCodes.deliveryOtp}
                        </div>
                      </div>
                    )}

                    {/* Visual Step-by-Step Progress Bar */}
                    {!isCancelled ? (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-6">
                          Live Order Trajectory
                        </h4>

                        <div className="relative">
                          {/* Background line */}
                          <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200 -z-0" />
                          {/* Active filled line */}
                          <div
                            className="absolute top-4 left-0 h-1 bg-teal-500 transition-all duration-500 -z-0"
                            style={{
                              width: `${(currentStepIdx / (ORDER_STEPS.length - 1)) * 100}%`
                            }}
                          />

                          <div className="relative z-10 flex justify-between">
                            {ORDER_STEPS.map((st, idx) => {
                              const isCompleted = idx <= currentStepIdx;
                              const isCurrent = idx === currentStepIdx;

                              return (
                                <div key={st.key} className="flex flex-col items-center text-center">
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      isCompleted
                                        ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                                        : 'bg-white border-2 border-slate-300 text-slate-400'
                                    }`}
                                  >
                                    {isCompleted ? '✓' : idx + 1}
                                  </div>
                                  <span
                                    className={`mt-2 text-[10px] font-bold max-w-[65px] leading-tight ${
                                      isCurrent
                                        ? 'text-teal-700 font-extrabold'
                                        : isCompleted
                                        ? 'text-slate-800'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>This order was cancelled. No charges were made.</span>
                      </div>
                    )}

                    {/* Order Details & Receipt Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Schedule & Address */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
                        <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                          Logistics &amp; Scheduling
                        </h4>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-800">Pickup Schedule:</span>
                              <p className="text-slate-600">
                                {order.pickupSchedule?.date} • {order.pickupSchedule?.timeSlot}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <Truck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-800">Delivery Target:</span>
                              <p className="text-slate-600">
                                {order.deliverySchedule?.date} • {order.deliverySchedule?.timeSlot}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-800">Doorstep Address:</span>
                              <p className="text-slate-600">
                                {order.pickupAddress?.flatAndBuilding}, {order.pickupAddress?.streetAndLandmark}, {order.pickupAddress?.city} - {order.pickupAddress?.pincode}
                              </p>
                              <p className="text-slate-500 text-[11px] mt-0.5">
                                Contact: {order.pickupAddress?.contactPhone}
                              </p>
                            </div>
                          </div>

                          {/* Rider Info if assigned */}
                          {order.logistics?.assignedRider && (
                            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                              <Bike className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-slate-800">Assigned Logistics Rider:</span>
                                <p className="text-slate-600">
                                  {order.logistics.assignedRider.name} • <a href={`tel:${order.logistics.assignedRider.phone}`} className="text-teal-700 font-bold hover:underline">{order.logistics.assignedRider.phone}</a>
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Bag Tag ID if present */}
                          {order.logistics?.bagTagId && (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <Tag className="w-4 h-4 text-teal-600 shrink-0" />
                              <span className="text-slate-600 font-medium">Bag Tag ID:</span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {order.logistics.bagTagId}
                              </span>
                            </div>
                          )}

                          {/* Inspection Notes if present */}
                          {order.logistics?.inspectionNotes && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px]">
                              <span className="font-bold text-amber-900">Doorstep Inspection Notes: </span>
                              <span className="text-amber-800">{order.logistics.inspectionNotes}</span>
                            </div>
                          )}

                          {order.preferences?.specialInstructions && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                              <span className="font-bold text-slate-700">Special Notes: </span>
                              <span className="text-slate-600">{order.preferences.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Itemized Bill Breakdown */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="font-bold text-slate-900">Itemized Bill Breakdown</h4>
                          <span className="text-slate-500 font-medium">Tax Invoice</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start">
                              <div>
                                <span className="font-bold text-slate-800">{item.garmentName}</span>
                                <span className="text-slate-500 ml-1.5 font-medium">× {item.quantity}</span>
                                <p className="text-[10px] text-slate-400">
                                  {item.serviceType.replace(/_/g, ' ')}
                                  {item.ironingType !== 'NONE' && ` • ${item.ironingType.replace(/_/g, ' ')}`}
                                </p>
                              </div>
                              <span className="font-semibold text-slate-900">₹{item.lineTotal}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-1.5">
                          <div className="flex justify-between text-slate-500">
                            <span>Subtotal:</span>
                            <span>₹{order.pricingBreakdown?.subtotal}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Pickup &amp; Delivery Fee:</span>
                            <span>{order.pricingBreakdown?.pickupDeliveryFee === 0 ? 'FREE' : `₹${order.pricingBreakdown?.pickupDeliveryFee}`}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>GST (5%):</span>
                            <span>₹{order.pricingBreakdown?.taxAmount}</span>
                          </div>
                          <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-200">
                            <span>Grand Total:</span>
                            <span className="text-primary-700">₹{order.pricingBreakdown?.grandTotal}</span>
                          </div>
                        </div>

                        {/* Invoice & Cancellation Actions */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForInvoice(order)}
                            className="py-2 px-3 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 flex items-center justify-center gap-1.5 text-xs transition-all shadow-2xs cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary-600" />
                            <span>View / Print GST Invoice</span>
                          </button>

                          {['BOOKED', 'PICKUP_ASSIGNED'].includes(order.orderStatus) && (
                            <button
                              type="button"
                              disabled={cancellingOrderId === order._id}
                              onClick={() => handleCancelOrder(order._id)}
                              className="py-2 px-3 rounded-xl font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {cancellingOrderId === order._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                              ) : (
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                              )}
                              <span>Cancel Order</span>
                            </button>
                          )}
                        </div>

                        {/* Payment Actions for Unpaid / Pending Online Orders */}
                        {order.payment?.method === 'ONLINE' && order.payment?.status !== 'PAID' && (
                          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              disabled={actionLoadingId === order._id}
                              onClick={() => handleRetryOnlinePayment(order)}
                              className="flex-1 py-2.5 px-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{actionLoadingId === order._id ? 'Opening Gateway...' : 'Retry Online Payment'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === order._id}
                              onClick={() => handleSwitchToCod(order._id)}
                              className="py-2.5 px-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-slate-500" />
                              <span>Switch to COD</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Status History & Audit Trail */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Live Status Timeline &amp; Audit Trail
                        </h4>
                        <div className="space-y-3 border-l-2 border-teal-200 ml-2 pl-4">
                          {order.statusHistory.map((hist, idx) => (
                            <div key={idx} className="relative text-xs">
                              <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-teal-100" />
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="font-bold text-slate-900">{hist.status.replace(/_/g, ' ')}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(hist.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {new Date(hist.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              {hist.note && <p className="text-slate-600 text-[11px] mt-0.5">{hist.note}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Online Payment Modal */}
      {showPaymentModal && selectedOrderForPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          order={selectedOrderForPayment}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* GST Tax Invoice Modal */}
      {selectedOrderForInvoice && (
        <GstInvoiceModal
          isOpen={Boolean(selectedOrderForInvoice)}
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

    </div>
  );
};


export default MyOrdersPage;
