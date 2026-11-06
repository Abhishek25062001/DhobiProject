import ContentState from '../components/ContentState';
import usePageCopy from '../hooks/usePageCopy';
import useServiceAreas from '../hooks/useServiceAreas';
import ApiLoadError from '../components/ApiLoadError';
import { serviceAreaService } from '../services/api';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, CheckCircle2, Clock, Truck, ShieldCheck, Sparkles, ArrowRight, Building2} from 'lucide-react';

const OperationalAreasPage = () => {
  const copy = usePageCopy('areas');
  const coverage = useServiceAreas();
  const [checking, setChecking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pincodeReady = /^[1-9]\d{5}$/.test(searchQuery);

  const handleCheckPincode = async (event) => {
    event?.preventDefault();
    if (!pincodeReady) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await serviceAreaService.check(searchQuery);
      setCheckResult(result.serviceable
        ? { status: 'available', hub: result.area }
        : { status: 'unavailable' });
    } catch (error) {
      setCheckResult({ status: 'error', message: error.response?.data?.message || 'Coverage could not be checked. Please try again.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <ContentState resource={copy}><div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 space-y-12 font-[Plus_Jakarta_Sans,system-ui,sans-serif] text-[#080f31]">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#5030ef]">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{copy('doorstep_pickup_48_hour_hub_delivery_42f5b6e')}</span>
            </p>
            <h1 className="text-[clamp(28px,3vw,42px)] font-extrabold leading-[1.2] tracking-[-0.04em] text-[#080f31]">
              {copy('our_operational_hubs_b64da69')}
              <span className="block text-[#5030ef] sm:inline">{copy('serviceable_cities_aaadc60')}</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#536489]">{copy('indodhobi_operates_commercial_temperature_controlled_laundry_and__ecd0ee0')}</p>
          </div>

          <form onSubmit={handleCheckPincode} className="w-full shrink-0 rounded-[20px] border border-[#e2dcfb] bg-white p-5 shadow-[0_5px_18px_#5030ef0d] lg:w-[22.5rem]">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#080f31]">
              <Search className="h-4 w-4 text-[#5030ef]" aria-hidden="true" />
              <span>{copy('instant_pincode_checker_38bc744')}</span>
            </h2>
            <label htmlFor="area-pincode" className="mt-1 block text-xs text-[#536489]">{copy('enter_your_6_digit_pincode_0a9af78')}</label>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                id="area-pincode"
                type="text"
                value={searchQuery}
                disabled={checking}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                onChange={(e) => { setSearchQuery(e.target.value.replace(/\D/g, '').slice(0, 6)); setCheckResult(null); }}
                placeholder={copy('e_g_110001_d1c3a44')}
                className="h-11 min-w-0 sm:flex-1 rounded-xl border border-[#e2dcfb] bg-white px-3.5 text-sm text-[#080f31] placeholder:text-[#536489] focus:border-[#5030ef] focus:outline-hidden focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#008778]"
              />
              <button
                type="submit"
                disabled={checking || !pincodeReady}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#5030ef] px-4 text-sm font-bold text-white hover:bg-[#3b24d0] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#008778]"
              >
                <span>{checking ? 'Checking…' : copy('check_serviceability_6c8dbe0')}</span>
                {!checking && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {checkResult && (
              <div className="mt-4 text-sm" role="status">
                {checkResult.status === 'available' ? (
                  <>
                    <p className="font-bold text-[#008778]">Served by {checkResult.hub?.name}</p>
                    {checkResult.hub?.turnaround && <p className="mt-1 text-xs text-[#536489]">{checkResult.hub.turnaround}</p>}
                    <Link to="/book" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#5030ef] hover:text-[#3b24d0] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#008778]">
                      <span>{copy('book_pickup_for_cd4d6a8')}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </>
                ) : checkResult.status === 'unavailable' ? (
                  <p className="text-[#536489]">This pincode is outside current coverage.</p>
                ) : (
                  <p className="text-[#536489]">{checkResult.message} <button type="button" onClick={handleCheckPincode} className="font-bold text-[#5030ef] underline">Try again</button></p>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Active service areas */}
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
                      <Clock className="w-3.5 h-3.5 shrink-0 text-teal-600" aria-hidden="true" />
                      <span>{hub.turnaround}</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-600 shrink-0" aria-hidden="true" />
                    <span>{hub.name}</span>
                  </h3>

                  <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong>{copy('pincode_zones_c22a4e6')}</strong> {hub.pincodeRange}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-bold text-slate-600">{copy('prominent_service_neighborhoods_37bd0fa')}</p>
                    <ul className="grid grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-2 text-xs leading-relaxed text-slate-700">
                      {hub.coverage.map((area, idx) => (
                        <li key={idx} className="flex min-w-0 items-start gap-1.5">
                          <MapPin className="mt-1 w-3 h-3 text-teal-600 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 break-words">{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  {copy('fleet_active_ready_d0c7ff6') && <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{copy('fleet_active_ready_d0c7ff6')}</span>
                  </span>}
                  <Link
                    to="/book"
                    className="ml-auto inline-flex items-center gap-1 text-xs font-extrabold text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    <span>{copy('schedule_wash_ea59b39')}</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assurances Strip */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">{copy('free_doorstep_pickup_4ce6006')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{copy('complimentary_doorstep_collection_on_orders_above_399_across_all__f9a4ff2')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">{copy('digital_chain_of_custody_12ed623')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{copy('physical_tamper_proof_bag_tags_and_4_digit_customer_otp_verificat_f7879f0')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">{copy('german_steam_finishing_c354dd5')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{copy('professional_boiler_steam_pressing_and_antiseptic_garment_sanitiz_031999c')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-6 rounded-[20px] bg-[#f0ecff] px-6 py-6 sm:flex-row sm:items-center sm:px-8">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.03em] text-[#080f31] sm:text-2xl">{copy('is_your_pincode_in_our_fleet_zone_b05c4bd')}</h2>
            <p className="mt-1 text-sm text-[#536489]">{checkResult?.status === 'available' && checkResult.hub?.name ? `Doorstep pickup is available in ${checkResult.hub.name}.` : copy('book_your_wash_in_under_60_seconds_with_live_doorstep_tracking_04b1c46')}</p>
          </div>
          <Link
            to="/book"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#5030ef] px-5 text-sm font-bold text-white hover:bg-[#3b24d0] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#008778]"
          >
            <span>{copy('book_your_wash_now_00e01c2')}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

      </div>
    </div></ContentState>
  );
};

export default OperationalAreasPage;
