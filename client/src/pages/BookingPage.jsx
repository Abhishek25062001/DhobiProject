import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrderBooking, calculateItemUnitPrice } from '../context/OrderBookingContext';
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
  Bookmark,
  X
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
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isRider, addAddress } = useAuth();

  // Redirect staff / logistics users to their dedicated operations portals
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isRider) {
      navigate('/rider', { replace: true });
    }
  }, [isAdmin, isRider, navigate]);
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

  // Custom Garment Flow state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customGarmentDesc, setCustomGarmentDesc] = useState('');
  const [customServiceType, setCustomServiceType] = useState('WASH_AND_IRON');
  const [customIroningType, setCustomIroningType] = useState('STANDARD_STEAM');
  const [customQuantity, setCustomQuantity] = useState(1);

  // Address book management state
  const [saveAddressLabel, setSaveAddressLabel] = useState('Home');
  const [savingAddress, setSavingAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // UPGRADE 1: Rehydrate draft state on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('indodhobi_draft_booking');
      if (raw) {
        const draft = JSON.parse(raw);
        // Shared booking data is restored once by OrderBookingProvider.
        if (!location.state?.startAtBeginning && draft.activeStep && draft.activeStep > 1) {
          setActiveStep(draft.activeStep);
        }
        if (!location.state?.startAtBeginning) {
          toast.success('Restored your draft laundry booking!', { icon: '🧺', id: 'booking-draft-restored' });
        }
      }
    } catch (err) {
      console.warn('[Draft Rehydration Failed]:', err);
    }
  }, []);

  // UPGRADE 1: Persist live booking selections on change
  useEffect(() => {
    if (cartItems.length > 0 || preferences?.specialInstructions || pickupAddress?.flatAndBuilding) {
      try {
        const draft = {
          cartItems,
          preferences,
          pickupSchedule,
          deliverySchedule,
          pickupAddress,
          isExpress,
          activeStep,
          appliedCoupon
        };
        sessionStorage.setItem('indodhobi_draft_booking', JSON.stringify(draft));
      } catch (err) {
        console.warn('[Draft Persistence Error]:', err);
      }
    }
  }, [cartItems, preferences, pickupSchedule, deliverySchedule, pickupAddress, isExpress, activeStep, appliedCoupon]);

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

  // Generate horizontal strip dates for Pickup
  const pickupDateCapsules = React.useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = addDays(base, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      let title = '';
      if (i === 0) title = 'Today';
      else if (i === 1) title = 'Tomorrow';
      else title = format(d, 'EEE d');
      const sub = format(d, 'MMM');
      list.push({ dateStr, title, sub, dateObj: d });
    }
    return list;
  }, []);

  // Generate horizontal strip dates for Delivery (guarantee minimum 24h turnaround)
  const deliveryDateCapsules = React.useMemo(() => {
    const list = [];
    const pickupDateObj = pickupSchedule.date ? new Date(pickupSchedule.date) : new Date();
    for (let i = 1; i <= 14; i++) {
      const d = addDays(pickupDateObj, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      let title = '';
      if (i === 1) title = 'Next Day';
      else title = format(d, 'EEE d');
      const sub = format(d, 'MMM');
      list.push({ dateStr, title, sub, dateObj: d });
    }
    return list;
  }, [pickupSchedule.date]);

  // Template for custom garments
  const customGarmentTemplate = React.useMemo(() => {
    return (
      garments.find((g) => g.isCustom || g.name.includes('Miscellaneous')) || {
        _id: 'custom_misc_id',
        name: 'Miscellaneous / Special Item',
        category: 'Household',
        isCustom: true,
        pricing: {
          washOnly: 40,
          standardSteamIron: 15,
          crispStarchPress: 25,
          delicatePress: 30,
          dryClean: 120
        }
      }
    );
  }, [garments]);

  // Handler to add custom item to bag
  const handleAddCustomGarment = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customGarmentDesc.trim()) {
      toast.error('Please enter a description for the garment (e.g. Silk Zari Shawl).');
      return;
    }

    addItem(
      customGarmentTemplate,
      customServiceType,
      customIroningType,
      {
        isCustomItem: true,
        customDescription: customGarmentDesc.trim(),
        quantity: customQuantity
      }
    );

    toast.success(`Added "${customGarmentDesc.trim()}" with Estimated Rate!`);
    setCustomGarmentDesc('');
    setCustomQuantity(1);
    setShowCustomModal(false);
  };

  // Helper for time slot icons
  const getSlotIcon = (slotStr) => {
    if (slotStr.includes('08:00 AM') || slotStr.includes('Morning')) return '☀️';
    if (slotStr.includes('10:00 AM') || slotStr.includes('01:00 PM')) return '🌤️';
    if (slotStr.includes('02:00 PM') || slotStr.includes('05:00 PM')) return '⛅';
    return '🌙';
  };

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

  // Final Order Submission - Authenticated Booking Enforced
  const handlePlaceOrder = async () => {
    if (!user || !isAuthenticated) {
      // Save draft state to sessionStorage
      const draft = {
        cartItems,
        preferences,
        pickupSchedule,
        deliverySchedule,
        pickupAddress,
        isExpress,
        activeStep: 4,
        appliedCoupon
      };
      sessionStorage.setItem('indodhobi_draft_booking', JSON.stringify(draft));
      toast('Please log in or register to place your laundry order.', { icon: '🔐' });
      navigate('/login?redirect=/book');
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
          ironingType: item.ironingType,
          customDescription: item.customDescription || '',
          isCustomItem: Boolean(item.isCustomItem || item.garment?.isCustom)
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
        sessionStorage.removeItem('indodhobi_draft_booking');

        if (paymentMethod === 'ONLINE') {
          if (res.razorpay) {
            launchRazorpayCheckout({
              order: res.order,
              razorpayPayload: res.razorpay,
              user,
              onSuccess: (updatedOrder) => {
                sessionStorage.removeItem('indodhobi_draft_booking');
                clearCart();
                navigate('/my-orders', { state: { order: updatedOrder } });
              },
              onDismiss: () => {
                sessionStorage.removeItem('indodhobi_draft_booking');
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
          sessionStorage.removeItem('indodhobi_draft_booking');
          clearCart();
          navigate('/my-orders', { state: { order: res.order } });
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
    sessionStorage.removeItem('indodhobi_draft_booking');
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {garments
                      .filter((g) => !g.isCustom && !g.name.includes('Miscellaneous'))
                      .map((garment) => {
                        const cartItem = cartItems.find((i) => !i.isCustomItem && i.garment._id === garment._id);
                        const qty = cartItem ? cartItem.quantity : 0;

                        return (
                          <div
                            key={garment._id}
                            className={`bg-white rounded-2xl p-4 border transition-all ${
                              qty > 0
                                ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                                : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            {/* Top Row: Icon + Title + Category on Left; Price or Stepper + Total on Right */}
                            <div className="flex items-start justify-between gap-3">
                              {/* Left: Icon + Title Wrapper */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100 relative">
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
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-bold text-slate-900 leading-snug break-words">
                                    {garment.name}
                                  </h3>
                                  <span className="inline-block text-[10px] font-semibold text-slate-500 mt-0.5">
                                    {garment.category}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Unselected shows Price Badge; Selected shows Stepper + Line Total */}
                              {qty === 0 ? (
                                <div className="shrink-0 text-right whitespace-nowrap">
                                  <span className="text-[10px] text-slate-400 block font-medium">Wash Base</span>
                                  <span className="text-sm font-extrabold text-slate-900">
                                    ₹{garment.pricing.washOnly}
                                  </span>
                                </div>
                              ) : (
                                <div className="shrink-0 text-right whitespace-nowrap flex flex-col items-end gap-1">
                                  <div className="text-[11px] text-slate-500 font-semibold">
                                    Line: <strong className="text-sm font-extrabold text-indigo-600">₹{cartItem.lineTotal}</strong>
                                  </div>
                                  <div className="flex items-center gap-1 bg-slate-100/80 border border-slate-200 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(cartItem.cartItemId || garment._id, qty - 1)}
                                      className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                      title="Decrease quantity"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-5 text-center font-bold text-xs text-slate-900">
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(cartItem.cartItemId || garment._id, qty + 1)}
                                      className="w-6 h-6 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                      title="Increase quantity"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Unselected State: Clean Bottom Row with Rate Hints and + Add Button */}
                            {qty === 0 && (
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="text-[11px] text-slate-500 truncate">
                                  🧺 Wash ₹{garment.pricing.washOnly} · 👔 Steam +₹{garment.pricing.standardSteamIron}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addItem(garment, 'WASH_AND_IRON', 'STANDARD_STEAM')}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </button>
                              </div>
                            )}

                            {/* Selected State: Compact Customization Tray */}
                            {qty > 0 && (
                              <div className="bg-slate-50/90 rounded-xl p-3 mt-3 border border-slate-200/80 space-y-3">
                                {/* 2x2 Single-Line Service Pills */}
                                <div>
                                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                                    Service Choice
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      {
                                        id: 'WASH_AND_FOLD',
                                        label: 'Wash & Fold',
                                        icon: '🧺'
                                      },
                                      {
                                        id: 'WASH_AND_IRON',
                                        label: 'Wash & Iron',
                                        icon: '👔'
                                      },
                                      {
                                        id: 'IRON_ONLY',
                                        label: 'Iron Only',
                                        icon: '♨️'
                                      },
                                      {
                                        id: 'DRY_CLEAN',
                                        label: 'Dry Clean',
                                        icon: '🧴'
                                      }
                                    ].map((srv) => {
                                      const isSelected = cartItem.serviceType === srv.id;
                                      const srvPrice = calculateItemUnitPrice(garment, srv.id, cartItem.ironingType);
                                      return (
                                        <button
                                          key={srv.id}
                                          type="button"
                                          onClick={() => updateServiceType(cartItem.cartItemId || garment._id, srv.id)}
                                          className={`px-3 py-2 rounded-lg flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600 ring-offset-1'
                                              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                                            <span className="text-sm shrink-0">{srv.icon}</span>
                                            <span className="truncate">{srv.label}</span>
                                          </div>
                                          <span className={`shrink-0 ml-1.5 font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                            ₹{srvPrice}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Segmented 3-Column Ironing Finish Pills */}
                                {(cartItem.serviceType === 'WASH_AND_IRON' || cartItem.serviceType === 'IRON_ONLY') && (
                                  <div className="pt-0.5">
                                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Ironing Finish
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        {
                                          id: 'STANDARD_STEAM',
                                          shortLabel: 'Steam Press',
                                          delta: `+₹${garment.pricing.standardSteamIron}`
                                        },
                                        {
                                          id: 'CRISP_STARCH',
                                          shortLabel: 'Crisp Starch',
                                          delta: `+₹${garment.pricing.crispStarchPress}`
                                        },
                                        {
                                          id: 'DELICATE_PRESS',
                                          shortLabel: 'Delicate',
                                          delta: `+₹${garment.pricing.delicatePress}`
                                        }
                                      ].map((opt) => {
                                        const isSelected = cartItem.ironingType === opt.id;
                                        return (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => updateIroningType(cartItem.cartItemId || garment._id, opt.id)}
                                            className={`p-2 rounded-lg text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                                              isSelected
                                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600 ring-offset-1'
                                                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                                            }`}
                                          >
                                            <span
                                              className={`text-[11px] font-semibold leading-tight truncate w-full text-center ${
                                                isSelected ? 'text-white' : 'text-slate-800'
                                              }`}
                                            >
                                              {opt.shortLabel}
                                            </span>
                                            <span
                                              className={`text-[10px] opacity-80 font-bold mt-0.5 ${
                                                isSelected ? 'text-indigo-100' : 'text-slate-500'
                                              }`}
                                            >
                                              {opt.delta}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* UPGRADE 3: Dedicated "+ Add Custom / Unlisted Garment" Card below the catalog */}
                  <div
                    onClick={() => setShowCustomModal(true)}
                    className="p-5 rounded-3xl border-2 border-dashed border-primary-300 hover:border-primary-500 bg-primary-50/40 hover:bg-primary-50/70 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left group shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-primary-200 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform text-2xl">
                        ✨
                      </div>
                      <div>
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            + Add Custom / Unlisted Garment
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            Doorstep Confirmed
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Can't find a specific item? Add designer sarees, sherwanis, heavy drapes, or special fabric items.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCustomModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm shadow-primary-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Garment</span>
                    </button>
                  </div>
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
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between text-primary-700 font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-600" />
                      <span>STEP A: PICKUP DATE &amp; TIME</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Selected: <strong className="text-primary-800">{pickupSchedule.date}</strong>
                    </span>
                  </div>

                  {/* Horizontal Scrollable Strip of Capsule Buttons for Pickup Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Select Pickup Date:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 pt-0.5 scrollbar-thin">
                      {pickupDateCapsules.map((d) => {
                        const isSelected = pickupSchedule.date === d.dateStr;
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => {
                              setPickupSchedule((prev) => ({ ...prev, date: d.dateStr }));
                              const currentDelivery = new Date(deliverySchedule.date);
                              const newPickup = new Date(d.dateStr);
                              if (currentDelivery <= newPickup) {
                                const defaultNext = format(addDays(newPickup, isExpress ? 1 : 2), 'yyyy-MM-dd');
                                setDeliverySchedule((prev) => ({ ...prev, date: defaultNext }));
                              }
                            }}
                            className={`shrink-0 px-4 py-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center min-w-[76px] ${
                              isSelected
                                ? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-600/25 ring-2 ring-primary-500/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {d.title}
                            </span>
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-primary-100' : 'text-slate-400'}`}>
                              {d.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Responsive 2x2 Grid for Pickup Time Slots */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Select Pickup Time Slot:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableSlotsList.map((slot) => {
                        const slotInfo = slotCapacities[slot];
                        const remaining = slotInfo ? slotInfo.remaining : 15;
                        const isUnavailable = slotInfo ? !slotInfo.isAvailable : false;
                        const isPast = slotInfo?.isPast;
                        const isSelected = pickupSchedule.timeSlot === slot;
                        const icon = getSlotIcon(slot);

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isUnavailable}
                            onClick={() => setPickupSchedule({ ...pickupSchedule, timeSlot: slot })}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                              isSelected
                                ? 'border-primary-600 bg-primary-50/80 text-primary-950 ring-2 ring-primary-500/20 shadow-xs'
                                : isUnavailable
                                ? 'border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed opacity-60'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{icon}</span>
                                <span className="font-extrabold text-xs tracking-tight">{slot}</span>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isPast ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                                  Passed
                                </span>
                              ) : isUnavailable ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                                  Slot Full
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    remaining <= 4
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                  }`}
                                >
                                  {remaining} slots left
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Delivery Section */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between text-teal-700 font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-teal-600" />
                      <span>STEP B: DELIVERY DATE &amp; TIME (Turnaround guaranteed)</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Selected: <strong className="text-teal-800">{deliverySchedule.date}</strong>
                    </span>
                  </div>

                  {/* Horizontal Scrollable Strip of Capsule Buttons for Delivery Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Select Delivery Date:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 pt-0.5 scrollbar-thin">
                      {deliveryDateCapsules.map((d) => {
                        const isSelected = deliverySchedule.date === d.dateStr;
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => setDeliverySchedule((prev) => ({ ...prev, date: d.dateStr }))}
                            className={`shrink-0 px-4 py-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center min-w-[76px] ${
                              isSelected
                                ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-2 ring-teal-500/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {d.title}
                            </span>
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                              {d.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Responsive 2x2 Grid for Delivery Time Slots */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Select Delivery Time Slot:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableSlotsList.map((slot) => {
                        const isSelected = deliverySchedule.timeSlot === slot;
                        const icon = getSlotIcon(slot);

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setDeliverySchedule({ ...deliverySchedule, timeSlot: slot })}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                              isSelected
                                ? 'border-teal-600 bg-teal-50/80 text-teal-950 ring-2 ring-teal-500/20 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{icon}</span>
                                <span className="font-extrabold text-xs tracking-tight">{slot}</span>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 block mt-1">
                              Standard Doorstep Return
                            </span>
                          </button>
                        );
                      })}
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
                      <div className="flex items-center gap-1.5">
                        {['Home', 'Work', 'Other'].map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setSaveAddressLabel(lbl)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              saveAddressLabel === lbl
                                ? 'border-primary-600 bg-primary-600 text-white shadow-2xs'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
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
                  className="px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-sm shadow-xl shadow-primary-600/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Booking Your Order...</span>
                    </>
                  ) : !user || !isAuthenticated ? (
                    <>
                      <span>Login to Confirm Order (₹{grandTotal})</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Confirm Order &amp; Schedule Pickup (₹{grandTotal})</span>
                      <PackageCheck className="w-4 h-4" />
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
                  <div key={item.cartItemId || item.garment._id} className="pt-3 first:pt-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-800">
                        {item.isCustomItem && item.customDescription ? item.customDescription : item.garment.name}
                      </h4>
                      {item.isCustomItem && (
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 rounded border border-amber-200">
                          Estimated Rate — Confirmed at Doorstep
                        </span>
                      )}
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
                        type="button"
                        onClick={() => removeItem(item.cartItemId || item.garment._id)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
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

                  {/* Available Coupons List with Full Details */}
                  {availableCoupons.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                          <Percent className="w-3 h-3 text-teal-600" />
                          <span>Available Offers ({availableCoupons.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Tap to apply</span>
                      </div>
                      
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {availableCoupons.map((c) => {
                          const minReq = Number(c.minOrderSubtotal) || 0;
                          const isEligible = subtotal >= minReq;
                          const isApplied = appliedCoupon?.code === c.code;

                          return (
                            <div
                              key={c.code}
                              className={`p-2.5 rounded-xl border transition-all ${
                                isApplied
                                  ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-400'
                                  : isEligible
                                  ? 'bg-white hover:bg-teal-50/40 border-teal-200 shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 opacity-90'
                              }`}
                            >
                              {/* Header: Code + Discount + Action */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md border border-dashed border-teal-600 bg-teal-50 text-teal-900 font-mono font-black text-[11px] uppercase tracking-wide">
                                    {c.code}
                                  </span>
                                  <span className="font-extrabold text-xs text-slate-900">
                                    {c.discountType === 'PERCENTAGE'
                                      ? `${c.discountValue}% OFF`
                                      : `₹${c.discountValue} FLAT OFF`}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  disabled={validatingCoupon}
                                  onClick={() => handleApplyCoupon(c.code)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                    isApplied
                                      ? 'bg-teal-700 text-white cursor-default'
                                      : isEligible
                                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                >
                                  {isApplied ? 'Applied' : 'Apply'}
                                </button>
                              </div>

                              {/* Description */}
                              {c.description && (
                                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                                  {c.description}
                                </p>
                              )}

                              {/* Full Financial Criteria: Min Order & Max Cashback Limit */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                                <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  <span>Min Order:</span>
                                  <strong className="text-slate-800">
                                    {minReq > 0 ? `₹${minReq}` : 'No Min.'}
                                  </strong>
                                </span>
                                <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  <span>Max Cashback / Discount:</span>
                                  <strong className="text-slate-800">
                                    {c.maxDiscountAmount ? `₹${c.maxDiscountAmount}` : 'Unlimited'}
                                  </strong>
                                </span>
                              </div>

                              {/* Eligibility Feedback */}
                              <div className="mt-1 text-[10px]">
                                {isEligible ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Unlocked &amp; ready to apply</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium">
                                    Add ₹{minReq - subtotal} more garments to unlock
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                <span>GST ({platformConfig?.gstPercentage ?? 5}% SGST + CGST):</span>
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

      {/* Custom / Unlisted Garment Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center text-xl shrink-0">
                  ✨
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Add Custom / Unlisted Garment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add specialty fabrics, designer items, or unlisted textiles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Garment Description or Item Name *
              </label>
              <input
                type="text"
                value={customGarmentDesc}
                onChange={(e) => setCustomGarmentDesc(e.target.value)}
                placeholder="e.g. Silk Zari Shawl, Heavy Velvet Curtains (1 Pair), Designer Sherwani"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <p className="text-[10px] text-slate-400">
                Be specific with fabric details so our dhobi masters apply the right gentle wash process.
              </p>
            </div>

            {/* Service Choice Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Choose Service Type:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'WASH_AND_FOLD', label: 'Wash & Fold', icon: '🧺', price: customGarmentTemplate.pricing.washOnly },
                  { id: 'WASH_AND_IRON', label: 'Wash & Iron', icon: '👔', price: customGarmentTemplate.pricing.washOnly + customGarmentTemplate.pricing.standardSteamIron },
                  { id: 'IRON_ONLY', label: 'Iron Only', icon: '♨️', price: customGarmentTemplate.pricing.standardSteamIron },
                  { id: 'DRY_CLEAN', label: 'Dry Clean', icon: '🧴', price: customGarmentTemplate.pricing.dryClean }
                ].map((s) => {
                  const isSelected = customServiceType === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCustomServiceType(s.id)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50 text-primary-950 ring-2 ring-primary-500/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl">{s.icon}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />}
                      </div>
                      <span className="font-bold text-xs text-slate-900">{s.label}</span>
                      <span className="text-[11px] font-semibold text-slate-500">From ₹{s.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ironing Finish Pills if Wash & Iron or Iron Only */}
            {(customServiceType === 'WASH_AND_IRON' || customServiceType === 'IRON_ONLY') && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  Ironing Finish Preference:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    ...(customServiceType === 'WASH_AND_IRON' ? [{ id: 'NONE', label: 'No Iron', delta: '₹0' }] : []),
                    { id: 'STANDARD_STEAM', label: 'Standard Steam', delta: `+₹${customGarmentTemplate.pricing.standardSteamIron}` },
                    { id: 'CRISP_STARCH', label: 'Crisp Starch', delta: `+₹${customGarmentTemplate.pricing.crispStarchPress}` },
                    { id: 'DELICATE_PRESS', label: 'Delicate Press', delta: `+₹${customGarmentTemplate.pricing.delicatePress}` }
                  ].map((tier) => {
                    const isSelected = customIroningType === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setCustomIroningType(tier.id)}
                        className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-950 ring-2 ring-teal-500/20 shadow-2xs font-extrabold'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate text-[11px]">{tier.label}</span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
                          ({tier.delta})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <span className="block text-xs font-bold text-slate-800">Quantity</span>
                <span className="text-[10px] text-slate-400">Total number of identical garments</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-black text-sm text-slate-900">
                  {customQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setCustomQuantity(customQuantity + 1)}
                  className="w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Doorstep confirmation estimated rate badge */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs">
                    Estimated Rate: ₹{calculateItemUnitPrice(customGarmentTemplate, customServiceType, customIroningType) * customQuantity}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[9px] font-black tracking-wide">
                    Confirmed at Doorstep
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 leading-snug">
                  Our rider will physically inspect the fabric, dimensions, and care tags upon doorstep collection. If any rate adjustment is needed, it will be transparently confirmed before washing begins.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomGarment}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs shadow-md shadow-primary-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Laundry Bag (₹{calculateItemUnitPrice(customGarmentTemplate, customServiceType, customIroningType) * customQuantity})</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
