import { GARMENT_PRICE_KEYS, SERVICE_CODES } from './catalogContract.mjs';

export const IRONING_PRICE_KEYS = Object.freeze({ STANDARD_STEAM: 'standardSteamIron', CRISP_STARCH: 'crispStarchPress', DELICATE_PRESS: 'delicatePress' });
export function cents(value) {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER / 100) throw new Error('Amounts must be finite, non-negative numbers.');
  return Math.round((value + Number.EPSILON) * 100);
}
export const money = value => cents(value) / 100;
export function calculateItemUnitPrice(garment, service, finish = 'NONE') {
  if (!garment?.pricing || !SERVICE_CODES.includes(service)) throw new Error('Unknown garment or service.');
  for (const key of GARMENT_PRICE_KEYS) cents(garment.pricing[key]);
  const price = garment.pricing;
  const iron = finish === 'NONE' ? 0 : price[IRONING_PRICE_KEYS[finish]];
  if (iron === undefined) throw new Error('Unknown ironing finish.');
  if (service === 'WASH_AND_FOLD') return money(price.washOnly);
  if (service === 'DRY_CLEAN') return money(price.dryClean);
  if (service === 'WASH_AND_IRON') return (cents(price.washOnly) + cents(iron)) / 100;
  return money(iron);
}
const sortedActive = options => (options || []).filter(option => option.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
export function availableFinishes(garment, config) {
  return sortedActive(config?.ironingTiers).filter(tier => (garment.allowedIroningTiers || []).includes(tier.code));
}
export function availableServices(garment, config) {
  return sortedActive(config?.serviceTypes).filter(service => (garment.allowedServices || []).includes(service.code) &&
    (!['WASH_AND_IRON', 'IRON_ONLY'].includes(service.code) || availableFinishes(garment, config).length > 0));
}
export function selectionAvailable(garment, config, service, finish) {
  if (garment.isActive === false || !availableServices(garment, config).some(option => option.code === service)) return false;
  return ['WASH_AND_IRON', 'IRON_ONLY'].includes(service)
    ? availableFinishes(garment, config).some(option => option.code === finish)
    : finish === 'NONE';
}
export function preferredFinish(garment, config, service, requested) {
  if (!['WASH_AND_IRON', 'IRON_ONLY'].includes(service)) return 'NONE';
  const options = availableFinishes(garment, config);
  return options.find(option => option.code === requested)?.code || options[0]?.code || 'NONE';
}
export function calculateTotals({ items, config, preferences = {}, isExpress = false, discountAmount = 0, couponCode = null }) {
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw new Error('Quantity must be a whole number between 1 and 999.');
  }
  const subtotalCents = items.reduce((sum, item) => sum + cents(item.unitPrice) * item.quantity, 0);
  if (!Number.isSafeInteger(subtotalCents)) throw new Error('Order amount is too large.');
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const threshold = cents(config.freeDeliveryThreshold);
  const delivery = itemCount && subtotalCents < threshold ? cents(config.deliveryFee) : 0;
  const express = itemCount && isExpress ? cents(config.expressSurcharge) : 0;
  let extra = 0;
  for (const [selection, options] of [['detergentType', 'detergentOptions'], ['packagingType', 'packagingOptions']]) {
    const option = config[options]?.find(entry => entry.code === preferences[selection] && entry.isActive !== false);
    if (itemCount && option) extra += cents(option.extraPricePerOrder);
  }
  const discount = Math.min(subtotalCents, cents(discountAmount));
  if (!Number.isFinite(config.gstPercentage) || config.gstPercentage < 0 || config.gstPercentage > 100) throw new Error('Invalid GST rate.');
  const taxable = subtotalCents - discount + delivery + express + extra;
  const tax = Math.round(taxable * config.gstPercentage / 100);
  return { subtotal: subtotalCents / 100, itemCount, pickupDeliveryFee: delivery / 100, expressSurcharge: express / 100,
    extraPreferenceFee: extra / 100, discountAmount: discount / 100, couponCode, taxAmount: tax / 100,
    grandTotal: (taxable + tax) / 100, amountNeededForFreeDelivery: Math.max(0, threshold - subtotalCents) / 100 };
}

export function serviceFromPrice(garments, config, service, finish) {
  const eligible = garments.filter(garment => !garment.isCustom && selectionAvailable(garment, config, service, finish));
  return eligible.length ? Math.min(...eligible.map(garment => calculateItemUnitPrice(garment, service, finish))) : null;
}
