import ContentState from '../components/ContentState';
import usePageCopy from '../hooks/usePageCopy';
import useServiceAreas from '../hooks/useServiceAreas';
import ApiLoadError from '../components/ApiLoadError';
import { serviceAreaService } from '../services/api';
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

const OperationalAreasPage = () => {
  const copy = usePageCopy('areas');
  const coverage = useServiceAreas();
  const [checking, setChecking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCheckPincode = async (e) => {
    e.preventDefault();
    setChecking(true); setCheckResult(null);
    try {
      const result = await serviceAreaService.check(searchQuery.trim());
      setCheckResult({ serviceable: result.serviceable, area: searchQuery.trim(),
        message: result.serviceable ? `Doorstep service is available through ${result.area.name}. ${result.area.turnaround}` : `We do not currently offer doorstep service for ${searchQuery.trim()}.` });
    } catch (error) { setCheckResult({ serviceable: false, message: error.response?.data?.message || 'Coverage could not be checked. Please try again.' }); }
    finally { setChecking(false); }
  };

  return (
    <ContentState resource={copy}><div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-xl text-center sm:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <Compass className="w-3.5 h-3.5 text-teal-400 animate-spin" />
              <span>{copy('doorstep_pickup_48_hour_hub_delivery_42f5b6e')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">{copy('our_operational_hubs_b64da69')}<br />
              <span className="bg-gradient-to-r from-teal-400 via-primary-300 to-indigo-300 bg-clip-text text-transparent">{copy('serviceable_cities_aaadc60')}</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{copy('indodhobi_operates_commercial_temperature_controlled_laundry_and__ecd0ee0')}</p>
          </div>

          {/* Quick Pincode Checker Card */}
          <div className="w-full md:w-96 bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 text-white shadow-2xl shrink-0">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-teal-300" />
              <span>{copy('instant_pincode_checker_38bc744')}</span>
            </h3>
            <p className="text-xs text-slate-300 mb-4">{copy('enter_your_6_digit_pincode_0a9af78')}</p>

            <form onSubmit={handleCheckPincode} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  disabled={checking}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => { setSearchQuery(e.target.value); setCheckResult(null); }}
                  placeholder={copy('e_g_110001_d1c3a44')}
                  className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <button
                type="submit"
                disabled={checking}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{copy('check_serviceability_6c8dbe0')}</span>
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
                      >{copy('book_pickup_for_cd4d6a8')}{checkResult.area} &rarr;
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
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{copy('active_fleet_networks_plant_locations_7960bf4')}</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{copy('every_hub_features_dedicated_doorstep_logistics_riders_digital_ba_0d9d5d9')}</p>
          </div>

          {coverage.error && <ApiLoadError message={copy('service_areas_could_not_be_loaded_e1539c6')} onRetry={coverage.retry} />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coverage.areas.map((hub) => (
              <div
                key={hub._id}
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
                    <strong>{copy('pincode_zones_c22a4e6')}</strong> {hub.pincodeRange}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">{copy('prominent_service_neighborhoods_37bd0fa')}</span>
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
                    <span>{copy('fleet_active_ready_d0c7ff6')}</span>
                  </span>
                  <Link
                    to="/book"
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    <span>{copy('schedule_wash_ea59b39')}</span>
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
              <h4 className="font-bold text-slate-900 text-sm">{copy('free_doorstep_pickup_4ce6006')}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{copy('complimentary_doorstep_collection_on_orders_above_399_across_all__f9a4ff2')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{copy('digital_chain_of_custody_12ed623')}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{copy('physical_tamper_proof_bag_tags_and_4_digit_customer_otp_verificat_f7879f0')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{copy('german_steam_finishing_c354dd5')}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{copy('professional_boiler_steam_pressing_and_antiseptic_garment_sanitiz_031999c')}</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="rounded-3xl p-8 bg-gradient-to-r from-primary-600 to-teal-600 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="text-xl sm:text-2xl font-black">{copy('is_your_pincode_in_our_fleet_zone_b05c4bd')}</h3>
            <p className="text-xs sm:text-sm text-white/90 mt-1">{copy('book_your_wash_in_under_60_seconds_with_live_doorstep_tracking_04b1c46')}</p>
          </div>
          <Link
            to="/book"
            className="px-6 py-3.5 rounded-2xl bg-white text-primary-700 font-extrabold text-xs shadow-lg hover:bg-slate-50 hover:scale-105 transition-all shrink-0"
          >{copy('book_your_wash_now_00e01c2')}</Link>
        </div>

      </div>
    </div></ContentState>
  );
};

export default OperationalAreasPage;
