import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, FileText, CheckCircle, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

const PrivacyPolicyPage = () => {
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
          <span className="text-slate-800">Privacy Policy</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center shadow-xs">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Legal &amp; Compliance</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Privacy Policy
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            At IndoDhobi Technologies Pvt Ltd (&quot;IndoDhobi&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we value your privacy and are committed to safeguarding your personal data in strict compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <span><strong>Effective Date:</strong> January 1, 2026</span>
            <span><strong>Last Updated:</strong> October 15, 2026</span>
            <span><strong>Version:</strong> 2.4.0</span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">1</span>
              <span>Information We Collect</span>
            </h2>
            <p>
              When you use IndoDhobi services, create an account, schedule laundry pickups, or communicate with our operations team, we collect the following types of information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Personal Identity &amp; Contact:</strong> Full name, verified mobile phone number (via OTP), and optional email address.
              </li>
              <li>
                <strong>Doorstep Logistics &amp; Address:</strong> House/flat number, apartment/building name, street, nearby landmark, city, and 6-digit postal pincode.
              </li>
              <li>
                <strong>Order &amp; Laundry Specifications:</strong> Selected garment categories, quantities, custom fabric instructions (e.g. starch preference, delicate silk care), and pickup/delivery date-time slots.
              </li>
              <li>
                <strong>Inspection &amp; Verification Media:</strong> Photographs of pre-existing garment stains, tears, or tag markings captured by our doorstep logistics rider during bag sealing.
              </li>
              <li>
                <strong>Payment Information:</strong> Transaction identifiers, payment mode (Cash on Delivery, UPI Dynamic QR, or Razorpay card/netbanking), and bank reference UTR numbers. We do <em>not</em> store full credit/debit card numbers or UPI PINs.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">2</span>
              <span>How We Use Your Information</span>
            </h2>
            <p>Your data is processed strictly for legitimate operational purposes:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Service Fulfillment
                </span>
                <p className="text-xs text-slate-500">Dispatching verified doorstep riders, processing laundry in temperature-controlled hub batches, and scheduling 48-hr delivery.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Real-time Notifications
                </span>
                <p className="text-xs text-slate-500">Transmitting 4-digit pickup and delivery verification OTPs, rider contact coordinates, and order progression alerts.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Quality &amp; Discrepancy Audits
                </span>
                <p className="text-xs text-slate-500">Resolving garment count mismatches, spot treatments, and damage claims using verified bag tags and doorstep photos.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Legal &amp; Tax Compliance
                </span>
                <p className="text-xs text-slate-500">Generating compliant GST Tax Invoices and maintaining audit ledgers as mandated by Indian taxation laws.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">3</span>
              <span>Data Protection &amp; Security Measures</span>
            </h2>
            <p>
              We implement industry-standard administrative, physical, and technical controls to safeguard your data against unauthorized access, loss, or misuse:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>All web and API traffic is encrypted in transit using Transport Layer Security (TLS 1.3 / HTTPS).</li>
              <li>Databases are encrypted at rest with automated daily backups and multi-region redundancy.</li>
              <li>Doorstep riders have time-limited, role-based access strictly to orders assigned to their current delivery shift.</li>
              <li>Payment transactions are handled through PCI-DSS Level 1 compliant gateway partners (Razorpay and NPCI Unified Payments Interface).</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">4</span>
              <span>Third-Party Sharing &amp; Disclosures</span>
            </h2>
            <p>
              We do <strong>not</strong> sell, rent, or trade your personal information to third-party advertisers. Data is shared exclusively with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Certified Logistics Personnel:</strong> Verified riders who require your delivery address and phone number for doorstep handover.</li>
              <li><strong>Payment Service Providers:</strong> Razorpay Software Pvt Ltd and banking partners for processing digital settlements.</li>
              <li><strong>Cloud Infrastructure Providers:</strong> ISO-27001 certified hosting and Cloudinary media storage for inspection photos.</li>
              <li><strong>Law Enforcement Authorities:</strong> When required by binding court orders or statutory mandates under Indian law.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">5</span>
              <span>Your Rights Under DPDP Act</span>
            </h2>
            <p>
              As a customer, you retain full rights to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Access a summary of personal data held about you and past order invoices.</li>
              <li>Request correction or updating of inaccurate addresses or contact numbers.</li>
              <li>Request account erasure and deletion of your profile data, subject to statutory GST retention rules.</li>
              <li>Nominate a representative in case of incapacity.</li>
            </ul>
          </section>

          {/* Section 6 - Grievance Officer */}
          <section className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary-600" />
              <span>Grievance Officer &amp; Contact Information</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, the details of our appointed Grievance Officer are:
            </p>
            <div className="text-xs text-slate-700 space-y-1 pt-1 font-medium">
              <p><strong>Name:</strong> Grievance Redressal Officer, IndoDhobi</p>
              <p><strong>Company:</strong> IndoDhobi Technologies Pvt Ltd</p>
              <p><strong>Registered Address:</strong> Barakhamba Road, Connaught Place, New Delhi, Delhi 110001</p>
              <p><strong>Email:</strong> <a href="mailto:privacy@indodhobi.com" className="text-primary-600 font-bold hover:underline">privacy@indodhobi.com</a> / <a href="mailto:care@indodhobi.com" className="text-primary-600 font-bold hover:underline">care@indodhobi.com</a></p>
              <p><strong>Phone:</strong> +91 98765 43210 (Mon-Sat, 9:00 AM - 6:00 PM IST)</p>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
