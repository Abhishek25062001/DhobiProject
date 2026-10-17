import ContentState from '../components/ContentState';
import ManagedImage from '../components/ManagedImage';
import { availableServices, preferredFinish, selectionAvailable } from '../../../shared/pricing.mjs';
import usePageCopy from '../hooks/usePageCopy';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGarments from '../hooks/useGarments';
import useCategories from '../hooks/useCategories';
import ApiLoadError from '../components/ApiLoadError';
import { useOrderBooking } from '../context/OrderBookingContext';
import { 
  Sparkles, 
  Search, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  Shirt, 
  Scissors, 
  Feather, 
  Heart, 
  Layers, 
  Wind, 
  Cloud, 
  Box, 
  Award,
  Loader2,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const getGarmentIcon = (iconName) => {
  const iconMap = {
    Shirt,
    Scissors,
    Sparkles,
    Feather,
    Heart,
    Layers,
    Wind,
    Cloud,
    Box,
    Award
  };
  const IconComponent = iconMap[iconName] || Shirt;
  return <IconComponent className="w-5 h-5 text-primary-600" />;
};

const PricingPage = () => {
  const copy = usePageCopy('pricing');
  const navigate = useNavigate();
  const { addItem, platformConfig } = useOrderBooking();
  const categoryResource = useCategories();
  const categoryOptions = [{ _id: 'All', name: copy('allCategories') }, ...categoryResource.categories];
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { garments, loading, error: catalogError, retry: retryCatalog } = useGarments(activeCategory, searchQuery);

  const handleAddAndBook = (garment) => {
    const services = availableServices(garment, platformConfig);
    const service = services.find(item => item.code === 'WASH_AND_IRON') || services[0];
    if (!service) return;
    const finish = preferredFinish(garment, platformConfig, service.code, 'STANDARD_STEAM');
    if (!selectionAvailable(garment, platformConfig, service.code, finish)) return;
    addItem(garment, service.code, finish);
    toast.success(`Added 1 ${garment.name} to laundry bag!`);
    navigate('/book');
  };

  return (
    <ContentState resource={copy}><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-bold border border-primary-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{copy('100_transparent_dhobi_rate_card_fe60d40')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{copy('clear_per_garment_pricing_with_zero_hidden_fees_dc1155c')}</h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{copy('no_vague_per_kg_guesswork_where_wet_towels_inflate_your_bill_know_fef54c9')}</p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
          {categoryOptions.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setActiveCategory(cat._id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat._id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={copy('search_price_for_saree_shirt_jeans_2697981')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Rate Card Table */}
      {categoryResource.error ? <ApiLoadError message={copy('we_couldn_t_load_categories_2a81ded')} onRetry={categoryResource.retry} /> : loading || categoryResource.loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">{copy('loading_comprehensive_garment_rate_card_9b9668a')}</p>
        </div>
      ) : catalogError ? <ApiLoadError onRetry={retryCatalog} /> : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">{copy('garment_name_a3153c1')}</th>
                  <th className="py-4 px-4 text-center">{copy('category_292c06f')}</th>
                  <th className="py-4 px-4 text-center text-primary-700 font-black">{copy('wash_only_099fe0a')}</th>
                  <th className="py-4 px-4 text-center">{copy('steam_iron_fe64aa5')}</th>
                  <th className="py-4 px-4 text-center">{copy('crisp_starch_98d69e3')}</th>
                  <th className="py-4 px-4 text-center">{copy('delicate_press_7ed6a93')}</th>
                  <th className="py-4 px-4 text-center text-teal-700 font-black">{copy('dry_clean_478a7ee')}</th>
                  <th className="py-4 px-5 text-right">{copy('action_64cff13')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {garments.map((garment) => (
                  <tr key={garment._id} className="hover:bg-slate-50/70 transition-colors">
                    
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                          <ManagedImage reference={garment.primaryImage} className="w-8 h-8 object-contain" width={32} height={32} />
                        </div>
                        <span title={garment.description || garment.name} className="font-bold text-slate-900">{garment.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {garment.category}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 bg-primary-50/20">
                      {selectionAvailable(garment, platformConfig, 'WASH_AND_FOLD', 'NONE') ? `₹${garment.pricing.washOnly}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {selectionAvailable(garment, platformConfig, 'IRON_ONLY', 'STANDARD_STEAM') ? `₹${garment.pricing.standardSteamIron}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {selectionAvailable(garment, platformConfig, 'IRON_ONLY', 'CRISP_STARCH') ? `₹${garment.pricing.crispStarchPress}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {selectionAvailable(garment, platformConfig, 'IRON_ONLY', 'DELICATE_PRESS') ? `₹${garment.pricing.delicatePress}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-teal-800 bg-teal-50/30">
                      {selectionAvailable(garment, platformConfig, 'DRY_CLEAN', 'NONE') ? `₹${garment.pricing.dryClean}` : '—'}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleAddAndBook(garment)}
                        disabled={!availableServices(garment, platformConfig).length}
                        className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white font-bold text-xs transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{copy('book_909cb81')}</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Free Delivery & Assurances Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-teal-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>{copy('free_doorstep_pickup_delivery_on_orders_above_399_98c6866')}</span>
          </div>
          <p className="text-xs text-slate-400">{copy('for_orders_under_399_a_nominal_49_doorstep_logistics_charge_appli_ad80de1')}</p>
        </div>

        <button
          onClick={() => navigate('/book')}
          className="shrink-0 px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5"
        >
          <span>{copy('open_booking_bag_89107ad')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div></ContentState>
  );
};

export default PricingPage;
