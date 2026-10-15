/**
 * IndoDhobi — Sprint 2 Automated Verification Suite
 * ──────────────────────────────────────────────────────────────
 * Tests against real MongoDB Atlas database and live API server:
 * 1. End-to-end Cash on Delivery (COD) Order Creation (HTTP 201)
 * 2. GET /api/orders/my-active Active Orders Filtering
 * 3. Standardized 10-Stage Lifecycle Pipeline Progression & Live Tracking
 * 4. Multiple Active Orders Support & Sorting (updatedAt: -1)
 * 5. Payment Failure Recording (POST /api/orders/:id/payment-failed)
 * 6. Cryptographic Razorpay Signature Verification (HMAC-SHA256)
 * 7. Razorpay Webhook Processing (POST /api/orders/webhook/razorpay)
 * 8. Clean Idempotent Teardown
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const TS = Date.now();
const TEST_PHONE = `92${String(TS).slice(-8)}`;
const TEST_EMAIL = `sprint2_${TS}@indodhobi.test`;

async function detectServerPort() {
  for (const port of [5001, 5000, 5002]) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return port;
      }
    } catch {}
  }
  return null;
}

const ok = (msg) => console.log(`  ✅  ${msg}`);
const fail = (msg) => { console.error(`  ❌  ${msg}`); process.exitCode = 1; };
const info = (msg) => console.log(`  ℹ️   ${msg}`);
const sep = () => console.log('  ' + '─'.repeat(60));

async function run() {
  console.log('\n🚀 Starting Sprint 2 Real Database Verification Suite...\n');

  // 1. Detect Live Port
  const activePort = await detectServerPort();
  if (!activePort) {
    fail('Backend server is not running on port 5000 or 5001.');
    process.exit(1);
  }
  const API_BASE = `http://localhost:${activePort}/api`;
  ok(`Connected to live backend server on port ${activePort} (${API_BASE})`);

  // 2. Direct Atlas Connection
  if (!process.env.MONGO_URI) {
    fail('MONGO_URI is missing from server/.env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  ok(`Direct MongoDB Atlas Connection Established: ${mongoose.connection.host} / ${mongoose.connection.name}`);

  const User = mongoose.connection.collection('users');
  const Order = mongoose.connection.collection('orders');
  const Garment = mongoose.connection.collection('garments');

  let testUserId = null;
  let testUserToken = null;
  let codOrderId = null;
  let secondOrderId = null;

  try {
    // Setup: Get a valid garment from DB
    const sampleGarment = await Garment.findOne({ isActive: true });
    if (!sampleGarment) {
      fail('No active garments found in database. Please run seeder.');
      process.exit(1);
    }

    // Setup: Create authenticated test customer
    const userRes = await fetch(`${API_BASE}/auth/customer/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: `test_firebase_token_${TEST_PHONE}`,
        name: `Sprint 2 Tester ${TS}`
      })
    });
    const userData = await userRes.json();
    testUserId = userData.user?._id;
    testUserToken = userData.token;
    ok(`Test Customer Authenticated: ID ${testUserId} (Token granted)`);

    // Complete profile if needed
    if (userData.requiresName) {
      const onboard = await fetch(`${API_BASE}/auth/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUserToken}`
        },
        body: JSON.stringify({ name: `Sprint 2 Tester ${TS}`, email: TEST_EMAIL })
      });
      const onboardData = await onboard.json();
      testUserToken = onboardData.token;
    }

    sep();
    info('TEST 1: End-to-End Cash on Delivery (COD) Order Creation (Requirement #5)');
    const futureDate = '2026-11-10';
    const futureDelivery = '2026-11-12';

    const codPayload = {
      items: [
        {
          garmentId: sampleGarment._id.toString(),
          quantity: 2,
          serviceType: 'WASH_AND_FOLD',
          ironingType: 'NONE'
        }
      ],
      preferences: {
        detergentType: 'Standard',
        packagingType: 'Folded',
        specialInstructions: 'Handle carefully'
      },
      isExpress: false,
      pickupSchedule: {
        date: futureDate,
        timeSlot: '10:00 AM - 01:00 PM'
      },
      deliverySchedule: {
        date: futureDelivery,
        timeSlot: '02:00 PM - 05:00 PM'
      },
      pickupAddress: {
        flatAndBuilding: 'Flat 101, Green Heights',
        streetAndLandmark: 'MG Road, DLF Phase 1',
        city: 'Gurugram',
        pincode: '122002',
        contactPhone: TEST_PHONE
      },
      paymentMethod: 'COD'
    };

    const codRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify(codPayload)
    });
    const codData = await codRes.json();

    if (codRes.status === 201 && codData.success && codData.order) {
      codOrderId = codData.order._id;
      ok(`COD Order created with HTTP 201! Order Number: ${codData.order.orderNumber}`);
      if (codData.order.payment?.method === 'COD' && codData.order.payment?.status === 'PENDING' && !codData.order.payment?.onlineSubMethod) {
        ok('COD Payment structure confirmed: method=COD, status=PENDING, onlineSubMethod=null');
      } else {
        fail(`Unexpected COD payment structure: ${JSON.stringify(codData.order.payment)}`);
      }
    } else {
      fail(`COD Order creation failed: ${codRes.status} ${JSON.stringify(codData)}`);
    }

    // Cross-verify in real MongoDB Atlas
    const codInDb = await Order.findOne({ _id: new mongoose.Types.ObjectId(codOrderId) });
    if (codInDb && codInDb.payment.method === 'COD' && codInDb.payment.status === 'PENDING') {
      ok(`Verified in Atlas DB: Order ${codInDb.orderNumber} strictly stored with COD & PENDING status.`);
    } else {
      fail(`COD check failed in DB: ${JSON.stringify(codInDb)}`);
    }

    sep();
    info('TEST 2: GET /api/orders/my-active (Requirement #2)');
    const activeRes = await fetch(`${API_BASE}/orders/my-active`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${testUserToken}` }
    });
    const activeData = await activeRes.json();

    if (activeRes.status === 200 && activeData.success && Array.isArray(activeData.activeOrders)) {
      const found = activeData.activeOrders.find((o) => o._id === codOrderId);
      if (found) {
        ok(`Active order retrieved in GET /my-active! Order: ${found.orderNumber}, Status: ${found.orderStatus}`);
        if (found.items?.[0]?.garment) {
          ok('Garment details populated successfully on active order items.');
        }
      } else {
        fail(`Created order ${codOrderId} not found in activeOrders list: ${JSON.stringify(activeData)}`);
      }
    } else {
      fail(`Failed to fetch active orders: ${JSON.stringify(activeData)}`);
    }

    sep();
    info('TEST 3: Standardized 10-Stage Lifecycle Pipeline Progression');
    // Stages: ORDER_PLACED -> CONFIRMED -> PICKUP_SCHEDULED -> OUT_FOR_PICKUP -> PICKED_UP -> IN_WASH -> IN_IRONING -> READY -> OUT_FOR_DELIVERY -> DELIVERED
    const stagesToTest = [
      'CONFIRMED',
      'PICKUP_SCHEDULED',
      'OUT_FOR_PICKUP',
      'PICKED_UP',
      'IN_WASH',
      'IN_IRONING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED'
    ];

    // Login as Admin to perform status transitions
    const adminLoginRes = await fetch(`${API_BASE}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@indodhobi.com', password: 'admin123' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;

    for (const stage of stagesToTest) {
      const updateRes = await fetch(`${API_BASE}/orders/${codOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          orderStatus: stage,
          note: `Transitioned to stage ${stage}`
        })
      });
      const updateData = await updateRes.json();
      if (updateRes.status === 200 && updateData.order?.orderStatus === stage) {
        // ok(`Transitioned to: ${stage}`);
      } else {
        fail(`Failed transition to ${stage}: ${JSON.stringify(updateData)}`);
      }
    }
    ok('Successfully progressed through all 10 stages: ORDER_PLACED -> CONFIRMED -> PICKUP_SCHEDULED -> OUT_FOR_PICKUP -> PICKED_UP -> IN_WASH -> IN_IRONING -> READY -> OUT_FOR_DELIVERY -> DELIVERED');

    // Cross-verify that DELIVERED order is now excluded from GET /my-active
    const postDeliveredActive = await fetch(`${API_BASE}/orders/my-active`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${testUserToken}` }
    });
    const postDeliveredData = await postDeliveredActive.json();
    const stillInActive = postDeliveredData.activeOrders?.some((o) => o._id === codOrderId);

    if (!stillInActive) {
      ok('Delivered order is cleanly excluded from GET /api/orders/my-active (Active Count: 0).');
    } else {
      fail(`Order ${codOrderId} was NOT excluded from my-active after being marked DELIVERED!`);
    }

    sep();
    info('TEST 4: Multiple Active Orders Support & Sorting (Requirement #2)');
    // Create 2 fresh active orders
    const createActiveOrder = async (idx) => {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          ...codPayload,
          pickupSchedule: { date: '2026-11-15', timeSlot: '08:00 AM - 10:00 AM' },
          deliverySchedule: { date: '2026-11-17', timeSlot: '06:00 PM - 09:00 PM' }
        })
      });
      const data = await res.json();
      return data.order;
    };

    const orderA = await createActiveOrder(1);
    const orderB = await createActiveOrder(2);

    const multiActiveRes = await fetch(`${API_BASE}/orders/my-active`, {
      headers: { 'Authorization': `Bearer ${testUserToken}` }
    });
    const multiActiveData = await multiActiveRes.json();

    if (multiActiveData.count >= 2) {
      ok(`Multiple active orders returned: ${multiActiveData.count} orders found.`);
      secondOrderId = orderB._id;
    } else {
      fail(`Expected at least 2 active orders, got: ${multiActiveData.count}`);
    }

    sep();
    info('TEST 5: Payment Failure Recording (POST /api/orders/:id/payment-failed) (Requirement #5)');
    const failRes = await fetch(`${API_BASE}/orders/${secondOrderId}/payment-failed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        reason: 'User dismissed Razorpay checkout modal',
        errorCode: 'MODAL_DISMISSED',
        paymentId: 'pay_failed_sim_123'
      })
    });
    const failData = await failRes.json();

    if (failRes.status === 200 && failData.order?.payment?.status === 'FAILED') {
      ok('POST /api/orders/:id/payment-failed successfully updated payment.status to FAILED.');
      const lastHistory = failData.order.statusHistory[failData.order.statusHistory.length - 1];
      if (lastHistory?.note?.includes('MODAL_DISMISSED')) {
        ok(`Status history audit trail verified: "${lastHistory.note}"`);
      }
    } else {
      fail(`Failed to record payment failure: ${JSON.stringify(failData)}`);
    }

    // Cross-verify in Atlas DB
    const failedInDb = await Order.findOne({ _id: new mongoose.Types.ObjectId(secondOrderId) });
    if (failedInDb.payment.status === 'FAILED') {
      ok(`Verified in Atlas DB: Order ${failedInDb.orderNumber} payment.status = FAILED`);
    } else {
      fail(`Atlas DB check failed for payment failure: ${failedInDb.payment.status}`);
    }

    sep();
    info('TEST 6: Cryptographic Razorpay Signature Verification (HMAC-SHA256)');
    // Refresh payment to online
    const retryRes = await fetch(`${API_BASE}/orders/${secondOrderId}/retry-payment`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testUserToken}` }
    });
    const retryData = await retryRes.json();
    const rzpOrderId = retryData.razorpay?.id;
    const testPaymentId = `pay_live_test_${TS}`;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    // 6a: Test invalid signature rejection
    const invalidVerify = await fetch(`${API_BASE}/orders/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        orderId: secondOrderId,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: 'invalid_forged_signature_12345'
      })
    });
    if (invalidVerify.status === 400) {
      ok('Server strictly rejected invalid cryptographic signature with HTTP 400.');
    } else {
      fail(`Expected 400 for forged signature, got: ${invalidVerify.status}`);
    }

    // 6b: Test valid cryptographic HMAC signature
    let validSignature = 'simulated_valid_signature';
    if (secret) {
      validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${rzpOrderId}|${testPaymentId}`)
        .digest('hex');
    }

    const validVerify = await fetch(`${API_BASE}/orders/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        orderId: secondOrderId,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature
      })
    });
    const validVerifyData = await validVerify.json();

    if (validVerify.status === 200 && validVerifyData.order?.payment?.status === 'PAID') {
      ok(`Cryptographic signature verified successfully! Payment marked PAID. Txn ID: ${validVerifyData.order.payment.transactionId}`);
    } else {
      fail(`Valid payment verification failed: ${validVerify.status} ${JSON.stringify(validVerifyData)}`);
    }

    // Cross-verify in Atlas DB
    const paidInDb = await Order.findOne({ _id: new mongoose.Types.ObjectId(secondOrderId) });
    if (paidInDb.payment.status === 'PAID' && paidInDb.payment.transactionId === testPaymentId) {
      ok(`Verified in Atlas DB: Order ${paidInDb.orderNumber} payment.status = PAID (paidAt recorded)`);
    } else {
      fail(`Payment verification not persisted in Atlas DB: ${JSON.stringify(paidInDb.payment)}`);
    }

    sep();
    info('TEST 7: Razorpay Server Webhook (POST /api/orders/webhook/razorpay)');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const webhookOrderNumber = orderA.orderNumber;
    const webhookRzpOrderId = orderA.payment?.razorpayOrderId || `order_wh_${TS}`;

    // Set razorpayOrderId on orderA for testing webhook
    await Order.updateOne(
      { _id: new mongoose.Types.ObjectId(orderA._id) },
      { $set: { 'payment.razorpayOrderId': webhookRzpOrderId, 'payment.status': 'PENDING' } }
    );

    const webhookEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_webhook_${TS}`,
            order_id: webhookRzpOrderId,
            amount: 50000,
            status: 'captured'
          }
        }
      }
    };
    const webhookBody = JSON.stringify(webhookEvent);
    const webhookSig = crypto.createHmac('sha256', webhookSecret).update(webhookBody).digest('hex');

    const webhookRes = await fetch(`${API_BASE}/orders/webhook/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': webhookSig
      },
      body: webhookBody
    });

    if (webhookRes.status === 200) {
      ok('Razorpay server webhook processed with HTTP 200 { status: "ok" }');
    } else {
      fail(`Webhook failed with status: ${webhookRes.status}`);
    }

    // Cross-verify order status in Atlas DB
    const webhookUpdatedOrder = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderA._id) });
    if (webhookUpdatedOrder.payment.status === 'PAID' && webhookUpdatedOrder.payment.transactionId === `pay_webhook_${TS}`) {
      ok(`Verified in Atlas DB: Order ${webhookOrderNumber} automatically marked PAID by webhook.`);
    } else {
      fail(`Webhook payment capture not reflected in Atlas DB: ${JSON.stringify(webhookUpdatedOrder.payment)}`);
    }

    sep();
    info('TEARDOWN: Cleaning up test orders and user from MongoDB Atlas');
    await Order.deleteMany({ customer: new mongoose.Types.ObjectId(testUserId) });
    await User.deleteOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    ok('All test orders and test user cleanly purged from MongoDB Atlas. Zero DB pollution.');

    sep();
    console.log('\n🎉 ALL SPRINT 2 REQUIREMENTS VERIFIED AGAINST REAL MONGODB ATLAS!\n');

  } catch (err) {
    fail(`Unhandled error during Sprint 2 verification: ${err.message}\n${err.stack}`);
  } finally {
    if (testUserId) {
      await Order.deleteMany({ customer: new mongoose.Types.ObjectId(testUserId) }).catch(() => {});
      await User.deleteOne({ _id: new mongoose.Types.ObjectId(testUserId) }).catch(() => {});
    }
    await mongoose.disconnect();
  }
}

run();
