import Order from '../models/Order.js';
import Garment from '../models/Garment.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import TimeSlot from '../models/TimeSlot.js';
import PlatformConfig from '../models/PlatformConfig.js';
import Notification from '../models/Notification.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../utils/razorpay.js';

export const MAX_ORDERS_PER_SLOT = 15;

export const STANDARD_SLOTS = [
  { slot: '08:00 AM - 10:00 AM', maxCapacity: 15, endHour: 10, endMinute: 0 },
  { slot: '10:00 AM - 01:00 PM', maxCapacity: 15, endHour: 13, endMinute: 0 },
  { slot: '02:00 PM - 05:00 PM', maxCapacity: 15, endHour: 17, endMinute: 0 },
  { slot: '06:00 PM - 09:00 PM', maxCapacity: 15, endHour: 21, endMinute: 0 }
];

// Helper to determine if a slot has already passed
export const isSlotInPast = async (dateStr, slotStr) => {
  if (!dateStr || !slotStr) return false;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (dateStr < todayStr) {
    return true;
  }

  if (dateStr === todayStr) {
    let endHour = 23;
    const slotDoc = await TimeSlot.findOne({ label: slotStr });
    if (slotDoc) {
      endHour = slotDoc.endHour;
    } else {
      const fallback = STANDARD_SLOTS.find((s) => s.slot === slotStr);
      if (fallback) endHour = fallback.endHour;
    }
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    if (currentHour > endHour || (currentHour === endHour && currentMinute > 0)) {
      return true;
    }
  }

  return false;
};

// Helper to calculate exact item price on server side
const calculateItemPrice = (garment, serviceType, ironingType) => {
  let unitPrice = 0;

  switch (serviceType) {
    case 'WASH_AND_FOLD':
      unitPrice = garment.pricing.washOnly;
      break;

    case 'WASH_AND_IRON':
      let ironCost = garment.pricing.standardSteamIron;
      if (ironingType === 'CRISP_STARCH') ironCost = garment.pricing.crispStarchPress;
      if (ironingType === 'DELICATE_PRESS') ironCost = garment.pricing.delicatePress;
      if (ironingType === 'NONE') ironCost = 0;
      unitPrice = garment.pricing.washOnly + ironCost;
      break;

    case 'IRON_ONLY':
      if (ironingType === 'CRISP_STARCH') {
        unitPrice = garment.pricing.crispStarchPress;
      } else if (ironingType === 'DELICATE_PRESS') {
        unitPrice = garment.pricing.delicatePress;
      } else {
        unitPrice = garment.pricing.standardSteamIron;
      }
      break;

    case 'DRY_CLEAN':
      unitPrice = garment.pricing.dryClean;
      break;

    default:
      unitPrice = garment.pricing.washOnly;
  }

  return unitPrice;
};

// @desc    Get available slots & capacity for a given date
// @route   GET /api/orders/slots
// @access  Public
export const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "date" (YYYY-MM-DD) is required.'
      });
    }

    // Dynamic TimeSlots from MongoDB
    let activeSlots = await TimeSlot.find({ isActive: true }).sort({ sortOrder: 1, startHour: 1 });
    if (!activeSlots || activeSlots.length === 0) {
      activeSlots = await TimeSlot.create([
        { label: '08:00 AM - 10:00 AM', startHour: 8, endHour: 10, maxCapacity: 15, sortOrder: 1, isActive: true },
        { label: '10:00 AM - 01:00 PM', startHour: 10, endHour: 13, maxCapacity: 15, sortOrder: 2, isActive: true },
        { label: '02:00 PM - 05:00 PM', startHour: 14, endHour: 17, maxCapacity: 15, sortOrder: 3, isActive: true },
        { label: '06:00 PM - 09:00 PM', startHour: 18, endHour: 21, maxCapacity: 15, sortOrder: 4, isActive: true }
      ]);
    }

    // Count existing pickup bookings for each slot on this date
    const ordersOnDate = await Order.find({
      'pickupSchedule.date': date,
      orderStatus: { $ne: 'CANCELLED' }
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const slotAvailability = activeSlots.map((slotDoc) => {
      const slot = slotDoc.label;
      const maxCapacity = slotDoc.maxCapacity;

      const bookedCount = ordersOnDate.filter(
        (o) => o.pickupSchedule?.date === date && o.pickupSchedule?.timeSlot === slot
      ).length;

      const remaining = Math.max(0, maxCapacity - bookedCount);

      let isPast = false;
      if (date < todayStr) {
        isPast = true;
      } else if (date === todayStr) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        if (currentHour > slotDoc.endHour || (currentHour === slotDoc.endHour && currentMinute > 0)) {
          isPast = true;
        }
      }

      return {
        slot,
        maxCapacity,
        bookedCount,
        remainingCapacity: remaining,
        isPast,
        isAvailable: remaining > 0 && !isPast
      };
    });

    return res.json({
      success: true,
      date,
      slots: slotAvailability
    });
  } catch (error) {
    console.error('[Slots Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve slot availability.'
    });
  }
};

