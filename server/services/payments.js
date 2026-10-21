import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { createRazorpayOrder, getRazorpayInstance } from '../utils/razorpay.js';

export const paymentError = (message, statusCode = 409) => Object.assign(new Error(message), { statusCode });
const expectedAmount = order => Math.round(order.pricingBreakdown.grandTotal * 100);
export function validatePayment(order, payment) {
  if (!payment?.id || payment.order_id !== order.payment.razorpayOrderId || payment.amount !== expectedAmount(order) || payment.currency !== 'INR') {
    throw paymentError('Payment details do not match this order. Contact support.', 422);
  }
}

// All capture paths use the same transaction. Repeated/delayed callbacks are no-ops.
export async function applyCapturedPayment(orderId, payment) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw paymentError('Order not found.', 404);
      validatePayment(order, payment);
      if (payment.status !== 'captured' || payment.captured !== true) throw paymentError('Payment is awaiting capture. Check payment status before retrying.');
      if (['PAID', 'REFUNDED'].includes(order.payment.status)) {
        if (order.payment.razorpayPaymentId !== payment.id) throw paymentError('Another payment is already recorded. Contact support.');
        result = order; return;
      }
      if (order.holdExpiresAt && order.holdExpiresAt <= new Date() && ['BOOKED', 'ORDER_PLACED'].includes(order.orderStatus)) order.orderStatus = 'CANCELLED';
      order.payment.status = 'PAID';
      order.payment.transactionId = payment.id;
      order.payment.razorpayPaymentId = payment.id;
      order.payment.paidAt = new Date();
      order.payment.refundRequired = order.orderStatus === 'CANCELLED';
      order.statusHistory.push({ status: order.orderStatus, updaterRole: 'system', note: order.payment.refundRequired ? 'Payment captured after cancellation. Refund requires reconciliation.' : 'Payment capture verified with provider.' });
      await order.save({ session });
      result = order;
    });
  } finally { await session.endSession(); }
  return result;
}

export async function reconcilePayment(order, { gateway = getRazorpayInstance() } = {}) {
  if (!gateway) throw paymentError('Payment verification is unavailable. Please check again later; do not pay again.', 503);
  let remote, payments;
  try {
    [remote, payments] = await Promise.all([gateway.orders.fetch(order.payment.razorpayOrderId), gateway.orders.fetchPayments(order.payment.razorpayOrderId)]);
  } catch { throw paymentError('Payment status could not be verified. Please check again later; do not pay again.', 503); }
  if (remote.id !== order.payment.razorpayOrderId || remote.amount !== expectedAmount(order) || remote.currency !== 'INR' || !Array.isArray(payments?.items)) throw paymentError('Payment session does not match this order. Contact support.', 422);
  const captured = payments.items.find(p => p.status === 'captured');
  if (captured) return { order: await applyCapturedPayment(order._id, captured), razorpay: null };
  if (remote.status === 'paid' || payments.items.some(p => !['failed', 'refunded'].includes(p.status))) throw paymentError('Payment is awaiting verification. Please check again later; do not pay again.');
  if (payments.items.some(p => p.status === 'refunded')) throw paymentError('This payment was refunded. Contact support before paying again.');
  return { order, razorpay: { id: remote.id, amount: remote.amount, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID } };
}

export async function preparePayment(order, { gateway = getRazorpayInstance() } = {}) {
  if (order.holdExpiresAt && order.holdExpiresAt <= new Date() && order.payment.status !== 'PAID') throw paymentError('This booking reservation expired. Check My Orders before starting a new booking.');
  if (order.orderStatus === 'CANCELLED') throw paymentError('Cancelled orders cannot start a payment session.');
  if (['PAID', 'REFUNDED'].includes(order.payment.status)) return { order, razorpay: null };
  if (order.payment.razorpayOrderId) return reconcilePayment(order, { gateway });
  if (!gateway) throw paymentError('Online payment is unavailable. Your booking is saved; check My Orders.', 503);
  // A permanent claim is intentional: an unknown external outcome must NEVER be retried by creating another session.
  const claimed = await Order.findOneAndUpdate({ _id: order._id, __v: order.__v, orderStatus: { $ne: 'CANCELLED' }, 'payment.status': { $nin: ['PAID', 'REFUNDED'] }, 'payment.razorpayOrderId': null, 'payment.sessionState': { $in: [null, 'NONE'] } }, { $set: { 'payment.sessionState': 'CREATING', 'payment.method': 'ONLINE' }, $inc: { __v: 1 } }, { new: true });
  if (!claimed) throw paymentError('Payment setup is processing or needs verification. Check My Orders or contact support; do not start another booking.');
  try {
    const remote = await createRazorpayOrder(claimed.pricingBreakdown.grandTotal, claimed.orderNumber, { gateway });
    const saved = await Order.findOneAndUpdate({ _id: claimed._id, 'payment.sessionState': 'CREATING' }, { $set: { 'payment.razorpayOrderId': remote.id, 'payment.sessionState': 'READY' }, $inc: { __v: 1 } }, { new: true });
    if (!saved) throw new Error('Session persistence conflict');
    return { order: saved, razorpay: { ...remote, key_id: remote.keyId } };
  } catch {
    await Order.updateOne({ _id: claimed._id, 'payment.sessionState': 'CREATING' }, { $set: { 'payment.sessionState': 'UNKNOWN' }, $inc: { __v: 1 } });
    console.error(JSON.stringify({ event: 'payment_setup_requires_reconciliation', orderId: String(claimed._id), receipt: claimed.orderNumber }));
    throw paymentError('Payment setup outcome is uncertain. Your booking is saved. Contact support before trying another payment.', 503);
  }
}

