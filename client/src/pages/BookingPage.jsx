import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrderBooking } from '../context/OrderBookingContext';
import { catalogService, orderService } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import { launchRazorpayCheckout } from '../utils/razorpayCheckout';
import { 
  Shirt, 
  Scissors, 
  Sparkles, 
  Feather, 
  Heart, 
  Layers, 
  Wind, 
  Cloud, 
  Shield, 
  Box, 
  Award,
  Plus, 
  Minus, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Loader2,
  PackageCheck,
  ShoppingBag,
  Sparkle,
  Zap,
  Tag,
  Percent,
  Bookmark
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';

// Dynamic icon mapper for garment cards
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
    Shield,
    Box,
    Award
  };
  const IconComponent = iconMap[iconName] || Shirt;
  return <IconComponent className="w-5 h-5 text-primary-600" />;
};

const BookingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, addAddress } = useAuth();
  const {
    cartItems,
    addItem,
    updateQuantity,
    updateServiceType,
    updateIroningType,
    removeItem,
    clearCart,
    preferences,
    setPreferences,
    pickupSchedule,
    setPickupSchedule,
    deliverySchedule,
    setDeliverySchedule,
    pickupAddress,
    setPickupAddress,
    isExpress,
    setIsExpress,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    subtotal,
    itemCount,
    pickupDeliveryFee,
    expressSurcharge,
    discountAmount,
    couponCode,
    taxAmount,
    grandTotal,
    amountNeededForFreeDelivery,
    platformConfig,
    freeDeliveryThreshold,
    slots
  } = useOrderBooking();

  const [activeStep, setActiveStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [garments, setGarments] = useState([]);
  const [loadingGarments, setLoadingGarments] = useState(true);

  // Address book management state
  const [saveAddressLabel, setSaveAddressLabel] = useState('Home');
  const [savingAddress, setSavingAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr._id);
    setPickupAddress({
      flatAndBuilding: addr.flatAndBuilding,
      streetAndLandmark: addr.streetAndLandmark,
      city: addr.city,
      pincode: addr.pincode,
      contactPhone: pickupAddress.contactPhone || user?.phone || ''
    });
    toast.success(`Selected ${addr.label} address`);
  };

  const handleSaveCurrentAddress = async () => {
    if (!pickupAddress.flatAndBuilding || !pickupAddress.streetAndLandmark || !pickupAddress.pincode) {
      toast.error('Please enter flat/building, street, and PIN code first.');
      return;
    }
    setSavingAddress(true);
    const res = await addAddress({
      label: saveAddressLabel,
      flatAndBuilding: pickupAddress.flatAndBuilding,
      streetAndLandmark: pickupAddress.streetAndLandmark,
      city: pickupAddress.city || 'New Delhi',
      pincode: pickupAddress.pincode,
      isDefault: true
    });
    setSavingAddress(false);
    if (res?.success) {
      toast.success('Address saved to address book!');
    }
  };

  // Promo coupon state
  const [couponInput, setCouponInput] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' or 'ONLINE'
  const [placingOrder, setPlacingOrder] = useState(false);

  // Online payment modal state
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch available promo coupons from backend
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await orderService.getCoupons();
        if (res.success && res.coupons) {
          setAvailableCoupons(res.coupons);
        }
      } catch (err) {
        console.warn('Failed to load coupons:', err);
      }
    };
    fetchCoupons();
  }, []);

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponInput || '').trim();
    if (!code) {
      toast.error('Please enter a coupon code.');
      return;
    }
    if (subtotal <= 0) {
      toast.error('Add items to your laundry bag before applying a coupon.');
      return;
    }

    setValidatingCoupon(true);
    try {
      const res = await orderService.validateCoupon(code, subtotal);
      if (res.success && res.valid) {
        applyCoupon({
          code: res.code,
          discountAmount: res.discountAmount,
          description: res.description
        });
        setCouponInput('');
        toast.success(`Coupon ${res.code} applied! Saved ₹${res.discountAmount}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code.');
    } finally {
      setValidatingCoupon(false);
    }
  };


  // Fetch garment catalog from backend
  useEffect(() => {
    const fetchGarments = async () => {
      try {
        setLoadingGarments(true);
        const res = await catalogService.getGarments(selectedCategory, searchQuery);
        if (res.success) {
          setGarments(res.data);
        }
      } catch (err) {
        console.error('Failed to load garments:', err);
        toast.error('Unable to fetch garment catalog.');
      } finally {
        setLoadingGarments(false);
      }
    };

    fetchGarments();
  }, [selectedCategory, searchQuery]);

  // Pre-fill user address if available and currently empty
  useEffect(() => {
    if (user && user.addresses && user.addresses.length > 0 && !pickupAddress.flatAndBuilding) {
      const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setPickupAddress({
        flatAndBuilding: defaultAddr.flatAndBuilding,
        streetAndLandmark: defaultAddr.streetAndLandmark,
        city: defaultAddr.city || 'New Delhi',
        pincode: defaultAddr.pincode,
        contactPhone: user.phone || ''
      });
    } else if (user && !pickupAddress.contactPhone) {
      setPickupAddress((prev) => ({ ...prev, contactPhone: user.phone }));
    }
  }, [user]);

  // Slot capacity state for selected pickup date
  const [slotCapacities, setSlotCapacities] = useState({});

  useEffect(() => {
    const fetchSlots = async () => {
      if (!pickupSchedule.date) return;
      try {
        const res = await orderService.getSlots(pickupSchedule.date);
        if (res.success && res.slots) {
          const map = {};
          res.slots.forEach((s) => {
            map[s.slot] = {
              remaining: s.remainingCapacity,
              isAvailable: s.isAvailable,
              isPast: s.isPast
            };
          });
          setSlotCapacities(map);
        }
      } catch (err) {
        // Silently continue with defaults
      }
    };

    fetchSlots();
  }, [pickupSchedule.date]);

  const availableSlotsList = React.useMemo(() => {
    if (slots && slots.length > 0) {
      return slots.filter((s) => s.isActive !== false).map((s) => s.label);
    }
    const fromCapacities = Object.keys(slotCapacities);
    if (fromCapacities.length > 0) {
      return fromCapacities;
    }
    return [
      '08:00 AM - 10:00 AM',
      '10:00 AM - 01:00 PM',
      '02:00 PM - 05:00 PM',
      '06:00 PM - 09:00 PM'
    ];
  }, [slots, slotCapacities]);

  // Validation before advancing to next step
  const handleNextStep = () => {
    if (activeStep === 1) {
      if (cartItems.length === 0) {
        toast.error('Please add at least one garment to your laundry bag.');
        return;
      }
      setActiveStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeStep === 2) {
      setActiveStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeStep === 3) {
      if (!pickupAddress.flatAndBuilding || !pickupAddress.streetAndLandmark || !pickupAddress.pincode) {
        toast.error('Please fill in complete pickup address details.');
        return;
      }
      if (!pickupSchedule.date || !pickupSchedule.timeSlot) {
        toast.error('Please select a pickup date and slot.');
        return;
      }
      if (!deliverySchedule.date || !deliverySchedule.timeSlot) {
        toast.error('Please select a delivery date and slot.');
        return;
      }
      if (new Date(deliverySchedule.date) <= new Date(pickupSchedule.date)) {
        toast.error('Delivery date must be scheduled after pickup date (minimum 24-hour turnaround required).');
        return;
      }
      setActiveStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final Order Submission
  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      toast('Please log in or register to place your laundry order.', { icon: '🔐' });
      navigate('/login', { state: { from: { pathname: '/book' } } });
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your laundry bag is empty.');
      return;
    }

    setPlacingOrder(true);

    try {
      const orderPayload = {
        items: cartItems.map((item) => ({
          garmentId: item.garment._id,
          quantity: item.quantity,
          serviceType: item.serviceType,
          ironingType: item.ironingType
        })),
        preferences,
        isExpress,
        couponCode: appliedCoupon?.code || null,
        pickupSchedule,
        deliverySchedule,
        pickupAddress: {
          ...pickupAddress,
          contactPhone: pickupAddress.contactPhone || user.phone
        },
        paymentMethod
      };


      const res = await orderService.createOrder(orderPayload);

      if (res.success && res.order) {
        setCreatedOrder(res.order);

        if (paymentMethod === 'ONLINE') {
          if (res.razorpay) {
            launchRazorpayCheckout({
              order: res.order,
              razorpayPayload: res.razorpay,
              user,
              onSuccess: (updatedOrder) => {
                clearCart();
                navigate('/my-orders', { state: { order: updatedOrder } });
              },
              onDismiss: () => {
                clearCart();
                navigate('/my-orders');
              },
              onFallback: () => {
                setShowPaymentModal(true);
              }
            });
          } else {
            setShowPaymentModal(true);
          }
        } else {
          // COD Order placed instantly
          toast.success('Order booked successfully with Cash on Delivery!');
          clearCart();
          navigate('/order-success', { state: { order: res.order } });
        }
      } else {
        toast.error(res.message || 'Failed to place order.');
      }
    } catch (error) {
      console.error('[Place Order Error]:', error);
      toast.error(error.response?.data?.message || 'Server error while booking order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePaymentSuccess = (updatedOrder) => {
    setShowPaymentModal(false);
    clearCart();
    navigate('/order-success', { state: { order: updatedOrder || createdOrder } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Title & Wizard Step Progress */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Book Doorstep Laundry &amp; Ironing
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Customize garment washing recipes, choose starch stiffening, and select your preferred slots.
        </p>

        {/* Step Indicator */}
        <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { num: 1, label: 'Select Clothes', desc: 'Garments & Ironing' },
            { num: 2, label: 'Wash Care', desc: 'Detergents & Bags' },
            { num: 3, label: 'Schedule', desc: 'Pickup & Delivery' },
            { num: 4, label: 'Checkout', desc: 'Payment & Confirm' }
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num < activeStep) setActiveStep(s.num);
              }}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                activeStep === s.num
                  ? 'border-primary-600 bg-primary-50/70 shadow-xs'
                  : activeStep > s.num
                  ? 'border-teal-500 bg-teal-50/40 text-teal-800'
                  : 'border-slate-200 bg-white opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                    activeStep === s.num
                      ? 'bg-primary-600 text-white'
                      : activeStep > s.num
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {activeStep > s.num ? '✓' : s.num}
                </span>
                <div className="truncate">
                  <h4 className="text-xs font-bold truncate text-slate-900">{s.label}</h4>
                  <p className="text-[10px] text-slate-500 hidden sm:block truncate">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Steps + Right Sticky Cart Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Interactive Wizard Content */}
        <div className="lg:col-span-8 space-y-6">

          {/* ================= STEP 1: SELECT CLOTHES ================= */}
          {activeStep === 1 && (
            <div className="space-y-6">
              
              {/* Category Pills & Search */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
                    {['All', 'Men', 'Women', 'Household', 'Winter & Heavy'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          selectedCategory === cat
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Search garments (e.g. Saree, Kurta)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Garments Listing */}
              {loadingGarments ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading catalog with Indian garments...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {garments.map((garment) => {
                    const cartItem = cartItems.find((i) => i.garment._id === garment._id);
                    const qty = cartItem ? cartItem.quantity : 0;

                    return (
                      <div
                        key={garment._id}
                        className={`bg-white rounded-3xl p-5 border transition-all ${
                          qty > 0
                            ? 'border-primary-500 shadow-md ring-1 ring-primary-500'
                            : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100 relative">
                              {garment.imageUrl ? (
                                <>
                                  <img
                                    src={garment.imageUrl}
                                    alt={garment.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget.nextElementSibling;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div style={{ display: 'none' }} className="w-full h-full items-center justify-center">
                                    {getGarmentIcon(garment.iconName)}
                                  </div>
                                </>
                              ) : (
                                getGarmentIcon(garment.iconName)
                              )}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{garment.name}</h3>
                              <span className="inline-block text-[10px] font-semibold text-slate-500">
                                {garment.category}
                              </span>
                            </div>
                          </div>

                          {/* Base Price Badge */}
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Wash Base</span>
                            <span className="text-sm font-extrabold text-slate-900">
                              ₹{garment.pricing.washOnly}
                            </span>
                          </div>
                        </div>

                        {/* Add / Quantity Controls */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-[11px] text-slate-500">
                            Steam Press: <span className="font-semibold text-slate-700">+₹{garment.pricing.standardSteamIron}</span>
                          </div>

                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => addItem(garment, 'WASH_AND_IRON', 'STANDARD_STEAM')}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white transition-all flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(garment._id, qty - 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center font-black text-sm text-slate-900">
                                {qty}
                              </span>
                              <button
                                onClick={() => updateQuantity(garment._id, qty + 1)}
                                className="w-7 h-7 rounded-lg bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* If in bag, show service & ironing selectors right on the card */}
                        {qty > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 bg-slate-50/70 -mx-5 -mb-5 p-4 rounded-b-3xl text-xs">
                            
                            {/* Service Type */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                Service Choice:
                              </label>
                              <select
                                value={cartItem.serviceType}
                                onChange={(e) => updateServiceType(garment._id, e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="WASH_AND_IRON">Wash &amp; Iron (+ Steam Press)</option>
                                <option value="WASH_AND_FOLD">Wash &amp; Fold Only (No Press)</option>
                                <option value="IRON_ONLY">Ironing Only (No Wash)</option>
                                <option value="DRY_CLEAN">Professional Dry Clean</option>
                              </select>
                            </div>

                            {/* Ironing Type (Only if relevant) */}
                            {(cartItem.serviceType === 'WASH_AND_IRON' || cartItem.serviceType === 'IRON_ONLY') && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                  Ironing Finish:
                                </label>
                                <select
                                  value={cartItem.ironingType}
                                  onChange={(e) => updateIroningType(garment._id, e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:ring-1 focus:ring-primary-500"
                                >
                                  <option value="STANDARD_STEAM">
                                    Standard Steam Iron (+₹{garment.pricing.standardSteamIron})
                                  </option>
                                  <option value="CRISP_STARCH">
                                    Crisp Starch Press (+₹{garment.pricing.crispStarchPress})
                                  </option>
                                  <option value="DELICATE_PRESS">
                                    Delicate Low-Heat Press (+₹{garment.pricing.delicatePress})
                                  </option>
                                </select>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <span className="text-slate-500">Unit: ₹{cartItem.unitPrice}</span>
                              <span className="font-bold text-primary-700">Line: ₹{cartItem.lineTotal}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Next Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-600/30 flex items-center gap-2"
                >
                  <span>Continue to Wash Care &amp; Preferences</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ================= STEP 2: WASH CARE & PREFERENCES ================= */}
          {activeStep === 2 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Custom Wash Care &amp; Preferences</h3>
                <p className="text-xs text-slate-500">
                  Tell our dhobi masters exactly how you like your garments treated.
                </p>
              </div>

              {/* Detergent Type */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  1. Detergent Selection:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(platformConfig?.detergentOptions?.filter((d) => d.isActive !== false)?.length
                    ? platformConfig.detergentOptions.filter((d) => d.isActive !== false)
                    : [
                        { code: 'Standard', name: 'Standard Gentle', description: 'Mild German liquid detergent for daily wear.', extraPricePerOrder: 0 },
                        { code: 'Hypoallergenic', name: 'Hypoallergenic Baby-Safe', description: 'Dermatologist-tested, zero fragrance or allergens.', extraPricePerOrder: 0 },
                        { code: 'Fabric Softener Plus', name: 'Fabric Softener Plus', description: 'Enriched with natural botanical softening conditioners.', extraPricePerOrder: 0 }
                      ]
                  ).map((d) => (
                    <div
                      key={d.code}
                      onClick={() => setPreferences({ ...preferences, detergentType: d.code })}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        preferences.detergentType === d.code
                          ? 'border-primary-600 bg-primary-50/70 shadow-xs ring-1 ring-primary-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{d.name}</span>
                        {preferences.detergentType === d.code && (
                          <CheckCircle2 className="w-4 h-4 text-primary-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{d.description}</p>
                      {d.extraPricePerOrder > 0 && (
                        <span className="inline-block mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          +₹{d.extraPricePerOrder}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Packaging Type */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  2. Packaging Preference:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(platformConfig?.packagingOptions?.filter((p) => p.isActive !== false)?.length
                    ? platformConfig.packagingOptions.filter((p) => p.isActive !== false)
                    : [
                        { code: 'Folded', name: 'Neatly Folded in Eco-Bags', description: 'Protected in breathable, biodegradable paper totes for your wardrobe shelves.', extraPricePerOrder: 0 },
                        { code: 'On Hangers', name: 'Crisp on Hangers', description: 'Ready-to-hang wooden / wire hangers wrapped in dust covers (ideal for suits & sarees).', extraPricePerOrder: 0 }
                      ]
                  ).map((p) => (
                    <div
                      key={p.code}
                      onClick={() => setPreferences({ ...preferences, packagingType: p.code })}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        preferences.packagingType === p.code
                          ? 'border-primary-600 bg-primary-50/70 shadow-xs ring-1 ring-primary-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{p.name}</span>
                        {preferences.packagingType === p.code && (
                          <CheckCircle2 className="w-4 h-4 text-primary-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{p.description}</p>
                      {p.extraPricePerOrder > 0 && (
                        <span className="inline-block mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          +₹{p.extraPricePerOrder}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  3. Special Handling Instructions (Optional):
                </label>
                <textarea
                  rows={3}
                  value={preferences.specialInstructions}
                  onChange={(e) => setPreferences({ ...preferences, specialInstructions: e.target.value })}
                  placeholder="e.g. Mild tea stain on white linen shirt collar; please use extra starch on cotton kurta cuffs; do not twist delicate silk saree."
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Express 24-Hour Turnaround Toggle Switch */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isExpress
                    ? 'border-amber-400 bg-amber-50/70 shadow-xs ring-1 ring-amber-400'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                        isExpress ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          Express 24-Hour Turnaround
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                          +₹{platformConfig?.expressSurcharge ?? 99} Express
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Priority wash, iron &amp; fast doorstep return within 24 hours of pickup.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isExpress;
                      setIsExpress(next);
                      if (next) {
                        toast(`⚡ Express 24-Hour delivery enabled (+₹${platformConfig?.expressSurcharge ?? 99})`, { icon: '⚡' });
                        if (pickupSchedule.date) {
                          const nextDay = format(addDays(new Date(pickupSchedule.date), 1), 'yyyy-MM-dd');
                          setDeliverySchedule((prev) => ({ ...prev, date: nextDay }));
                        }
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isExpress ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isExpress ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>


              {/* Step Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Clothes</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-600/30 flex items-center gap-2"
                >
                  <span>Continue to Schedule &amp; Address</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ================= STEP 3: SCHEDULE & ADDRESS ================= */}
          {activeStep === 3 && (
            <div className="space-y-6">
              
              {/* Pickup & Delivery Slots */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Doorstep Pickup &amp; Delivery Schedule</h3>
                  <p className="text-xs text-slate-500">
                    Choose when our rider should collect and deliver your fresh clothes.
                  </p>
                </div>

                {/* Pickup Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-primary-700 font-bold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>STEP A: PICKUP DATE &amp; TIME</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pickup Date
                      </label>
                      <input
                        type="date"
                        min={format(new Date(), 'yyyy-MM-dd')}
                        value={pickupSchedule.date}
                        onChange={(e) => setPickupSchedule({ ...pickupSchedule, date: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pickup Time Slot
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {availableSlotsList.map((slot) => {
                          const slotInfo = slotCapacities[slot];
                          const remaining = slotInfo ? slotInfo.remaining : 15;
                          const isUnavailable = slotInfo ? !slotInfo.isAvailable : false;
                          const isPast = slotInfo?.isPast;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isUnavailable}
                              onClick={() => setPickupSchedule({ ...pickupSchedule, timeSlot: slot })}
                              className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all text-left ${
                                pickupSchedule.timeSlot === slot
                                  ? 'border-primary-600 bg-primary-600 text-white'
                                  : isUnavailable
                                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-primary-400'
                              }`}
                            >
                              <div className="truncate">{slot}</div>
                              <span className="text-[9px] opacity-80 block truncate">
                                {isPast ? 'Passed' : isUnavailable ? 'Slot Full' : `${remaining} slots left`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-bold text-xs">
                    <PackageCheck className="w-4 h-4" />
                    <span>STEP B: DELIVERY DATE &amp; TIME (Turnaround guaranteed)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Delivery Date
                      </label>
                      <input
                        type="date"
                        min={pickupSchedule.date || format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        value={deliverySchedule.date}
                        onChange={(e) => setDeliverySchedule({ ...deliverySchedule, date: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Delivery Time Slot
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {availableSlotsList.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setDeliverySchedule({ ...deliverySchedule, timeSlot: slot })}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all text-left ${
                              deliverySchedule.timeSlot === slot
                                ? 'border-teal-600 bg-teal-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400'
                            }`}
                          >
                            <div className="truncate">{slot}</div>
                            <span className="text-[9px] opacity-80 block">Standard Hub Delivery</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Address Form */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    <h3 className="text-base font-bold text-slate-900">Pickup &amp; Delivery Address</h3>
                  </div>

                  {user && user.addresses && user.addresses.length > 0 && (
                    <span className="text-xs text-primary-600 font-semibold">
                      Saved Address Book Active
                    </span>
                  )}
                </div>

                {/* 1-Click Saved Addresses Picker */}
                {user && user.addresses && user.addresses.length > 0 && (
                  <div className="space-y-2 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block">
                      Choose from Your Saved Addresses:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {user.addresses.map((addr) => {
                        const isSelected =
                          selectedAddressId === addr._id ||
                          (pickupAddress.flatAndBuilding === addr.flatAndBuilding &&
                            pickupAddress.pincode === addr.pincode);

                        return (
                          <button
                            key={addr._id}
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                                : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                              {addr.isDefault && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium truncate">{addr.flatAndBuilding}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {addr.streetAndLandmark}, {addr.city} {addr.pincode}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Flat / House No. / Building / Tower Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 402, Royal Palms Apartments"
                      value={pickupAddress.flatAndBuilding}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, flatAndBuilding: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Street / Sector / Landmark *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Barakhamba Road, Near Connaught Place Metro"
                      value={pickupAddress.streetAndLandmark}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, streetAndLandmark: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={pickupAddress.city}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PIN Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. 110001"
                      value={pickupAddress.pincode}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, pincode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Rider Contact Mobile *</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={pickupAddress.contactPhone}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Save Current Address to Address Book Action */}
                {user && (
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-primary-600" />
                      <span className="font-semibold text-slate-700">Save to Address Book as:</span>
                      <select
                        value={saveAddressLabel}
                        onChange={(e) => setSaveAddressLabel(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-700"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={savingAddress}
                      onClick={handleSaveCurrentAddress}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-primary-500 text-primary-700 hover:bg-primary-50 font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {savingAddress ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Save Address</span>
                    </button>
                  </div>
                )}

                {/* Step Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Wash Care</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-600/30 flex items-center gap-2"
                  >
                    <span>Proceed to Review &amp; Payment</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ================= STEP 4: PAYMENT SELECTION & FINAL REVIEW ================= */}
          {activeStep === 4 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Review &amp; Payment Method</h3>
                <p className="text-xs text-slate-500">
                  Select how you want to pay. No payment details are charged until order verification.
                </p>
              </div>

              {/* Payment Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Mode 1: COD */}
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-primary-600 bg-primary-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      Cash on Delivery (COD)
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'COD' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pay comfortably in cash or scan the rider's UPI QR code when your fresh clothes are delivered to your door.
                  </p>
                  <span className="inline-block mt-3 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    No upfront payment needed
                  </span>
                </div>

                {/* Mode 2: Online Payment */}
                <div
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-primary-600 bg-primary-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      Online Payment (Instant Receipt)
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'ONLINE' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'ONLINE' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pay securely using UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or Net Banking.
                  </p>
                  <span className="inline-block mt-3 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">
                    Instant Tax Invoice &amp; Contactless
                  </span>
                </div>

              </div>

              {/* Order Recap Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>Selected Schedule:</span>
                  <span className="text-primary-700">
                    Pickup: {pickupSchedule.date} ({pickupSchedule.timeSlot})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Target:</span>
                  <span className="font-medium">{deliverySchedule.date} ({deliverySchedule.timeSlot})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Detergent &amp; Packaging:</span>
                  <span className="font-medium">{preferences.detergentType} • {preferences.packagingType}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Address:</span>
                  <span className="font-medium truncate max-w-xs">{pickupAddress.flatAndBuilding}, {pickupAddress.city}</span>
                </div>
              </div>

              {/* Final Confirm Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className="px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-sm shadow-xl shadow-primary-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Booking Your Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Place Order (₹{grandTotal})</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

        {/* ================= RIGHT STICKY ORDER SUMMARY ================= */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg shadow-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-slate-900">Your Laundry Bag</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Free Delivery Tracker */}
            <div className="my-4 p-3 rounded-2xl bg-teal-50 border border-teal-200/60 text-xs">
              {amountNeededForFreeDelivery > 0 ? (
                <div>
                  <div className="flex justify-between font-semibold text-teal-900 mb-1">
                    <span>Add ₹{amountNeededForFreeDelivery} more for FREE Delivery!</span>
                    <span>Threshold: ₹{freeDeliveryThreshold}</span>
                  </div>
                  <div className="w-full bg-teal-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (subtotal / (freeDeliveryThreshold || 399)) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-teal-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Congratulations! FREE Doorstep Delivery applied.</span>
                </div>
              )}
            </div>

            {/* Itemized Cart List */}
            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Shirt className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p>Your laundry bag is currently empty.</p>
                <p className="text-[11px] text-slate-500">
                  Select shirts, sarees, bedsheets or kurtas to begin.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-xs divide-y divide-slate-100">
                {cartItems.map((item) => (
                  <div key={item.garment._id} className="pt-3 first:pt-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-800">{item.garment.name}</h4>
                      <p className="text-[10px] text-slate-500">
                        {item.serviceType.replace(/_/g, ' ')}
                        {item.ironingType !== 'NONE' && ` • ${item.ironingType.replace(/_/g, ' ')}`}
                      </p>
                      <div className="text-[11px] text-slate-600 font-medium">
                        {item.quantity} × ₹{item.unitPrice}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 block">₹{item.lineTotal}</span>
                      <button
                        onClick={() => removeItem(item.garment._id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Promo Code & Available Coupons Drawer */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary-600" />
                <span>Apply Promo Coupon</span>
              </span>

              {appliedCoupon ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-teal-800 text-xs block">
                      {appliedCoupon.code} applied!
                    </span>
                    <span className="text-[10px] text-teal-600 block">
                      {appliedCoupon.description} (-₹{discountAmount})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. FIRST50"
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 uppercase tracking-wider"
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon || !couponInput.trim()}
                      onClick={() => handleApplyCoupon(couponInput)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50 cursor-pointer transition-all"
                    >
                      {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>

                  {/* Available Coupons Pills */}
                  {availableCoupons.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">Available for you:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCoupons.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleApplyCoupon(c.code)}
                            className="py-1 px-2 rounded-lg border border-dashed border-primary-300 bg-primary-50/60 hover:bg-primary-100/80 text-primary-700 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                            title={c.description}
                          >
                            <span>{c.code}</span>
                            <span className="text-slate-400 font-sans font-normal">
                              ({c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bill Details */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Garments Subtotal:</span>
                <span className="font-bold text-slate-800">₹{subtotal}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-teal-700 font-semibold">
                  <span>Promo Discount ({couponCode}):</span>
                  <span className="font-mono font-bold">-₹{discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Pickup &amp; Delivery Fee:</span>
                <span className={pickupDeliveryFee === 0 ? 'text-teal-600 font-bold' : 'font-bold text-slate-800'}>
                  {pickupDeliveryFee === 0 ? 'FREE' : `₹${pickupDeliveryFee}`}
                </span>
              </div>

              {expressSurcharge > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Express 24h Turnaround:</span>
                  </span>
                  <span className="font-mono font-bold">+₹{expressSurcharge}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>GST (5% SGST + CGST):</span>
                <span className="font-bold text-slate-800">₹{taxAmount}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-primary-700 font-mono">₹{grandTotal}</span>
              </div>
            </div>


            {/* Quick Action Button in Sidebar */}
            {activeStep < 4 && cartItems.length > 0 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full mt-4 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-600/30 flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Step {activeStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

          </div>

          {/* Quick Dhobi Assurance card */}
          <div className="bg-slate-900 text-white p-4 rounded-3xl text-xs space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-teal-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>IndoDhobi Fabric Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every garment is barcoded upon pickup. Zero fabric mixing, zero color bleeding, and free re-wash if not satisfied.
            </p>
          </div>
        </div>

      </div>

      {/* Online Payment Modal Triggered on Submit */}
      {showPaymentModal && createdOrder && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          order={createdOrder}
          onSuccess={handlePaymentSuccess}
        />
      )}

    </div>
  );
};

export default BookingPage;
