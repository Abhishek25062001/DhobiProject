import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../services/api';
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
  const navigate = useNavigate();
  const { addItem } = useOrderBooking();
  const [garments, setGarments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const res = await catalogService.getGarments(activeCategory, searchQuery);
        if (res.success) {
          setGarments(res.data);
        }
      } catch (err) {
        toast.error('Could not load pricing rate card.');
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [activeCategory, searchQuery]);

  const handleAddAndBook = (garment) => {
    addItem(garment, 'WASH_AND_IRON', 'STANDARD_STEAM');
    toast.success(`Added 1 ${garment.name} to laundry bag!`);
    navigate('/book');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-bold border border-primary-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>100% Transparent Dhobi Rate Card</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Clear, Per-Garment Pricing with Zero Hidden Fees
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          No vague per-kg guesswork where wet towels inflate your bill. Know your exact garment washing, steam ironing, and starch pressing charges upfront.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
          {['All', 'Men', 'Women', 'Household', 'Winter & Heavy'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search price for saree, shirt, jeans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Rate Card Table */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading comprehensive garment rate card...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">Garment Name</th>
                  <th className="py-4 px-4 text-center">Category</th>
                  <th className="py-4 px-4 text-center text-primary-700 font-black">Wash Only</th>
                  <th className="py-4 px-4 text-center">Steam Iron</th>
                  <th className="py-4 px-4 text-center">Crisp Starch</th>
                  <th className="py-4 px-4 text-center">Delicate Press</th>
                  <th className="py-4 px-4 text-center text-teal-700 font-black">Dry Clean</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {garments.map((garment) => (
                  <tr key={garment._id} className="hover:bg-slate-50/70 transition-colors">
                    
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                          {getGarmentIcon(garment.iconName)}
                        </div>
                        <span className="font-bold text-slate-900">{garment.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {garment.category}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 bg-primary-50/20">
                      ₹{garment.pricing.washOnly}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      ₹{garment.pricing.standardSteamIron}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      ₹{garment.pricing.crispStarchPress}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      ₹{garment.pricing.delicatePress}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-teal-800 bg-teal-50/30">
                      ₹{garment.pricing.dryClean}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleAddAndBook(garment)}
                        className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white font-bold text-xs transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Book</span>
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
            <span>Free Doorstep Pickup &amp; Delivery on Orders Above ₹399</span>
          </div>
          <p className="text-xs text-slate-400">
            For orders under ₹399, a nominal ₹49 doorstep logistics charge applies. 5% GST calculated automatically at checkout.
          </p>
        </div>

        <button
          onClick={() => navigate('/book')}
          className="shrink-0 px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5"
        >
          <span>Open Booking Bag</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

export default PricingPage;
