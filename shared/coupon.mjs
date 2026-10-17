import { money } from './pricing.mjs';

export function couponQuote(coupon, subtotal, now = Date.now()) {
  if (!coupon || !coupon.isActive || !Number.isFinite(Date.parse(coupon.expiresAt)) || now >= Date.parse(coupon.expiresAt)) return { valid: false, discountAmount: 0, message: 'Invalid or expired coupon code.' };
  if (subtotal < coupon.minOrderSubtotal) return { valid: false, discountAmount: 0, message: `Coupon requires a minimum subtotal of ₹${coupon.minOrderSubtotal}.` };
  let discount = coupon.discountType === 'PERCENTAGE' ? money(subtotal * coupon.discountValue / 100) : money(coupon.discountValue);
  if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) discount = Math.min(discount, money(coupon.maxDiscountAmount));
  return { valid: true, discountAmount: money(Math.min(discount, subtotal)), code: coupon.code, description: coupon.description };
}
