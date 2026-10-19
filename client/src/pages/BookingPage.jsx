import { addressForBooking, sameAddress } from '../../../shared/addressBook.mjs';
import BasketReview from '../components/BasketReview';
import { saveBookingDraft } from '../utils/bookingDraft';
import ContentAssurances from '../components/ContentAssurances';
import usePincodeCoverage from '../hooks/usePincodeCoverage';
import useSiteContent from '../hooks/useSiteContent';
import { activeOptions, customTemplate, validPreferences, scheduleAllowed } from '../../../shared/bookingChoices.mjs';
import { availableServices, availableFinishes, preferredFinish, selectionAvailable, IRONING_PRICE_KEYS, money } from '../../../shared/pricing.mjs';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrderBooking, calculateItemUnitPrice } from '../context/OrderBookingContext';
import { catalogService, orderService } from '../services/api';
import PaymentModal from '../components/PaymentModal';
import BookingGarmentCard from '../components/booking/BookingGarmentCard';
import BookingBagThumbnail from '../components/booking/BookingBagThumbnail';
import useGarments from '../hooks/useGarments';
import useCategories from '../hooks/useCategories';
import ApiLoadError from '../components/ApiLoadError';
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
  X,
  Truck,
  ChevronUp,
  ChevronDown,
  Search
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

