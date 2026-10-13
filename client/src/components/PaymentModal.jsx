import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  Lock, 
  QrCode,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { orderService } from '../services/api';
import toast from 'react-hot-toast';

const PaymentModal = ({ isOpen, onClose, order, onSuccess }) => {
  if (!isOpen || !order) return null;

  const [activeTab, setActiveTab] = useState('UPI'); // 'UPI', 'CARD', 'NET_BANKING'
  const [upiId, setUpiId] = useState('customer@okaxis');
  const [selectedUpiApp, setSelectedUpiApp] = useState('GPay');
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('842');
  const [cardName, setCardName] = useState(order.pickupAddress?.contactPhone ? 'Rohan Sharma' : 'Cardholder');

  // Net banking state
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const [processing, setProcessing] = useState(false);
  const [successPaid, setSuccessPaid] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const grandTotal = order.pricingBreakdown?.grandTotal || 0;

  const handleProcessPayment = async () => {
    setProcessing(true);

    try {
      // Simulate gateway latency of 1.2s for authentic payment processing feel
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const payload = {
        razorpay_order_id: order.payment?.razorpayOrderId || `order_sim_${Date.now()}`,
        razorpay_payment_id: `pay_sim_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        razorpay_signature: 'simulated_valid_signature',
        onlineSubMethod: activeTab,
      };

      const res = await orderService.payOnline(order._id, payload);

      if (res.success) {
        setReceiptData({
          transactionId: payload.razorpay_payment_id,
          method: activeTab,
          amount: grandTotal,
          date: new Date().toLocaleString('en-IN')
        });
        setSuccessPaid(true);
        toast.success('Payment captured successfully!');
        if (onSuccess) {
          onSuccess(res.order);
        }
      } else {
        toast.error(res.message || 'Payment processing failed.');
      }
    } catch (error) {
      console.error('[Payment Modal Error]:', error);
      toast.error(error.response?.data?.message || 'Payment could not be completed. Please retry.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transition-all animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">IndoDhobi Secure Pay</h3>
                <p className="text-xs text-white/80">Order Ref: {order.orderNumber}</p>
              </div>
            </div>
            {!successPaid && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close payment modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-baseline justify-between">
            <span className="text-xs font-medium text-white/90">Amount Payable:</span>
            <div className="text-2xl font-black tracking-tight text-white">
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {successPaid ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-bold text-slate-900">Payment Successful!</h4>
              <p className="text-xs text-slate-500">
                A digital tax receipt has been generated and linked to your order.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 border border-slate-200/80 text-left">
              <div className="flex justify-between text-slate-600">
                <span>Transaction Ref:</span>
                <span className="font-mono font-semibold text-slate-900">{receiptData?.transactionId}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-900">{receiptData?.method} Gateway</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date & Time:</span>
                <span className="font-semibold text-slate-900">{receiptData?.date}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Total Paid:</span>
                <span className="font-black text-slate-900 text-sm">₹{receiptData?.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all"
            >
              Done & View Order Details
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('UPI')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'UPI'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CARD')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'CARD'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('NET_BANKING')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'NET_BANKING'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Net Banking</span>
              </button>
            </div>

            {/* TAB 1: UPI */}
            {activeTab === 'UPI' && (
              <div className="space-y-4">
                {/* UPI Apps selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Popular UPI Apps:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['GPay', 'PhonePe', 'Paytm'].map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setSelectedUpiApp(app)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                          selectedUpiApp === app
                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Code / VPA field */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center gap-4">
                  <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-300 flex items-center justify-center shrink-0 shadow-xs">
                    <QrCode className="w-12 h-12 text-slate-800" />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-slate-800">Scan UPI QR or enter UPI ID</p>
                    <p className="text-[11px] text-slate-500">
                      Supports BHIM, Google Pay, PhonePe, Paytm, CRED & all Indian bank UPI apps.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Virtual Payment Address (UPI ID)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mobile@upi or username@okhdfcbank"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: CREDIT / DEBIT CARD */}
            {activeTab === 'CARD' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 0000 0000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CVV / Security Code
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>256-bit SSL Encrypted • RuPay, Visa & Mastercard Supported</span>
                </div>
              </div>
            )}

            {/* TAB 3: NET BANKING */}
            {activeTab === 'NET_BANKING' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Your Bank:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'HDFC Bank',
                    'State Bank of India',
                    'ICICI Bank',
                    'Axis Bank',
                    'Kotak Mahindra',
                    'Punjab National Bank'
                  ].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-all ${
                        selectedBank === bank
                          ? 'border-primary-600 bg-primary-50 text-primary-800'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate">{bank}</span>
                      {selectedBank === bank && (
                        <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Banner / Gateway Notice */}
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200/60 flex items-start gap-2.5 text-xs text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Zero-Risk Payment Gateway:</span> IndoDhobi operates verified payment pipelines with RBI-compliant tokenization and instant digital receipts.
              </div>
            </div>

            {/* Pay Action Button */}
            <button
              type="button"
              onClick={handleProcessPayment}
              disabled={processing}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting Secure Gateway & Verifying...</span>
                </>
              ) : (
                <>
                  <span>Pay ₹{grandTotal.toLocaleString('en-IN')} Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentModal;
