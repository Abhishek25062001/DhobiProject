import OrderProgress, { OrderStatusBadge } from '../components/OrderProgress';
import { useCustomerOrders } from '../context/CustomerOrdersContext';
import { getTrackingState } from '../utils/orderTracking.mjs';
import ContentState from '../components/ContentState';
import usePageCopy from '../hooks/usePageCopy';
import { orderServiceLabel, orderFinishLabel } from '../../../shared/orderSnapshot.mjs';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Printer,
  QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';


const MyOrdersPage = () => {
  const copy = usePageCopy('orders');
  const { user, isAdmin, isRider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect staff / logistics users to their dedicated operations portals
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isRider) {
      navigate('/rider', { replace: true });
    }
  }, [isAdmin, isRider, navigate]);

  const feed = useCustomerOrders();
  const { orders, loading, refresh: fetchOrders } = feed;
  const requestedOrderId = new URLSearchParams(location.search).get('order');
  const [expandedOrderId, setExpandedOrderId] = useState(requestedOrderId || undefined);
  useEffect(() => { if (requestedOrderId) setExpandedOrderId(requestedOrderId); }, [requestedOrderId]);
  useEffect(() => {
    if (expandedOrderId === undefined && orders.length) setExpandedOrderId(orders[0]._id);
  }, [orders, expandedOrderId]);

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
        fetchOrders();
      } else {
        toast.error(res.message || 'Failed to cancel order.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };


  const toggleExpand = (id) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleRetryOnlinePayment = async (order) => {
    if (actionLoadingId) return;
    setActionLoadingId(order._id);
    try {
      const res = await orderService.retryPayment(order._id);
      if (res.success && res.razorpay) {
        launchRazorpayCheckout({
          order: res.order || order,
          razorpayPayload: res.razorpay,
          user,
          onSuccess: (updatedOrder) => {
            fetchOrders();
          },
          onDismiss: () => {},
          onFallback: () => {
            setSelectedOrderForPayment(res.order || order);
            setShowPaymentModal(true);
          }
        });
      } else {
        await fetchOrders();
        toast('Payment status updated.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to verify payment. Check again later; do not pay again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSwitchToCod = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      const res = await orderService.switchToCod(orderId);
      if (res.success && res.order) {
        fetchOrders();
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
    fetchOrders();
    toast.success('Payment updated successfully!');
  };

  return (
    <ContentState resource={copy}><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{copy('my_laundry_orders_live_tracking_a92f072')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{copy('track_individual_garment_progress_from_hub_pickup_to_doorstep_del_8511b99')}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={feed.refreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{copy('refresh_0e91610')}</span>
          </button>
          <Link
            to="/book"
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{copy('new_booking_502c524')}</span>
          </Link>
        </div>
      </div>

      <div className={`mb-5 rounded-xl px-4 py-3 text-sm ${feed.error ? 'bg-amber-50 text-amber-900' : 'bg-teal-50 text-teal-800'}`} role="status">
        {feed.error ? feed.error === 'auth' ? 'Sign in again to view your orders.' : feed.error === 'offline' ? 'You’re offline. Showing the last update.' : 'Updates are paused. Showing the last update and retrying automatically.' : 'Auto-updating · Your booking status stays in sync across pages.'}
      </div>
      {/* Main Content */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">{copy('retrieving_your_order_history_1db4ed3')}</p>
        </div>
      ) : feed.error && orders.length === 0 ? (
        <div role="alert" className="p-8 bg-white rounded-2xl border border-amber-200">We couldn’t load your orders. {feed.error === 'auth' ? <Link to="/login" className="underline">Sign in</Link> : <button type="button" onClick={fetchOrders} disabled={feed.refreshing} className="underline font-bold">Retry</button>}</div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{copy('no_orders_placed_yet_8185f12')}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{copy('you_haven_t_scheduled_any_laundry_or_steam_press_pickups_yet_book_b57f5ae')}</p>
          <div className="pt-2">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 text-white font-bold text-xs shadow-md shadow-primary-600/30 hover:bg-primary-700"
            >
              <span>{copy('schedule_first_wash_from_30_f42f90d')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {feed.hasMore && <button className="btn-secondary" disabled={feed.loadingMore} onClick={feed.loadMore}>{feed.loadingMore ? 'Loading…' : 'Load older orders'}</button>}
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order._id;
            const tracking = getTrackingState(order);

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
              >
                {/* Order Summary Top Bar */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${isExpanded ? 'Minimize' : 'View'} details for ${order.orderNumber}`}
                  aria-expanded={isExpanded}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleExpand(order._id); } }}
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
                        <OrderStatusBadge order={order} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <p className="text-xs text-slate-500">{copy('placed_on_bbba0c2')}{new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })} • {tracking.totalItems}{copy('garments_a2c86ca')}</p>
                        {tracking.otpType === 'pickup' && (order.verificationCodes?.pickupOtp || order.pickupOtp) && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-mono font-black text-xs shadow-xs">
                            <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                            <span>{copy('pickup_otp_dc427e5')}{order.verificationCodes?.pickupOtp || order.pickupOtp}</span>
                          </span>
                        )}
                        {tracking.otpType === 'delivery' && (order.verificationCodes?.deliveryOtp || order.deliveryOtp) && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-100 border border-teal-300 text-teal-950 font-mono font-black text-xs shadow-xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                            <span>{copy('delivery_otp_eef1f34')}{order.verificationCodes?.deliveryOtp || order.deliveryOtp}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    {order.payment?.method === 'ONLINE' && order.payment?.status !== 'REFUNDED' && (order.payment?.status !== 'PAID' || order.payment?.refundRequired) && <button type="button" disabled={actionLoadingId === order._id} className="text-xs font-bold text-primary-700 underline disabled:opacity-50" onClick={async event => {
                      event.stopPropagation(); setActionLoadingId(order._id);
                      try { const result = await orderService.checkPaymentStatus(order._id); await fetchOrders(); toast(result.order?.payment?.refundRequired ? 'Refund is awaiting provider confirmation.' : result.order?.payment?.status === 'PAID' ? 'Payment confirmed.' : 'Status checked. If money was debited, wait for verification before paying again.'); }
                      catch (error) { toast.error(error.response?.data?.message || 'Verification unavailable. Please check again later.'); }
                      finally { setActionLoadingId(null); }
                    }}>{actionLoadingId === order._id ? 'Checking…' : 'Check payment status'}</button>}
                    {order.payment?.method === 'ONLINE' && !['PAID', 'REFUNDED'].includes(order.payment?.status) && order.orderStatus !== 'CANCELLED' && order.holdExpiresAt && <p className="text-xs text-amber-800">Payment reservation expires at {new Date(order.holdExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Any payment captured after cancellation will be refunded.</p>}
                    {/* Payment Badge */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 sm:justify-end">
                        {order.payment?.refundRequired ? <span className="text-xs font-bold text-amber-800">Refund awaiting confirmation</span> : order.payment?.status === 'REFUNDED' ? <span className="text-xs font-bold text-indigo-700">Refund confirmed</span> : order.orderStatus === 'CANCELLED' || order.payment?.status === 'CANCELLED' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="text-xs font-bold text-slate-500">{copy('cancelled_8ab6812')}</span>
                          </>
                        ) : order.payment?.status === 'REFUNDED' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-xs font-bold text-indigo-700">{copy('refunded_6e72ba4')}</span>
                          </>
                        ) : order.payment?.status === 'PAID' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold text-emerald-800">{copy('paid_e17956e')}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-xs font-bold text-amber-800">
                              {order.payment?.method || copy('cod_ca8c637')}{copy('pending_3c9730e')}</span>
                          </>
                        )}
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

                {!isExpanded && <div className="px-6 pb-6"><OrderProgress order={order} showStages={false} /></div>}
                {/* Collapsible Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-6">
                    
                    {/* Doorstep OTP Verification Banners */}
                    {tracking.otpType === 'pickup' && (order.verificationCodes?.pickupOtp || order.pickupOtp) && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <KeyRound className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">{copy('doorstep_pickup_otp_7cb30f6')}</span>
                            <p className="text-xs text-amber-900 font-medium">{copy('share_this_4_digit_code_verbally_with_our_pickup_rider_at_your_do_fbd91e8')}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-white border-2 border-amber-400 text-center font-mono font-black text-xl text-amber-950 shadow-xs tracking-widest shrink-0">
                          {order.verificationCodes?.pickupOtp || order.pickupOtp}
                        </div>
                      </div>
                    )}

                    {tracking.otpType === 'delivery' && (order.verificationCodes?.deliveryOtp || order.deliveryOtp) && (
                      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-300 text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 block">{copy('doorstep_delivery_confirmation_otp_efa2ebf')}</span>
                            <p className="text-xs text-teal-900 font-medium">{copy('verify_and_inspect_your_clean_garments_then_share_this_4_digit_co_59e51fc')}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-white border-2 border-teal-500 text-center font-mono font-black text-xl text-teal-950 shadow-xs tracking-widest shrink-0">
                          {order.verificationCodes?.deliveryOtp || order.deliveryOtp}
                        </div>
                      </div>
                    )}

                    <OrderProgress order={order} />

                    {/* Order Details & Receipt Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Schedule & Address */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
                        <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">{copy('logistics_scheduling_9eae2d7')}</h4>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-800">{copy('pickup_schedule_64b5474')}</span>
                              <p className="text-slate-600">
                                {order.pickupSchedule?.date} • {order.pickupSchedule?.timeSlot}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <Truck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-800">{copy('delivery_target_81bfc95')}</span>
                              <p className="text-slate-600">
                                {order.deliverySchedule?.date} • {order.deliverySchedule?.timeSlot}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-800">{copy('doorstep_address_bc63632')}</span>
                              <p className="text-slate-600">
                                {order.pickupAddress?.flatAndBuilding}, {order.pickupAddress?.streetAndLandmark}, {order.pickupAddress?.city} - {order.pickupAddress?.pincode}
                              </p>
                              <p className="text-slate-500 text-[11px] mt-0.5">{copy('contact_8fe6d39')}{order.pickupAddress?.contactPhone}
                              </p>
                            </div>
                          </div>

                          {/* Decoupled Two-Leg Fleet & Rider Details */}
                          {(() => {
                            const isDeliveryLeg = ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus);
                            const activeRider = isDeliveryLeg
                              ? (order.logistics?.deliveryRider || order.logistics?.assignedRider)
                              : (order.logistics?.pickupRider || order.logistics?.assignedRider);

                            return (
                              <>
                                {activeRider && (
                                  <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                                    <Bike className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold text-slate-800">
                                        {isDeliveryLeg ? copy('assigned_delivery_rider_e855a22') : copy('assigned_pickup_rider_f1820f5')}
                                      </span>
                                      <p className="text-slate-600">
                                        {activeRider.name} •{' '}
                                        <a href={`tel:${activeRider.phone}`} className="text-teal-700 font-bold hover:underline">
                                          {activeRider.phone || copy('contact_via_indodhobi_d8ec29b')}
                                        </a>
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {order.orderStatus !== 'CANCELLED' && order.payment?.method === 'COD' && order.payment?.status !== 'PAID' && order.payment?.status !== 'CANCELLED' && (
                                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                                    <QrCode className="w-4 h-4 text-amber-700 shrink-0" />
                                    <p className="leading-relaxed">
                                      <strong>{copy('doorstep_payment_options_3369dd9')}</strong>{copy('pay_our_rider_via_exact_cash_or_scan_our_official_company_dynamic_bc725d0')}</p>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {/* Bag Tag ID if present */}
                          {order.logistics?.bagTagId && (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <Tag className="w-4 h-4 text-teal-600 shrink-0" />
                              <span className="text-slate-600 font-medium">{copy('bag_tag_id_e68c185')}</span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {order.logistics.bagTagId}
                              </span>
                            </div>
                          )}

                          {/* Inspection Notes if present */}
                          {order.logistics?.inspectionNotes && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px]">
                              <span className="font-bold text-amber-900">{copy('doorstep_inspection_notes_4652744')}</span>
                              <span className="text-amber-800">{order.logistics.inspectionNotes}</span>
                            </div>
                          )}

                          {/* Stain & Inspection Photos if present */}
                          {order.logistics?.inspectionPhotos?.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                              <span className="font-bold text-slate-800 block text-[11px]">{copy('doorstep_stain_fabric_inspection_photos_7044151')}{order.logistics.inspectionPhotos.length}):
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {order.logistics.inspectionPhotos.map((photo, pIdx) => (
                                  <a
                                    key={pIdx}
                                    href={photo?.url || photo?.imageUrl || photo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-square rounded-xl overflow-hidden border border-slate-200 group relative hover:opacity-90 transition-opacity bg-slate-50"
                                  >
                                    <img
                                      src={photo?.url || photo?.imageUrl || photo}
                                      alt={`Inspection Photo ${pIdx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <span className="absolute bottom-1 right-1 bg-slate-900/70 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">{copy('view_dcc839a')}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {order.preferences?.specialInstructions && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                              <span className="font-bold text-slate-700">{copy('special_notes_d9e1e32')}</span>
                              <span className="text-slate-600">{order.preferences.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Itemized Bill Breakdown */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="font-bold text-slate-900">{copy('itemized_bill_breakdown_158df3e')}</h4>
                          <span className="text-slate-500 font-medium">{copy('tax_invoice_e6876b3')}</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start">
                              <div>
                                <span className="font-bold text-slate-800">{item.garmentName}</span>
                                <span className="text-slate-500 ml-1.5 font-medium">× {item.quantity}</span>
                                <p className="text-[10px] text-slate-400">
                                  {orderServiceLabel(item)}
                                  {item.ironingType !== 'NONE' && ` • ${orderFinishLabel(item)}`}
                                </p>
                              </div>
                              <span className="font-semibold text-slate-900">₹{item.lineTotal}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-1.5">
                          <div className="flex justify-between text-slate-500">
                            <span>{copy('subtotal_8cf83a4')}</span>
                            <span>₹{order.pricingBreakdown?.subtotal}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>{copy('pickup_delivery_fee_037a708')}</span>
                            <span>{order.pricingBreakdown?.pickupDeliveryFee === 0 ? copy('free_19f1fa5') : `₹${order.pricingBreakdown?.pickupDeliveryFee}`}</span>
                          </div>
                          {order.pricingBreakdown?.expressSurcharge > 0 && <div className="flex justify-between"><span>{copy('order_extra_express')}</span><span>₹{order.pricingBreakdown.expressSurcharge}</span></div>}
              {order.pricingBreakdown?.extraPreferenceFee > 0 && <div className="flex justify-between"><span>{copy('order_extra_preferences')}</span><span>₹{order.pricingBreakdown.extraPreferenceFee}</span></div>}
              {order.pricingBreakdown?.discountAmount > 0 && <div className="flex justify-between"><span>{copy('order_extra_discount')} ({order.pricingBreakdown.couponCode}):</span><span>−₹{order.pricingBreakdown.discountAmount}</span></div>}
              <div className="flex justify-between text-slate-500">
                            <span>{copy('gst_5_be9ba6d')}{order.pricingBreakdown?.gstPercentage != null ? ` (${order.pricingBreakdown.gstPercentage}%)` : ''}:</span>
                            <span>₹{order.pricingBreakdown?.taxAmount}</span>
                          </div>
                          <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-200">
                            <span>{copy('grand_total_8d7627e')}</span>
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
                            <span>{copy('view_print_gst_invoice_6d32a48')}</span>
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
                              <span>{copy('cancel_order_205f016')}</span>
                            </button>
                          )}
                        </div>

                        {/* Payment Actions for Unpaid / Pending Online Orders */}
                        {order.orderStatus !== 'CANCELLED' && order.payment?.method === 'ONLINE' && order.payment?.status !== 'PAID' && order.payment?.status !== 'CANCELLED' && (
                          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              disabled={actionLoadingId === order._id}
                              onClick={() => handleRetryOnlinePayment(order)}
                              className="flex-1 py-2.5 px-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{actionLoadingId === order._id ? 'Processing…' : copy('retry_online_payment_2902f50')}</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === order._id}
                              onClick={() => handleSwitchToCod(order._id)}
                              className="py-2.5 px-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-slate-500" />
                              <span>{copy('switch_to_cod_4b139f8')}</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Status History & Audit Trail */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{copy('live_status_timeline_audit_trail_1ed0194')}</h4>
                        <div className="space-y-3 border-l-2 border-teal-200 ml-2 pl-4">
                          {order.statusHistory.map((hist, idx) => (
                            <div key={idx} className="relative text-xs">
                              <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-teal-100" />
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <OrderStatusBadge order={{ orderStatus: hist.status }} />
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

    </div></ContentState>
  );
};


export default MyOrdersPage;
