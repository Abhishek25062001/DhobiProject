import mongoose from 'mongoose';
import User from '../models/User.js';
import { ADDRESS_LABELS, addressError, cleanAddress, sameAddress } from '../../shared/addressBook.mjs';

export function saveAddressInBook(user, input, addressId) {
  if (input.isDefault !== undefined && typeof input.isDefault !== 'boolean') throw addressError('Default address must be true or false.');
  const existing = addressId ? user.addresses.id(addressId) : null;
  if (addressId && !existing) throw Object.assign(new Error('Address no longer exists in your address book. Choose another address.'), { statusCode: 404 });
  const address = cleanAddress({ ...(existing?.toObject() || {}), ...input });
  const label = input.label ?? existing?.label ?? 'Home';
  if (!ADDRESS_LABELS.includes(label)) throw addressError('Choose Home, Work, or Other.');
  const duplicate = user.addresses.find(item => String(item._id) !== String(existing?._id) && sameAddress(item, address));
  if (existing && duplicate) throw addressError('This address is already saved. Choose it from your address book.');
  let target = existing || duplicate;
  if (!target) {
    user.addresses.push({ ...address, label });
    target = user.addresses[user.addresses.length - 1];
  } else if (existing) {
    Object.assign(target, address, { label });
  }
  const defaultId = input.isDefault === true ? target._id : (user.addresses.find(item => item.isDefault)?._id || target._id);
  user.addresses.forEach(item => { item.isDefault = String(item._id) === String(defaultId); });
  return target;
}

export async function lockedAddressUser(userId, session) {
  // Both checkout and profile changes take this write lock so concurrent saves
  // cannot create duplicate defaults or lose another address change.
  await User.collection.updateOne({ _id: userId }, { $inc: { addressRevision: 1 } }, { session });
  const user = await User.findById(userId).session(session);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return user;
}

export async function changeAddressBook(userId, change) {
  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      user = await lockedAddressUser(userId, session);
      change(user);
      await user.save({ session });
    });
    return user;
  } finally { await session.endSession(); }
}

export function bookingAddressConsent(value) {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.save !== 'boolean') throw addressError('Choose whether to save your address.');
  if (!value.save) return null;
  if (value.isDefault !== undefined && typeof value.isDefault !== 'boolean') throw addressError('Default address must be true or false.');
  if (value.label !== undefined && !ADDRESS_LABELS.includes(value.label)) throw addressError('Choose Home, Work, or Other.');
  if (value.addressId !== undefined && !mongoose.isValidObjectId(value.addressId)) throw addressError('Choose a valid saved address.');
  return { label: value.label || 'Home', isDefault: value.isDefault === true, addressId: value.addressId };
}