// @desc    Create a new order with server-side validation & pricing
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      preferences,
      pickupSchedule,
      deliverySchedule,
      pickupAddress,
      paymentMethod,
      onlineSubMethod,
      isExpress,
      couponCode
    } = req.body;


    // 1. Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.'
      });
    }

    if (!pickupSchedule?.date || !pickupSchedule?.timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid pickup date and time slot.'
      });
    }

    if (!deliverySchedule?.date || !deliverySchedule?.timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid delivery date and time slot.'
      });
    }

    // 2. Validate Turnaround: Delivery must be after pickup date (minimum 24-hour turnaround required)
    const pickupDateObj = new Date(pickupSchedule.date);
    const deliveryDateObj = new Date(deliverySchedule.date);

    if (deliveryDateObj <= pickupDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Delivery date must be scheduled after pickup date (minimum 24-hour turnaround required).'
      });
    }

    // 3. Past Slot & Capacity Checks using dynamic TimeSlot
    const isPast = await isSlotInPast(pickupSchedule.date, pickupSchedule.timeSlot);
    if (isPast) {
      return res.status(400).json({
        success: false,
        message: 'Selected pickup time slot has already passed. Please choose a future slot.'
      });
    }

    const currentBookedCount = await Order.countDocuments({
      'pickupSchedule.date': pickupSchedule.date,
      'pickupSchedule.timeSlot': pickupSchedule.timeSlot,
      orderStatus: { $ne: 'CANCELLED' }
    });

    const slotDoc = await TimeSlot.findOne({ label: pickupSchedule.timeSlot, isActive: true });
    const slotCapacity = slotDoc ? slotDoc.maxCapacity : MAX_ORDERS_PER_SLOT;
    const remaining = slotCapacity - currentBookedCount;

    if (remaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected pickup time slot is fully booked. Please choose another slot.'
      });
    }

    // 4. Server-side item pricing calculation
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const garment = await Garment.findById(item.garmentId || item.garment);
      if (!garment) {
        return res.status(404).json({
          success: false,
          message: `Garment not found with ID ${item.garmentId || item.garment}`
        });
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const serviceType = item.serviceType || 'WASH_AND_FOLD';
      const ironingType = item.ironingType || (serviceType.includes('IRON') ? 'STANDARD_STEAM' : 'NONE');

      const unitPrice = calculateItemPrice(garment, serviceType, ironingType);
      const lineTotal = unitPrice * quantity;

      subtotal += lineTotal;

      processedItems.push({
        garment: garment._id,
        garmentName: garment.name,
        category: garment.category,
        quantity,
        serviceType,
        ironingType,
        unitPrice,
        lineTotal,
        customDescription: item.customDescription || '',
        isCustomItem: Boolean(item.isCustomItem || garment.isCustom)
      });
    }

    // 5. Dynamic Surcharge, Preferences & Coupon Calculation from PlatformConfig
    const platformConfig = await PlatformConfig.getOrCreateActiveConfig();
    const expressOrder = Boolean(isExpress);
    const expressSurcharge = expressOrder ? (platformConfig.expressSurcharge ?? 99) : 0;

    let extraPreferenceFee = 0;
    if (preferences?.detergentType && platformConfig.detergentOptions) {
      const selectedDetergent = platformConfig.detergentOptions.find(
        (d) => d.code === preferences.detergentType || d.name === preferences.detergentType
      );
      if (selectedDetergent && selectedDetergent.extraPricePerOrder > 0) {
        extraPreferenceFee += selectedDetergent.extraPricePerOrder;
      }
    }
    if (preferences?.packagingType && platformConfig.packagingOptions) {
      const selectedPackaging = platformConfig.packagingOptions.find(
        (p) => p.code === preferences.packagingType || p.name === preferences.packagingType
      );
      if (selectedPackaging && selectedPackaging.extraPricePerOrder > 0) {
        extraPreferenceFee += selectedPackaging.extraPricePerOrder;
      }
    }

    let discountAmount = 0;
    let appliedCouponCode = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: cleanCode });

      if (!coupon || !coupon.isActive || new Date() > coupon.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired coupon code.'
        });
      }

      if (subtotal < coupon.minOrderSubtotal) {
        return res.status(400).json({
          success: false,
          message: `Coupon requires a minimum subtotal of ₹${coupon.minOrderSubtotal}. Your current subtotal is ₹${subtotal}.`
        });
      }

      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        }
      } else if (coupon.discountType === 'FLAT') {
        discountAmount = coupon.discountValue;
      }

      discountAmount = Math.min(discountAmount, subtotal);
      appliedCouponCode = coupon.code;
    }

    // Dynamic Delivery fee & Tax calculation from PlatformConfig
    const freeThreshold = platformConfig.freeDeliveryThreshold !== undefined ? platformConfig.freeDeliveryThreshold : 399;
    const baseDeliveryFee = platformConfig.deliveryFee !== undefined ? platformConfig.deliveryFee : 49;
    const pickupDeliveryFee = subtotal >= freeThreshold ? 0 : baseDeliveryFee;
    const taxableBase = Math.max(0, subtotal - discountAmount) + pickupDeliveryFee + expressSurcharge + extraPreferenceFee;
    const gstRate = (platformConfig.gstPercentage !== undefined ? platformConfig.gstPercentage : 5) / 100;
    const taxAmount = Math.round(taxableBase * gstRate);
    const grandTotal = taxableBase + taxAmount;

    // 6. Generate unique Indian Order ID
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `IDB-${year}-${randomSuffix}`;

    // 7. Handle Payment setup
    const isOnline = paymentMethod === 'ONLINE';
    let paymentData = {
      method: isOnline ? 'ONLINE' : 'COD',
      onlineSubMethod: isOnline ? (onlineSubMethod || 'UPI') : null,
      status: 'PENDING',
      transactionId: null,
      razorpayOrderId: null,
      razorpayPaymentId: null,
      razorpaySignature: null,
      paidAt: null
    };

    let razorpayPayload = null;

    if (isOnline) {
      const rzOrder = await createRazorpayOrder(grandTotal, orderNumber);
      paymentData.razorpayOrderId = rzOrder.id;
      razorpayPayload = {
        ...rzOrder,
        key_id: rzOrder.keyId || process.env.RAZORPAY_KEY_ID
      };
    }

    // 8. Generate 4-digit doorstep verification OTPs
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // 9. Save order
    const order = await Order.create({
      orderNumber,
      customer: req.user._id,
      items: processedItems,
      preferences: {
        detergentType: preferences?.detergentType || 'Standard',
        packagingType: preferences?.packagingType || 'Folded',
        specialInstructions: preferences?.specialInstructions || ''
      },
      isExpress: expressOrder,
      pickupSchedule,
      deliverySchedule,
      pickupAddress: {
        flatAndBuilding: pickupAddress.flatAndBuilding,
        streetAndLandmark: pickupAddress.streetAndLandmark,
        city: pickupAddress.city || 'New Delhi',
        pincode: pickupAddress.pincode,
        contactPhone: pickupAddress.contactPhone || req.user.phone
      },
      pricingBreakdown: {
        subtotal,
        discountAmount,
        couponCode: appliedCouponCode,
        pickupDeliveryFee,
        expressSurcharge,
        taxAmount,
        grandTotal
      },

      payment: paymentData,
      orderStatus: 'BOOKED',
      verificationCodes: {
        pickupOtp,
        deliveryOtp
      },
      logistics: {
        assignedRider: null,
        bagTagId: '',
        inspectionNotes: '',
        verifiedGarmentCount: 0,
        pickedUpAt: null,
        deliveredAt: null
      },
      statusHistory: [
        {
          status: 'BOOKED',
          timestamp: new Date(),
          updatedBy: req.user._id,
          updaterRole: req.user.role || 'customer',
          note: 'Order placed by customer'
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order,
      razorpay: razorpayPayload
    });
  } catch (error) {
    console.error('[Create Order Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating order.'
    });
  }
};

