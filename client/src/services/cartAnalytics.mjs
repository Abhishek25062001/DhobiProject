// Pure helpers that turn laundry-bag state changes into analytics events.
// Kept free of React/browser imports so they can be unit tested with node --test.

const round = value => Math.round((Number(value) || 0) * 100) / 100;
export const cartLineKey = item => item?.cartItemId || item?.garment?._id || '';

export function cartSummary(items = []) {
  return {
    cartValue: round(items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0)),
    cartItems: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    cartLines: items.length,
  };
}

// Product properties only: custom garment descriptions are typed by customers and are never sent.
export function productProps(item) {
  const garment = item?.garment || {};
  const isCustom = Boolean(item?.isCustomItem || garment.isCustom);
  return {
    productId: String(garment._id || ''),
    productName: isCustom ? 'Custom item' : String(garment.name || '').slice(0, 80),
    category: String(garment.category || '').slice(0, 60),
    serviceType: item?.serviceType || '',
    ironingType: item?.ironingType || '',
    unitPrice: round(item?.unitPrice),
    isCustom,
  };
}

/**
 * Compare two bag snapshots and describe what the customer changed.
 * Returns [{ type: 'add' | 'remove' | 'option', item, quantity }].
 */
export function diffCart(previous = [], next = []) {
  const before = new Map(previous.map(item => [cartLineKey(item), item]));
  const after = new Map(next.map(item => [cartLineKey(item), item]));
  const changes = [];
  for (const [key, item] of after) {
    const old = before.get(key);
    const delta = (item.quantity || 0) - (old?.quantity || 0);
    if (delta > 0) changes.push({ type: 'add', item, quantity: delta });
    else if (delta < 0) changes.push({ type: 'remove', item, quantity: -delta });
    if (old && (old.serviceType !== item.serviceType || old.ironingType !== item.ironingType)) changes.push({ type: 'option', item, quantity: 0, from: { serviceType: old.serviceType, ironingType: old.ironingType } });
  }
  for (const [key, item] of before) if (!after.has(key)) changes.push({ type: 'remove', item, quantity: item.quantity || 0 });
  return changes;
}
