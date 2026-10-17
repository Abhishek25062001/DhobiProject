import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const isConfigured = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes('placeholder') &&
    !keySecret.includes('placeholder')
  );
};

let razorpayInstance = null;

export const getRazorpayInstance = () => {
  if (isConfigured()) {
    if (!razorpayInstance) {
      razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
    return razorpayInstance;
  }
  return null;
};

export const createRazorpayOrder = async (amountInINR, receiptId, { gateway = getRazorpayInstance() } = {}) => {
  if (!gateway) throw Object.assign(new Error('Online payment is currently unavailable. Choose an available payment method or try again later.'), { statusCode: 503 });
  try {
    const amount = Math.round(amountInINR * 100);
    const order = await gateway.orders.create({ amount, currency: 'INR', receipt: receiptId, payment_capture: 1 });
    if (!order?.id || order.amount !== amount || order.currency !== 'INR') throw new Error('Invalid gateway response');
    return { id: order.id, amount: order.amount, currency: order.currency, isSimulated: false, keyId: process.env.RAZORPAY_KEY_ID };
  } catch {
    throw Object.assign(new Error('Online payment could not be started. Please try again later.'), { statusCode: 503 });
  }
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
};

export default {
  isConfigured,
  getRazorpayInstance,
  createRazorpayOrder,
  verifyRazorpaySignature
};
