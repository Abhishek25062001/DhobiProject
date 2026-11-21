// Converts between the browser bag (full garment objects, prices) and the server's saved bag
// (garment ids only). Pure functions so they can be unit tested with node --test.
import { calculateItemUnitPrice, money } from '../../../shared/pricing.mjs';

export function bagPayload(cartItems = []) {
  return cartItems.filter(item => item?.garment?._id).map(item => ({
    cartItemId: item.cartItemId || '',
    garmentId: String(item.garment._id),
    quantity: item.quantity,
    serviceType: item.serviceType,
    ironingType: item.ironingType || 'NONE',
    isCustomItem: Boolean(item.isCustomItem),
    customDescription: item.isCustomItem ? item.customDescription || '' : '',
  }));
}

/** Rebuild browser bag lines from a saved bag using the current catalogue; unknown garments are dropped. */
export function cartFromSavedBag(savedItems = [], garments = []) {
  const byId = new Map(garments.map(garment => [String(garment._id), garment]));
  return savedItems.flatMap(item => {
    const garment = byId.get(String(item.garmentId));
    if (!garment) return [];
    const isCustomItem = Boolean(item.isCustomItem || garment.isCustom);
    const unitPrice = calculateItemUnitPrice(garment, item.serviceType, item.ironingType || 'NONE');
    return [{
      cartItemId: isCustomItem ? item.cartItemId || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` : garment._id,
      garment,
      quantity: item.quantity,
      serviceType: item.serviceType,
      ironingType: item.ironingType || 'NONE',
      unavailableReason: '',
      unitPrice,
      lineTotal: money(unitPrice * item.quantity),
      isCustomItem,
      customDescription: isCustomItem ? item.customDescription || '' : '',
    }];
  });
}
