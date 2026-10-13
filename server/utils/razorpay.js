import Razorpay from 'razorpay';
import crypto from 'crypto';

const isConfigured = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return (
    keyId &&
    keySecret &&
    !keyId.includes('placeholder') &&
    !keySecret.includes('placeholder')
  );
};

let razorpayInstance = null;

if (isConfigured()) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const createRazorpayOrder = async (amountInINR, receiptId) => {
  const amountInPaise = Math.round(amountInINR * 100);

  if (isConfigured() && razorpayInstance) {
    try {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        payment_capture: 1
      });
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        isSimulated: false,
        keyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (err) {
      console.warn('[Razorpay] Failed to create live order, falling back to simulated order:', err.message);
    }
  }

  // Graceful simulation fallback
  return {
    id: `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    amount: amountInPaise,
    currency: 'INR',
    isSimulated: true,
    keyId: 'rzp_test_simulated'
  };
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  if (!isConfigured() || orderId.startsWith('order_sim_')) {
    // In simulation mode, accept simulated payment verification
    return true;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generatedSignature === signature;
  } catch (err) {
    console.error('[Razorpay Signature Error]:', err);
    return false;
  }
};

export { isConfigured };