// Category badge styling helper for high visual distinction
const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'Men':
      return 'bg-sky-50 text-sky-700 border-sky-200/70';
    case 'Women':
      return 'bg-rose-50 text-rose-700 border-rose-200/70';
    case 'Household':
      return 'bg-amber-50 text-amber-700 border-amber-200/70';
    case 'Winter & Heavy':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/70';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200/70';
  }
};

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isRider, updateUser } = useAuth();

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
    slots,
    catalogGarments,
    extraPreferenceFee, reviewRequired, bookingBlocked, fetchPlatformConfig, configCheckedAt, availableCoupons, acknowledgeReview
  } = useOrderBooking();

  const coverage = usePincodeCoverage(pickupAddress.pincode);
  const activeHub = coverage.area;
  const coverageBlocked = !coverage.supported || coverage.refreshing;
  const pageContent = useSiteContent('book', platformConfig);
  const copy = pageContent.t;
  const categoryResource = useCategories();
  const categoryOptions = [{ _id: 'All', name: copy('allCategories') }, ...categoryResource.categories];
  const [activeStep, setActiveStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { garments, loading: loadingGarments, error: catalogError, retry: retryCatalog } = useGarments(selectedCategory, searchQuery);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const { garments: allGarments } = useGarments();

  const categoryCounts = React.useMemo(() => {
    const source = allGarments.length > 0 ? allGarments : garments;
    const counts = { All: 0 };
    source.forEach((g) => {
      if (!g.isCustom) {
        counts.All = (counts.All || 0) + 1;
        counts[g.categoryId] = (counts[g.categoryId] || 0) + 1;
      }
    });
    return counts;
  }, [allGarments, garments]);

  // Custom Garment Flow state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customGarmentDesc, setCustomGarmentDesc] = useState('');
  const [customServiceType, setCustomServiceType] = useState('WASH_AND_IRON');
  const [customIroningType, setCustomIroningType] = useState('STANDARD_STEAM');
  const [customQuantity, setCustomQuantity] = useState(1);

  // Address book management state
  const [saveAddressLabel, setSaveAddressLabel] = useState('Home');
  const [saveAddressConsent, setSaveAddressConsent] = useState(false);
  const [makeAddressDefault, setMakeAddressDefault] = useState(false);
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
          addressOwnerId: user?._id || null,
          isExpress,
          activeStep,
          appliedCoupon
        };
        saveBookingDraft(draft);
      } catch (err) {
        console.warn('[Draft Persistence Error]:', err);
      }
    }
  }, [cartItems, preferences, pickupSchedule, deliverySchedule, pickupAddress, isExpress, activeStep, appliedCoupon]);

  const selectedSavedAddress = user?.addresses?.find(address => address._id === selectedAddressId)
    || user?.addresses?.find(address => sameAddress(addressForBooking(address, user.phone), pickupAddress));
  const addressChanged = !selectedSavedAddress || !sameAddress(addressForBooking(selectedSavedAddress, user?.phone), pickupAddress);
  const handleSelectSavedAddress = (address) => {
    setSelectedAddressId(address._id);
    setPickupAddress(addressForBooking(address, user?.phone));
    setSaveAddressLabel(address.label);
    setSaveAddressConsent(false);
    setMakeAddressDefault(false);
  };
  const handleNewAddress = () => {
    setSelectedAddressId(null);
    setPickupAddress(addressForBooking(null, user?.phone));
    setSaveAddressLabel('Home');
    setSaveAddressConsent(false);
    setMakeAddressDefault(false);
    document.getElementById('booking-flat')?.focus();
  };
  const handleAddressChange = (field, value) => {
    // Remember which saved address is being edited without silently changing it.
    if (selectedSavedAddress) setSelectedAddressId(selectedSavedAddress._id);
    setPickupAddress({ ...pickupAddress, [field]: value });
  };
  useEffect(() => {
    setSelectedAddressId(null);
    setSaveAddressConsent(false);
    setMakeAddressDefault(false);
  }, [user?._id]);

  // Promo coupon state
  const [couponInput, setCouponInput] = useState('');
  const [serverQuote, setServerQuote] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' or 'ONLINE'
  const [placingOrder, setPlacingOrder] = useState(false);

  // Online payment modal state
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch available promo coupons from backend

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


  const [slotCapacities, setSlotCapacities] = useState({});
  const [deliveryCapacities, setDeliveryCapacities] = useState({});
  const [slotsError, setSlotsError] = useState('');
  const [slotRefresh, setSlotRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    setSlotCapacities({}); setDeliveryCapacities({}); setSlotsError('');
    Promise.all([orderService.getSlots(pickupSchedule.date, 'pickup'), orderService.getSlots(deliverySchedule.date, 'delivery')]).then(([pickup, delivery]) => {
      if (!current) return;
      const mapped = response => Object.fromEntries(response.slots.map(slot => [slot.slot, { remaining: slot.remainingCapacity, isAvailable: slot.isAvailable, isPast: slot.isPast }]));
      setSlotCapacities(mapped(pickup)); setDeliveryCapacities(mapped(delivery));
    }).catch(() => { if (current) setSlotsError('We could not verify slot availability. Please retry.'); });
    return () => { current = false; };
  }, [pickupSchedule.date, deliverySchedule.date, slots, slotRefresh, configCheckedAt]);
  const availableSlotsList = activeOptions(slots).map(slot => slot.label);

  // Generate horizontal strip dates for Pickup
  const pickupDateCapsules = React.useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = addDays(base, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      let title = '';
      if (i === 0) title = copy('today');
      else if (i === 1) title = copy('tomorrow');
      else title = format(d, 'EEE d');
      const sub = format(d, 'MMM');
      list.push({ dateStr, title, sub, dateObj: d });
    }
    return list;
  }, [pageContent.page]);

  // Generate horizontal strip dates for Delivery (guarantee minimum 24h turnaround)
  const deliveryDateCapsules = React.useMemo(() => {
    const list = [];
    const pickupDateObj = pickupSchedule.date ? new Date(pickupSchedule.date) : new Date();
    for (let i = 1; i <= 14; i++) {
      const d = addDays(pickupDateObj, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      let title = '';
      if (i === 1) title = copy('nextDay');
      else title = format(d, 'EEE d');
      const sub = format(d, 'MMM');
      list.push({ dateStr, title, sub, dateObj: d });
    }
    return list;
  }, [pickupSchedule.date, pageContent.page]);

  const customGarmentTemplate = customTemplate(catalogGarments);
  const customServices = customGarmentTemplate ? availableServices(customGarmentTemplate, platformConfig) : [];
  const customFinishes = customGarmentTemplate ? availableFinishes(customGarmentTemplate, platformConfig) : [];
  const customAvailable = customGarmentTemplate && selectionAvailable(customGarmentTemplate, platformConfig, customServiceType, customIroningType);
  const customEstimate = customAvailable ? money(calculateItemUnitPrice(customGarmentTemplate, customServiceType, customIroningType) * customQuantity) : null;
  const openCustom = () => {
    if (!customServices.length) return;
    const service = customServices.find(option => option.code === customServiceType)?.code || customServices[0].code;
    setCustomServiceType(service);
    setCustomIroningType(preferredFinish(customGarmentTemplate, platformConfig, service, customIroningType));
    setShowCustomModal(true);
  };

  // Handler to add custom item to bag
  const handleAddCustomGarment = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customGarmentDesc.trim()) {
      toast.error('Please enter a description for the garment (e.g. Silk Zari Shawl).');
      return;
    }

    if (!customAvailable) { toast.error('Custom garment booking is currently unavailable.'); return; }
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
  const handleNextStep = async () => {
    if (bookingBlocked || reviewRequired) { toast.error('Review the updated laundry bag before continuing.'); return; }
    if (activeStep === 1) {
      if (cartItems.length === 0) {
        toast.error('Please add at least one garment to your laundry bag.');
        return;
      }
      setActiveStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeStep === 2) {
      if (!validPreferences(preferences, platformConfig)) { toast.error('Choose available detergent and packaging options before continuing.'); return; }
      setActiveStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeStep === 3) {
      if (coverage.loading || coverage.error || !activeHub) { toast.error(coverage.error ? 'Coverage could not be checked. Please retry.' : 'Enter a supported six-digit pincode before continuing.'); return; }
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
      if (!scheduleAllowed(pickupSchedule, deliverySchedule, slots, platformConfig, isExpress)) {
        toast.error(`Choose delivery at least ${isExpress ? platformConfig.expressTurnaroundHours : platformConfig.minStandardTurnaroundHours} hours after the pickup window ends.`);
        return;
      }
      if (!slotCapacities[pickupSchedule.timeSlot]?.isAvailable || !deliveryCapacities[deliverySchedule.timeSlot]?.isAvailable) { toast.error('Choose available pickup and delivery slots.'); return; }
      if (!(await coverage.verify())) { toast.error('Pickup is not available for this pincode, or coverage could not be checked. Please review your address.'); return; }
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
        addressOwnerId: user?._id || null,
        isExpress,
        activeStep: 4,
        appliedCoupon
      };
      saveBookingDraft(draft);
      toast('Please log in or register to place your laundry order.', { icon: '🔐' });
      navigate('/login?redirect=/book');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your laundry bag is empty.');
      return;
    }

    if (bookingBlocked || reviewRequired) { toast.error('Review the updated laundry bag before placing the order.'); return; }
    if (!validPreferences(preferences, platformConfig)) { toast.error('Choose available care preferences.'); setActiveStep(2); return; }
    if (coverage.error || coverage.loading || !activeHub || !scheduleAllowed(pickupSchedule, deliverySchedule, slots, platformConfig, isExpress)) { toast.error('Review your address and available schedule.'); setActiveStep(3); return; }

    setPlacingOrder(true);

    try {
      if (!(await coverage.verify())) { toast.error('Pickup is not available for this pincode, or coverage could not be checked.'); setActiveStep(3); return; }
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
        paymentMethod,
        ...(paymentMethod === 'ONLINE' ? { onlineSubMethod: 'RAZORPAY_CHECKOUT' } : {})
      };

      const preview = await orderService.quote(orderPayload);
      const changed = preview.quote.pricingBreakdown.grandTotal !== grandTotal || preview.quote.items.some((item, index) => item.unitPrice !== cartItems[index]?.unitPrice);
      if (changed && !(serverQuote?.reviewed && serverQuote.fingerprint === preview.fingerprint)) {
        setServerQuote({ ...preview, reviewed: false });
        await fetchPlatformConfig();
        toast('Booking details changed. Review the updated quote before placing the order.');
        return;
      }
      const res = await orderService.createOrder({ ...orderPayload, quoteFingerprint: preview.fingerprint,
        addressBook: { save: saveAddressConsent && addressChanged,
          label: selectedSavedAddress?.label || saveAddressLabel,
          isDefault: makeAddressDefault,
          ...(selectedSavedAddress ? { addressId: selectedSavedAddress._id } : {}) }
      });

      if (res.success && res.order) {
        if (res.addresses) updateUser({ ...user, addresses: res.addresses });
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
                clearCart(res.addresses);
                navigate('/my-orders', { state: { order: updatedOrder } });
              },
              onDismiss: () => {
                sessionStorage.removeItem('indodhobi_draft_booking');
                clearCart(res.addresses);
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
          clearCart(res.addresses);
          navigate('/my-orders', { state: { order: res.order } });
        }
      } else {
        toast.error(res.message || 'Failed to place order.');
      }
    } catch (error) {
      if (error.response?.status === 409 && error.response.data.quote) {
        setServerQuote({ quote: error.response.data.quote, fingerprint: error.response.data.fingerprint, reviewed: false });
        await fetchPlatformConfig();
      }
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

  if (pageContent.error) return <ApiLoadError message="Book content could not be loaded." onRetry={pageContent.retry} />;
  if (pageContent.loading) return <div className="min-h-[70vh]" aria-busy="true" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-28 lg:pb-12">
      
      <BasketReview />
      {activeStep === 4 && coverageBlocked && <div role="alert" className="my-4 p-4 rounded-xl bg-red-50 text-red-800 text-sm">{coverage.loading || coverage.refreshing ? 'Checking pickup coverage…' : 'This pickup pincode is unavailable or coverage could not be verified. Update your address before placing an order.'} <button type="button" className="underline font-bold" onClick={() => setActiveStep(3)}>Review pickup address</button></div>}
      {serverQuote && !serverQuote.reviewed && <section role="status" className="my-4 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-sm space-y-3"><h3 className="font-bold">Updated booking quote</h3><p>The current total is ₹{serverQuote.quote.pricingBreakdown.grandTotal}. Review the refreshed bag and booking details.</p><button type="button" className="btn-primary" disabled={bookingBlocked} onClick={() => { acknowledgeReview(); setServerQuote({ ...serverQuote, reviewed: true }); }}>Review and accept updated quote</button></section>}
      <ContentAssurances content={pageContent.section('assurances')} text={pageContent.text} />
      {/* ================= STEP PROGRESS WIZARD ================= */}
      <div className="mb-8">
        {/* Desktop Stepper (Visible sm and above) */}
        <div className="hidden sm:grid grid-cols-4 gap-3">
          {[
            { num: 1, label: copy('select_clothes_10f8467'), desc: copy('garments_ironing_0f2c96e') },
            { num: 2, label: copy('wash_care_22e6486'), desc: copy('detergents_bags_8be2e01') },
            { num: 3, label: copy('schedule_f4830a1'), desc: copy('pickup_delivery_dcb17ea') },
            { num: 4, label: copy('checkout_99e71f4'), desc: copy('payment_confirm_580a0c3') }
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num < activeStep) setActiveStep(s.num);
              }}
              className={`p-3.5 rounded-2xl border transition-all ${
                s.num < activeStep ? 'cursor-pointer hover:border-teal-400' : ''
              } ${
                activeStep === s.num
                  ? 'border-primary-600 bg-primary-50/70 shadow-xs ring-1 ring-primary-500'
                  : activeStep > s.num
                  ? 'border-teal-500 bg-teal-50/50 text-teal-900'
                  : 'border-slate-200 bg-white opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                    activeStep === s.num
                      ? 'bg-primary-600 text-white shadow-xs'
                      : activeStep > s.num
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {activeStep > s.num ? '✓' : s.num}
                </span>
                <div className="truncate">
                  <h4 className="text-xs font-bold truncate text-slate-900">{s.label}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Stepper (Clean compact progress bar on small screens) */}
        <div className="sm:hidden bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-900">{copy('step_474a987')}{activeStep}{copy('of_4_3e185dd')}{' '}
              <span className="text-primary-600">
                {activeStep === 1
                  ? copy('select_clothes_10f8467')
                  : activeStep === 2
                  ? copy('wash_care_preferences_46943c5')
                  : activeStep === 3
                  ? copy('schedule_pickup_delivery_2ec3005')
                  : copy('review_payment_6af7ffb')}
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((stepNum) => (
                <button
                  key={stepNum}
                  type="button"
                  disabled={stepNum > activeStep}
                  onClick={() => setActiveStep(stepNum)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    stepNum === activeStep
                      ? 'bg-primary-600 w-5'
                      : stepNum < activeStep
                      ? 'bg-teal-500'
                      : 'bg-slate-200'
                  }`}
                  title={`Step ${stepNum}`}
                />
              ))}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary-600 h-full transition-all duration-300"
              style={{ width: `${(activeStep / 4) * 100}%` }}
            />
          </div>
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
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
                    {categoryOptions.map((category) => {
                      const cat = category._id;
                      const isSelected = selectedCategory === cat;
                      const count = categoryCounts[cat] || 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-primary-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                          }`}
                        >
                          <span>{category.name}</span>
                          {count > 0 && (
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search with Prefix Icon & Clear Button */}
                  <div className="relative w-full sm:w-72 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={copy('search_garments_e_g_saree_kurta_6631e90')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-sm sm:text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-colors"
                        title={copy('clear_search_3b7ea51')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Garments Listing */}
              {categoryResource.error ? <ApiLoadError message={copy('we_couldn_t_load_categories_2a81ded')} onRetry={categoryResource.retry} /> : loadingGarments || categoryResource.loading ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">{copy('loading_catalog_with_indian_garments_088f6b4')}</p>
                </div>
              ) : catalogError ? <ApiLoadError onRetry={retryCatalog} /> : (
                <div className="space-y-4">
                  {garments.filter((g) => !g.isCustom).length === 0 ? (
                    <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                      <Search className="w-8 h-8 mx-auto text-slate-300" />
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{copy('no_garments_found_f0ba2e5')}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{copy('we_couldn_t_find_any_garments_matching_17361d6')}{searchQuery}{copy('in_76af5ae')}{selectedCategory}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
                      >{copy('reset_filters_view_all_30b1e7a')}</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {garments
                        .filter((g) => !g.isCustom)
                        .map((garment) => {
                          const cartItem = cartItems.find((i) => !i.isCustomItem && i.garment._id === garment._id);
                          return <BookingGarmentCard
                            key={garment._id}
                            garment={garment}
                            cartItem={cartItem}
                            addItem={addItem}
                            updateQuantity={updateQuantity}
                            updateServiceType={updateServiceType}
                            updateIroningType={updateIroningType}
                            fallbackIcon={getGarmentIcon(garment.iconName)}
                            copy={copy}
                          />;
                      })}
                    </div>
                  )}

                  {/* UPGRADE 3: Dedicated "+ Add Custom / Unlisted Garment" Card below the catalog */}
                  <div
                    onClick={openCustom}
                    aria-disabled={!customServices.length}
                    className="p-5 rounded-3xl border-2 border-dashed border-primary-300 hover:border-primary-500 bg-primary-50/40 hover:bg-primary-50/70 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left group shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-primary-200 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform text-2xl">
                        ✨
                      </div>
                      <div>
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                          <h4 className="font-extrabold text-sm text-slate-900">{copy('add_custom_unlisted_garment_c8441ac')}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">{copy('doorstep_confirmed_3b1e8f6')}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{copy('can_t_find_a_specific_item_add_designer_sarees_sherwanis_heavy_dr_5c6acf7')}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCustom();
                      }}
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm shadow-primary-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{customServices.length ? copy('add_custom_garment_836db4a') : copy('custom_booking_unavailable_fa86d80')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Next Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={activeStep === 3 && coverageBlocked}
                  className="disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-600/30 flex items-center gap-2"
                >
                  <span>{copy('continue_to_wash_care_preferences_993a5fe')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ================= STEP 2: WASH CARE & PREFERENCES ================= */}
          {activeStep === 2 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{copy('custom_wash_care_preferences_aa687d7')}</h3>
                <p className="text-xs text-slate-500">{copy('tell_our_dhobi_masters_exactly_how_you_like_your_garments_treated_f4f63bd')}</p>
              </div>

              {/* Detergent Type */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">{copy('1_detergent_selection_dc575a4')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeOptions(platformConfig?.detergentOptions).map((d) => (
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
                <label className="block text-xs font-bold text-slate-800">{copy('2_packaging_preference_53710c7')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeOptions(platformConfig?.packagingOptions).map((p) => (
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
                <label className="block text-xs font-bold text-slate-800">{copy('3_special_handling_instructions_optional_3675d2c')}</label>
                <textarea
                  rows={3}
                  value={preferences.specialInstructions}
                  onChange={(e) => setPreferences({ ...preferences, specialInstructions: e.target.value })}
                  placeholder={copy('e_g_mild_tea_stain_on_white_linen_shirt_collar_please_use_extra_s_6fa3769')}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {!activeOptions(platformConfig.detergentOptions).length && <p role="status" className="text-amber-800">{copy('no_detergent_options_are_currently_available_275e52e')}</p>}
              {!activeOptions(platformConfig.packagingOptions).length && <p role="status" className="text-amber-800">{copy('no_packaging_options_are_currently_available_d85736b')}</p>}
              {/* Express turnaround */}
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
                        <span className="font-extrabold text-sm text-slate-900">{copy('express_24_hour_turnaround_668d8c9')}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                          +₹{platformConfig?.expressSurcharge ?? 99}{copy('express_fc1fab4')}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{copy('priority_wash_iron_fast_doorstep_return_within_24_hours_of_pickup_931d9f5')}</p>
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
                  <span>{copy('back_to_clothes_9bc8636')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={activeStep === 3 && coverageBlocked}
                  className="disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-600/30 flex items-center gap-2"
                >
                  <span>{copy('continue_to_schedule_address_4484d25')}</span>
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
                  <h3 className="text-lg font-bold text-slate-900">{copy('doorstep_pickup_delivery_schedule_30f6f96')}</h3>
                  <p className="text-xs text-slate-500">{copy('choose_when_our_rider_should_collect_and_deliver_your_fresh_cloth_9784617')}</p>
                </div>

                {/* Pickup Section */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between text-primary-700 font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-600" />
                      <span>{copy('step_a_pickup_date_time_9483530')}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">{copy('selected_1f153fd')}<strong className="text-primary-800">{pickupSchedule.date}</strong>
                    </span>
                  </div>

                  {/* Horizontal Scrollable Strip of Capsule Buttons for Pickup Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{copy('select_pickup_date_c000c54')}</label>
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{copy('select_pickup_time_slot_1585889')}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableSlotsList.map((slot) => {
                        const slotInfo = slotCapacities[slot];
                        const remaining = slotInfo ? slotInfo.remaining : 0;
                        const isUnavailable = slotInfo ? !slotInfo.isAvailable : true;
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
                                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">{copy('passed_436fe71')}</span>
                              ) : isUnavailable ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">{copy('slot_full_a764bd9')}</span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    remaining <= 4
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                  }`}
                                >
                                  {remaining}{copy('slots_left_6bed6dd')}</span>
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
                      <span>{copy('step_b_delivery_date_time_turnaround_guaranteed_4811be8')}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">{copy('selected_1f153fd')}<strong className="text-teal-800">{deliverySchedule.date}</strong>
                    </span>
                  </div>

                  {/* Horizontal Scrollable Strip of Capsule Buttons for Delivery Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{copy('select_delivery_date_4e1040a')}</label>
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{copy('select_delivery_time_slot_225aa91')}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableSlotsList.map((slot) => {
                        const isUnavailable = !deliveryCapacities[slot]?.isAvailable || !scheduleAllowed(pickupSchedule, { ...deliverySchedule, timeSlot: slot }, slots, platformConfig, isExpress);
                        const isSelected = deliverySchedule.timeSlot === slot;
                        const icon = getSlotIcon(slot);

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isUnavailable}
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
                            <span className="text-[10px] font-medium text-slate-500 block mt-1">{copy('standard_doorstep_return_e91e5f2')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {slotsError && <ApiLoadError message={slotsError} onRetry={() => setSlotRefresh(value => value + 1)} />}
              {!availableSlotsList.length && <p role="status" className="text-amber-800">{copy('no_pickup_or_delivery_slots_are_currently_available_663898f')}</p>}
              {/* Address Form */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    <h3 className="text-base font-bold text-slate-900">{copy('pickup_delivery_address_f376344')}</h3>
                  </div>

                  {user && user.addresses && user.addresses.length > 0 && (
                    <span className="text-xs text-primary-600 font-semibold">{copy('saved_address_book_active_498350d')}</span>
                  )}
                </div>

                {/* 1-Click Saved Addresses Picker */}
                {user && user.addresses && user.addresses.length > 0 && (
                  <div className="space-y-2 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block">{copy('choose_from_your_saved_addresses_7f7841f')}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {user.addresses.map((addr) => {
                        const isSelected = selectedSavedAddress?._id === addr._id;

                        return (
                          <button
                            key={addr._id}
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            aria-pressed={isSelected}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                                : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                              {addr.isDefault && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">{copy('default_21b111c')}</span>
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

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <button type="button" onClick={handleNewAddress} className="min-h-11 text-primary-700 font-semibold flex items-center gap-1"><Plus className="w-4 h-4" />Use a different address</button>
                  {user && <Link to="/profile#manage-addresses" className="min-h-11 inline-flex items-center text-primary-700 font-semibold underline">Manage addresses</Link>}
                </div>
                {selectedSavedAddress && <p className="text-xs text-slate-600">Using your {selectedSavedAddress.label} address{selectedSavedAddress.isDefault ? ' (default)' : ''}. You can edit the details below for this order.</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label htmlFor="booking-flat" className="block font-semibold text-slate-700 mb-1">{copy('flat_house_no_building_tower_name_6fc717e')}</label>
                    <input
                      type="text"
                      placeholder={copy('e_g_flat_402_royal_palms_apartments_3147891')}
                      id="booking-flat"
                      value={pickupAddress.flatAndBuilding}
                      onChange={(e) => handleAddressChange('flatAndBuilding', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="booking-street" className="block font-semibold text-slate-700 mb-1">{copy('street_sector_landmark_36c3a05')}</label>
                    <input
                      type="text"
                      placeholder={copy('e_g_barakhamba_road_near_connaught_place_metro_a3a52e9')}
                      id="booking-street"
                      value={pickupAddress.streetAndLandmark}
                      onChange={(e) => handleAddressChange('streetAndLandmark', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="booking-city" className="block font-semibold text-slate-700 mb-1">{copy('city_fc33f73')}</label>
                    <input
                      type="text"
                      id="booking-city"
                      value={pickupAddress.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="booking-pincode" className="block font-semibold text-slate-700 mb-1">{copy('pin_code_99d9a4a')}</label>
                    <input
                      type="text"
                      placeholder={copy('e_g_110001_d1c3a44')}
                      inputMode="numeric"
                      maxLength={6}
                      aria-label="Pickup pincode"
                      aria-describedby="pincode-status"
                      aria-invalid={Boolean(pickupAddress.pincode) && !coverage.loading && !activeHub}
                      id="booking-pincode"
                      value={pickupAddress.pincode}
                      onChange={(e) => handleAddressChange('pincode', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                    {pickupAddress.pincode && <p id="pincode-status" role="status" className={`text-xs mt-1 ${activeHub ? 'text-emerald-700' : 'text-red-700'}`}>{coverage.loading ? 'Checking coverage…' : coverage.error ? <button type="button" onClick={coverage.retry}>Coverage unavailable. Retry</button> : activeHub ? `Served by ${activeHub.shortName || activeHub.name}` : 'Enter a supported six-digit pincode. Bookings are unavailable outside our active service areas.'}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="booking-phone" className="block font-semibold text-slate-700 mb-1">{copy('rider_contact_mobile_48f4d3d')}</label>
                    <input
                      type="text"
                      placeholder={copy('e_g_9876543210_c759847')}
                      id="booking-phone"
                      value={pickupAddress.contactPhone}
                      onChange={(e) => handleAddressChange('contactPhone', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {user && addressChanged && (
                  <div className="p-4 bg-primary-50/60 border border-primary-100 rounded-2xl space-y-3 text-sm">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={saveAddressConsent} onChange={event => setSaveAddressConsent(event.target.checked)} className="mt-1 w-4 h-4 accent-primary-600" />
                      <span><span className="font-semibold text-slate-900">{selectedSavedAddress ? `Update my saved ${selectedSavedAddress.label} address when I place this order` : 'Save this address for future orders'}</span>
                        <span className="block text-xs text-slate-600 mt-1">{selectedSavedAddress ? 'Leave unchecked to use these changes for this order only.' : !user.addresses?.length ? 'Saved as Home by default and selected automatically next time.' : 'Saved only when your booking is placed. Your current default stays selected for future orders.'}</span>
                      </span>
                    </label>
                    {saveAddressConsent && <div className="space-y-3 pl-7">
                      {!selectedSavedAddress && <label className="flex flex-wrap items-center gap-3 font-medium">Save as
                        <select aria-label="Saved address label" value={saveAddressLabel} onChange={event => setSaveAddressLabel(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">
                          {['Home', 'Work', 'Other'].map(label => <option key={label}>{label}</option>)}
                        </select>
                      </label>}
                      {!!user.addresses?.length && !selectedSavedAddress?.isDefault && <label className="flex items-center gap-2"><input type="checkbox" checked={makeAddressDefault} onChange={event => setMakeAddressDefault(event.target.checked)} className="w-4 h-4 accent-primary-600" />Use as my default address</label>}
                      {!user.addresses?.length && <p className="text-xs text-primary-800">Your first saved address will be your default. You can change it in Manage Addresses.</p>}
                    </div>}
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
                    <span>{copy('back_to_wash_care_69a5047')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={activeStep === 3 && coverageBlocked}
                    className="disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-600/30 flex items-center gap-2"
                  >
                    <span>{copy('proceed_to_review_payment_809373d')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          )}

          {activeStep === 4 && user && <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 text-sm text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span>{saveAddressConsent && addressChanged ? selectedSavedAddress ? `Your saved ${selectedSavedAddress.label} address will be updated with this booking.` : `This address will be saved as ${saveAddressLabel}${!user.addresses?.length || makeAddressDefault ? ' and set as your default' : ''}.` : addressChanged ? 'This address will be used for this order only.' : `Using your saved ${selectedSavedAddress?.label || ''} address.`}</span>
            <button type="button" className="min-h-11 font-semibold text-primary-700 underline" onClick={() => setActiveStep(3)}>Change address or saving choice</button>
          </div>}
          {/* ================= STEP 4: PAYMENT SELECTION & FINAL REVIEW ================= */}
          {activeStep === 4 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{copy('review_payment_method_ad1a20d')}</h3>
                <p className="text-xs text-slate-500">{copy('select_how_you_want_to_pay_no_payment_details_are_charged_until_o_c462674')}</p>
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
                    <span className="font-extrabold text-sm text-slate-900">{copy('cash_on_delivery_cod_3e718c3')}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'COD' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{copy('pay_comfortably_in_cash_or_scan_the_rider_s_upi_qr_code_when_your_0381334')}</p>
                  <span className="inline-block mt-3 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">{copy('no_upfront_payment_needed_c7336ac')}</span>
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
                    <span className="font-extrabold text-sm text-slate-900">{copy('online_payment_instant_receipt_7ebabcb')}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'ONLINE' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'ONLINE' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{copy('pay_securely_using_upi_google_pay_phonepe_paytm_credit_debit_card_5143e9c')}</p>
                  <span className="inline-block mt-3 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">{copy('instant_tax_invoice_contactless_3005108')}</span>
                </div>

              </div>

              {/* Order Recap Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>{copy('selected_schedule_1aa83a2')}</span>
                  <span className="text-primary-700">{copy('pickup_5571c3f')}{pickupSchedule.date} ({pickupSchedule.timeSlot})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{copy('delivery_target_81bfc95')}</span>
                  <span className="font-medium">{deliverySchedule.date} ({deliverySchedule.timeSlot})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{copy('detergent_packaging_211215c')}</span>
                  <span className="font-medium">{preferences.detergentType} • {preferences.packagingType}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{copy('delivery_address_50d0cb0')}</span>
                  <span className="font-medium text-right max-w-xs">{pickupAddress.flatAndBuilding}, {pickupAddress.streetAndLandmark}, {pickupAddress.city} {pickupAddress.pincode}<br />{pickupAddress.contactPhone}</span>
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
                  <span>{copy('back_to_schedule_0fac064')}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || bookingBlocked || reviewRequired || coverageBlocked}
                  className="px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-sm shadow-xl shadow-primary-600/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{copy('booking_your_order_8a6d2bf')}</span>
                    </>
                  ) : !user || !isAuthenticated ? (
                    <>
                      <span>{copy('login_to_confirm_order_68c97cb')}{grandTotal})</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>{copy('confirm_order_schedule_pickup_6cab36c')}{grandTotal})</span>
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
                <h3 className="font-bold text-base text-slate-900">{copy('your_laundry_bag_250ccdc')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {itemCount} {itemCount === 1 ? copy('item_4a33eac') : copy('items_5f3c4f8')}
                </span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear your laundry bag?')) {
                        clearCart();
                        sessionStorage.removeItem('indodhobi_draft_booking');
                        toast('Cleared your laundry bag.', { icon: '🧹' });
                      }
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                  >{copy('clear_83b12c2')}</button>
                )}
              </div>
            </div>

            {/* Free Delivery Tracker */}
            <div className="my-4 p-3 rounded-2xl bg-teal-50 border border-teal-200/60 text-xs">
              {amountNeededForFreeDelivery > 0 ? (
                <div>
                  <div className="flex justify-between font-semibold text-teal-900 mb-1">
                    <span>{copy('add_c396233')}{amountNeededForFreeDelivery}{copy('more_for_free_delivery_d6ff51e')}</span>
                    <span>{copy('threshold_599295c')}{freeDeliveryThreshold}</span>
                  </div>
                  <div className="w-full bg-teal-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-teal-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>{copy('congratulations_free_doorstep_delivery_applied_6e636fc')}</span>
                </div>
              )}
            </div>

            {/* Itemized Cart List */}
            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Shirt className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p>{copy('your_laundry_bag_is_currently_empty_da9186d')}</p>
                <p className="text-[11px] text-slate-500">{copy('select_shirts_sarees_bedsheets_or_kurtas_to_begin_3fcd438')}</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-xs divide-y divide-slate-100">
                {cartItems.map((item) => (
                  <div key={item.cartItemId || item.garment._id} className="pt-3 first:pt-0 flex items-start justify-between gap-2">
                    <BookingBagThumbnail item={item} />
                    <div className="space-y-0.5 min-w-0 flex-1 pr-1">
                      <h4 className="font-bold text-slate-800 truncate">
                        {item.isCustomItem && item.customDescription ? item.customDescription : item.garment.name}
                      </h4>
                      {item.isCustomItem && (
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 rounded border border-amber-200">{copy('estimated_rate_confirmed_at_doorstep_df207ef')}</span>
                      )}
                      <p className="text-[10px] text-slate-500 truncate">
                        {platformConfig.serviceTypes.find(option => option.code === item.serviceType)?.name || item.serviceType}
                        {item.ironingType !== 'NONE' && ` • ${(platformConfig.ironingTiers.find(option => option.code === item.ironingType)?.name || item.ironingType)}`}
                      </p>
                      <div className="text-[11px] text-slate-600 font-medium">
                        ₹{item.unitPrice}{copy('each_1312908')}</div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <span className="font-extrabold text-slate-900 block text-xs">₹{item.lineTotal}</span>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId || item.garment._id, item.quantity - 1)}
                          className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title={copy('decrease_991e5ab')}
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-4 text-center font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId || item.garment._id, item.quantity + 1)}
                          className="w-5 h-5 rounded bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title={copy('increase_0c2d3b8')}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.cartItemId || item.garment._id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 text-[10px] flex items-center gap-0.5 cursor-pointer transition-colors"
                        title={copy('remove_item_5a89edf')}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{copy('remove_c3812fc')}</span>
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
                <span>{copy('apply_promo_coupon_da582b8')}</span>
              </span>

              {appliedCoupon ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-teal-800 text-xs block">
                      {appliedCoupon.code}{copy('applied_7eb0dce')}</span>
                    <span className="text-[10px] text-teal-600 block">
                      {appliedCoupon.description} (-₹{discountAmount})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                  >{copy('remove_c3812fc')}</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder={copy('e_g_first50_9688fc1')}
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 uppercase tracking-wider"
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon || !couponInput.trim()}
                      onClick={() => handleApplyCoupon(couponInput)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50 cursor-pointer transition-all"
                    >
                      {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : copy('apply_31e392d')}
                    </button>
                  </div>

                  {/* Available Coupons List with Full Details */}
                  {availableCoupons.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                          <Percent className="w-3 h-3 text-teal-600" />
                          <span>{copy('available_offers_bb31856')}{availableCoupons.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{copy('tap_to_apply_cf700ba')}</span>
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
                                  {isApplied ? copy('applied_0c79a9c') : copy('apply_31e392d')}
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
                                  <span>{copy('min_order_cb47004')}</span>
                                  <strong className="text-slate-800">
                                    {minReq > 0 ? `₹${minReq}` : copy('no_min_5fa6dc3')}
                                  </strong>
                                </span>
                                <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  <span>{copy('max_cashback_discount_bcd10fb')}</span>
                                  <strong className="text-slate-800">
                                    {c.maxDiscountAmount !== null && c.maxDiscountAmount !== undefined ? `₹${c.maxDiscountAmount}` : copy('unlimited_11dde17')}
                                  </strong>
                                </span>
                              </div>

                              {/* Eligibility Feedback */}
                              <div className="mt-1 text-[10px]">
                                {isEligible ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{copy('unlocked_ready_to_apply_5e69d12')}</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium">{copy('add_c396233')}{minReq - subtotal}{copy('more_garments_to_unlock_a1e113e')}</span>
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
                <span>{copy('garments_subtotal_7d1bbfa')}</span>
                <span className="font-bold text-slate-800">₹{subtotal}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-teal-700 font-semibold">
                  <span>{copy('promo_discount_12679ff')}{couponCode}):</span>
                  <span className="font-mono font-bold">-₹{discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>{copy('pickup_delivery_fee_037a708')}</span>
                <span className={pickupDeliveryFee === 0 ? 'text-teal-600 font-bold' : 'font-bold text-slate-800'}>
                  {pickupDeliveryFee === 0 ? copy('free_19f1fa5') : `₹${pickupDeliveryFee}`}
                </span>
              </div>

              {extraPreferenceFee > 0 && <div className="flex justify-between"><span>{copy('care_preferences_f48cdc3')}</span><span>₹{extraPreferenceFee}</span></div>}
              {expressSurcharge > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{copy('express_24h_turnaround_c072d1a')}</span>
                  </span>
                  <span className="font-mono font-bold">+₹{expressSurcharge}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>{copy('gst_0b3ccae')}{platformConfig?.gstPercentage ?? 5}{copy('sgst_cgst_9c39265')}</span>
                <span className="font-bold text-slate-800">₹{taxAmount}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>{copy('grand_total_8d7627e')}</span>
                <span className="text-primary-700 font-mono">₹{grandTotal}</span>
              </div>
            </div>


            {/* Quick Action Button in Sidebar */}
            {activeStep < 4 && cartItems.length > 0 && (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={activeStep === 3 && coverageBlocked}
                className="disabled:opacity-50 disabled:cursor-not-allowed w-full mt-4 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-600/30 flex items-center justify-center gap-1.5"
              >
                <span>{copy('proceed_to_step_78af469')}{activeStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

          </div>

          {/* Quick Dhobi Assurance card */}
          <div className="bg-slate-900 text-white p-4 rounded-3xl text-xs space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-teal-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>{copy('indodhobi_fabric_guarantee_5168188')}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{copy('every_garment_is_barcoded_upon_pickup_zero_fabric_mixing_zero_col_79bced3')}</p>
          </div>
        </div>

      </div>

      {/* Custom / Unlisted Garment Modal */}
      {showCustomModal && customGarmentTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center text-xl shrink-0">
                  ✨
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{copy('add_custom_unlisted_garment_c3646df')}</h3>
                  <p className="text-[11px] text-slate-500">{copy('add_specialty_fabrics_designer_items_or_unlisted_textiles_87171d5')}</p>
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
              <label className="block text-xs font-bold text-slate-800">{copy('garment_description_or_item_name_0c70993')}</label>
              <input
                type="text"
                value={customGarmentDesc}
                onChange={(e) => setCustomGarmentDesc(e.target.value)}
                placeholder={copy('e_g_silk_zari_shawl_heavy_velvet_curtains_1_pair_designer_sherwan_fb18bb5')}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <p className="text-[10px] text-slate-400">{copy('be_specific_with_fabric_details_so_our_dhobi_masters_apply_the_ri_6a2dd8c')}</p>
            </div>

            {/* Service Choice Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">{copy('choose_service_type_7a6a2a3')}</label>
              <div className="grid grid-cols-2 gap-2">
                {customServices.map(option => ({ id: option.code, label: option.shortName || option.name, icon: { WASH_AND_FOLD: '🧺', WASH_AND_IRON: '👔', IRON_ONLY: '♨️', DRY_CLEAN: '🧴' }[option.code], price: calculateItemUnitPrice(customGarmentTemplate, option.code, preferredFinish(customGarmentTemplate, platformConfig, option.code, customIroningType)) })).map((s) => {
                  const isSelected = customServiceType === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setCustomServiceType(s.id); setCustomIroningType(preferredFinish(customGarmentTemplate, platformConfig, s.id, customIroningType)); }}
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
                      <span className="text-[11px] font-semibold text-slate-500">{copy('from_bfd0b98')}{s.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ironing Finish Pills if Wash & Iron or Iron Only */}
            {(customServiceType === 'WASH_AND_IRON' || customServiceType === 'IRON_ONLY') && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-800">{copy('ironing_finish_preference_c203210')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {customFinishes.map(option => ({ id: option.code, label: option.shortName || option.name, delta: `+₹${customGarmentTemplate.pricing[IRONING_PRICE_KEYS[option.code]]}` })).map((tier) => {
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
                <span className="block text-xs font-bold text-slate-800">{copy('quantity_822bab8')}</span>
                <span className="text-[10px] text-slate-400">{copy('total_number_of_identical_garments_432adfc')}</span>
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
                  onClick={() => setCustomQuantity(Math.min(999, customQuantity + 1))}
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
                  <span className="font-extrabold text-xs">{copy('estimated_rate_7181680')}{customEstimate ?? '—'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[9px] font-black tracking-wide">{copy('confirmed_at_doorstep_f990920')}</span>
                </div>
                <p className="text-[10px] text-amber-700 leading-snug">{copy('our_rider_will_physically_inspect_the_fabric_dimensions_and_care__943baef')}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >{copy('cancel_19766ed')}</button>
              <button
                type="button"
                disabled={!customAvailable}
                onClick={handleAddCustomGarment}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs shadow-md shadow-primary-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{copy('add_to_laundry_bag_30b522f')}{customEstimate ?? '—'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING STICKY MOBILE CART BAR ================= */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            {/* Left: Bag summary (tappable to view sheet) */}
            <button
              type="button"
              onClick={() => setShowMobileCart(true)}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="relative w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-primary-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-slate-900">₹{grandTotal}</span>
                  <span className="text-[10px] text-primary-600 font-bold flex items-center">
                    <span>{copy('view_bag_fd3023c')}</span>
                    <ChevronUp className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                  {pickupDeliveryFee === 0 ? copy('free_doorstep_delivery_6be93f0') : `Delivery: ₹${pickupDeliveryFee}`}
                </span>
              </div>
            </button>

            {/* Right: Step Action Button */}
            {activeStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={activeStep === 3 && coverageBlocked}
                className="disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-primary-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
              >
                <span>{copy('step_474a987')}{activeStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placingOrder || bookingBlocked || reviewRequired || coverageBlocked}
                className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-primary-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-50"
              >
                {placingOrder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{copy('confirm_order_252eea6')}</span>
                    <PackageCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= MOBILE CART BOTTOM SHEET DRAWER ================= */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setShowMobileCart(false)}
          />
          <div className="relative z-10 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-600" />
                <h3 className="font-extrabold text-base text-slate-900">{copy('your_laundry_bag_250ccdc')}</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {itemCount} {itemCount === 1 ? copy('item_4a33eac') : copy('items_5f3c4f8')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileCart(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Free Delivery Tracker */}
            <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200/60 text-xs">
              {amountNeededForFreeDelivery > 0 ? (
                <div>
                  <div className="flex justify-between font-semibold text-teal-900 mb-1">
                    <span>{copy('add_c396233')}{amountNeededForFreeDelivery}{copy('more_for_free_delivery_d6ff51e')}</span>
                    <span>{copy('threshold_599295c')}{freeDeliveryThreshold}</span>
                  </div>
                  <div className="w-full bg-teal-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-teal-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>{copy('congratulations_free_doorstep_delivery_applied_6e636fc')}</span>
                </div>
              )}
            </div>

            {/* Itemized Cart List with Steppers */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1 text-xs divide-y divide-slate-100">
              {cartItems.map((item) => (
                <div key={item.cartItemId || item.garment._id} className="pt-3 first:pt-0 flex items-start justify-between gap-2">
                    <BookingBagThumbnail item={item} />
                  <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                    <h4 className="font-bold text-slate-800 truncate">
                      {item.isCustomItem && item.customDescription ? item.customDescription : item.garment.name}
                    </h4>
                    {item.isCustomItem && (
                      <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 rounded border border-amber-200">{copy('estimated_rate_confirmed_at_doorstep_df207ef')}</span>
                    )}
                    <p className="text-[10px] text-slate-500 truncate">
                      {platformConfig.serviceTypes.find(option => option.code === item.serviceType)?.name || item.serviceType}
                      {item.ironingType !== 'NONE' && ` • ${(platformConfig.ironingTiers.find(option => option.code === item.ironingType)?.name || item.ironingType)}`}
                    </p>
                    <div className="text-[11px] text-slate-600 font-medium">
                      ₹{item.unitPrice}{copy('each_1312908')}</div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <span className="font-extrabold text-slate-900 text-xs block">₹{item.lineTotal}</span>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId || item.garment._id, item.quantity - 1)}
                        className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        title={copy('decrease_991e5ab')}
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-4 text-center font-bold text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId || item.garment._id, item.quantity + 1)}
                        className="w-5 h-5 rounded bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        title={copy('increase_0c2d3b8')}
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.cartItemId || item.garment._id)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 text-[10px] flex items-center gap-0.5 cursor-pointer"
                      title={copy('remove_c3812fc')}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{copy('remove_c3812fc')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Promo Code Drawer */}
            <div className="pt-2 border-t border-slate-100">
              {appliedCoupon ? (
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-teal-800 text-xs block">{appliedCoupon.code}{copy('applied_7eb0dce')}</span>
                    <span className="text-[10px] text-teal-600">{copy('saved_1d840a7')}{discountAmount}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                  >{copy('remove_c3812fc')}</button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={copy('enter_coupon_code_bde2e70')}
                    className="flex-1 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-300 uppercase tracking-wider"
                  />
                  <button
                    type="button"
                    disabled={validatingCoupon || !couponInput.trim()}
                    onClick={() => handleApplyCoupon(couponInput)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {validatingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : copy('apply_31e392d')}
                  </button>
                </div>
              )}
            </div>

            {/* Bill Details */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{copy('garments_subtotal_7d1bbfa')}</span>
                <span className="font-bold text-slate-800">₹{subtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-teal-700 font-semibold">
                  <span>{copy('promo_discount_12679ff')}{couponCode}):</span>
                  <span className="font-mono font-bold">-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>{copy('pickup_delivery_d58f53c')}</span>
                <span className={pickupDeliveryFee === 0 ? 'text-teal-600 font-bold' : 'font-bold text-slate-800'}>
                  {pickupDeliveryFee === 0 ? copy('free_19f1fa5') : `₹${pickupDeliveryFee}`}
                </span>
              </div>
              {extraPreferenceFee > 0 && <div className="flex justify-between"><span>{copy('care_preferences_f48cdc3')}</span><span>₹{extraPreferenceFee}</span></div>}
              {expressSurcharge > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>{copy('express_24h_turnaround_c072d1a')}</span>
                  <span className="font-mono font-bold">+₹{expressSurcharge}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>{copy('gst_5_sgst_cgst_29812e7')}</span>
                <span className="font-bold text-slate-800">₹{taxAmount}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>{copy('grand_total_8d7627e')}</span>
                <span className="text-primary-700 font-mono text-base">₹{grandTotal}</span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowMobileCart(false);
                  if (activeStep < 4) handleNextStep();
                }}
                disabled={activeStep === 3 && coverageBlocked}
                className="disabled:opacity-50 disabled:cursor-not-allowed w-full py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-primary-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>{activeStep < 4 ? `Proceed to Step ${activeStep + 1}` : copy('review_order_1f1edc7')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
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
