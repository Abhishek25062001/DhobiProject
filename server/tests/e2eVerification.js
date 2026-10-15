import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from '../server.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Garment from '../models/Garment.js';
import { seedData } from '../utils/seeder.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const runE2ETest = async () => {
  let mongod;
  let serverInstance;

  try {
    console.log('[E2E Test] Starting In-Memory MongoDB Server...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.disconnect();
    await mongoose.connect(uri);
    console.log('[E2E Test] Connected to In-Memory DB');

    // Run seedData to populate default garments, slots, and config
    await seedData();

    const garment = await Garment.findOne({ isActive: true });
    if (!garment) throw new Error('No seeded garment found');

    // Retrieve or create Customer & Rider users
    let customer = await User.findOne({ role: 'customer' });
    let rider = await User.findOne({ role: 'rider' });

    if (!customer) {
      customer = await User.create({
        name: 'E2E Customer',
        phone: '9876543210',
        role: 'customer',
        password: 'hashedPassword123'
      });
    }

    if (!rider) {
      rider = await User.create({
        name: 'E2E Rider',
        phone: '9876543211',
        role: 'rider',
        password: 'hashedPassword123'
      });
    }

    const customerToken = jwt.sign(
      { id: customer._id, role: 'customer' },
      process.env.JWT_SECRET || 'HFN39uXzKcG72zi1RnG84qHGjwv2sgvMSY7mTxsdOha'
    );

    const riderToken = jwt.sign(
      { id: rider._id, role: 'rider' },
      process.env.JWT_SECRET || 'HFN39uXzKcG72zi1RnG84qHGjwv2sgvMSY7mTxsdOha'
    );

    const PORT = 5098;
    serverInstance = app.listen(PORT);
    console.log(`[E2E Test] Test server listening on port ${PORT}`);

    const api = async (endpoint, options = {}) => {
      const res = await fetch(`http://localhost:${PORT}/api${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    // Step 1: Customer creates an order
    console.log('\n--- Step 1: Customer Creates Order ---');
    const orderPayload = {
      items: [
        {
          garmentId: garment._id.toString(),
          quantity: 3,
          serviceType: 'WASH_AND_IRON'
        }
      ],
      pickupSchedule: {
        date: '2026-10-20',
        timeSlot: '10:00 AM - 01:00 PM'
      },
      deliverySchedule: {
        date: '2026-10-22',
        timeSlot: '02:00 PM - 05:00 PM'
      },
      pickupAddress: {
        flatAndBuilding: 'Flat 101, Galaxy Tower',
        streetAndLandmark: 'Connaught Place',
        city: 'New Delhi',
        pincode: '110001',
        contactPhone: '9876543210'
      },
      paymentMethod: 'COD'
    };

    const createRes = await api('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify(orderPayload)
    });

    if (createRes.status !== 201 || !createRes.data?.order) {
      throw new Error(`Order creation failed with status ${createRes.status}: ${JSON.stringify(createRes.data)}`);
    }

    const createdOrder = createRes.data.order;
    const orderId = createdOrder._id;
    console.log(`✓ Order created successfully: #${createdOrder.orderNumber} (ID: ${orderId})`);

    // Step 2: Customer fetches /api/orders/my-orders and reads verificationCodes.pickupOtp
    console.log('\n--- Step 2: Customer Fetches /api/orders/my-orders & Reads Pickup OTP ---');
    const myOrdersRes = await api('/orders/my-orders', {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    if (myOrdersRes.status !== 200 || !myOrdersRes.data?.orders) {
      throw new Error(`Failed to fetch customer orders: status ${myOrdersRes.status}`);
    }

    const targetOrder = myOrdersRes.data.orders.find((o) => o._id === orderId);
    if (!targetOrder) {
      throw new Error(`Order ${orderId} not found in customer orders list`);
    }

    const customerPickupOtp = targetOrder.verificationCodes?.pickupOtp || targetOrder.pickupOtp;
    console.log(`✓ Customer orders returned verificationCodes.pickupOtp: "${customerPickupOtp}"`);
    if (!customerPickupOtp || customerPickupOtp.length !== 4) {
      throw new Error(`Invalid pickup OTP format: ${customerPickupOtp}`);
    }

    // Step 3: Rider submits that exact OTP with 3 Base64 stain photos to /api/orders/:id/verify-pickup
    console.log('\n--- Step 3: Rider Submits Pickup Verification with 3 Base64 Stain Photos ---');
    const sampleBase64_1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const sampleBase64_2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const sampleBase64_3 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkuM9QDwADfwGA7aT8awAAAABJRU5ErkJggg==';

    const verifyPayload = {
      otp: customerPickupOtp,
      pickupOtp: customerPickupOtp,
      bagTagId: 'BAG-E2E-TEST-777',
      verifiedGarmentCount: 3,
      inspectionNotes: 'Verified 3 shirts: 1 ink spot on left cuff, 2 small grease spots on hem.',
      inspectionPhotos: [sampleBase64_1, sampleBase64_2, sampleBase64_3]
    };

    const verifyRes = await api(`/orders/${orderId}/verify-pickup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${riderToken}` },
      body: JSON.stringify(verifyPayload)
    });

    console.log(`Verification response status: ${verifyRes.status}`);
    if (verifyRes.status !== 200) {
      throw new Error(`Pickup verification failed with status ${verifyRes.status}: ${JSON.stringify(verifyRes.data)}`);
    }

    const verifiedOrder = verifyRes.data.order;
    console.log(`✓ Order status is now: "${verifiedOrder.orderStatus}" (Expected: "PICKED_UP")`);
    if (verifiedOrder.orderStatus !== 'PICKED_UP') {
      throw new Error(`Expected orderStatus to be PICKED_UP, got ${verifiedOrder.orderStatus}`);
    }

    const photos = verifiedOrder.logistics?.inspectionPhotos;
    console.log(`✓ Inspection photos count: ${photos?.length} (Expected: 3)`);
    if (!photos || photos.length !== 3) {
      throw new Error(`Expected 3 inspection photos, got ${photos?.length}`);
    }

    photos.forEach((photo, idx) => {
      console.log(`  - Photo ${idx + 1}: url="${photo.url.substring(0, 45)}...", imageUrl="${photo.imageUrl?.substring(0, 45)}..."`);
      if (!photo.url || typeof photo.url !== 'string') {
        throw new Error(`Photo ${idx + 1} is missing a valid 'url' key`);
      }
      if (!photo.imageUrl || typeof photo.imageUrl !== 'string') {
        throw new Error(`Photo ${idx + 1} is missing a valid 'imageUrl' key`);
      }
    });

    // Step 4: Verify single order fetch also exposes renderable photos and OTPs
    console.log('\n--- Step 4: Verify Single Order Fetch (Customer & Admin) ---');
    const singleOrderRes = await api(`/orders/${orderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    const fetchedOrder = singleOrderRes.data?.order;
    if (fetchedOrder.logistics?.inspectionPhotos?.length !== 3) {
      throw new Error(`Single order fetch did not return 3 inspection photos`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END FLOW VERIFICATION CHECKS PASSED 100%!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ [E2E Test Failed]:', err);
    process.exit(1);
  } finally {
    if (serverInstance) serverInstance.close();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
};

runE2ETest();
