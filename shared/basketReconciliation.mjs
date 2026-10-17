import { calculateItemUnitPrice, money, selectionAvailable } from './pricing.mjs';

export function reconcileBasket(items, garments, config) {
  return items.map(item => {
    const garment = garments.find(candidate => candidate._id === item.garment?._id);
    if (!garment || !selectionAvailable(garment, config, item.serviceType, item.ironingType)) return { ...item, garment: garment || { ...item.garment, primaryImage: null }, unavailableReason: 'This garment, service or finish is no longer available. Remove it or choose an available option.' };
    const unitPrice = calculateItemUnitPrice(garment, item.serviceType, item.ironingType);
    const changed = unitPrice !== item.unitPrice;
    return { ...item, garment, unitPrice, lineTotal: money(unitPrice * item.quantity), unavailableReason: '',
      reviewRequired: Boolean(item.reviewRequired || changed), previousUnitPrice: item.reviewRequired ? item.previousUnitPrice : changed ? item.unitPrice : undefined };
  });
}
export function pricingRulesSignature(config) {
  if (!config) return '';
  return JSON.stringify({
    rules: Object.fromEntries(['freeDeliveryThreshold', 'deliveryFee', 'expressSurcharge', 'gstPercentage', 'minStandardTurnaroundHours', 'expressTurnaroundHours'].map(key => [key, config[key]])),
    options: Object.fromEntries(['serviceTypes', 'ironingTiers', 'detergentOptions', 'packagingOptions'].map(key => [key, (config[key] || []).map(option => ({ code: option.code, isActive: option.isActive, extraPricePerOrder: option.extraPricePerOrder }))])),
  });
}
