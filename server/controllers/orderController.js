import Order from '../models/Order.js';
import Garment from '../models/Garment.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../utils/razorpay.js';

const STANDARD_SLOTS = [
  { slot: '08:00 AM - 10:00 AM', maxCapacity: 15 },
  { slot: '10:00 AM - 01:00 PM', maxCapacity: 20 },
  { slot: '02:00 PM - 05:00 PM', maxCapacity: 20 },
  { slot: '06:00 PM - 09:00 PM', maxCapacity: 15 }
];

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

    // Count existing pickup and delivery bookings for each slot on this date
    const ordersOnDate = await Order.find({
      $or: [
        { 'pickupSchedule.date': date },
        { 'deliverySchedule.date': date }
      ],
      orderStatus: { $ne: 'CANCELLED' }
    });

    const slotAvailability = STANDARD_SLOTS.map(({ slot, maxCapacity }) => {
      const bookedCount = ordersOnDate.filter(
        (o) =>
          (o.pickupSchedule.date === date && o.pickupSchedule.timeSlot === slot) ||
          (o.deliverySchedule.date === date && o.deliverySchedule.timeSlot === slot)
      ).length;

      const remaining = Math.max(0, maxCapacity - bookedCount);
      return {
        slot,
        maxCapacity,
        bookedCount,
        remainingCapacity: remaining,
        isAvailable: remaining > 0
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
      onlineSubMethod
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

    // 2. Validate Turnaround: Delivery must be on or after pickup date
    const pickupDateObj = new Date(pickupSchedule.date);
    const deliveryDateObj = new Date(deliverySchedule.date);

    if (deliveryDateObj < pickupDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Delivery date cannot be earlier than pickup date.'
      });
    }

    if (
      pickupSchedule.date === deliverySchedule.date &&
      pickupSchedule.timeSlot === deliverySchedule.timeSlot
    ) {
      return res.status(400).json({
        success: false,
        message: 'Delivery slot must be scheduled after the pickup slot.'
      });
    }

    // 3. Server-side item pricing calculation
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
        lineTotal
      });
    }

    // 4. Delivery fee & Tax calculation (Free delivery >= ₹399, otherwise ₹49; 5% GST)
    const pickupDeliveryFee = subtotal >= 399 ? 0 : 49;
    const expressSurcharge = 0;
    const taxableBase = subtotal + pickupDeliveryFee + expressSurcharge;
    const taxAmount = Math.round(taxableBase * 0.05 * 100) / 100; // 5% GST
    const grandTotal = Math.round(taxableBase + taxAmount);

    // 5. Generate unique Indian Order ID
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `IDB-${year}-${randomSuffix}`;

    // 6. Handle Payment setup
    const isOnline = paymentMethod === 'ONLINE';
    let paymentData = {
      method: isOnline ? 'ONLINE' : 'COD',
      onlineSubMethod: isOnline ? (onlineSubMethod || 'UPI') : null,
      status: 'PENDING',
      transactionId: null,
      razorpayOrderId: null
    };

    let razorpayPayload = null;

    if (isOnline) {
      const rzOrder = await createRazorpayOrder(grandTotal, orderNumber);
      paymentData.razorpayOrderId = rzOrder.id;
      razorpayPayload = rzOrder;
    }

    // 7. Save order
    const order = await Order.create({
      orderNumber,
      customer: req.user._id,
      items: processedItems,
      preferences: {
        detergentType: preferences?.detergentType || 'Standard',
        packagingType: preferences?.packagingType || 'Folded',
        specialInstructions: preferences?.specialInstructions || ''
      },
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
        pickupDeliveryFee,
        expressSurcharge,
        taxAmount,
        grandTotal
      },
      payment: paymentData,
      orderStatus: 'BOOKED'
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

// @desc    Mark an online order as PAID via Razorpay / Simulated Gateway
// @route   POST /api/orders/:id/pay-online
// @access  Private
export const payOnlineOrder = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, onlineSubMethod } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Customer or admin check
    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update payment for this order.'
      });
    }

    const orderIdToVerify = razorpay_order_id || order.payment.razorpayOrderId || `order_sim_${Date.now()}`;
    const paymentIdToVerify = razorpay_payment_id || `pay_sim_${Date.now()}`;

    // Verify signature
    const isValid = verifyRazorpaySignature(orderIdToVerify, paymentIdToVerify, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid cryptographic signature.'
      });
    }

    order.payment.status = 'PAID';
    order.payment.transactionId = paymentIdToVerify;
    order.payment.razorpayPaymentId = paymentIdToVerify;
    order.payment.onlineSubMethod = onlineSubMethod || order.payment.onlineSubMethod || 'UPI';

    await order.save();

    return res.json({
      success: true,
      message: 'Payment verified and captured successfully!',
      order
    });
  } catch (error) {
    console.error('[Pay Online Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process online payment.'
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
      .sort({ createdAt: -1 });

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

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.garment', 'name category iconName');

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

    if (search) {
      filter.orderNumber = { $regex: search, $options: 'i' };
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
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
    const { orderStatus, paymentStatus, transactionId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      order.payment.status = paymentStatus;
      if (paymentStatus === 'PAID' && !order.payment.transactionId) {
        order.payment.transactionId = transactionId || `COD_COLLECTED_${Date.now()}`;
      }
    }

    await order.save();

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
