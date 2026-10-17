export const BOOKING_DRAFT_KEY = 'indodhobi_draft_booking';

export function readBookingDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(BOOKING_DRAFT_KEY) || '{}');
    return draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : {};
  } catch {
    return {};
  }
}

export function readDraftCart(draft) {
  if (!Array.isArray(draft.cartItems)) return [];
  return draft.cartItems.filter(item => item?.garment?._id && item.garment.pricing && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 999 && Number.isFinite(item.unitPrice) && item.unitPrice >= 0 && Number.isFinite(item.lineTotal) && item.lineTotal >= 0);
}

export function saveBookingDraft(fields) {
  try {
    const previous = readBookingDraft();
    // A completed booking removes its draft. Clearing that cart must not recreate it.
    if (!sessionStorage.getItem(BOOKING_DRAFT_KEY) && !fields.cartItems?.length) return;
    sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ ...previous, ...fields }));
  } catch {
    // The current basket remains usable when browser storage is unavailable.
  }
}
