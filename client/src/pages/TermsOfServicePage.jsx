import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ShieldAlert, Shirt, Truck, Banknote, HelpCircle, ArrowLeft } from 'lucide-react';

const TermsOfServicePage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800">Terms of Service</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
              <FileCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Legal Agreement</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Terms of Service
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            Welcome to IndoDhobi. Please read these Terms of Service carefully before booking laundry, dry cleaning, or steam pressing services through our web application or mobile portals.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <span><strong>Effective Date:</strong> January 1, 2026</span>
            <span><strong>Last Updated:</strong> October 15, 2026</span>
            <span><strong>Jurisdiction:</strong> New Delhi, India</span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">1</span>
              <span>Acceptance &amp; Eligibility</span>
            </h2>
            <p>
              By accessing our platform or placing an order, you agree to be bound by these Terms and our Privacy Policy. You must be at least 18 years of age and legally competent to enter into binding contracts under the Indian Contract Act, 1872.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">2</span>
              <span>Doorstep Pickup &amp; Delivery Protocol</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Punctuality &amp; Slots:</strong> Pickups and deliveries are scheduled within designated time slots (e.g. 10:00 AM - 01:00 PM). Our verified doorstep rider will contact you prior to arrival.
              </li>
              <li>
                <strong>Doorstep OTP Verification:</strong> To ensure chain-of-custody security, you must provide the 4-digit Pickup OTP displayed on your order screen to the rider. The rider will count and seal your laundry bag with a tamper-evident physical Bag Tag ID.
              </li>
              <li>
                <strong>Turnaround Time:</strong> Standard turnaround time is 48 hours from successful pickup. Express 24-hour turnaround is available for selected services subject to express surcharge.
              </li>
              <li>
                <strong>Delivery Handover:</strong> Handover requires sharing the 4-digit Delivery OTP. Please inspect the sealed package upon delivery.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">3</span>
              <span>Garment Inspection, Care &amp; Discrepancy Policy</span>
            </h2>
            <p>
              While IndoDhobi employs commercial-grade German steam machinery and fabric-safe hypoallergenic detergents, the following terms govern garment handling:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Pre-existing Defects:</strong> Any tears, missing buttons, color runs, or stubborn pre-existing stains observed during doorstep pickup or plant audit will be logged with photographic evidence and customer notification.
              </li>
              <li>
                <strong>Valuables in Pockets:</strong> Customers are solely responsible for emptying all garment pockets before pickup. IndoDhobi is not liable for money, jewelry, electronics, or pens left inside clothes.
              </li>
              <li>
                <strong>Delicate Fabrics:</strong> Silks, pure wool, pashminas, hand-embroidered sarees, and wedding lehengas must be booked under the designated &quot;Dry Clean &amp; Delicate&quot; category. IndoDhobi will adhere to standard manufacturer wash-care tags.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">4</span>
              <span>Pricing, Payments &amp; COD Terms</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Transparent Pricing:</strong> All service rates are published per garment and inclusive of applicable 5% Goods and Services Tax (GST). Official GST Tax Invoices are downloadable from your account portal.
              </li>
              <li>
                <strong>Cash on Delivery (COD):</strong> For COD orders, payment is due upon doorstep delivery. You may pay the assigned rider via physical Cash or by scanning the Official Company Dynamic UPI QR code. A 12-digit UPI reference (UTR) is verified on digital settlements.
              </li>
              <li>
                <strong>Minimum Order Value:</strong> Orders under ₹399 incur a standard pickup &amp; delivery fee of ₹49. Orders of ₹399 and above receive 100% Free Doorstep Delivery.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">5</span>
              <span>Order Cancellation &amp; Refund Policy</span>
            </h2>
            <p>
              Orders may be cancelled free of charge at any time before clothes are picked up from your doorstep (in &quot;Booked&quot; or &quot;Pickup Assigned&quot; stage). Once clothes are picked up and sealed with a Bag Tag, cancellations cannot be processed.
            </p>
            <p className="text-slate-600">
              For cancelled orders where payment was prepaid online, a 100% full refund is initiated within 2 business hours back to the original source payment method (bank account / UPI / credit card), reflecting within 3-5 banking days. For COD orders, the order is cancelled with zero charge.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">6</span>
              <span>Loss, Damage &amp; Maximum Liability Cap</span>
            </h2>
            <p>
              In the unlikely event of physical damage or loss of an article directly resulting from our gross negligence, IndoDhobi provides fair compensation capped at:
            </p>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <p>
                <strong>Maximum Compensation Cap:</strong> Maximum of <strong>10 times the laundering service charge</strong> for the individual item, or <strong>₹3,000</strong> per article (whichever is lower), upon provision of an original purchase receipt and verified inspection audit.
              </p>
              <p className="text-amber-800">
                Any claim must be reported to <a href="mailto:care@indodhobi.com" className="font-bold underline">care@indodhobi.com</a> within 24 hours of delivery.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">7</span>
              <span>Dispute Resolution &amp; Governing Law</span>
            </h2>
            <p className="text-slate-600">
              These Terms shall be governed by and construed in accordance with the laws of India. Any legal suit, action, or proceeding arising out of or related to these Terms shall be instituted exclusively in the competent courts located in New Delhi, Delhi, India.
            </p>
          </section>

          {/* Section 8 - Contact */}
          <section className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            <p>
              Questions regarding these Terms? Contact us at <a href="mailto:legal@indodhobi.com" className="text-primary-600 font-bold hover:underline">legal@indodhobi.com</a> or call our support helpline at <strong>+91 98765 43210</strong>.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
};

export default TermsOfServicePage;
