import ContentState from '../components/ContentState';
import usePageCopy from '../hooks/usePageCopy';
import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Receipt, 
  ArrowRight, 
  Truck,
  ShieldCheck
} from 'lucide-react';

const OrderSuccessPage = () => {
  const copy = usePageCopy('order-success');
  const location = useLocation();
  const order = location.state?.order;

  if (!order) {
    return <Navigate to="/my-orders" replace />;
  }

  const isPaid = order.payment?.status === 'PAID';

  return (
    <ContentState resource={copy}><div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8 text-center sm:text-left">
      
      {/* Celebration Header */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-100 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{copy('pickup_booking_confirmed_effdaed')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{copy('order_a458d68')}{order.orderNumber}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">{copy('our_rider_has_been_scheduled_for_doorstep_collection_you_will_rec_c985e62')}</p>
        </div>

        {/* Status Pills */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 font-bold border border-primary-200">{copy('status_4889951')}{order.orderStatus.replace(/_/g, ' ')}
          </span>
          <span className={`px-3 py-1 rounded-full font-bold border ${
            isPaid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>{copy('payment_8efbcb3')}{isPaid ? copy('paid_online_01d3da2') : copy('cash_on_delivery_pending_2b7ce29')}
          </span>
        </div>
      </div>

      {/* Logistics & Invoice Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          
          {/* Pickup & Delivery */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span>{copy('logistics_timetable_6fc24cb')}</span>
            </div>

            <div className="space-y-2 text-slate-600">
              <div>
                <span className="font-semibold text-slate-800 block">{copy('pickup_slot_6f7c1d9')}</span>
                <p>{order.pickupSchedule?.date} • {order.pickupSchedule?.timeSlot}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-800 block">{copy('estimated_doorstep_delivery_fb36672')}</span>
                <p>{order.deliverySchedule?.date} • {order.deliverySchedule?.timeSlot}</p>
              </div>
              <div className="pt-1">
                <span className="font-semibold text-slate-800 block">{copy('pickup_address_b62bdad')}</span>
                <p className="text-slate-500">
                  {order.pickupAddress?.flatAndBuilding}, {order.pickupAddress?.streetAndLandmark}, {order.pickupAddress?.city} - {order.pickupAddress?.pincode}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Receipt className="w-4 h-4 text-teal-600" />
              <span>{copy('tax_invoice_summary_0fc8ddc')}</span>
            </div>

            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>{copy('garments_total_50bb34c')}{order.items?.length}{copy('items_e4de98f')}</span>
                <span>₹{order.pricingBreakdown?.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>{copy('doorstep_delivery_fee_d18fba2')}</span>
                <span>{order.pricingBreakdown?.pickupDeliveryFee === 0 ? copy('free_19f1fa5') : `₹${order.pricingBreakdown?.pickupDeliveryFee}`}</span>
              </div>
              {order.pricingBreakdown?.expressSurcharge > 0 && <div className="flex justify-between"><span>{copy('order_extra_express')}</span><span>₹{order.pricingBreakdown.expressSurcharge}</span></div>}
              {order.pricingBreakdown?.extraPreferenceFee > 0 && <div className="flex justify-between"><span>{copy('order_extra_preferences')}</span><span>₹{order.pricingBreakdown.extraPreferenceFee}</span></div>}
              {order.pricingBreakdown?.discountAmount > 0 && <div className="flex justify-between"><span>{copy('order_extra_discount')} ({order.pricingBreakdown.couponCode}):</span><span>−₹{order.pricingBreakdown.discountAmount}</span></div>}
              <div className="flex justify-between">
                <span>{copy('gst_5_be9ba6d')}{order.pricingBreakdown?.gstPercentage != null ? ` (${order.pricingBreakdown.gstPercentage}%)` : ''}:</span>
                <span>₹{order.pricingBreakdown?.taxAmount}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>{copy('grand_total_8d7627e')}</span>
                <span className="text-primary-700">₹{order.pricingBreakdown?.grandTotal}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to="/my-orders"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-600/30 flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>{copy('track_order_trajectory_54f7545')}</span>
          </Link>

          <Link
            to="/book"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2"
          >
            <span>{copy('book_another_wash_0dfe144')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

    </div></ContentState>
  );
};

export default OrderSuccessPage;
