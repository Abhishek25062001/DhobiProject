import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Truck, 
  Shirt, 
  Star, 
  Layers, 
  Flame, 
  Award,
  ChevronRight
} from 'lucide-react';
import { useOrderBooking } from '../context/OrderBookingContext';
import ActiveOrderTracker from '../components/ActiveOrderTracker';

const HomePage = () => {
  const { itemCount } = useOrderBooking();

  const services = [
    {
      title: 'Wash & Fold',
      desc: 'Gentle antiseptic wash with premium fabric softeners. Neatly folded in eco-pouches.',
      price: 'From ₹30/pc',
      icon: Shirt,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Wash & Steam Iron',
      desc: 'Deep clean wash followed by commercial high-pressure steam press for zero creases.',
      price: 'From ₹45/pc',
      icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-600',
      badge: 'Most Popular',
    },
    {
      title: 'Crisp Starch Press',
      desc: 'Traditional rice-starch or synthetic stiff press for cotton kurtas, shirts & sarees.',
      price: 'From ₹25/pc',
      icon: Award,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Dry Clean & Delicate',
      desc: 'Solvent-based care for pure silk sarees, wedding lehengas, suits & blazers.',
      price: 'From ₹90/pc',
      icon: Flame,
      color: 'bg-teal-50 text-teal-600',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Schedule in 60 Seconds',
      desc: 'Select your garments, choose custom starch or steam press, and pick your preferred time slot.',
      icon: Clock,
    },
    {
      step: '02',
      title: 'Free Doorstep Pickup',
      desc: 'Our verified IndoDhobi rider arrives at your door with sanitized laundry tote bags.',
      icon: Truck,
    },
    {
      step: '03',
      title: 'Hub Processing & QC',
      desc: 'Garments are tagged, spot-treated, washed separately with pH-neutral soap, and steam ironed.',
      icon: ShieldCheck,
    },
    {
      step: '04',
      title: 'Delivered Fresh & Crisp',
      desc: 'Delivered within 48 hours neatly packed in breathable bags or on hangers. Pay via UPI or COD.',
      icon: Sparkles,
    },
  ];

  const comparisons = [
    { feature: 'Detergents Used', indo: 'Hypoallergenic German liquid soaps (pH 6.5)', traditional: 'Harsh industrial washing soda & bleaching powder' },
    { feature: 'Ironing Method', indo: 'Temperature-calibrated boiler steam press', traditional: 'Heavy charcoal irons with scorch & ash risk' },
    { feature: 'Hygiene Standards', indo: 'Individual machine batches; zero mixing', traditional: 'Communal washing in unmonitored water bodies' },
    { feature: 'Accountability', indo: 'Barcoded digital tracking with instant receipts', traditional: 'Chalk marks, frequent garment loss & no recourse' },
    { feature: 'Turnaround Time', indo: 'Guaranteed 24-48 hours with slot selection', traditional: 'Uncertain 4-7 days depending on weather' },
  ];

  const testimonials = [
    {
      name: 'Ananya Deshmukh',
      role: 'Product Lead, Gurugram',
      comment: 'Their crisp starch press on my Chanderi sarees is immaculate. No scorch marks, zero detergent smell, and they even deliver on hangers!',
      rating: 5,
    },
    {
      name: 'Vikramaditya Sen',
      role: 'Advocate, High Court of Delhi',
      comment: 'I need crisp cotton shirts and stiff collars daily. IndoDhobi has completely replaced my erratic local dry cleaner. Free delivery above ₹399 is awesome.',
      rating: 5,
    },
    {
      name: 'Meera Iyer',
      role: 'Architect, Bangalore',
      comment: 'Tracking order progress from In Washing to Out for Delivery gives total peace of mind. Truly the modern dhobi India needed.',
      rating: 5,
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 bg-gradient-to-b from-primary-50/70 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Dynamic Active Order Tracker (Requirement #2) */}
          <ActiveOrderTracker />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                <span>Modern Indian Laundry, Washed with Precision</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                India’s Most Trusted <br />
                <span className="bg-gradient-to-r from-primary-600 via-primary-700 to-teal-600 bg-clip-text text-transparent">
                  Doorstep Laundry &amp; Steam Press
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Say goodbye to erratic local dhobis, scorched shirts, and delayed deliveries. 
                Experience spotless washing, crisp starch finish, and safe dry cleaning with 
                punctual doorstep pickup and delivery in 48 hours.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/book"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-xl shadow-primary-600/30 hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2.5"
                >
                  <Shirt className="w-5 h-5" />
                  <span>Book Your Wash Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/pricing"
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Explore Transparent Pricing</span>
                </Link>
              </div>

              {/* Micro-assurances */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-200/80 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Free Pickup &gt; ₹399</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>48-Hour Turnaround</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pay via COD or UPI</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Teaser Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-6 shadow-2xl shadow-slate-200 border border-slate-100">
                <div className="absolute -top-3.5 right-6 bg-amber-400 text-slate-900 font-black text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SPECIAL OFFER</span>
                </div>

                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-black">
                    IDB
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">Instant Basket Estimator</h3>
                    <p className="text-xs text-slate-500">Typical household weekly wash load</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-700">4 Men Shirts (Wash &amp; Steam Press)</span>
                    <span className="font-bold text-slate-900">₹200</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-700">2 Cotton Kurtis (Wash &amp; Starch)</span>
                    <span className="font-bold text-slate-900">₹140</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-700">1 King Bedsheet (Steam Finish)</span>
                    <span className="font-bold text-slate-900">₹85</span>
                  </div>

                  <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span>₹425</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Delivery (Above ₹399):</span>
                      <span>FREE</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>GST (5%):</span>
                      <span>₹21</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-black text-base pt-1 border-t border-slate-200">
                      <span>Estimated Total:</span>
                      <span className="text-primary-700">₹446</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    to="/book"
                    className="w-full py-3 px-4 rounded-xl font-bold text-center block text-white bg-slate-900 hover:bg-primary-600 transition-colors shadow-sm text-sm"
                  >
                    Customize Your Basket &rarr;
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SERVICES OVERVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Comprehensive Garment Care
          </h2>
          <p className="text-sm text-slate-600">
            From daily cotton trousers to delicate raw silk sarees, every fabric has a dedicated washing recipe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                {s.badge && (
                  <span className="absolute top-4 right-4 bg-primary-100 text-primary-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    {s.badge}
                  </span>
                )}
                <div>
                  <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{s.desc}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{s.price}</span>
                  <Link
                    to="/book"
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <span>Book</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-900 text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-bold tracking-wider uppercase text-teal-400">
              Effortless Doorstep Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              How IndoDhobi Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Clean clothes delivered in 4 transparent, digitally monitored steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((st, i) => {
              const StepIcon = st.icon;
              return (
                <div key={i} className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-slate-700">{st.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-teal-400 flex items-center justify-center">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white">{st.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-lg transition-all"
            >
              <span>Schedule Your First Pickup</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE: INDODHOBI VS LOCAL DHOBI */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Why IndoDhobi Beats the Unorganized Dhobi
          </h2>
          <p className="text-sm text-slate-600">
            Compare our scientific laundry infrastructure against traditional roadside pressing.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Garment Care Aspect</th>
                <th className="py-4 px-6 text-primary-700 bg-primary-50/50 font-black">IndoDhobi Guarantee</th>
                <th className="py-4 px-6 text-slate-500">Unorganized Local Dhobi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisons.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{row.feature}</td>
                  <td className="py-4 px-6 font-semibold text-primary-900 bg-primary-50/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{row.indo}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-500">{row.traditional}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CUSTOMER TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Loved by 45,000+ Urban Households
          </h2>
          <p className="text-sm text-slate-600">
            Real feedback from professionals, families, and boutique wear enthusiasts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "{t.comment}"
              </p>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{t.name}</h4>
                  <p className="text-[11px] text-slate-500">{t.role}</p>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(t.rating)].map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-teal-600 rounded-3xl p-8 sm:p-12 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8 shadow-xl shadow-primary-700/20">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ready for Crisp Clothes Without the Hassle?
            </h3>
            <p className="text-xs sm:text-sm text-white/90">
              Book your pickup now. Free delivery on orders above ₹399 with live tracking every step of the way.
            </p>
          </div>
          <Link
            to="/book"
            className="shrink-0 px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-primary-700 font-extrabold text-sm shadow-md transition-all hover:scale-105"
          >
            Start Booking Now &rarr;
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