// @desc    Verify Razorpay online payment cryptographically
// @route   POST /api/orders/verify-payment or POST /api/orders/:id/pay-online
// @access  Private
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, onlineSubMethod } = req.body;
    const targetId = req.params.id || orderId;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required.'
      });
    }

    const order = await Order.findById(targetId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Customer or admin authorization check
    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update payment for this order.'
      });
    }

    const orderIdToVerify = razorpay_order_id || order.payment?.razorpayOrderId;
    const paymentIdToVerify = razorpay_payment_id;

    if (!orderIdToVerify || !paymentIdToVerify || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature).'
      });
    }

    // Strict HMAC-SHA256 signature verification
    const isValid = verifyRazorpaySignature(orderIdToVerify, paymentIdToVerify, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid cryptographic signature.'
      });
    }

    order.payment.status = 'PAID';
    order.payment.transactionId = paymentIdToVerify;
    order.payment.razorpayOrderId = orderIdToVerify;
    order.payment.razorpayPaymentId = paymentIdToVerify;
    order.payment.razorpaySignature = razorpay_signature;
    order.payment.onlineSubMethod = onlineSubMethod || order.payment.onlineSubMethod || 'UPI';
    order.payment.paidAt = new Date();

    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      updatedBy: req.user._id,
      updaterRole: req.user.role || 'customer',
      note: `Online payment verified & captured via ${onlineSubMethod || 'Razorpay'}. Transaction ID: ${paymentIdToVerify}`
    });

    await order.save();

    return res.json({
      success: true,
      message: 'Payment verified and captured successfully!',
      order
    });
  } catch (error) {
    console.error('[Verify Payment Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process online payment verification.'
    });
  }
};

// @desc    Record client-side payment failure or checkout dismissal
// @route   POST /api/orders/:id/payment-failed
// @access  Private
export const recordPaymentFailure = async (req, res) => {
  try {
    const { reason, errorCode, paymentId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update payment status for this order.'
      });
    }

    if (order.payment.status !== 'PAID') {
      order.payment.status = 'FAILED';
      if (paymentId) order.payment.razorpayPaymentId = paymentId;

      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: order.orderStatus,
        timestamp: new Date(),
        updatedBy: req.user._id,
        updaterRole: req.user.role || 'customer',
        note: `Payment failed/dismissed: ${reason || 'Checkout closed by user'} (Code: ${errorCode || 'USER_DISMISSED'})`
      });

      await order.save();
    }

    return res.json({
      success: true,
      message: 'Payment failure recorded.',
      order
    });
  } catch (error) {
    console.error('[Record Payment Failure Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to record payment failure.'
    });
  }
};

// @desc    Razorpay Server Webhook Handler
// @route   POST /api/orders/webhook/razorpay
// @access  Public
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!webhookSignature || !webhookSecret) {
      return res.status(400).json({
        success: false,
        message: 'Missing webhook signature or secret.'
      });
    }

    const crypto = await import('crypto');
    const bodyPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto.default
      .createHmac('sha256', webhookSecret)
      .update(bodyPayload)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook cryptographic signature.'
      });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { event: eventName, payload } = event;

    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (rzpOrderId) {
        const order = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId });
        if (order && order.payment.status !== 'PAID') {
          order.payment.status = 'PAID';
          order.payment.transactionId = paymentId;
          order.payment.razorpayPaymentId = paymentId;
          order.payment.paidAt = new Date();
          if (!order.statusHistory) order.statusHistory = [];
          order.statusHistory.push({
            status: order.orderStatus,
            timestamp: new Date(),
            updaterRole: 'system',
            note: `Payment captured via Razorpay webhook. Transaction ID: ${paymentId}`
          });
          await order.save();
        }
      }
    } else if (eventName === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      if (rzpOrderId) {
        const order = await Order.findOne({ 'payment.razorpayOrderId': rzpOrderId });
        if (order && order.payment.status !== 'PAID') {
          order.payment.status = 'FAILED';
          if (!order.statusHistory) order.statusHistory = [];
          order.statusHistory.push({
            status: order.orderStatus,
            timestamp: new Date(),
            updaterRole: 'system',
            note: `Payment failed via Razorpay webhook: ${paymentEntity?.error_description || 'Declined'}`
          });
          await order.save();
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Razorpay Webhook Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Webhook processing failed.'
    });
  }
};

// Alias for backwards-compatibility
export const payOnlineOrder = verifyPayment;

// @desc    Retry / refresh online payment for an order
// @route   POST /api/orders/:id/retry-payment
// @access  Private
export const retryPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to retry payment for this order.'
      });
    }

    if (order.payment.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been paid.'
      });
    }

    const rzOrder = await createRazorpayOrder(order.pricingBreakdown.grandTotal, order.orderNumber);
    order.payment.method = 'ONLINE';
    order.payment.razorpayOrderId = rzOrder.id;
    order.payment.status = 'PENDING';
    await order.save();

    return res.json({
      success: true,
      message: 'Ready for online checkout.',
      order,
      razorpay: {
        ...rzOrder,
        key_id: rzOrder.keyId || process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('[Retry Payment Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment retry.'
    });
  }
};

// @desc    Switch an unpaid online order to Cash on Delivery (COD)
// @route   POST /api/orders/:id/switch-to-cod
// @access  Private
export const switchToCod = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this order.'
      });
    }

    if (order.payment.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Cannot switch payment method for an already paid order.'
      });
    }

    order.payment.method = 'COD';
    order.payment.onlineSubMethod = null;
    order.payment.status = 'PENDING';
    await order.save();

    return res.json({
      success: true,
      message: 'Successfully switched order payment method to Cash on Delivery (COD).',
      order
    });
  } catch (error) {
    console.error('[Switch to COD Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to switch payment method to COD.'
    });
  }
};

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.garment', 'name category iconName')
      .populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails')
      .populate('payment.collectedBy payment.reconciledBy', 'name phone email')
      .sort({ createdAt: -1 });

    // Auto-backfill OTPs if any legacy order is missing them
    for (const order of orders) {
      let needsSave = false;
      if (!order.verificationCodes) {
        order.verificationCodes = {};
        needsSave = true;
      }
      if (!order.verificationCodes.pickupOtp) {
        order.verificationCodes.pickupOtp = String(Math.floor(1000 + Math.random() * 9000));
        needsSave = true;
      }
      if (!order.verificationCodes.deliveryOtp) {
        order.verificationCodes.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
        needsSave = true;
      }
      if (needsSave) {
        await order.save();
      }
    }

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('[Get My Orders Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your orders.'
    });
  }
};

