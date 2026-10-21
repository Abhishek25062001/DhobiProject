import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { RateLimitCounter } from './mongoRateLimitStore.js';
export async function verifyTransactionDatabase() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Bookings require a MongoDB replica set or sharded cluster.');
  await Order.createIndexes();
  await RateLimitCounter.createIndexes();
  const indexes = await Order.collection.indexes();
  for (const field of ['checkoutKey', 'payment.razorpayOrderId', 'payment.razorpayPaymentId']) {
    if (!indexes.some(index => index.unique && index.key[field])) throw new Error('Required transaction uniqueness index is missing.');
  }
}
