import { orderService } from '../services/api';
import toast from 'react-hot-toast';

// Helper to dynamically load the official Razorpay checkout script
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[Razorpay] Script failed to load from CDN.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Launch the official Razorpay Checkout Modal
export const launchRazorpayCheckout = async ({
  order,
  razorpayPayload,
  user,
  onSuccess,
  onDismiss,
  onFallback
}) => {
  const isLoaded = await loadRazorpayScript();

  if (!isLoaded || !window.Razorpay || razorpayPayload?.isSimulated) {
    if (onFallback) {
      onFallback();
      return;
    }
  }

  try {
    const key = razorpayPayload?.key_id || razorpayPayload?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!key || key.includes('placeholder')) {
      if (onFallback) return onFallback();
    }

    const options = {
      key,
      amount: razorpayPayload.amount || Math.round(order.pricingBreakdown.grandTotal * 100),
      currency: razorpayPayload.currency || 'INR',
      name: 'IndoDhobi',
      description: `Doorstep Laundry & Steam Ironing (Order #${order.orderNumber})`,
      order_id: razorpayPayload.id,
      image: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
      prefill: {
        name: user?.name || 'Customer',
        email: user?.email || '',
        contact: order.pickupAddress?.contactPhone || user?.phone || ''
      },
      theme: {
        color: '#4f46e5'
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true
      },
      config: {
        display: {
          blocks: {
            upiBlock: {
              name: 'Pay via UPI ID / QR',
              instruments: [
                { method: 'upi', flows: ['collect', 'qr', 'intent'] }
              ]
            },
            otherBlock: {
              name: 'Cards, NetBanking & Wallets',
              instruments: [
                { method: 'card' },
                { method: 'netbanking' },
                { method: 'wallet' }
              ]
            }
          },
          sequence: ['block.upiBlock', 'block.otherBlock'],
          preferences: { show_default_blocks: true }
        }
      },
      handler: async function (response) {
        try {
          const verifyPayload = {
            orderId: order._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            onlineSubMethod: 'RAZORPAY_CHECKOUT'
          };

          const verifyRes = await orderService.verifyPayment(verifyPayload);

          if (verifyRes.success) {
            toast.success('Payment verified & captured successfully!');
            if (onSuccess) {
              onSuccess(verifyRes.order || order);
            }
          } else {
            toast.error(verifyRes.message || 'Payment signature verification failed.');
          }
        } catch (err) {
          console.error('[Razorpay Verify Error]:', err);
          toast.error(err.response?.data?.message || 'Server error while verifying payment.');
        }
      },
      modal: {
        ondismiss: async function () {
          try {
            await orderService.recordPaymentFailure(order._id, {
              reason: 'User dismissed checkout modal',
              errorCode: 'MODAL_DISMISSED'
            });
          } catch {}
          toast('Payment dismissed. You can retry payment anytime from My Orders.', { icon: 'ℹ️' });
          if (onDismiss) {
            onDismiss();
          }
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', async function (response) {
      try {
        await orderService.recordPaymentFailure(order._id, {
          reason: response.error?.description || 'Transaction declined by bank/network',
          errorCode: response.error?.code || 'PAYMENT_FAILED',
          paymentId: response.error?.metadata?.payment_id
        });
      } catch {}
      toast.error(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
    });
    rzp.open();
  } catch (error) {
    console.error('[Razorpay Launch Error]:', error);
    if (onFallback) {
      onFallback();
    }
  }
};

export default launchRazorpayCheckout;