// @desc    Get logged-in user's active orders (non-delivered, non-cancelled)
// @route   GET /api/orders/my-active
// @access  Private
export const getMyActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.find({
      customer: req.user._id,
      orderStatus: { $nin: ['DELIVERED', 'CANCELLED'] }
    })
      .populate('items.garment', 'name category iconName imageUrl')
      .populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails')
      .populate('payment.collectedBy payment.reconciledBy', 'name phone email')
      .sort({ updatedAt: -1 });

    // Auto-backfill OTPs if any active order is missing them
    for (const order of activeOrders) {
      let needsSave = false;
      if (!order.verificationCodes) {
        order.verificationCodes = {};
        needsSave = true;
      }
      if (!order.verificationCodes.pickupOtp) {
        order.verificationCodes.pickupOtp = String(Math.floor(1000 + Math.random() * 9000));
        needsSave = true;
      }
      if (!order.verificationCodes.deliveryOtp) {
        order.verificationCodes.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
        needsSave = true;
      }
      if (needsSave) {
        await order.save();
      }
    }

    return res.json({
      success: true,
      count: activeOrders.length,
      activeOrders
    });
  } catch (error) {
    console.error('[Get My Active Orders Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active orders.'
    });
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.garment', 'name category iconName')
      .populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails')
      .populate('payment.collectedBy payment.reconciledBy', 'name phone email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Check authorization: customer owning order or admin/rider
    if (
      order.customer._id.toString() !== req.user._id.toString() &&
      !['admin', 'rider'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order.'
      });
    }

    return res.json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order details.'
    });
  }
};

// @desc    Get all orders (Admin & Rider ops)
// @route   GET /api/orders/all
// @access  Private (Admin / Rider)
export const getAllOrders = async (req, res) => {
  try {
    const { status, paymentStatus, date, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.orderStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      filter['payment.status'] = paymentStatus;
    }

    if (date) {
      filter.$or = [
        { 'pickupSchedule.date': date },
        { 'deliverySchedule.date': date }
      ];
    }

    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const matchingCustomers = await User.find({
        $or: [
          { name: { $regex: trimmedSearch, $options: 'i' } },
          { phone: { $regex: trimmedSearch, $options: 'i' } },
          { email: { $regex: trimmedSearch, $options: 'i' } }
        ]
      }).select('_id');
      const customerIds = matchingCustomers.map(c => c._id);

      const searchConditions = [
        { orderNumber: { $regex: trimmedSearch, $options: 'i' } },
        { 'logistics.bagTagId': { $regex: trimmedSearch, $options: 'i' } },
        { 'pickupAddress.contactPhone': { $regex: trimmedSearch, $options: 'i' } }
      ];

      if (customerIds.length > 0) {
        searchConditions.push({ customer: { $in: customerIds } });
      }

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails')
      .populate('payment.collectedBy payment.reconciledBy', 'name phone email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('[Get All Orders Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform orders.'
    });
  }
};

// @desc    Update order status and/or payment status (Admin & Rider)
// @route   PATCH /api/orders/:id/status
// @access  Private (Admin / Rider)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, transactionId, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
      if (orderStatus === 'CANCELLED') {
        if (order.payment?.status === 'PAID') {
          order.payment.status = 'REFUNDED';
        } else if (!paymentStatus) {
          order.payment.status = 'CANCELLED';
        }
        order.payment.reconciliationStatus = 'NOT_APPLICABLE';
      }
    }

    if (paymentStatus) {
      order.payment.status = paymentStatus;
      if (paymentStatus === 'PAID') {
        if (!order.payment.transactionId) {
          order.payment.transactionId = transactionId || `COD_COLLECTED_${Date.now()}`;
        }
        if (!order.payment.paidAt) {
          order.payment.paidAt = new Date();
        }
      }
    }

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: orderStatus || order.orderStatus,
      timestamp: new Date(),
      updatedBy: req.user._id,
      updaterRole: req.user.role,
      note: note || `Order status updated to ${orderStatus || order.orderStatus}`
    });

    await order.save();

    // Automatically notify customer of order status update
    Notification.createNotification({
      recipient: order.customer,
      title: 'Order Status Updated',
      message: `Your Order #${order.orderNumber} is now ${String(orderStatus || order.orderStatus).replace(/_/g, ' ')}.`,
      type: 'ORDER_UPDATE',
      orderId: order._id,
      orderNumber: order.orderNumber
    });

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('[Update Order Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status.'
    });
  }
};

// @desc    Get all registered riders
// @route   GET /api/orders/riders
// @access  Private (Admin only)
export const getRiders = async (req, res) => {
  try {
    const riders = await User.find({ role: 'rider' }).select('_id name phone email');
    return res.json({
      success: true,
      count: riders.length,
      riders
    });
  } catch (error) {
    console.error('[Get Riders Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve riders list.'
    });
  }
};

