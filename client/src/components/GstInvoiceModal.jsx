import React, { useState, useEffect } from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, Shirt, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { configService } from '../services/api';

const GstInvoiceModal = ({ order, isOpen, onClose, platformConfig }) => {
  const [activeConfig, setActiveConfig] = useState(platformConfig || null);

  useEffect(() => {
    if (!platformConfig) {
      configService.getPublicConfig().then((res) => {
        if (res.success && res.config) {
          setActiveConfig(res.config);
        }
      }).catch(() => {});
    } else {
      setActiveConfig(platformConfig);
    }
  }, [platformConfig]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const pb = order.pricingBreakdown || {
    subtotal: 0,
    discountAmount: 0,
    couponCode: null,
    pickupDeliveryFee: 0,
    expressSurcharge: 0,
    taxAmount: 0,
    grandTotal: 0
  };

  const businessName = activeConfig?.businessName || 'IndoDhobi Laundry & Dry Cleaning Pvt. Ltd.';
  const gstin = activeConfig?.gstin || '07AABCI1234F1Z5';
  const sacCode = activeConfig?.sacCode || '999712';
  const gstPercentage = activeConfig?.gstPercentage !== undefined ? activeConfig.gstPercentage : 5;
  const halfGst = (gstPercentage / 2).toFixed(1).replace(/\.0$/, '');

  // GST split: CGST + SGST dynamically based on activeConfig.gstPercentage
  const cgstAmount = (pb.taxAmount / 2).toFixed(2);
  const sgstAmount = (pb.taxAmount / 2).toFixed(2);

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const invoiceNumber = `INV-${order.orderNumber}`;

  const paymentStatus = order.payment?.status || 'PENDING';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full">
        
        {/* Action Header (Hidden during print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tax Invoice Document
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-200 font-bold text-slate-700">
              {invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-8 print:p-6 space-y-6 text-slate-800 text-xs">
          
          {/* Header & Seller Metadata */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black">
                  <Shirt className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Indo<span className="text-primary-600">Dhobi</span>
                </h1>
              </div>
              <p className="font-semibold text-slate-700">{businessName}</p>
              <p className="text-slate-500">Plot 42, Central Processing Hub, Okhla Phase III</p>
              <p className="text-slate-500">New Delhi - 110020, India</p>
              <div className="mt-2 space-y-0.5 text-[11px] font-mono text-slate-600">
                <p><strong>GSTIN:</strong> {gstin}</p>
                <p><strong>SAC Code:</strong> {sacCode} (Laundry &amp; Cleaning Services)</p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-widest">
                TAX INVOICE
              </span>
              <p className="font-mono text-sm font-bold text-slate-900 mt-2">{invoiceNumber}</p>
              <p className="text-slate-500">
                <strong>Date:</strong> {format(orderDate, 'dd MMM yyyy, hh:mm a')}
              </p>
              <p className="text-slate-500">
                <strong>Order Ref:</strong> #{order.orderNumber}
              </p>
              {order.logistics?.bagTagId && (
                <p className="font-mono text-teal-700 font-bold">
                  <strong>Bag Tag:</strong> {order.logistics.bagTagId}
                </p>
              )}
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 print:bg-transparent print:p-0 print:border-none">
            <div>
              <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Billed To (Customer)
              </h3>
              <p className="font-bold text-slate-900 text-sm">
                {order.customer?.name || 'Customer'}
              </p>
              <p className="text-slate-600">{order.customer?.phone || order.pickupAddress?.contactPhone || 'N/A'}</p>
              {order.customer?.email && <p className="text-slate-500">{order.customer.email}</p>}
            </div>

            <div>
              <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Doorstep Service Address
              </h3>
              <p className="font-medium text-slate-800">
                {order.pickupAddress?.flatAndBuilding}
              </p>
              <p className="text-slate-600">{order.pickupAddress?.streetAndLandmark}</p>
              <p className="text-slate-600">
                {order.pickupAddress?.city} - {order.pickupAddress?.pincode}
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Garment Item</th>
                  <th className="py-2.5 px-3">Service Type</th>
                  <th className="py-2.5 px-3">Ironing</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {item.garmentName}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Category: {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.serviceType?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.ironingType === 'NONE' ? 'None' : item.ironingType?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ₹{item.unitPrice}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{item.lineTotal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary & Tax Breakdown */}
          <div className="grid grid-cols-2 gap-6 pt-2">
            
            {/* Payment & Stamp Column */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5 print:bg-transparent">
                <span className="font-bold text-slate-600 block text-[10px] uppercase tracking-wider">
                  Payment Status &amp; Method
                </span>
                <div className="flex items-center gap-2">
                  {paymentStatus === 'PAID' ? (
                    <div className="px-3 py-1 rounded-lg bg-teal-100 text-teal-800 font-black text-xs inline-flex items-center gap-1 border border-teal-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>PAID &amp; SETTLED</span>
                    </div>
                  ) : paymentStatus === 'REFUNDED' ? (
                    <div className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-xs inline-flex items-center gap-1 border border-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>REFUNDED</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs">
                      COD - PAYMENT DUE AT DELIVERY
                    </div>
                  )}
                  <span className="text-slate-600 font-medium">
                    ({order.payment?.method} {order.payment?.onlineSubMethod ? `• ${order.payment.onlineSubMethod}` : ''})
                  </span>
                </div>
                {order.payment?.paidAt && (
                  <p className="text-[10px] text-slate-500">
                    Paid on {format(new Date(order.payment.paidAt), 'dd MMM yyyy, hh:mm a')}
                  </p>
                )}
                {order.payment?.razorpayPaymentId && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    Txn ID: {order.payment.razorpayPaymentId}
                  </p>
                )}
              </div>

              <div className="text-[10px] text-slate-400 space-y-0.5">
                <p>• This is a computer-generated GST tax invoice.</p>
                <p>• IndoDhobi guarantees fabric care as per individual care labels.</p>
                <p>• For questions, reach out to help@indodhobi.com</p>
              </div>
            </div>

            {/* Calculations Column */}
            <div className="space-y-2 border-t border-slate-200 pt-2 font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Garments Subtotal:</span>
                <span className="font-mono text-slate-900 font-bold">₹{pb.subtotal}</span>
              </div>

              {pb.discountAmount > 0 && (
                <div className="flex justify-between text-teal-700 font-semibold">
                  <span>Promo Discount ({pb.couponCode || 'PROMO'}):</span>
                  <span className="font-mono">-₹{pb.discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Doorstep Pickup &amp; Delivery Fee:</span>
                <span className="font-mono text-slate-900 font-bold">
                  {pb.pickupDeliveryFee === 0 ? 'FREE' : `₹${pb.pickupDeliveryFee}`}
                </span>
              </div>

              {pb.expressSurcharge > 0 && (
                <div className="flex justify-between text-amber-800 font-semibold">
                  <span>Express 24h Turnaround Surcharge:</span>
                  <span className="font-mono">+₹{pb.expressSurcharge}</span>
                </div>
              )}

              <div className="border-t border-slate-200 my-1 pt-1 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Central GST (CGST @ {halfGst}%):</span>
                  <span className="font-mono">₹{cgstAmount}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>State GST (SGST @ {halfGst}%):</span>
                  <span className="font-mono">₹{sgstAmount}</span>
                </div>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                <span>Grand Total (INR):</span>
                <span className="text-primary-700 font-mono">₹{pb.grandTotal}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default GstInvoiceModal;
