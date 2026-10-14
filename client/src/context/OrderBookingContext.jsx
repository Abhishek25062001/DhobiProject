import React, { createContext, useContext, useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';

const OrderBookingContext = createContext(null);

export const calculateItemUnitPrice = (garment, serviceType, ironingType) => {
  if (!garment || !garment.pricing) return 0;

  switch (serviceType) {
    case 'WASH_AND_FOLD':
      return garment.pricing.washOnly;

    case 'WASH_AND_IRON': {
      let ironCost = garment.pricing.standardSteamIron;
      if (ironingType === 'CRISP_STARCH') ironCost = garment.pricing.crispStarchPress;
      if (ironingType === 'DELICATE_PRESS') ironCost = garment.pricing.delicatePress;
      return garment.pricing.washOnly + ironCost;
    }

    case 'IRON_ONLY': {
      if (ironingType === 'CRISP_STARCH') return garment.pricing.crispStarchPress;
      if (ironingType === 'DELICATE_PRESS') return garment.pricing.delicatePress;
      return garment.pricing.standardSteamIron;
    }

    case 'DRY_CLEAN':
      return garment.pricing.dryClean;

    default:
      return garment.pricing.washOnly;
  }
};

export const OrderBookingProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Default dates: Pickup tomorrow, Delivery in 2 days
  const today = new Date();
  const defaultPickupDate = format(addDays(today, 1), 'yyyy-MM-dd');
  const defaultDeliveryDate = format(addDays(today, 3), 'yyyy-MM-dd');

  const [preferences, setPreferences] = useState({
    detergentType: 'Standard',
    packagingType: 'Folded',
    specialInstructions: ''
  });

  const [pickupSchedule, setPickupSchedule] = useState({
    date: defaultPickupDate,
    timeSlot: '10:00 AM - 01:00 PM'
  });

  const [deliverySchedule, setDeliverySchedule] = useState({
    date: defaultDeliveryDate,
    timeSlot: '10:00 AM - 01:00 PM'
  });

  const [pickupAddress, setPickupAddress] = useState({
    flatAndBuilding: '',
    streetAndLandmark: '',
    city: 'New Delhi',
    pincode: '',
    contactPhone: ''
  });

  // Cart operations
  const addItem = (garment, serviceType = 'WASH_AND_FOLD', ironingType = 'NONE') => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.garment._id === garment._id);
      const unitPrice = calculateItemUnitPrice(garment, serviceType, ironingType);

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          lineTotal: unitPrice * newQty
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            garment,
            quantity: 1,
            serviceType,
            ironingType,
            unitPrice,
            lineTotal: unitPrice
          }
        ];
      }
    });
  };

  const updateQuantity = (garmentId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(garmentId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.garment._id === garmentId) {
          const unitPrice = calculateItemUnitPrice(item.garment, item.serviceType, item.ironingType);
          return {
            ...item,
            quantity: newQuantity,
            unitPrice,
            lineTotal: unitPrice * newQuantity
          };
        }
        return item;
      })
    );
  };

  const updateServiceType = (garmentId, serviceType) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.garment._id === garmentId) {
          let ironingType = item.ironingType;
          if (serviceType === 'WASH_AND_FOLD') ironingType = 'NONE';
          else if (ironingType === 'NONE' && (serviceType === 'WASH_AND_IRON' || serviceType === 'IRON_ONLY')) {
            ironingType = 'STANDARD_STEAM';
          }
          const unitPrice = calculateItemUnitPrice(item.garment, serviceType, ironingType);
          return {
            ...item,
            serviceType,
            ironingType,
            unitPrice,
            lineTotal: unitPrice * item.quantity
          };
        }
        return item;
      })
    );
  };

  const updateIroningType = (garmentId, ironingType) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.garment._id === garmentId) {
          const unitPrice = calculateItemUnitPrice(item.garment, item.serviceType, ironingType);
          return {
            ...item,
            ironingType,
            unitPrice,
            lineTotal: unitPrice * item.quantity
          };
        }
        return item;
      })
    );
  };

  const removeItem = (garmentId) => {
    setCartItems((prev) => prev.filter((item) => item.garment._id !== garmentId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const resetBooking = () => {
    setCartItems([]);
    setPreferences({
      detergentType: 'Standard',
      packagingType: 'Folded',
      specialInstructions: ''
    });
    setPickupSchedule({
      date: defaultPickupDate,
      timeSlot: '10:00 AM - 01:00 PM'
    });
    setDeliverySchedule({
      date: defaultDeliveryDate,
      timeSlot: '10:00 AM - 01:00 PM'
    });
    setIsExpress(false);
    setAppliedCoupon(null);
  };

  const [isExpress, setIsExpress] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const applyCoupon = (couponData) => {
    setAppliedCoupon(couponData);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Live Pricing Calculations
  const {
    subtotal,
    itemCount,
    pickupDeliveryFee,
    expressSurcharge,
    discountAmount,
    couponCode,
    taxAmount,
    grandTotal,
    amountNeededForFreeDelivery
  } = useMemo(() => {
    const sub = cartItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
    const count = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const delivery = sub >= 399 ? 0 : sub > 0 ? 49 : 0;
    const expressFee = isExpress && sub > 0 ? 99 : 0;
    const discount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, sub) : 0;
    const taxableBase = Math.max(0, sub - discount) + delivery + expressFee;
    const tax = Math.round(taxableBase * 0.05);
    const total = taxableBase + tax;
    const neededForFree = Math.max(0, 399 - sub);

    return {
      subtotal: sub,
      itemCount: count,
      pickupDeliveryFee: delivery,
      expressSurcharge: expressFee,
      discountAmount: discount,
      couponCode: appliedCoupon?.code || null,
      taxAmount: tax,
      grandTotal: total,
      amountNeededForFreeDelivery: neededForFree
    };
  }, [cartItems, isExpress, appliedCoupon]);

  return (
    <OrderBookingContext.Provider
      value={{
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
        discountAmount,
        couponCode,
        taxAmount,
        grandTotal,
        amountNeededForFreeDelivery,
        freeDeliveryThreshold: 399
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