// @desc    Assign rider to an order (Decoupled Two-Leg: PICKUP vs DELIVERY vs BOTH)
// @route   PATCH /api/orders/:id/assign-rider
// @access  Private (Admin only)
export const assignRider = async (req, res) => {
  try {
    const riderId = req.body.riderId || req.body._id || req.body.id;
    const requestedLeg = (req.body.leg || '').toUpperCase();

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required.'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Determine target leg if not explicitly specified
    let targetLeg = requestedLeg;
    if (!targetLeg || !['PICKUP', 'DELIVERY', 'BOTH'].includes(targetLeg)) {
      const isDeliveryPhase = [
        'PICKED_UP',
        'IN_WASH',
        'IN_WASHING',
        'IN_IRONING',
        'QUALITY_CHECK',
        'READY',
        'OUT_FOR_DELIVERY'
      ].includes(order.orderStatus);

      targetLeg = isDeliveryPhase ? 'DELIVERY' : 'PICKUP';
    }

    let riderName = 'Rider';
    let rider = null;

    if (riderId === 'UNASSIGN' || riderId === 'NONE') {
      if (targetLeg === 'PICKUP' || targetLeg === 'BOTH') {
        order.logistics.pickupRider = null;
        order.logistics.pickupAssignedAt = null;
        if (order.pickupSchedule) order.pickupSchedule.assignedRider = null;
        if (order.orderStatus === 'PICKUP_ASSIGNED') order.orderStatus = 'BOOKED';
      }
      if (targetLeg === 'DELIVERY' || targetLeg === 'BOTH') {
        order.logistics.deliveryRider = null;
        order.logistics.deliveryAssignedAt = null;
        if (order.deliverySchedule) order.deliverySchedule.assignedRider = null;
        if (order.orderStatus === 'OUT_FOR_DELIVERY') order.orderStatus = 'READY';
      }
      riderName = 'Unassigned';
    } else {
      rider = await User.findOne({ _id: riderId, role: 'rider' });
      if (!rider) {
        return res.status(404).json({
          success: false,
          message: 'Rider not found or user is not a registered rider.'
        });
      }
      riderName = rider.name;
      const now = new Date();

      if (targetLeg === 'PICKUP') {
        order.logistics.pickupRider = rider._id;
        order.logistics.pickupAssignedAt = now;
        order.logistics.assignedRider = rider._id;
        if (order.pickupSchedule) {
          order.pickupSchedule.assignedRider = rider._id;
          order.pickupSchedule.assignedAt = now;
        }
        if (['BOOKED', 'ORDER_PLACED', 'CONFIRMED'].includes(order.orderStatus)) {
          order.orderStatus = 'PICKUP_ASSIGNED';
        }
      } else if (targetLeg === 'DELIVERY') {
        order.logistics.deliveryRider = rider._id;
        order.logistics.deliveryAssignedAt = now;
        order.logistics.assignedRider = rider._id;
        if (order.deliverySchedule) {
          order.deliverySchedule.assignedRider = rider._id;
          order.deliverySchedule.assignedAt = now;
        }
        if (['READY', 'QUALITY_CHECK'].includes(order.orderStatus)) {
          order.orderStatus = 'OUT_FOR_DELIVERY';
        }
      } else if (targetLeg === 'BOTH') {
        order.logistics.pickupRider = rider._id;
        order.logistics.pickupAssignedAt = now;
        order.logistics.deliveryRider = rider._id;
        order.logistics.deliveryAssignedAt = now;
        order.logistics.assignedRider = rider._id;
        if (order.pickupSchedule) {
          order.pickupSchedule.assignedRider = rider._id;
          order.pickupSchedule.assignedAt = now;
        }
        if (order.deliverySchedule) {
          order.deliverySchedule.assignedRider = rider._id;
          order.deliverySchedule.assignedAt = now;
        }
        if (['BOOKED', 'ORDER_PLACED', 'CONFIRMED'].includes(order.orderStatus)) {
          order.orderStatus = 'PICKUP_ASSIGNED';
        } else if (['READY', 'QUALITY_CHECK'].includes(order.orderStatus)) {
          order.orderStatus = 'OUT_FOR_DELIVERY';
        }
      }
    }

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      updatedBy: req.user._id,
      updaterRole: req.user.role,
      note: `${targetLeg === 'BOTH' ? 'Pickup & Delivery Rider' : targetLeg === 'DELIVERY' ? 'Delivery Rider' : 'Pickup Rider'} assigned: ${riderName}`
    });

    await order.save();
    await order.populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails');
    await order.populate('customer', 'name email phone');

    // Automatically notify customer of assigned rider
    if (rider) {
      const legLabel = targetLeg === 'DELIVERY' ? 'Doorstep Delivery' : 'Doorstep Pickup';
      Notification.createNotification({
        recipient: order.customer._id || order.customer,
        title: `Rider Assigned for ${legLabel}`,
        message: `Rider ${rider.name} (${rider.phone || 'Contact via app'}) has been assigned for ${legLabel.toLowerCase()} of your Order #${order.orderNumber}.`,
        type: 'RIDER_ASSIGNED',
        orderId: order._id,
        orderNumber: order.orderNumber
      });
    }

    return res.json({
      success: true,
      message: `Order assigned to rider ${riderName} for ${targetLeg} successfully.`,
      order
    });
  } catch (error) {
    console.error('[Assign Rider Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign rider to order.'
    });
  }
};

// @desc    Rider self-claims or accepts assigned task
// @route   POST /api/orders/:id/accept-task
// @access  Private (Rider & Admin)
export const acceptRiderTask = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const riderId = req.user._id;
    const now = new Date();
    const isDeliveryStage = ['READY', 'QUALITY_CHECK', 'OUT_FOR_DELIVERY'].includes(order.orderStatus);

    if (isDeliveryStage) {
      order.logistics.deliveryRider = riderId;
      order.logistics.deliveryAssignedAt = now;
      order.logistics.assignedRider = riderId;
      if (order.deliverySchedule) {
        order.deliverySchedule.assignedRider = riderId;
        order.deliverySchedule.assignedAt = now;
      }
      order.orderStatus = 'OUT_FOR_DELIVERY';
    } else {
      order.logistics.pickupRider = riderId;
      order.logistics.pickupAssignedAt = now;
      order.logistics.assignedRider = riderId;
      if (order.pickupSchedule) {
        order.pickupSchedule.assignedRider = riderId;
        order.pickupSchedule.assignedAt = now;
      }
      if (['BOOKED', 'ORDER_PLACED', 'CONFIRMED'].includes(order.orderStatus)) {
        order.orderStatus = 'PICKUP_ASSIGNED';
      }
    }

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: now,
      updatedBy: req.user._id,
      updaterRole: req.user.role,
      note: `Task accepted by Rider ${req.user.name} (${isDeliveryStage ? 'Delivery Leg' : 'Pickup Leg'})`
    });

    await order.save();
    await order.populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails');
    await order.populate('customer', 'name email phone');

    return res.json({
      success: true,
      message: `Task accepted successfully for ${isDeliveryStage ? 'Delivery' : 'Pickup'}!`,
      order
    });
  } catch (error) {
    console.error('[Accept Task Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept task.'
    });
  }
};

