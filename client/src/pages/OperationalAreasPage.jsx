import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Search, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Building2, 
  Compass,
  AlertCircle
} from 'lucide-react';

const HUBS = [
  {
    id: 'delhi',
    name: 'Delhi NCR (Central, South & West)',
    badge: 'Flagship Hub',
    pincodeRange: '110001 - 110085',
    turnaround: '24 - 48 Hours',
    coverage: [
      'Connaught Place & Barakhamba Rd (110001)',
      'Chanakyapuri & Diplomatic Enclave (110021)',
      'Hauz Khas, Green Park & Safdarjung (110016)',
      'Vasant Kunj & Vasant Vihar (110070)',
      'Greater Kailash I & II, CR Park (110048)',
      'Saket, Malviya Nagar & Sainik Farms (110017)',
      'Defence Colony & South Extension (110024)',
      'Okhla Industrial & Friends Colony (110020)',
      'Dwarka Sectors 1 to 23 (110075)',
      'Rohini & Pitampura (110085)',
      'Punjabi Bagh & Rajouri Garden (110027)'
    ],
    pincodes: ['110001', '110002', '110003', '110016', '110017', '110019', '110020', '110021', '110024', '110025', '110027', '110048', '110070', '110075', '110085']
  },
  {
    id: 'gurugram',
    name: 'Gurugram (CyberCity & Golf Course Rd)',
    badge: 'Express Hub',
    pincodeRange: '122001 - 122018',
    turnaround: '24 - 48 Hours',
    coverage: [
      'DLF Phase 1, 2, 3, 4 & 5 (122002)',
      'Cyber City & Cyber Hub Enclave (122002)',
      'Golf Course Road & DLF Camellias (122002)',
      'Golf Course Extension & Sector 56 (122011)',
      'Sector 29, 43, 44 Commercial Hub (122009)',
      'Sohna Road & Subhash Chowk (122018)',
      'Old Gurugram & Sector 14 (122001)'
    ],
    pincodes: ['122001', '122002', '122003', '122009', '122011', '122018']
  },
  {
    id: 'noida',
    name: 'Noida & Greater Noida Expressway',
    badge: 'High-Capacity Hub',
    pincodeRange: '201301 - 201310',
    turnaround: '24 - 48 Hours',
    coverage: [
      'Sector 18 & Atta Market Commercial Hub (201301)',
      'Sector 50 & Central Noida Residential (201301)',
      'Sector 62 IT Parks & Fortis Corridor (201307)',
      'Sector 74, 76, 78 High-Rise Clusters (201301)',
      'Sector 128, 137 Noida Expressway (201304)',
      'Greater Noida Knowledge Park & Pari Chowk (201310)'
    ],
    pincodes: ['201301', '201303', '201304', '201307', '201310']
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru (Tech Corridors & Central)',
    badge: 'Southern Hub',
    pincodeRange: '560001 - 560103',
    turnaround: '48 Hours',
    coverage: [
      'Indiranagar & Defence Colony (560038)',
      'Koramangala Blocks 1 through 8 (560034)',
      'HSR Layout Sectors 1 to 7 (560102)',
      'Whitefield & ITPL Corridor (560066)',
      'Bellandur & Outer Ring Road (560103)',
      'MG Road, Lavelle Road & Richmond Town (560001)'
    ],
    pincodes: ['560001', '560008', '560034', '560038', '560066', '560100', '560102', '560103']
  }
];

const OperationalAreasPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCheckPincode = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setCheckResult(null);
      return;
    }

    // Check pincode match or locality name match
    let matchedHub = null;
    let matchedArea = '';

    for (const hub of HUBS) {
      if (hub.pincodes.includes(query)) {
        matchedHub = hub;
        matchedArea = `Pincode ${query}`;
        break;
      }
      const foundArea = hub.coverage.find(a => a.toLowerCase().includes(query));
      if (foundArea) {
        matchedHub = hub;
        matchedArea = foundArea;
        break;
      }
      if (hub.name.toLowerCase().includes(query)) {
        matchedHub = hub;
        matchedArea = hub.name;
        break;
      }
    }

    if (matchedHub) {
      setCheckResult({
        serviceable: true,
        hub: matchedHub.name,
        area: matchedArea,
        turnaround: matchedHub.turnaround,
        message: `Hooray! Doorstep pickup & laundry delivery is actively servicing your area with a ${matchedHub.turnaround} turnaround!`
      });
    } else {
      setCheckResult({
        serviceable: false,
        message: `We haven't launched our full doorstep fleet in "${searchQuery}" yet. We are actively expanding! Contact support or check back soon.`
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-xl text-center sm:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <Compass className="w-3.5 h-3.5 text-teal-400 animate-spin" />
              <span>Doorstep Pickup &amp; 48-Hour Hub Delivery</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Our Operational Hubs &amp; <br />
              <span className="bg-gradient-to-r from-teal-400 via-primary-300 to-indigo-300 bg-clip-text text-transparent">
                Serviceable Cities
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              IndoDhobi operates commercial temperature-controlled laundry and German steam pressing hubs across Delhi NCR, Gurugram, Noida, and Bengaluru. Check your pincode below to confirm doorstep service!
            </p>
          </div>

          {/* Quick Pincode Checker Card */}
          <div className="w-full md:w-96 bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 text-white shadow-2xl shrink-0">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-teal-300" />
              <span>Instant Pincode / Area Checker</span>
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Enter your 6-digit pincode or locality name:
            </p>

            <form onSubmit={handleCheckPincode} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 110001 or Vasant Kunj"
                  className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Check Serviceability</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Checker Output */}
            {checkResult && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-medium border animate-in fade-in ${
                checkResult.serviceable
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
              }`}>
                <div className="flex items-start gap-2">
                  {checkResult.serviceable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="leading-snug">{checkResult.message}</p>
                    {checkResult.serviceable && (
                      <Link
                        to="/book"
                        className="inline-block mt-2 font-bold text-emerald-300 underline hover:text-white"
                      >
                        Book Pickup for {checkResult.area} &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 Operational Hub Grid */}
        <div className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Active Fleet Networks &amp; Plant Locations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Every hub features dedicated doorstep logistics riders, digital bag-tagging, and 100% fabric-safe batch processing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HUBS.map((hub) => (
              <div
                key={hub.id}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200">
                      {hub.badge}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>{hub.turnaround}</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-600 shrink-0" />
                    <span>{hub.name}</span>
                  </h3>

                  <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong>Pincode Zones:</strong> {hub.pincodeRange}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Prominent Service Neighborhoods:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                      {hub.coverage.map((area, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                          <span className="truncate">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Fleet Active &amp; Ready</span>
                  </span>
                  <Link
                    to="/book"
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    <span>Schedule Wash</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assurances Strip */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Free Doorstep Pickup</h4>
              <p className="text-xs text-slate-500 mt-0.5">Complimentary doorstep collection on orders above ₹399 across all hubs.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Digital Chain of Custody</h4>
              <p className="text-xs text-slate-500 mt-0.5">Physical tamper-proof bag tags and 4-digit customer OTP verification at your door.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">German Steam Finishing</h4>
              <p className="text-xs text-slate-500 mt-0.5">Professional boiler steam pressing and antiseptic garment sanitization.</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="rounded-3xl p-8 bg-gradient-to-r from-primary-600 to-teal-600 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="text-xl sm:text-2xl font-black">Is Your Pincode in Our Fleet Zone?</h3>
            <p className="text-xs sm:text-sm text-white/90 mt-1">Book your wash in under 60 seconds with live doorstep tracking.</p>
          </div>
          <Link
            to="/book"
            className="px-6 py-3.5 rounded-2xl bg-white text-primary-700 font-extrabold text-xs shadow-lg hover:bg-slate-50 hover:scale-105 transition-all shrink-0"
          >
            Book Your Wash Now &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
};

export default OperationalAreasPage;
