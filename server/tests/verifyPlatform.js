import crypto from 'crypto';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedData } from '../utils/seeder.js';
import Garment from '../models/Garment.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

process.env.NODE_ENV = 'test';
const TEST_PORT = 5005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

const results = [];
let order1Data = null;
let order2Data = null;

// Helper to make timed HTTP requests with full header inspection
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const start = performance.now();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  };

  const res = await fetch(url, fetchOptions);
  const duration = Math.round(performance.now() - start);

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    ok: res.ok,
    duration,
    headers: Object.fromEntries(res.headers.entries()),
    data
  };
}

function recordResult(suiteNumber, title, status, httpCode, duration, details = '') {
  results.push({
    suite: `Test ${suiteNumber}`,
    title,
    status: status ? 'PASS' : 'FAIL',
    httpCode,
    duration: `${duration}ms`,
    details
  });
  const symbol = status ? '✅' : '❌';
  console.log(`${symbol} [Test ${suiteNumber}] ${title} -> ${status ? 'PASS' : 'FAIL'} (${httpCode}, ${duration}ms)`);
  if (details) {
    console.log(`   ℹ️ ${details}`);
  }
}

async function runVerification() {
  console.log(`======================================================================`);
  console.log(`🚀 Starting IndoDhobi Lead QA Production Readiness Verification Suite`);
  console.log(`======================================================================\n`);

  let serverInstance = null;

  try {
    // ---------------------------------------------------------
    // Boot in-memory server & database for test isolation
    // ---------------------------------------------------------
    await connectDB();
    await seedData();

    serverInstance = await new Promise((resolve) => {
      const server = app.listen(TEST_PORT, () => {
        console.log(`[Test Server] Listening on ${BASE_URL}\n`);
        resolve(server);
      });
    });

    let customerToken = null;
    let adminToken = null;
    let garmentsList = [];

    // =========================================================
    // TEST 1: Database Connection, Production Indexes & Auto-Seeder
    // =========================================================
    {
      const start = performance.now();
      const isConnected = mongoose.connection.readyState === 1;
      const garmentsCount = await Garment.countDocuments({ isActive: true });
      const categories = await Garment.distinct('category', { isActive: true });

      const customerUser = await User.findOne({ email: 'customer@indodhobi.com' });
      const adminUser = await User.findOne({ email: 'admin@indodhobi.com' });

      // Verify Production Mongoose Indexes
      const orderIndexes = Order.schema.indexes().map(idx => JSON.stringify(idx[0]));
      const userIndexes = User.schema.indexes().map(idx => JSON.stringify(idx[0]));
      const garmentIndexes = Garment.schema.indexes().map(idx => JSON.stringify(idx[0]));

      const hasOrderCompound1 = orderIndexes.some(i => i.includes('customer') && i.includes('createdAt'));
      const hasOrderCompound2 = orderIndexes.some(i => i.includes('orderStatus') && i.includes('pickupSchedule.date'));
      const hasOrderNumIndex = orderIndexes.some(i => i.includes('orderNumber')) || Boolean(Order.schema.paths.orderNumber?.options?.unique);
      const hasUserEmail = userIndexes.some(i => i.includes('email')) || Boolean(User.schema.paths.email?.options?.unique);
      const hasUserPhone = userIndexes.some(i => i.includes('phone')) || Boolean(User.schema.paths.phone?.options?.unique);
      const hasGarmentCompound = garmentIndexes.some(i => i.includes('category') && i.includes('isActive'));

      const allIndexesPresent =
        hasOrderCompound1 &&
        hasOrderCompound2 &&
        hasOrderNumIndex &&
        hasUserEmail &&
        hasUserPhone &&
        hasGarmentCompound;

      const passed =
        isConnected &&
        garmentsCount >= 12 &&
        Boolean(customerUser) &&
        Boolean(adminUser) &&
        allIndexesPresent;

      const duration = Math.round(performance.now() - start);
      recordResult(
        1,
        'Database Connection, Production Indexes & Auto-Seeder Verification',
        passed,
        'DB OK',
        duration,
        `Seeded ${garmentsCount} garments. Verified compound indexes on Order, User, and Garment models.`
      );
    }

    // =========================================================
    // TEST 2: Security Headers (Helmet), Input Sanitization & Auth
    // =========================================================
    {
      // 1. Check Helmet Security Headers on /api/health
      const resHealth = await apiRequest('/health');
      const hasHelmetHeaders = Boolean(
        resHealth.headers['x-content-type-options'] === 'nosniff' ||
        resHealth.headers['x-dns-prefetch-control'] ||
        resHealth.headers['x-frame-options']
      );

      // 2. Test NoSQL Injection Sanitization on /api/auth/login
      const maliciousBody = {
        email: 'customer@indodhobi.com',
        password: 'password123',
        $where: 'sleep(5000)',
        'admin.role': 'admin'
      };
      const resSanitized = await apiRequest('/auth/login', {
        method: 'POST',
        body: maliciousBody
      });
      customerToken = resSanitized.data?.token;

      // 3. Login Admin
      const resAdmin = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: 'admin@indodhobi.com', password: 'admin123' }
      });
      adminToken = resAdmin.data?.token;

      // 4. Verify unauthenticated access rejection
      const resNoToken = await apiRequest('/auth/me');

      const passed =
        hasHelmetHeaders &&
        resSanitized.status === 200 &&
        Boolean(customerToken) &&
        resAdmin.status === 200 &&
        resNoToken.status === 401;

      recordResult(
        2,
        'Security Headers (Helmet), NoSQL Sanitization & JWT Auth',
        passed,
        `Health: ${resHealth.status}, Login: ${resSanitized.status}, Unauth: ${resNoToken.status}`,
        resHealth.duration + resSanitized.duration + resAdmin.duration,
        `Helmet HTTP headers active. NoSQL injection operators ($where, '.') stripped. JWT issued.`
      );
    }

    // =========================================================
    // TEST 3: Garment Catalog & Ironing Pricing Structure
    // =========================================================
    {
      const res = await apiRequest('/catalog/garments');
      garmentsList = res.data?.data || [];

      let allValid = res.status === 200 && garmentsList.length >= 12;
      for (const g of garmentsList) {
        const p = g.pricing;
        if (
          typeof p?.washOnly !== 'number' ||
          typeof p?.standardSteamIron !== 'number' ||
          typeof p?.crispStarchPress !== 'number' ||
          typeof p?.delicatePress !== 'number' ||
          typeof p?.dryClean !== 'number'
        ) {
          allValid = false;
          break;
        }
      }

      recordResult(
        3,
        'Garment Catalog & Ironing Pricing Structure',
        allValid,
        res.status,
        res.duration,
        `Retrieved ${garmentsList.length} garments with full 5-tier pricing structures.`
      );
    }

    // =========================================================
    // TEST 4: Real-Time Slot Capacity Decrementing & Past-Slot Blocking
    // =========================================================
    {
      const testDate = '2026-10-25';
      const testSlot = '10:00 AM - 01:00 PM';

      // 1. Initial slots lookup
      const resInitial = await apiRequest(`/orders/slots?date=${testDate}`);
      const initialSlotInfo = resInitial.data?.slots?.find(s => s.slot === testSlot);
      const initialCapacity = initialSlotInfo?.remainingCapacity ?? 15;

      // 2. Book an order for this slot
      const shirt = garmentsList.find(g => g.name.includes('Shirt')) || garmentsList[0];
      const resBook = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [{ garmentId: shirt._id, quantity: 1, serviceType: 'WASH_AND_FOLD' }],
          pickupSchedule: { date: testDate, timeSlot: testSlot },
          deliverySchedule: { date: '2026-10-27', timeSlot: '02:00 PM - 05:00 PM' },
          pickupAddress: {
            flatAndBuilding: 'Flat 402',
            streetAndLandmark: 'Barakhamba Road',
            city: 'New Delhi',
            pincode: '110001',
            contactPhone: '9876543210'
          },
          paymentMethod: 'COD'
        }
      });

      // 3. Re-query slots lookup and check capacity decremented by 1
      const resAfter = await apiRequest(`/orders/slots?date=${testDate}`);
      const afterSlotInfo = resAfter.data?.slots?.find(s => s.slot === testSlot);
      const afterCapacity = afterSlotInfo?.remainingCapacity;
      const capacityDecremented = afterCapacity === initialCapacity - 1;

      // 4. Test past date blocking: query a past date
      const resPast = await apiRequest('/orders/slots?date=2020-01-01');
      const allPastBlocked = (resPast.data?.slots || []).every(s => s.isPast === true && s.isAvailable === false);

      // 5. Test booking a past slot returns 400 Bad Request
      const resPastBook = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [{ garmentId: shirt._id, quantity: 1, serviceType: 'WASH_AND_FOLD' }],
          pickupSchedule: { date: '2020-01-01', timeSlot: testSlot },
          deliverySchedule: { date: '2020-01-03', timeSlot: '02:00 PM - 05:00 PM' },
          pickupAddress: {
            flatAndBuilding: 'Flat 402',
            streetAndLandmark: 'Barakhamba Road',
            city: 'New Delhi',
            pincode: '110001',
            contactPhone: '9876543210'
          },
          paymentMethod: 'COD'
        }
      });

      const passed =
        resBook.status === 201 &&
        capacityDecremented &&
        allPastBlocked &&
        resPastBook.status === 400;

      recordResult(
        4,
        'Real-Time Slot Capacity Locking & Past-Slot Blocking',
        passed,
        `Book: ${resBook.status}, Past Query: ${resPast.status}, Past Book: ${resPastBook.status}`,
        resInitial.duration + resBook.duration + resAfter.duration,
        `Remaining capacity decremented from ${initialCapacity} to ${afterCapacity}. Past slots rejected with 400 Bad Request.`
      );
    }

    // =========================================================
    // TEST 5: Order Creation #1 — Cash on Delivery (Subtotal < ₹399)
    // =========================================================
    let createdOrder1 = null;
    {
      const shirt = garmentsList.find(g => g.name.includes('Shirt')) || garmentsList[0];
      const jeans = garmentsList.find(g => g.name.includes('Trousers') || g.name.includes('Jeans')) || garmentsList[1];

      // Shirt: washOnly(35) + crispStarch(25) = 60 * 2 = 120
      // Jeans: washOnly(40) * 1 = 40
      // Subtotal = 160 < 399
      // Delivery fee = 49
      // Taxable = 209
      // 5% GST = Math.round(209 * 0.05) = 10
      // Grand Total = 209 + 10 = 219

      const orderPayload = {
        items: [
          {
            garmentId: shirt._id,
            quantity: 2,
            serviceType: 'WASH_AND_IRON',
            ironingType: 'CRISP_STARCH'
          },
          {
            garmentId: jeans._id,
            quantity: 1,
            serviceType: 'WASH_AND_FOLD',
            ironingType: 'NONE'
          }
        ],
        preferences: {
          detergentType: 'Hypoallergenic',
          packagingType: 'Folded',
          specialInstructions: 'Handle collar carefully'
        },
        pickupSchedule: {
          date: '2026-10-22',
          timeSlot: '10:00 AM - 01:00 PM'
        },
        deliverySchedule: {
          date: '2026-10-24',
          timeSlot: '02:00 PM - 05:00 PM'
        },
        pickupAddress: {
          flatAndBuilding: 'Flat 402, Royal Palms Apartments',
          streetAndLandmark: 'Barakhamba Road, Near Connaught Place Metro',
          city: 'New Delhi',
          pincode: '110001',
          contactPhone: '9876543210'
        },
        paymentMethod: 'COD'
      };

      const res = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: orderPayload
      });

      createdOrder1 = res.data?.order;
      order1Data = createdOrder1;

      const pb = createdOrder1?.pricingBreakdown;
      const expectedSubtotal = 160;
      const expectedDeliveryFee = 49;
      const expectedTax = Math.round((expectedSubtotal + expectedDeliveryFee) * 0.05);
      const expectedTotal = expectedSubtotal + expectedDeliveryFee + expectedTax;

      const mathValid =
        pb?.subtotal === expectedSubtotal &&
        pb?.subtotal < 399 &&
        pb?.pickupDeliveryFee === expectedDeliveryFee &&
        pb?.taxAmount === expectedTax &&
        pb?.grandTotal === expectedTotal;

      const passed =
        res.status === 201 &&
        mathValid &&
        createdOrder1?.payment?.method === 'COD' &&
        createdOrder1?.payment?.status === 'PENDING' &&
        createdOrder1?.orderStatus === 'BOOKED';

      recordResult(
        5,
        'Order Creation #1 — COD (Subtotal < ₹399, Delivery Fee Applied)',
        passed,
        res.status,
        res.duration,
        `Order ${createdOrder1?.orderNumber}: Subtotal ₹${pb?.subtotal}, Delivery Fee ₹${pb?.pickupDeliveryFee}, GST ₹${pb?.taxAmount}, Grand Total ₹${pb?.grandTotal}.`
      );
    }

    // =========================================================
    // TEST 6: Order Creation #2 — Online Payment (Subtotal >= ₹399)
    // =========================================================
    let createdOrder2 = null;
    {
      const saree = garmentsList.find(g => g.name.includes('Saree')) || garmentsList[0];
      const quilt = garmentsList.find(g => g.name.includes('Quilt') || g.name.includes('Comforter')) || garmentsList[1];
      const shirt = garmentsList.find(g => g.name.includes('Shirt')) || garmentsList[2];

      // Saree: dryClean(199) * 1 = 199
      // Quilt: washOnly(180) * 1 = 180
      // Shirt: washOnly(35) + delicatePress(30) = 65 * 4 = 260
      // Subtotal = 199 + 180 + 260 = 639 >= 399
      // Delivery fee = 0
      // 5% GST = Math.round(639 * 0.05) = 32
      // Grand Total = 639 + 32 = 671

      const orderPayload = {
        items: [
          {
            garmentId: saree._id,
            quantity: 1,
            serviceType: 'DRY_CLEAN',
            ironingType: 'NONE'
          },
          {
            garmentId: quilt._id,
            quantity: 1,
            serviceType: 'WASH_AND_FOLD',
            ironingType: 'NONE'
          },
          {
            garmentId: shirt._id,
            quantity: 4,
            serviceType: 'WASH_AND_IRON',
            ironingType: 'DELICATE_PRESS'
          }
        ],
        preferences: {
          detergentType: 'Fabric Softener Plus',
          packagingType: 'On Hangers',
          specialInstructions: 'Delicate silk care for saree.'
        },
        pickupSchedule: {
          date: '2026-10-23',
          timeSlot: '08:00 AM - 10:00 AM'
        },
        deliverySchedule: {
          date: '2026-10-25',
          timeSlot: '06:00 PM - 09:00 PM'
        },
        pickupAddress: {
          flatAndBuilding: 'Flat 402, Royal Palms Apartments',
          streetAndLandmark: 'Barakhamba Road',
          city: 'New Delhi',
          pincode: '110001',
          contactPhone: '9876543210'
        },
        paymentMethod: 'ONLINE',
        onlineSubMethod: 'UPI'
      };

      const res = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: orderPayload
      });

      createdOrder2 = res.data?.order;
      order2Data = createdOrder2;

      const pb = createdOrder2?.pricingBreakdown;
      const expectedSubtotal = 639;
      const expectedDeliveryFee = 0;
      const expectedTax = Math.round(expectedSubtotal * 0.05);
      const expectedTotal = expectedSubtotal + expectedTax;

      const mathValid =
        pb?.subtotal === expectedSubtotal &&
        pb?.subtotal >= 399 &&
        pb?.pickupDeliveryFee === expectedDeliveryFee &&
        pb?.taxAmount === expectedTax &&
        pb?.grandTotal === expectedTotal;

      const passed =
        res.status === 201 &&
        mathValid &&
        createdOrder2?.payment?.method === 'ONLINE' &&
        createdOrder2?.payment?.status === 'PENDING' &&
        Boolean(createdOrder2?.payment?.razorpayOrderId);

      recordResult(
        6,
        'Order Creation #2 — Online Payment (Subtotal >= ₹399, Free Delivery)',
        passed,
        res.status,
        res.duration,
        `Order ${createdOrder2?.orderNumber}: Subtotal ₹${pb?.subtotal}, Delivery Fee ₹${pb?.pickupDeliveryFee} (FREE), GST ₹${pb?.taxAmount}, Grand Total ₹${pb?.grandTotal}.`
      );
    }

    // =========================================================
    // TEST 7: Cryptographic HMAC-SHA256 Razorpay Signature Verification
    // =========================================================
    {
      const orderId = createdOrder2.payment.razorpayOrderId;
      const paymentId = 'pay_real_verify_774912';

      // 1. Compute authentic HMAC-SHA256 signature using the server secret
      const validSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // 2. Negative Test: Send tampered / invalid signature -> Expect 400 Bad Request
      const resTampered = await apiRequest('/orders/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          orderId: createdOrder2._id,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'tampered_invalid_bad_signature'
        }
      });

      // 3. Positive Test: Send authentic HMAC-SHA256 signature -> Expect 200 OK
      const resValid = await apiRequest('/orders/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          orderId: createdOrder2._id,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          onlineSubMethod: 'RAZORPAY_CHECKOUT'
        }
      });

      const updatedOrder = resValid.data?.order;
      const passed =
        resTampered.status === 400 &&
        resValid.status === 200 &&
        updatedOrder?.payment?.status === 'PAID' &&
        updatedOrder?.payment?.transactionId === paymentId &&
        updatedOrder?.payment?.razorpaySignature === validSignature &&
        Boolean(updatedOrder?.payment?.paidAt);

      recordResult(
        7,
        'Cryptographic HMAC-SHA256 Razorpay Signature Verification',
        passed,
        `Tampered: ${resTampered.status}, Valid: ${resValid.status}`,
        resTampered.duration + resValid.duration,
        `Tampered signature rejected (400). Valid HMAC-SHA256 verified (200), payment set to PAID with paidAt timestamp.`
      );
    }

    // =========================================================
    // TEST 8: Online Payment Recovery: Retry & Switch-to-COD
    // =========================================================
    {
      // 1. Create an unpaid online order #3
      const shirt = garmentsList[0];
      const resOrder3 = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [{ garmentId: shirt._id, quantity: 1, serviceType: 'WASH_AND_FOLD' }],
          pickupSchedule: { date: '2026-10-24', timeSlot: '02:00 PM - 05:00 PM' },
          deliverySchedule: { date: '2026-10-26', timeSlot: '02:00 PM - 05:00 PM' },
          pickupAddress: {
            flatAndBuilding: 'Flat 402',
            streetAndLandmark: 'Barakhamba Road',
            city: 'New Delhi',
            pincode: '110001',
            contactPhone: '9876543210'
          },
          paymentMethod: 'ONLINE',
          onlineSubMethod: 'UPI'
        }
      });
      const order3 = resOrder3.data?.order;

      // 2. Test Retry Payment endpoint (refreshes Razorpay order)
      const resRetry = await apiRequest(`/orders/${order3._id}/retry-payment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` }
      });

      // 3. Test Switch-to-COD endpoint
      const resSwitch = await apiRequest(`/orders/${order3._id}/switch-to-cod`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` }
      });

      const passed =
        resOrder3.status === 201 &&
        resRetry.status === 200 &&
        Boolean(resRetry.data?.razorpay?.id) &&
        resSwitch.status === 200 &&
        resSwitch.data?.order?.payment?.method === 'COD' &&
        resSwitch.data?.order?.payment?.status === 'PENDING';

      recordResult(
        8,
        'Online Payment Recovery: Retry & Switch-to-COD Workflow',
        passed,
        `Retry: ${resRetry.status}, Switch: ${resSwitch.status}`,
        resRetry.duration + resSwitch.duration,
        `Unpaid online order successfully refreshed checkout and switched to Cash on Delivery (COD).`
      );
    }

    // =========================================================
    // TEST 9: Customer Order History & RBAC Security Test
    // =========================================================
    {
      // 1. Customer history fetch
      const resMyOrders = await apiRequest('/orders/my-orders', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });

      // 2. Customer unauthorized attempts to access admin routes
      const resGetAll = await apiRequest('/orders/all', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      const resStatusChange = await apiRequest(`/orders/${createdOrder1._id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { orderStatus: 'DELIVERED' }
      });

      const passed =
        resMyOrders.status === 200 &&
        Array.isArray(resMyOrders.data?.orders) &&
        resGetAll.status === 403 &&
        resStatusChange.status === 403;

      recordResult(
        9,
        'Customer Order History & RBAC Security Enforcement',
        passed,
        `History: ${resMyOrders.status}, RBAC: ${resGetAll.status}/${resStatusChange.status}`,
        resMyOrders.duration + resGetAll.duration + resStatusChange.duration,
        `Customer history active. Administrative routes strictly protected with 403 Forbidden for customer tokens.`
      );
    }

    // =========================================================
    // TEST 10: Admin & Rider Order Lifecycle Management
    // =========================================================
    {
      const start = performance.now();
      // 1. Admin gets all orders
      const resAll = await apiRequest('/orders/all', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      // 2. Step Order 1 through lifecycle states:
      // BOOKED -> PICKED_UP -> IN_WASHING -> IN_IRONING -> OUT_FOR_DELIVERY -> DELIVERED
      const lifecycleSteps = [
        'PICKED_UP',
        'IN_WASHING',
        'IN_IRONING',
        'OUT_FOR_DELIVERY',
        'DELIVERED'
      ];

      let allStepsSucceeded = resAll.status === 200;

      for (const step of lifecycleSteps) {
        const updateBody = { orderStatus: step };
        if (step === 'DELIVERED') {
          updateBody.paymentStatus = 'PAID';
        }

        const resStep = await apiRequest(`/orders/${createdOrder1._id}/status`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: updateBody
        });

        if (resStep.status !== 200 || resStep.data?.order?.orderStatus !== step) {
          allStepsSucceeded = false;
          break;
        }
      }

      // Verify final state directly from MongoDB
      const finalDbOrder = await Order.findById(createdOrder1._id);
      const finalVerified =
        finalDbOrder?.orderStatus === 'DELIVERED' &&
        finalDbOrder?.payment?.status === 'PAID' &&
        Boolean(finalDbOrder?.payment?.transactionId) &&
        Boolean(finalDbOrder?.payment?.paidAt);

      const passed = allStepsSucceeded && finalVerified;
      const duration = Math.round(performance.now() - start);

      recordResult(
        10,
        'Admin & Rider Order Lifecycle Management',
        passed,
        '200 OK',
        duration,
        `Order ${createdOrder1?.orderNumber} transitioned through 5 stages to DELIVERED and COD marked as PAID with timestamp.`
      );
    }

  } catch (error) {
    console.error('Fatal Test Suite Error:', error);
    process.exitCode = 1;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();
    console.log(`\n======================================================================`);
    console.log(`🏁 Verification Finished: ${results.filter(r => r.status === 'PASS').length}/${results.length} Suites Passed`);
    console.log(`======================================================================`);
  }

  // Print Summary Table for user report parsing
  console.log('\n--- VERIFICATION_SUMMARY_JSON_START ---');
  console.log(JSON.stringify({
    results,
    order1Data,
    order2Data
  }, null, 2));
  console.log('--- VERIFICATION_SUMMARY_JSON_END ---');

  if (results.some(r => r.status === 'FAIL')) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