// @desc    Get tasks assigned to rider (or active logistics orders for admin)
// @route   GET /api/orders/rider-tasks
// @access  Private (Rider & Admin)
export const getRiderTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'rider') {
      filter.$or = [
        { 'logistics.assignedRider': req.user._id },
        { 'logistics.pickupRider': req.user._id },
        { 'logistics.deliveryRider': req.user._id }
      ];
    } else if (req.query.riderId) {
      filter.$or = [
        { 'logistics.assignedRider': req.query.riderId },
        { 'logistics.pickupRider': req.query.riderId },
        { 'logistics.deliveryRider': req.query.riderId }
      ];
    }

    if (!req.query.status) {
      filter.orderStatus = { $ne: 'CANCELLED' };
    } else if (req.query.status !== 'ALL') {
      filter.orderStatus = req.query.status;
    }

    // IMPORTANT SECURITY: Exclude OTPs from rider tasks response payload
    const tasks = await Order.find(filter)
      .select('-verificationCodes.pickupOtp -verificationCodes.deliveryOtp')
      .populate('customer', 'name email phone')
      .populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails')
      .populate('payment.collectedBy payment.reconciledBy', 'name phone email')
      .sort({ 'pickupSchedule.date': 1, 'deliverySchedule.date': 1, createdAt: -1 });

    const riderTargetId = req.user.role === 'rider' ? String(req.user._id) : (req.query.riderId ? String(req.query.riderId) : null);

    // Compute cashInHand, pendingHandoversCount, companyQrPaymentsCount for the rider
    let cashInHand = 0;
    let pendingHandoversCount = 0;
    let companyQrPaymentsCount = 0;

    if (riderTargetId) {
      // Find all delivered COD orders collected by this rider that are PENDING_CASH_HANDOVER
      const pendingCashOrders = await Order.find({
        'payment.collectedBy': riderTargetId,
        'payment.reconciliationStatus': 'PENDING_CASH_HANDOVER'
      }).select('pricingBreakdown payment');

      pendingCashOrders.forEach((o) => {
        cashInHand += (o.payment?.amountCollected || o.payment?.codAmount || o.pricingBreakdown?.grandTotal || 0);
        pendingHandoversCount += 1;
      });

      const qrOrders = await Order.countDocuments({
        'payment.collectedBy': riderTargetId,
        'payment.codCollectionMethod': { $in: ['COMPANY_QR', 'UPI_QR'] }
      });
      companyQrPaymentsCount = qrOrders;
    }

    // Explicit sanitize to guarantee zero OTP leakage & tag each order with currentRiderLeg
    const sanitizedTasks = tasks.map((t) => {
      const obj = t.toObject();
      if (obj.verificationCodes) {
        delete obj.verificationCodes.pickupOtp;
        delete obj.verificationCodes.deliveryOtp;
      }

      // Determine currentRiderLeg for this rider
      const status = obj.orderStatus;
      const isDelivered = status === 'DELIVERED';
      const isCancelled = status === 'CANCELLED';

      if (isDelivered || isCancelled) {
        obj.currentRiderLeg = 'COMPLETED';
      } else {
        const isDeliveryStage = ['READY', 'QUALITY_CHECK', 'OUT_FOR_DELIVERY'].includes(status);
        const isRiderDelivery = riderTargetId && (
          String(obj.logistics?.deliveryRider?._id || obj.logistics?.deliveryRider || '') === riderTargetId
        );
        const isRiderPickup = riderTargetId && (
          String(obj.logistics?.pickupRider?._id || obj.logistics?.pickupRider || '') === riderTargetId
        );

        if (isRiderDelivery && !isRiderPickup) {
          obj.currentRiderLeg = 'DELIVERY';
        } else if (isRiderPickup && !isRiderDelivery) {
          obj.currentRiderLeg = isDeliveryStage ? 'COMPLETED' : 'PICKUP';
        } else {
          obj.currentRiderLeg = isDeliveryStage ? 'DELIVERY' : 'PICKUP';
        }
      }

      return obj;
    });

    return res.json({
      success: true,
      count: sanitizedTasks.length,
      cashInHand,
      pendingHandoversCount,
      companyQrPaymentsCount,
      tasks: sanitizedTasks
    });
  } catch (error) {
    console.error('[Get Rider Tasks Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rider tasks.'
    });
  }
};

// @desc    Verify doorstep pickup with customer OTP, bag tagging, inspection notes
// @route   POST /api/orders/:id/verify-pickup
// @access  Private (Rider & Admin)
export const verifyPickup = async (req, res) => {
  try {
    const submittedOtp = String(req.body.otp || req.body.pickupOtp || '').trim();
    const { bagTagId, inspectionNotes, verifiedGarmentCount, inspectionPhotos } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Allow pickup verification when order is in any pre-pickup state
    const allowedPrePickupStates = [
      'BOOKED',
      'ORDER_PLACED',
      'CONFIRMED',
      'PICKUP_ASSIGNED',
      'PICKUP_SCHEDULED',
      'OUT_FOR_PICKUP'
    ];
    if (!allowedPrePickupStates.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot verify pickup for order in '${order.orderStatus}' status.`
      });
    }

    if (!bagTagId || typeof bagTagId !== 'string' || !bagTagId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Bag Tag ID is required at pickup.'
      });
    }

    const actualOtp = String(order.verificationCodes?.pickupOtp || order.pickupOtp || '').trim();
    if (!submittedOtp || submittedOtp !== actualOtp) {
      console.warn(`[Verify Pickup]: OTP mismatch for order ${order.orderNumber}. Submitted: "${submittedOtp}", Actual: "${actualOtp}"`);
      return res.status(400).json({
        success: false,
        message: `Invalid pickup verification OTP. Please request the 4-digit OTP shown for order ${order.orderNumber} on customer's screen.`
      });
    }

    const garmentTotal = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const countNumber = Number(verifiedGarmentCount) > 0 ? Number(verifiedGarmentCount) : garmentTotal;

    order.orderStatus = 'PICKED_UP';
    order.logistics.bagTagId = bagTagId.trim();
    order.logistics.inspectionNotes = inspectionNotes ? String(inspectionNotes).trim() : '';
    order.logistics.verifiedGarmentCount = countNumber;
    order.logistics.pickedUpAt = new Date();
    order.logistics.pickedUpBy = req.user._id;

    if (!order.logistics.pickupRider && req.user.role === 'rider') {
      order.logistics.pickupRider = req.user._id;
      order.logistics.pickupAssignedAt = new Date();
    }

    // Process inspection photos (Cloudinary Base64 or URL payloads)
    if (inspectionPhotos && Array.isArray(inspectionPhotos) && inspectionPhotos.length > 0) {
      const processedPhotos = [];
      for (const item of inspectionPhotos) {
        if (typeof item === 'string') {
          if (item.startsWith('data:') || item.length > 300) {
            const uploadRes = await uploadImageToCloudinary(item, 'indodhobi/inspections');
            const pUrl = uploadRes.url || uploadRes.imageUrl;
            processedPhotos.push({
              url: pUrl,
              imageUrl: pUrl,
              publicId: uploadRes.publicId || '',
              uploadedAt: new Date()
            });
          } else {
            processedPhotos.push({
              url: item,
              imageUrl: item,
              publicId: '',
              uploadedAt: new Date()
            });
          }
        } else if (item && typeof item === 'object') {
          if (item.imageBase64 || item.base64) {
            const uploadRes = await uploadImageToCloudinary(item.imageBase64 || item.base64, 'indodhobi/inspections');
            const pUrl = uploadRes.url || uploadRes.imageUrl;
            processedPhotos.push({
              url: pUrl,
              imageUrl: pUrl,
              publicId: uploadRes.publicId || '',
              uploadedAt: new Date()
            });
          } else {
            const pUrl = item.url || item.imageUrl || '';
            if (pUrl) {
              processedPhotos.push({
                url: pUrl,
                imageUrl: pUrl,
                publicId: item.publicId || '',
                uploadedAt: item.uploadedAt || new Date()
              });
            }
          }
        }
      }
      if (!order.logistics.inspectionPhotos) {
        order.logistics.inspectionPhotos = [];
      }
      order.logistics.inspectionPhotos.push(...processedPhotos);
    }

    if (!order.logistics.assignedRider && req.user.role === 'rider') {
      order.logistics.assignedRider = req.user._id;
    }

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: 'PICKED_UP',
      timestamp: new Date(),
      updatedBy: req.user._id,
      updaterRole: req.user.role,
      note: `Picked up with Bag Tag: ${bagTagId.trim()}. Verified garments: ${countNumber}`
    });

    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails');

    return res.json({
      success: true,
      message: 'Doorstep pickup successfully verified and logged with bag tag!',
      order
    });
  } catch (error) {
    console.error('[Verify Pickup Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify pickup.'
    });
  }
};

