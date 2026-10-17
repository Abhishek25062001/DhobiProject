import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileBasket, pricingRulesSignature } from '../../shared/basketReconciliation.mjs';
import { couponQuote } from '../../shared/coupon.mjs';

const config = { freeDeliveryThreshold: 399, deliveryFee: 49, expressSurcharge: 99, gstPercentage: 0, serviceTypes: [{ code: 'WASH_AND_FOLD', isActive: true }, { code: 'DRY_CLEAN', isActive: true }], ironingTiers: [], detergentOptions: [{ code: 'standard', isActive: true, extraPricePerOrder: 0 }], packagingOptions: [] };
const garment = { _id: 'product', name: 'Shirt', isActive: true, allowedServices: ['WASH_AND_FOLD'], allowedIroningTiers: [], pricing: { washOnly: 35, standardSteamIron: 15, crispStarchPress: 25, delicatePress: 30, dryClean: 90 }, primaryImage: { asset: { url: '/before.png', version: 1 } } };
const item = { cartItemId: 'line', garment, quantity: 2, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE', unitPrice: 35, lineTotal: 70, isCustomItem: true, customDescription: 'Hand-sewn coat' };
test('T13 current product names, images and prices reconcile without losing custom details', () => {
  const changed = { ...garment, name: 'Updated shirt', primaryImage: null, pricing: { ...garment.pricing, washOnly: 45 } };
  const [fresh] = reconcileBasket([item], [changed], config);
  assert.equal(fresh.garment.name, 'Updated shirt'); assert.equal(fresh.garment.primaryImage, null);
  assert.equal(fresh.unitPrice, 45); assert.equal(fresh.lineTotal, 90);
  assert.equal(fresh.previousUnitPrice, 35); assert.equal(fresh.reviewRequired, true);
  assert.equal(fresh.customDescription, 'Hand-sewn coat'); assert.equal(fresh.cartItemId, 'line');
  assert.equal(item.unitPrice, 35);
  assert.equal(reconcileBasket([fresh], [changed], config)[0].reviewRequired, true);
});
test('T13 unavailable records remain recoverable and never silently switch service or finish', () => {
  for (const catalog of [[], [{ ...garment, allowedServices: [] }], [{ ...garment, isActive: false }]]) {
    const [fresh] = reconcileBasket([item], catalog, config);
    assert.ok(fresh.unavailableReason); assert.equal(fresh.serviceType, item.serviceType); assert.equal(fresh.quantity, 2);
  }
  assert.equal(reconcileBasket([item], [{ ...garment, name: 'Renamed' }], config)[0].reviewRequired, false);
});
test('T13 financial and availability rules alter the review signature while identity-only edits do not', () => {
  const original = pricingRulesSignature(config);
  assert.notEqual(pricingRulesSignature({ ...config, gstPercentage: 5 }), original);
  assert.notEqual(pricingRulesSignature({ ...config, detergentOptions: [] }), original);
  assert.equal(pricingRulesSignature({ ...config, businessName: 'Renamed company' }), original);
});
test('T13 coupons re-evaluate expiry, eligibility, subtotal and changed caps with shared precision', () => {
  const coupon = { code: 'SAVE', isActive: true, expiresAt: '2030-01-01', discountType: 'PERCENTAGE', discountValue: 12.34, minOrderSubtotal: 100, maxDiscountAmount: null };
  const now = Date.parse('2029-01-01');
  assert.equal(couponQuote(coupon, 100, now).discountAmount, 12.34);
  assert.equal(couponQuote(coupon, 200, now).discountAmount, 24.68);
  assert.equal(couponQuote({ ...coupon, maxDiscountAmount: 0 }, 200, now).discountAmount, 0);
  assert.equal(couponQuote(coupon, 99, now).valid, false);
  assert.equal(couponQuote({ ...coupon, isActive: false }, 200, now).valid, false);
  assert.equal(couponQuote(coupon, 200, Date.parse('2030-01-01')).valid, false);
});
