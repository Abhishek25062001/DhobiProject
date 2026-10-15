import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';

dotenv.config();

const runBackfill = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[Backfill Error]: MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  try {
    console.log('[Backfill] Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('[Backfill] Connected successfully.');

    // 1. Backfill Orders with missing verificationCodes / OTPs
    const allOrders = await Order.find();
    console.log(`[Backfill] Auditing ${allOrders.length} orders...`);

    let ordersOtpFixed = 0;
    let ordersPhotosFixed = 0;

    for (const order of allOrders) {
      let modified = false;

      // Check OTPs
      if (!order.verificationCodes) {
        order.verificationCodes = {};
        modified = true;
      }
      if (!order.verificationCodes.pickupOtp || order.verificationCodes.pickupOtp === '') {
        order.verificationCodes.pickupOtp = String(Math.floor(1000 + Math.random() * 9000));
        modified = true;
      }
      if (!order.verificationCodes.deliveryOtp || order.verificationCodes.deliveryOtp === '') {
        order.verificationCodes.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
        modified = true;
      }

      // Check inspectionPhotos
      if (order.logistics?.inspectionPhotos && Array.isArray(order.logistics.inspectionPhotos)) {
        order.logistics.inspectionPhotos.forEach((photo) => {
          const validUrl = photo.url || photo.imageUrl;
          if (validUrl) {
            if (!photo.url) {
              photo.url = validUrl;
              modified = true;
            }
            if (!photo.imageUrl) {
              photo.imageUrl = validUrl;
              modified = true;
            }
          }
        });
      }

      if (modified) {
        await order.save();
        ordersOtpFixed++;
      }
    }

    console.log(`[Backfill] Orders audit complete: ${ordersOtpFixed} orders backfilled with valid OTPs / photo keys.`);

    // 2. Audit and fix User profileImage records
    const allUsers = await User.find();
    console.log(`[Backfill] Auditing ${allUsers.length} users...`);

    let usersFixed = 0;
    for (const user of allUsers) {
      let modified = false;

      if (user.profileImage) {
        const currentUrl = user.profileImage.url || user.profileImage.imageUrl || (typeof user.profileImage === 'string' ? user.profileImage : '');
        if (currentUrl) {
          if (!user.profileImage.url) {
            user.profileImage.url = currentUrl;
            modified = true;
          }
          if (!user.profileImage.imageUrl) {
            user.profileImage.imageUrl = currentUrl;
            modified = true;
          }
        }
      }

      if (modified) {
        await user.save();
        usersFixed++;
      }
    }

    console.log(`[Backfill] Users audit complete: ${usersFixed} users updated.`);
    console.log('[Backfill] All database records verified and synchronized.');
  } catch (error) {
    console.error('[Backfill Error]:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Backfill] Disconnected from MongoDB.');
    process.exit(0);
  }
};

runBackfill();