// @desc    Verify doorstep delivery with customer OTP, dynamic QR / cash collection & COD reconciliation
// @route   POST /api/orders/:id/verify-delivery
// @access  Private (Rider & Admin)
export const verifyDelivery = async (req, res) => {
  try {
    const submittedOtp = String(req.body.otp || req.body.deliveryOtp || '').trim();
    const { codCollectionMethod } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const actualOtp = String(order.verificationCodes?.deliveryOtp || order.deliveryOtp || '').trim();
    if (!submittedOtp || submittedOtp !== actualOtp) {
      console.warn(`[Verify Delivery]: OTP mismatch for order ${order.orderNumber}. Submitted: "${submittedOtp}", Actual: "${actualOtp}"`);
      return res.status(400).json({
        success: false,
        message: `Invalid delivery verification OTP. Please request the 4-digit OTP shown for order ${order.orderNumber} on customer's screen.`
      });
    }

    // If order is COD and payment is not PAID, enforce payment collection method
    if (order.payment?.method === 'COD' && order.payment?.status !== 'PAID') {
      const allowedMethods = ['CASH', 'COMPANY_QR', 'UPI_QR'];
      const rawMethod = typeof codCollectionMethod === 'string' ? codCollectionMethod.trim() : (req.body.paymentMethod || '');

      if (!rawMethod || !allowedMethods.includes(rawMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Valid COD collection method (CASH, COMPANY_QR, or UPI_QR) is required for unpaid orders.'
        });
      }

      const chosenMethod = rawMethod;
      const totalDue = order.payment.codAmount || order.pricingBreakdown?.grandTotal || 0;
      const now = new Date();
      order.payment.status = 'PAID';
      order.payment.paidAt = now;
      order.payment.amountCollected = totalDue;
      order.payment.collectedBy = req.user._id;
      order.payment.collectedAt = now;

      if (chosenMethod === 'CASH') {
        order.payment.codCollectionMethod = 'CASH';
        order.payment.onlineSubMethod = null;
        order.payment.reconciliationStatus = 'PENDING_CASH_HANDOVER';
        order.payment.transactionId = `COD_CASH_${Date.now()}`;
      } else if (chosenMethod === 'UPI_QR') {
        const utr = String(req.body.transactionReferenceId || req.body.utrNumber || req.body.utr || '').trim();
        order.payment.codCollectionMethod = 'UPI_QR';
        order.payment.onlineSubMethod = 'UPI';
        order.payment.transactionReferenceId = utr;
        order.payment.reconciliationStatus = 'PENDING_UTR_VERIFICATION';
        order.payment.transactionId = utr ? `UPI_UTR_${utr}` : `COD_UPI_QR_${Date.now()}`;
      } else if (chosenMethod === 'COMPANY_QR') {
        const utr = String(req.body.transactionReferenceId || req.body.utrNumber || req.body.utr || '').trim();
        order.payment.codCollectionMethod = 'COMPANY_QR';
        order.payment.onlineSubMethod = 'COMPANY_QR';
        order.payment.transactionReferenceId = utr;
        order.payment.reconciliationStatus = 'PENDING_UTR_VERIFICATION';
        order.payment.transactionId = utr ? `UPI_UTR_${utr}` : `COD_QR_${Date.now()}`;
      }
    }

    order.orderStatus = 'DELIVERED';
    order.logistics.deliveredAt = new Date();
    order.logistics.deliveredBy = req.user._id;

    if (!order.logistics.deliveryRider && req.user.role === 'rider') {
      order.logistics.deliveryRider = req.user._id;
      order.logistics.deliveryAssignedAt = new Date();
    }

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: 'DELIVERED',
      timestamp: new Date(),
      updatedBy: req.user._id,
      updaterRole: req.user.role,
      note: `Order delivered to customer. Payment status: ${order.payment.status}${order.payment.codCollectionMethod !== 'NONE' ? ` via ${order.payment.codCollectionMethod}` : ''}`
    });

    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails');
    await order.populate('payment.collectedBy payment.reconciledBy', 'name phone email');

    return res.json({
      success: true,
      message: 'Doorstep delivery verified successfully and payment settled!',
      order
    });
  } catch (error) {
    console.error('[Verify Delivery Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify delivery.'
    });
  }
};

