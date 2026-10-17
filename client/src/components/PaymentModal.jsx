import React, { useState } from 'react';
import { X, Lock, AlertCircle, Loader2 } from 'lucide-react';
import usePageCopy from '../hooks/usePageCopy';
import { orderService } from '../services/api';
import { launchRazorpayCheckout } from '../utils/razorpayCheckout';

// A failed gateway never becomes a local simulated payment or collects card details.
export default function PaymentModal({ isOpen, onClose, order, onSuccess }) {
  const copy = usePageCopy('orders');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  if (!isOpen || !order) return null;
  async function retry() {
    setProcessing(true); setError('');
    try {
      const response = await orderService.retryPayment(order._id);
      await launchRazorpayCheckout({ order: response.order, razorpayPayload: response.razorpay,
        user: response.order.customerSnapshot,
        onSuccess, onDismiss: () => {}, onFallback: () => setError(copy('gateway_unavailable')) });
    } catch (error) { setError(error.response?.data?.message || copy('gateway_unavailable')); }
    finally { setProcessing(false); }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-teal-600 px-6 py-5 text-white">
        <div className="flex items-center justify-between"><div className="flex gap-2.5 items-center"><Lock className="w-5 h-5" /><div><h3 className="font-bold text-lg">{copy('indodhobi_secure_pay_cc2ffc4')}</h3><p className="text-xs">{copy('order_ref_6dbdd46')}{order.orderNumber}</p></div></div><button onClick={onClose} aria-label={copy('close_payment_modal_9132f6e')}><X /></button></div>
        <div className="mt-4 pt-3 border-t border-white/20 flex justify-between"><span>{copy('amount_payable_aab32ef')}</span><strong>₹{order.pricingBreakdown?.grandTotal}</strong></div>
      </div>
      <div className="p-6 space-y-5"><div role="alert" className="flex gap-3 text-amber-800"><AlertCircle className="shrink-0 w-5 h-5" /><p>{error || copy('gateway_unavailable')}</p></div><button className="btn-primary w-full flex justify-center gap-2" disabled={processing} onClick={retry}>{processing && <Loader2 className="w-4 h-4 animate-spin" />}{copy(processing ? 'connecting_secure_gateway_verifying_4dbb816' : 'retry_online_payment_2902f50')}</button></div>
    </div>
  </div>;
}
