import Order from '../models/Order.js';
import { getRazorpayInstance } from '../utils/razorpay.js';
import { reconcilePayment, refundCancelledOrder, paymentError } from './payments.js';

export function holdDeadline(now = new Date()) {
  const minutes = Number(process.env.BOOKING_HOLD_MINUTES || 30);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) throw new Error('BOOKING_HOLD_MINUTES must be 5–1440.');
  return new Date(now.getTime() + minutes * 60000);
}
export async function expireBookingHolds(now = new Date()) {
  const legacyCutoff = new Date(now.getTime() - (holdDeadline(now) - now));
  return Order.updateMany({ 'payment.method': 'ONLINE', 'payment.status': { $nin: ['PAID', 'REFUNDED'] },
    orderStatus: { $in: ['BOOKED', 'ORDER_PLACED'] },
    $or: [{ holdExpiresAt: { $lte: now } }, { holdExpiresAt: null, createdAt: { $lte: legacyCutoff } }]
  }, { $set: { orderStatus: 'CANCELLED', 'payment.status': 'CANCELLED' }, $inc: { __v: 1 },
    $push: { statusHistory: { status: 'CANCELLED', timestamp: now, updaterRole: 'system', note: 'Payment reservation expired. Any later capture will be refunded.' } } });
}

export async function recoverPaymentSession(order, { gateway = getRazorpayInstance() } = {}) {
  if (order.payment.razorpayOrderId) return order;
  if (!['CREATING', 'UNKNOWN'].includes(order.payment.sessionState)) return order;
  if (!gateway) throw paymentError('Payment provider is unavailable.', 503);
  const response = await gateway.orders.all({ receipt: order.orderNumber, count: 100 });
  if (!Array.isArray(response?.items) || response.items.length >= 100) throw paymentError('Payment search is incomplete. Contact support.');
  const matches = response.items.filter(remote => remote.receipt === order.orderNumber);
  if (matches.length !== 1) throw paymentError('Payment session cannot be uniquely identified. Support must review the provider receipt.');
  const remote = matches[0];
  if (!remote.id || remote.currency !== 'INR' || remote.amount !== Math.round(order.pricingBreakdown.grandTotal * 100)) throw paymentError('Recovered payment amount or currency does not match.', 422);
  return await Order.findOneAndUpdate({ _id: order._id, 'payment.razorpayOrderId': null, 'payment.sessionState': { $in: ['CREATING', 'UNKNOWN'] } },
    { $set: { 'payment.razorpayOrderId': remote.id, 'payment.sessionState': 'READY' }, $inc: { __v: 1 },
      $push: { statusHistory: { status: order.orderStatus, timestamp: new Date(), updaterRole: 'system', note: 'Original payment session recovered from provider receipt.' } } }, { new: true }) || await Order.findById(order._id);
}

export async function runPaymentMaintenance({ gateway = getRazorpayInstance(), now = new Date(), limit = 100, log = console.log } = {}) {
  const expired = await expireBookingHolds(now);
  const records = await Order.find({ $or: [
    { 'payment.method': 'ONLINE', 'payment.status': { $nin: ['PAID', 'REFUNDED'] }, 'payment.razorpayOrderId': { $type: 'string' } },
    { 'payment.refundRequired': true }, { 'payment.sessionState': { $in: ['CREATING', 'UNKNOWN'] } }
  ] }).sort({ 'payment.lastCheckedAt': 1, _id: 1 }).limit(limit);
  let unresolved = 0;
  for (let order of records) {
    try {
      order = await recoverPaymentSession(order, { gateway });
      if (!order.payment.razorpayOrderId) throw paymentError('Provider session requires review.');
      if (!['PAID', 'REFUNDED'].includes(order.payment.status)) order = (await reconcilePayment(order, { gateway })).order;
      order = await refundCancelledOrder(order, { gateway });
      if (order.payment.refundRequired) { unresolved++; log(JSON.stringify({ event: 'payment_reconciliation_pending', orderId: String(order._id), refundState: order.payment.refundState })); }
    } catch (error) {
      unresolved++;
      log(JSON.stringify({ event: 'payment_reconciliation_pending', orderId: String(order._id), code: error.statusCode || 503 }));
    } finally {
      await Order.updateOne({ _id: order._id }, { $set: { 'payment.lastCheckedAt': now } }, { timestamps: false });
    }
  }
  const summary = { event: 'payment_maintenance', checked: records.length, expired: expired.modifiedCount, unresolved };
  log(JSON.stringify(summary));
  return summary;
}

export function startPaymentMaintenance(options = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runPaymentMaintenance(options); }
    catch (error) { console.error(JSON.stringify({ event: 'payment_maintenance_failed', error: error.name })); }
    finally { running = false; }
  };
  const timer = setInterval(tick, 60000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
