import { useAuth } from './AuthContext';
import { defaultBookingAddress, restoreBookingAddress, addressForBooking, sameAddress } from '../../../shared/addressBook.mjs';
import { reconcileBasket, pricingRulesSignature } from '../../../shared/basketReconciliation.mjs';
import { couponQuote } from '../../../shared/coupon.mjs';
import { calculateItemUnitPrice, calculateTotals, preferredFinish, money, selectionAvailable } from '../../../shared/pricing.mjs';
import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { configService } from '../services/api';
import { readBookingDraft, readDraftCart, saveBookingDraft } from '../utils/bookingDraft';
import useApiResource from '../hooks/useApiResource';

const firstActive = options => (options || []).filter(option => option.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))[0];
const loadPlatformConfig = signal => configService.getPublicConfig({ signal });

const OrderBookingContext = createContext(null);

export { calculateItemUnitPrice } from '../../../shared/pricing.mjs';

export const OrderBookingProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const addressOwnerId = user?._id || null;
  const addressInitialized = useRef(false);
  const previousAddressUser = useRef(null);
  const [initialDraft] = useState(readBookingDraft);
  const [cartItems, setCartItems] = useState(() => readDraftCart(initialDraft));

  // Default dates: Pickup tomorrow, Delivery in 2 days
  const today = new Date();
  const defaultPickupDate = format(addDays(today, 1), 'yyyy-MM-dd');
  const defaultDeliveryDate = format(addDays(today, 3), 'yyyy-MM-dd');

  const [preferences, setPreferences] = useState({
    detergentType: '',
    packagingType: '',
    specialInstructions: '',
    ...initialDraft.preferences
  });

  const [pickupSchedule, setPickupSchedule] = useState({
    date: defaultPickupDate,
    timeSlot: '',
    ...initialDraft.pickupSchedule
  });

  const [deliverySchedule, setDeliverySchedule] = useState({
    date: defaultDeliveryDate,
    timeSlot: '',
    ...initialDraft.deliverySchedule
  });

  const [addressState, setAddressState] = useState(() => ({ ownerId: addressOwnerId, value: restoreBookingAddress(initialDraft, user) }));
  const pickupAddress = addressState.ownerId === addressOwnerId ? addressState.value : defaultBookingAddress(user);
  const setPickupAddress = next => setAddressState(previous => ({ ownerId: addressOwnerId, value: typeof next === 'function' ? next(previous.ownerId === addressOwnerId ? previous.value : defaultBookingAddress(user)) : next }));
  useEffect(() => {
    if (authLoading) return;
    if (!addressInitialized.current || addressState.ownerId !== addressOwnerId) {
      const draft = !addressInitialized.current ? initialDraft : { addressOwnerId: addressState.ownerId, pickupAddress: addressState.value };
      addressInitialized.current = true;
      setAddressState({ ownerId: addressOwnerId, value: restoreBookingAddress(draft, user) });
    } else if (previousAddressUser.current?._id === user?._id) {
      const previousUser = previousAddressUser.current;
      const previousSelection = previousUser?.addresses?.find(address => sameAddress(addressForBooking(address, previousUser.phone), addressState.value));
      if (previousSelection) {
        const current = user?.addresses?.find(address => address._id === previousSelection._id);
        const next = previousSelection.isDefault || !current ? defaultBookingAddress(user) : addressForBooking(current, user?.phone);
        if (!sameAddress(next, addressState.value)) setAddressState({ ownerId: addressOwnerId, value: next });
      }
    }
    previousAddressUser.current = user;
  }, [authLoading, addressOwnerId, user]);

  const { data: bootstrap, loading: loadingConfig, error: configError, retry: fetchPlatformConfig, fetchedAt: configCheckedAt, refreshing: refreshingConfig } = useApiResource(loadPlatformConfig, 'bootstrap');
  const platformConfig = bootstrap?.config || null;
  const slots = bootstrap?.slots || [];
  const currentRules = pricingRulesSignature(platformConfig);
  const [acceptedRules, setAcceptedRules] = useState(initialDraft.pricingRulesSignature || '');
  useEffect(() => {
    if (!bootstrap || configError) return;
    setCartItems(previous => {
      const next = reconcileBasket(previous, bootstrap.garments || [], bootstrap.config);
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
  }, [bootstrap, configError]);
  useEffect(() => { if (!cartItems.length && currentRules) setAcceptedRules(currentRules); }, [cartItems.length, currentRules]);

  const [choicesInitialized, setChoicesInitialized] = useState(false);
  useEffect(() => {
    if (!bootstrap || choicesInitialized) return;
    setPreferences(previous => ({ ...previous,
      detergentType: initialDraft.preferences?.detergentType ?? firstActive(platformConfig.detergentOptions)?.code ?? '',
      packagingType: initialDraft.preferences?.packagingType ?? firstActive(platformConfig.packagingOptions)?.code ?? '',
    }));
    const firstSlot = firstActive(slots)?.label || '';
    setPickupSchedule(previous => ({ ...previous, timeSlot: initialDraft.pickupSchedule?.timeSlot ?? firstSlot }));
    setDeliverySchedule(previous => ({ ...previous, timeSlot: initialDraft.deliverySchedule?.timeSlot ?? firstSlot }));
    setChoicesInitialized(true);
  }, [bootstrap, choicesInitialized]);

  // Cart operations
  const addItem = (garment, serviceType = 'WASH_AND_FOLD', ironingType = 'NONE', customOptions = {}) => {
    garment = bootstrap?.garments?.find(current => current._id === garment?._id);
    if (configError || !garment || !selectionAvailable(garment, platformConfig, serviceType, ironingType)) return;
    const requestedQuantity = customOptions.quantity ?? 1;
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 999) return;
    setCartItems((prev) => {
      const isCustomItem = Boolean(customOptions.isCustomItem || garment.isCustom);
      const customDescription = customOptions.customDescription || '';
      const cartItemId = isCustomItem
        ? (customOptions.cartItemId || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
        : garment._id;

      const existingIndex = isCustomItem
        ? prev.findIndex(
            (item) =>
              item.cartItemId === cartItemId ||
              (item.isCustomItem &&
                item.customDescription === customDescription &&
                item.serviceType === serviceType &&
                item.ironingType === ironingType)
          )
        : prev.findIndex((item) => !item.isCustomItem && item.garment._id === garment._id);

      const unitPrice = calculateItemUnitPrice(garment, serviceType, ironingType);

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(999, updated[existingIndex].quantity + requestedQuantity);
        const existing = updated[existingIndex];
        if (!selectionAvailable(garment, platformConfig, existing.serviceType, existing.ironingType)) return prev;
        const existingPrice = calculateItemUnitPrice(garment, existing.serviceType, existing.ironingType);
        updated[existingIndex] = {
          ...updated[existingIndex],
          garment, quantity: newQty, unitPrice: existingPrice,
          lineTotal: money(existingPrice * newQty)
        };
        return updated;
      } else {
        const qty = customOptions.quantity || 1;
        return [
          ...prev,
          {
            cartItemId,
            garment,
            quantity: qty,
            serviceType,
            ironingType, unavailableReason: '',
            unitPrice,
            lineTotal: money(unitPrice * qty),
            isCustomItem,
            customDescription
          }
        ];
      }
    });
  };

  const updateQuantity = (identifier, newQuantity) => {
    if (!Number.isInteger(newQuantity) || newQuantity > 999) return;
    if (newQuantity <= 0) {
      removeItem(identifier);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        const matches = item.cartItemId ? item.cartItemId === identifier : item.garment._id === identifier;
        if (matches) {
          const unitPrice = calculateItemUnitPrice(item.garment, item.serviceType, item.ironingType);
          return {
            ...item,
            quantity: newQuantity,
            unitPrice,
            lineTotal: money(unitPrice * newQuantity)
          };
        }
        return item;
      })
    );
  };

  const updateServiceType = (identifier, serviceType) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const matches = item.cartItemId ? item.cartItemId === identifier : item.garment._id === identifier;
        if (matches) {
          const ironingType = preferredFinish(item.garment, platformConfig, serviceType, item.ironingType);
          if (!selectionAvailable(item.garment, platformConfig, serviceType, ironingType)) return item;
          const unitPrice = calculateItemUnitPrice(item.garment, serviceType, ironingType);
          return {
            ...item,
            serviceType,
            ironingType, unavailableReason: '',
            unitPrice,
            lineTotal: money(unitPrice * item.quantity)
          };
        }
        return item;
      })
    );
  };

  const updateIroningType = (identifier, ironingType) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const matches = item.cartItemId ? item.cartItemId === identifier : item.garment._id === identifier;
        if (matches) {
          if (!selectionAvailable(item.garment, platformConfig, item.serviceType, ironingType)) return item;
          const unitPrice = calculateItemUnitPrice(item.garment, item.serviceType, ironingType);
          return {
            ...item,
            ironingType, unavailableReason: '',
            unitPrice,
            lineTotal: money(unitPrice * item.quantity)
          };
        }
        return item;
      })
    );
  };

  const removeItem = (identifier) => {
    setCartItems((prev) =>
      prev.filter((item) => {
        if (item.cartItemId) {
          return item.cartItemId !== identifier;
        }
        return item.garment._id !== identifier;
      })
    );
  };

  const clearCart = (addresses) => {
    setCartItems([]);
    setPickupAddress(defaultBookingAddress(addresses ? { ...user, addresses } : user));
  };

  const resetBooking = () => {
    setCartItems([]);
    setPickupAddress(defaultBookingAddress(user));
    setPreferences({
      detergentType: firstActive(platformConfig?.detergentOptions)?.code || '',
      packagingType: firstActive(platformConfig?.packagingOptions)?.code || '',
      specialInstructions: ''
    });
    setPickupSchedule({
      date: defaultPickupDate,
      timeSlot: firstActive(slots)?.label || ''
    });
    setDeliverySchedule({
      date: defaultDeliveryDate,
      timeSlot: firstActive(slots)?.label || ''
    });
    setIsExpress(false);
    setAppliedCoupon(null);
  };

  const [isExpress, setIsExpress] = useState(Boolean(initialDraft.isExpress));
  const [appliedCoupon, setAppliedCoupon] = useState(initialDraft.appliedCoupon || null);

  const couponSubtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const currentCoupon = bootstrap?.coupons?.find(coupon => coupon.code === appliedCoupon?.code);
  const couponStatus = appliedCoupon ? couponQuote(currentCoupon, money(couponSubtotal)) : { valid: true, discountAmount: 0 };
  const unavailableItems = cartItems.filter(item => item.unavailableReason);
  const reviewRequired = Boolean(cartItems.length && (acceptedRules !== currentRules || cartItems.some(item => item.reviewRequired) || (appliedCoupon && couponStatus.valid && appliedCoupon.discountAmount !== couponStatus.discountAmount)));
  const acknowledgeReview = () => {
    setAcceptedRules(currentRules);
    setCartItems(previous => previous.map(item => ({ ...item, reviewRequired: false, previousUnitPrice: undefined })));
    if (appliedCoupon && couponStatus.valid) setAppliedCoupon({ ...appliedCoupon, discountAmount: couponStatus.discountAmount, description: currentCoupon.description });
  };

  // Basket state belongs to the provider, including edits made on the homepage.
  // BookingPage still owns its current step; all other draft fields stay in sync here.
  useEffect(() => {
    if (authLoading || addressState.ownerId !== addressOwnerId) return;
    saveBookingDraft({ cartItems, preferences, pickupSchedule, deliverySchedule, pickupAddress, addressOwnerId, isExpress, appliedCoupon, pricingRulesSignature: acceptedRules });
  }, [cartItems, preferences, pickupSchedule, deliverySchedule, pickupAddress, isExpress, appliedCoupon, acceptedRules, addressOwnerId, authLoading]);

  const applyCoupon = (couponData) => {
    setAppliedCoupon(couponData);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Live Pricing Calculations dynamically derived from PlatformConfig
  const {
    subtotal,
    itemCount,
    pickupDeliveryFee,
    expressSurcharge,
    extraPreferenceFee,
    discountAmount,
    couponCode,
    taxAmount,
    grandTotal,
    amountNeededForFreeDelivery
  } = useMemo(() => {
    const sub = cartItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
    const count = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
    if (!platformConfig) return {
      subtotal: sub, itemCount: count, pickupDeliveryFee: null, expressSurcharge: null,
      discountAmount: null, couponCode: appliedCoupon?.code || null, taxAmount: null,
      grandTotal: null, amountNeededForFreeDelivery: null,
    };
    return calculateTotals({ items: cartItems, config: platformConfig, preferences, isExpress, discountAmount: couponStatus.discountAmount, couponCode: couponStatus.valid ? appliedCoupon?.code || null : null });
  }, [cartItems, isExpress, appliedCoupon, preferences, platformConfig, couponStatus.discountAmount, couponStatus.valid]);

  return (
    <OrderBookingContext.Provider
      value={{
        cartItems,
        setCartItems,
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
        resetBooking,
        isExpress,
        setIsExpress,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        subtotal,
        itemCount,
        pickupDeliveryFee,
        expressSurcharge,
        extraPreferenceFee,
        discountAmount,
        couponCode,
        taxAmount,
        grandTotal,
        amountNeededForFreeDelivery,
        freeDeliveryThreshold: platformConfig?.freeDeliveryThreshold ?? null,
        platformConfig,
        catalogGarments: bootstrap?.garments || [],
        availableCoupons: bootstrap?.coupons || [],
        unavailableItems, reviewRequired, acknowledgeReview, couponStatus,
        bookingBlocked: Boolean(configError || unavailableItems.length || !couponStatus.valid),
        slots,
        timeSlots: slots,
        configCheckedAt, refreshingConfig,
        loadingConfig,
        configError,
        fetchPlatformConfig
      }}
    >

      {children}
    </OrderBookingContext.Provider>
  );
};

export const useOrderBooking = () => {
  const context = useContext(OrderBookingContext);
  if (!context) {
    throw new Error('useOrderBooking must be used within an OrderBookingProvider');
  }
  return context;
};
