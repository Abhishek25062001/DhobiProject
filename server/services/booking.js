import { createHash } from 'node:crypto';
import { couponQuote } from '../../shared/coupon.mjs';
import ServiceArea from '../models/ServiceArea.js';
import mongoose from 'mongoose';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import PlatformConfig from '../models/PlatformConfig.js';
import TimeSlot from '../models/TimeSlot.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import { categoryForGarment } from './catalog.js';
import { calculateItemUnitPrice, calculateTotals, selectionAvailable, money } from '../../shared/pricing.mjs';

export function bookingError(message, statusCode = 400) { return Object.assign(new Error(message), { statusCode }); }
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function slotTime(date, hour) { return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+05:30`); }
export function couponDiscount(coupon, subtotal) {
  const result = couponQuote(coupon, subtotal);
  if (!result.valid) throw bookingError(result.message);
  return result.discountAmount;
}
export function quoteFingerprint(quote) {
  return createHash('sha256').update(JSON.stringify(quote)).digest('hex');
}

function requiredText(value, label, max = 300) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw bookingError(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
export async function quoteBooking(body, user, { now = new Date(), session = null } = {}) {
  const config = await PlatformConfig.findOne().session(session);
  if (!config) throw bookingError('Booking configuration is unavailable.', 503);
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw bookingError('Choose between 1 and 100 garment selections.');
  if (typeof body.isExpress !== 'undefined' && typeof body.isExpress !== 'boolean') throw bookingError('Express selection must be true or false.');
  if (!['COD', 'ONLINE'].includes(body.paymentMethod)) throw bookingError('Choose a supported payment method.');
  if (body.paymentMethod === 'COD' && config.companyPaymentConfig?.allowCashOnDelivery === false && config.companyPaymentConfig?.allowCompanyQrOnDelivery === false) throw bookingError('Payment on delivery is currently unavailable.');
  if (body.paymentMethod === 'ONLINE' && !['UPI', 'CARD', 'NET_BANKING', 'RAZORPAY_CHECKOUT'].includes(body.onlineSubMethod)) throw bookingError('Choose a supported online payment method.');
  const address = body.pickupAddress || {};
  const pickupAddress = {
    flatAndBuilding: requiredText(address.flatAndBuilding, 'Flat and building'),
    streetAndLandmark: requiredText(address.streetAndLandmark, 'Street and landmark'),
    city: requiredText(address.city, 'City', 100),
    pincode: requiredText(address.pincode, 'Pincode', 6),
    contactPhone: requiredText(address.contactPhone || user.phone, 'Contact phone', 20),
  };
  if (!/^[1-9]\d{5}$/.test(pickupAddress.pincode)) throw bookingError('Enter a valid six-digit pincode.');
  if (!/^\+?[\d\s()-]{10,20}$/.test(pickupAddress.contactPhone) || !/^(91)?[6-9]\d{9}$/.test(pickupAddress.contactPhone.replace(/\D/g, ''))) throw bookingError('Enter a valid contact phone.');
  const coverage = await ServiceArea.findOne({ isActive: true, pincodes: pickupAddress.pincode }).session(session).lean();
  if (!coverage) throw bookingError('Pickup is not currently available for this pincode. Check service areas or choose another address.');
  const preferences = { specialInstructions: body.preferences?.specialInstructions ?? '' };
  if (typeof preferences.specialInstructions !== 'string' || preferences.specialInstructions.length > 2000) throw bookingError('Special instructions must be at most 2000 characters.');
  const preferenceLabels = {};
  for (const [key, list] of [['detergentType', 'detergentOptions'], ['packagingType', 'packagingOptions']]) {
    const selected = config[list].find(option => option.isActive && option.code === body.preferences?.[key]);
    if (!selected) throw bookingError(`Choose an available ${key === 'detergentType' ? 'detergent' : 'packaging'} option.`);
    preferences[key] = selected.code;
    preferenceLabels[`${key}Label`] = selected.name;
  }
  const schedules = {};
  const slotSnapshots = {};
  for (const leg of ['pickupSchedule', 'deliverySchedule']) {
    const selected = body[leg];
    if (!validDate(selected?.date) || typeof selected?.timeSlot !== 'string') throw bookingError('Select valid pickup and delivery dates and slots.');
    const slot = await TimeSlot.findOne({ label: selected.timeSlot, isActive: true }).session(session);
    if (!slot) throw bookingError('The selected time slot is no longer available.');
    if (slotTime(selected.date, slot.startHour) <= now) throw bookingError('The selected time slot has already started.');
    const count = await Order.countDocuments({ [`${leg}.date`]: selected.date, [`${leg}.timeSlot`]: slot.label, orderStatus: { $ne: 'CANCELLED' } }).session(session);
    if (count >= slot.maxCapacity) throw bookingError('The selected time slot is fully booked.');
    schedules[leg] = { date: selected.date, timeSlot: slot.label };
    slotSnapshots[leg] = { slotId: slot._id, startHour: slot.startHour, endHour: slot.endHour };
  }
  const minimumHours = body.isExpress ? config.expressTurnaroundHours : config.minStandardTurnaroundHours;
  const interval = slotTime(schedules.deliverySchedule.date, slotSnapshots.deliverySchedule.startHour) - slotTime(schedules.pickupSchedule.date, slotSnapshots.pickupSchedule.endHour);
  if (interval < minimumHours * 3600000 || interval <= 0) throw bookingError(`Delivery must be at least ${minimumHours} hours after the pickup window ends.`);
  const categories = await Category.find().session(session).lean();
  const ids = body.items.map(item => item?.garmentId || item?.garment);
  if (ids.some(id => typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id))) throw bookingError('Choose a valid garment.');
  const garments = new Map((await Garment.find({ _id: { $in: ids } }).session(session)).map(item => [String(item._id), item]));
  const items = [];
  for (const item of body.items) {
    const id = item?.garmentId || item?.garment;
    if (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id)) throw bookingError('Choose a valid garment.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw bookingError('Quantity must be a whole number between 1 and 999.');
    const garment = garments.get(id);
    const category = garment && categoryForGarment(garment, categories);
    if (!garment?.isActive || !category?.isActive) throw bookingError('This garment or category is no longer available. Refresh your basket.');
    if (!selectionAvailable(garment, config, item.serviceType, item.ironingType)) throw bookingError('The selected service or finish is unavailable for this garment.');
    if (item.isCustomItem !== undefined && Boolean(item.isCustomItem) !== garment.isCustom) throw bookingError('Custom items must use the configured custom garment.');
    const customDescription = garment.isCustom ? requiredText(item.customDescription, 'Custom garment description', 1000) : '';
    const unitPrice = calculateItemUnitPrice(garment, item.serviceType, item.ironingType);
    items.push({ garment: garment._id, garmentName: garment.name, category: category.name, categoryId: category._id, quantity: item.quantity,
      serviceType: item.serviceType, serviceLabel: config.serviceTypes.find(option => option.code === item.serviceType).name,
      ironingType: item.ironingType, ironingLabel: config.ironingTiers.find(option => option.code === item.ironingType)?.name || '',
      unitPrice, lineTotal: money(unitPrice * item.quantity), customDescription, isCustomItem: garment.isCustom,
      catalogUpdatedAt: garment.updatedAt,
    });
  }
  const subtotal = calculateTotals({ items, config }).subtotal;
  let coupon = null;
  let discountAmount = 0;
  if (body.couponCode !== undefined && body.couponCode !== null && typeof body.couponCode !== 'string') throw bookingError('Invalid coupon code.');
  if (body.couponCode?.trim()) {
    coupon = await Coupon.findOne({ code: body.couponCode.trim().toUpperCase() }).session(session);
    discountAmount = couponDiscount(coupon, subtotal);
  }
  const totals = calculateTotals({ items, config, preferences, isExpress: Boolean(body.isExpress), discountAmount, couponCode: coupon?.code || null });
  const billingSnapshot = Object.fromEntries(['businessName', 'gstin', 'sacCode', 'supportPhone', 'supportEmail', 'businessAddress', 'gstPercentage', 'freeDeliveryThreshold', 'deliveryFee', 'expressSurcharge', 'minStandardTurnaroundHours', 'expressTurnaroundHours'].map(key => [key, config[key]]));
  return { items, preferences: { ...preferences, ...preferenceLabels }, pickupAddress, ...schedules,
    pricingBreakdown: { ...totals, gstPercentage: config.gstPercentage },
    billingSnapshot: { ...billingSnapshot, coverage: { areaId: coverage._id, name: coverage.name, pincode: pickupAddress.pincode, revision: coverage.revision, timezone: coverage.timezone }, configId: config._id, configUpdatedAt: config.updatedAt, ...slotSnapshots, couponUpdatedAt: coupon?.updatedAt || null },
    customerSnapshot: { name: user.name, email: user.email, phone: user.phone }, isExpress: Boolean(body.isExpress),
  };
}
