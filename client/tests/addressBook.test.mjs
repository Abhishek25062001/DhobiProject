import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAddress, sameAddress, addressForBooking, defaultBookingAddress, restoreBookingAddress } from '../../shared/addressBook.mjs';

const home = { _id: 'home', label: 'Home', flatAndBuilding: '1 Tower', streetAndLandmark: 'Main Road', city: 'Delhi', pincode: '110001', contactPhone: '9990000003' };
const work = { ...home, _id: 'work', label: 'Work', flatAndBuilding: '2 Office', isDefault: true, contactPhone: '9990000004' };
const user = { _id: 'customer', phone: '9990000002', addresses: [home, work] };

test('returning checkout chooses the default and its own contact number', () => {
  assert.deepEqual(defaultBookingAddress(user), addressForBooking(work));
  assert.equal(defaultBookingAddress({ ...user, addresses: [{ ...home, contactPhone: '' }] }).contactPhone, user.phone);
});
test('a partial draft survives only for its owner or a guest signing in', () => {
  const pickupAddress = { flatAndBuilding: 'Unfinished new address' };
  for (const addressOwnerId of [user._id, null]) assert.equal(restoreBookingAddress({ addressOwnerId, pickupAddress }, user).flatAndBuilding, pickupAddress.flatAndBuilding);
  for (const addressOwnerId of ['other-customer', undefined]) assert.equal(restoreBookingAddress({ addressOwnerId, pickupAddress }, user).flatAndBuilding, work.flatAndBuilding);
  assert.equal(restoreBookingAddress({ addressOwnerId: user._id, pickupAddress: home }, null).flatAndBuilding, '');
});
test('address matching includes street, city and contact; normalizes casing and whitespace', () => {
  assert.equal(sameAddress(home, { ...home, flatAndBuilding: ' 1 tower ' }), true);
  for (const key of ['flatAndBuilding', 'streetAndLandmark', 'city', 'pincode', 'contactPhone']) assert.equal(sameAddress(home, { ...home, [key]: 'different' }), false);
});
test('saved-address validation rejects whitespace, bad pincodes and phones, and accepts India country code', () => {
  assert.equal(cleanAddress({ ...home, contactPhone: '+91 99900 00003' }).contactPhone, home.contactPhone);
  assert.equal(cleanAddress({ ...home, contactPhone: '' }).contactPhone, '');
  for (const patch of [{ flatAndBuilding: ' ' }, { city: '' }, { streetAndLandmark: 123 }, { pincode: '11000' }, { pincode: '000000' }, { contactPhone: 'abcd9990000003' }, { contactPhone: '123' }]) assert.throws(() => cleanAddress({ ...home, ...patch }));
});