export async function applyRefund(order, payment) {
  validatePayment(order, payment);
  if (payment.id !== order.payment.razorpayPaymentId || payment.status !== 'refunded' || payment.amount_refunded !== expectedAmount(order)) throw paymentError('Refund is not yet confirmed in full by the provider.');
  return await Order.findOneAndUpdate({ _id: order._id, 'payment.razorpayPaymentId': payment.id, 'payment.status': 'PAID' }, {
    $set: { 'payment.status': 'REFUNDED', 'payment.refundRequired': false, 'payment.refundState': 'PROCESSED' },
    $inc: { __v: 1 }, $push: { statusHistory: { status: order.orderStatus, timestamp: new Date(), updaterRole: 'system', note: 'Full refund verified with payment provider.' } }
  }, { new: true }) || await Order.findById(order._id);
}

// One durable refund claim. Ambiguous responses are reconciled, never blindly repeated.
export async function refundCancelledOrder(order, { gateway = getRazorpayInstance() } = {}) {
  if (order.orderStatus !== 'CANCELLED' || order.payment.method !== 'ONLINE' || order.payment.status !== 'PAID' || !order.payment.refundRequired) return order;
  if (!gateway) return order;
  const payment = await gateway.payments.fetch(order.payment.razorpayPaymentId);
  validatePayment(order, payment);
  if (payment.id !== order.payment.razorpayPaymentId) throw paymentError('Refund payment identity does not match.');
  if (payment.status === 'refunded') return applyRefund(order, payment);
  if (payment.status !== 'captured' || payment.amount_refunded > 0) throw paymentError('Refund needs provider reconciliation. Contact support.');
  const claimed = await Order.findOneAndUpdate({ _id: order._id, 'payment.status': 'PAID', 'payment.refundRequired': true, $or: [{ 'payment.refundState': { $in: [null, 'NONE'] } }, ...(gateway.refundIdempotent ? [
    { 'payment.refundState': 'UNKNOWN', 'payment.refundKey': { $type: 'string' } },
    { 'payment.refundState': 'CREATING', 'payment.refundKey': { $type: 'string' }, 'payment.refundClaimedAt': { $lt: new Date(Date.now() - 60000) } }
  ] : [])] }, { $set: { 'payment.refundState': 'CREATING', 'payment.refundKey': order.payment.refundKey || `refund_${order._id}`, 'payment.refundClaimedAt': new Date() }, $inc: { __v: 1 } }, { new: true });
  if (!claimed) return await Order.findById(order._id);
  try {
    const refund = gateway.refundIdempotent ? await gateway.refundIdempotent(payment.id, expectedAmount(order), claimed.payment.refundKey) : await gateway.payments.refund(payment.id, { amount: expectedAmount(order) });
    if (!refund?.id || refund.payment_id !== payment.id || refund.amount !== expectedAmount(order)) throw new Error('Invalid refund response');
    await Order.updateOne({ _id: order._id, 'payment.refundState': 'CREATING' }, { $set: { 'payment.refundId': refund.id, 'payment.refundState': 'PENDING' }, $inc: { __v: 1 } });
    // Fetch the actual payment; a submitted refund is not necessarily processed.
    const refreshed = await gateway.payments.fetch(payment.id);
    if (refreshed.status === 'refunded') return applyRefund(await Order.findById(order._id), refreshed);
  } catch {
    await Order.updateOne({ _id: order._id, 'payment.refundState': 'CREATING' }, { $set: { 'payment.refundState': 'UNKNOWN' }, $inc: { __v: 1 } });
    console.error(JSON.stringify({ event: 'refund_requires_reconciliation', orderId: String(order._id) }));
  }
  return await Order.findById(order._id);
}
