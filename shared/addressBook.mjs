export const ADDRESS_LABELS = ['Home', 'Work', 'Other'];
export const ADDRESS_FIELDS = ['flatAndBuilding', 'streetAndLandmark', 'city', 'pincode', 'contactPhone'];
export const addressError = message => Object.assign(new Error(message), { statusCode: 400 });

export function cleanAddress(input = {}) {
  const result = {};
  for (const [field, label, max] of [['flatAndBuilding', 'Flat and building', 200], ['streetAndLandmark', 'Street and landmark', 200], ['city', 'City', 100], ['pincode', 'Pincode', 6]]) {
    if (typeof input[field] !== 'string' || !input[field].trim() || input[field].trim().length > max) throw addressError(`Enter a valid ${label.toLowerCase()}.`);
    result[field] = input[field].trim();
  }
  if (!/^[1-9]\d{5}$/.test(result.pincode)) throw addressError('Enter a valid six-digit pincode.');
  const rawPhone = input.contactPhone ?? '';
  if (typeof rawPhone !== 'string' || !/^[+\d\s()-]*$/.test(rawPhone)) throw addressError('Enter a valid ten-digit contact phone.');
  let phone = rawPhone.replace(/\D/g, '');
  if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
  if (phone && !/^\d{10}$/.test(phone)) throw addressError('Enter a valid ten-digit contact phone.');
  result.contactPhone = phone;
  return result;
}

export function sameAddress(a, b) {
  return ADDRESS_FIELDS.every(key => String(a?.[key] || '').trim().toLowerCase() === String(b?.[key] || '').trim().toLowerCase());
}

export function addressForBooking(address, phone = '') {
  return Object.fromEntries(ADDRESS_FIELDS.map(key => [key, address?.[key] || (key === 'city' ? 'New Delhi' : key === 'contactPhone' ? phone : '')]));
}

export function defaultBookingAddress(user) {
  const addresses = user?.addresses || [];
  return addressForBooking(addresses.find(address => address.isDefault) || addresses[0], user?.phone);
}

export function restoreBookingAddress(draft, user) {
  // Guest-entered addresses may follow a sign-in, but never another customer's address.
  const owned = draft.addressOwnerId === null || draft.addressOwnerId === (user?._id || null);
  const hasAddress = ['flatAndBuilding', 'streetAndLandmark', 'pincode'].some(key => draft.pickupAddress?.[key]);
  return owned && hasAddress ? addressForBooking(draft.pickupAddress, user?.phone) : defaultBookingAddress(user);
}