// @desc    Reconcile COD payment or approve UTR reference (Admin only)
// @route   PATCH /api/orders/:id/reconcile-cod
// @access  Private (Admin only)
export const reconcileCodPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const { reconciliationStatus, notes, transactionReferenceId } = req.body;
    const now = new Date();

    order.payment.reconciliationStatus = reconciliationStatus || 'RECONCILED';
    order.payment.reconciledBy = req.user._id;
    order.payment.reconciledAt = now;

    if (notes !== undefined) {
      order.payment.reconciliationNotes = String(notes).trim();
    }
    if (transactionReferenceId) {
      order.payment.transactionReferenceId = String(transactionReferenceId).trim();
    }
    if (order.payment.status !== 'PAID') {
      order.payment.status = 'PAID';
      order.payment.paidAt = order.payment.paidAt || now;
    }

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: now,
      updatedBy: req.user._id,
      updaterRole: 'admin',
      note: `Admin reconciled payment. Status: ${order.payment.reconciliationStatus}. Notes: ${notes || 'None'}`
    });

    await order.save();
    await order.populate('logistics.assignedRider logistics.pickupRider logistics.deliveryRider', 'name phone email riderDetails');
    await order.populate('payment.collectedBy payment.reconciledBy', 'name phone email');

    return res.json({
      success: true,
      message: `Payment reconciliation updated to ${order.payment.reconciliationStatus} for Order #${order.orderNumber}.`,
      order
    });
  } catch (error) {
    console.error('[Reconcile COD Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to reconcile payment.' });
  }
};

// @desc    Get all active coupons
// @route   GET /api/orders/coupons
// @access  Public
export const getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ minOrderSubtotal: 1 });

    return res.json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    console.error('[Get Coupons Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active coupons.'
    });
  }
};

// @desc    Validate a promo coupon for a given cart subtotal
// @route   POST /api/orders/validate-coupon
// @access  Private
export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a coupon code.'
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon || !coupon.isActive || new Date() > coupon.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon code.'
      });
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (orderSubtotal < coupon.minOrderSubtotal) {
      return res.status(400).json({
        success: false,
        message: `Coupon requires a minimum subtotal of ₹${coupon.minOrderSubtotal}. Your current subtotal is ₹${orderSubtotal}.`
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((orderSubtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === 'FLAT') {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, orderSubtotal);

    return res.json({
      success: true,
      valid: true,
      code: coupon.code,
      discountAmount,
      description: coupon.description
    });
  } catch (error) {
    console.error('[Validate Coupon Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate coupon code.'
    });
  }
};

// @desc    Create a new coupon (Admin only)
// @route   POST /api/orders/coupons
// @access  Private/Admin
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderSubtotal,
      maxDiscountAmount,
      expiresAt
    } = req.body;

    if (!code || !description || !discountType || discountValue === undefined || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (code, description, discountType, discountValue, expiresAt).'
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Coupon code '${cleanCode}' already exists.`
      });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      description,
      discountType,
      discountValue: Number(discountValue),
      minOrderSubtotal: Number(minOrderSubtotal) || 0,
      maxDiscountAmount: maxDiscountAmount !== undefined && maxDiscountAmount !== null ? Number(maxDiscountAmount) : null,
      expiresAt: new Date(expiresAt)
    });

    return res.status(201).json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error('[Create Coupon Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create coupon.'
    });
  }
};

// @desc    Cancel an order before pickup (Customer or Admin)
// @route   POST /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Check authorization: Must be the customer who placed the order or an admin
    const isOwner = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this order.'
      });
    }

    // Cancellation is allowed strictly in BOOKED or PICKUP_ASSIGNED states
    const cancellableStatuses = ['BOOKED', 'PICKUP_ASSIGNED'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled after clothes have been picked up.'
      });
    }

    order.orderStatus = 'CANCELLED';

    // If payment was already collected, mark as REFUNDED, else mark as CANCELLED (no payment due)
    if (order.payment.status === 'PAID') {
      order.payment.status = 'REFUNDED';
    } else {
      order.payment.status = 'CANCELLED';
    }
    order.payment.reconciliationStatus = 'NOT_APPLICABLE';

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      updatedBy: req.user._id,
      updaterRole: req.user.role || 'customer',
      note: reason || 'Cancelled by customer before pickup'
    });

    await order.save();

    return res.json({
      success: true,
      message: 'Order cancelled successfully.',
      order
    });
  } catch (error) {
    console.error('[Cancel Order Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order.'
    });
  }
};

// @desc    Get all coupons including inactive (Admin only)
// @route   GET /api/orders/coupons/all
// @access  Private/Admin
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    console.error('[Get All Coupons Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve coupons.'
    });
  }
};

// @desc    Toggle coupon active status (Admin only)
// @route   PATCH /api/orders/coupons/:id/toggle
// @access  Private/Admin
export const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.json({
      success: true,
      message: `Coupon '${coupon.code}' is now ${coupon.isActive ? 'ACTIVE' : 'INACTIVE'}`,
      coupon
    });
  } catch (error) {
    console.error('[Toggle Coupon Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle coupon status.'
    });
  }
};

// @desc    Get comprehensive revenue & operational analytics (Admin only)
// @route   GET /api/orders/analytics
// @access  Private/Admin
export const getOrderAnalytics = async (req, res) => {
  try {
    const allOrders = await Order.find();

    let totalRevenue = 0;
    let settledRevenue = 0;
    let pendingCodRevenue = 0;
    let expressOrdersCount = 0;
    let activeOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;

    const statusBreakdown = {
      BOOKED: 0,
      PICKUP_ASSIGNED: 0,
      PICKED_UP: 0,
      IN_WASH: 0,
      IRONING: 0,
      QUALITY_CHECK: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0
    };

    allOrders.forEach((o) => {
      const grand = o.pricingBreakdown?.grandTotal || 0;
      const status = o.orderStatus;

      // Status breakdown
      if (statusBreakdown[status] !== undefined) {
        statusBreakdown[status] += 1;
      } else {
        statusBreakdown[status] = 1;
      }

      // Counts
      if (status === 'DELIVERED') {
        deliveredOrders += 1;
      } else if (status === 'CANCELLED') {
        cancelledOrders += 1;
      } else {
        activeOrders += 1;
      }

      if (o.isExpress) {
        expressOrdersCount += 1;
      }

      // Revenue: non-cancelled orders count towards total revenue
      if (status !== 'CANCELLED') {
        totalRevenue += grand;
      }

      // Settled revenue: strictly PAID orders
      if (o.payment?.status === 'PAID') {
        settledRevenue += grand;
      }

      // Pending COD revenue: COD method, PENDING status, and not cancelled
      if (
        o.payment?.method === 'COD' &&
        o.payment?.status === 'PENDING' &&
        status !== 'CANCELLED'
      ) {
        pendingCodRevenue += grand;
      }
    });

    return res.json({
      success: true,
      analytics: {
        totalOrders: allOrders.length,
        activeOrders,
        deliveredOrders,
        cancelledOrders,
        expressOrdersCount,
        totalRevenue,
        settledRevenue,
        pendingCodRevenue,
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('[Get Order Analytics Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute order analytics.'
    });
  }
};

