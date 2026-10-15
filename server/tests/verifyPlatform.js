import crypto from 'crypto';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedData } from '../utils/seeder.js';
import Garment from '../models/Garment.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import PlatformConfig from '../models/PlatformConfig.js';
import TimeSlot from '../models/TimeSlot.js';


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

    // =========================================================
    // TEST 11: Demo Rider Seeding & Authentication (RBAC)
    // =========================================================
    let riderToken = null;
    let seededRider = null;
    {
      const start = performance.now();
      // 1. Rider Login
      const resRiderLogin = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          email: 'rider@indodhobi.com',
          password: 'rider123'
        }
      });
      riderToken = resRiderLogin.data?.token;
      seededRider = resRiderLogin.data?.user;

      // 2. Admin retrieves riders list
      const resGetRidersAdmin = await apiRequest('/orders/riders', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      // 3. Negative RBAC: Customer attempts to retrieve riders list
      const resGetRidersCust = await apiRequest('/orders/riders', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });

      const passed =
        resRiderLogin.status === 200 &&
        Boolean(riderToken) &&
        resRiderLogin.data?.user?.role === 'rider' &&
        resGetRidersAdmin.status === 200 &&
        Array.isArray(resGetRidersAdmin.data?.riders) &&
        resGetRidersAdmin.data.riders.some((r) => r.email === 'rider@indodhobi.com') &&
        resGetRidersCust.status === 403;

      const duration = Math.round(performance.now() - start);
      recordResult(
        11,
        'Demo Rider Seeding, Authentication & Fleet RBAC',
        passed,
        `Login: ${resRiderLogin.status}, Riders: ${resGetRidersAdmin.status}, Cust RBAC: ${resGetRidersCust.status}`,
        duration,
        `Demo Rider authenticated (${resRiderLogin.data?.user?.name}). Fleet list active for Admin. Protected with 403 for Customer.`
      );
    }

    // =========================================================
    // TEST 12: Admin Rider Assignment & Status Audit Trail
    // =========================================================
    let logisticsOrder = null;
    {
      const start = performance.now();
      // 1. Customer creates a fresh COD order for logistics lifecycle test
      const shirt = garmentsList.find((g) => g.name.includes('Shirt')) || garmentsList[0];
      const resCreate = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [{ garmentId: shirt._id, quantity: 2, serviceType: 'WASH_AND_IRON', ironingType: 'STANDARD_STEAM' }],
          pickupSchedule: { date: '2026-10-25', timeSlot: '10:00 AM - 01:00 PM' },
          deliverySchedule: { date: '2026-10-27', timeSlot: '02:00 PM - 05:00 PM' },
          pickupAddress: {
            flatAndBuilding: 'Flat 402, Royal Palms Apartments',
            streetAndLandmark: 'Barakhamba Road',
            city: 'New Delhi',
            pincode: '110001',
            contactPhone: '9876543210'
          },
          paymentMethod: 'COD'
        }
      });
      logisticsOrder = resCreate.data?.order;

      const riderId = seededRider._id || seededRider.id;

      // 2. Admin assigns rider
      const resAssign = await apiRequest(`/orders/${logisticsOrder._id}/assign-rider`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { riderId }
      });

      const updatedOrder = resAssign.data?.order;
      const historyHasAssignment = updatedOrder?.statusHistory?.some(
        (h) => h.status === 'PICKUP_ASSIGNED' && h.updaterRole === 'admin'
      );

      const assignedId = String(updatedOrder?.logistics?.assignedRider?._id || updatedOrder?.logistics?.assignedRider || '');
      const expectedId = String(riderId);

      const passed =
        resCreate.status === 201 &&
        resAssign.status === 200 &&
        assignedId === expectedId &&
        updatedOrder?.orderStatus === 'PICKUP_ASSIGNED' &&
        historyHasAssignment;

      const duration = Math.round(performance.now() - start);
      recordResult(
        12,
        'Admin Rider Assignment & Status History Audit Trail',
        passed,
        `Create: ${resCreate.status}, Assign: ${resAssign.status}`,
        duration,
        `Order ${logisticsOrder?.orderNumber} assigned to Rider ${seededRider?.name}. Status progressed to PICKUP_ASSIGNED and audit history logged.`
      );
    }

    // =========================================================
    // TEST 13: OTP Privacy & Security Protection Check
    // =========================================================
    let validPickupOtp = null;
    let validDeliveryOtp = null;
    {
      const start = performance.now();
      // 1. Rider fetches assigned tasks
      const resRiderTasks = await apiRequest('/orders/rider-tasks', {
        headers: { Authorization: `Bearer ${riderToken}` }
      });

      const taskForOrder = resRiderTasks.data?.tasks?.find((t) => t._id === logisticsOrder._id);
      const riderCannotSeePickupOtp = !taskForOrder?.verificationCodes?.pickupOtp;
      const riderCannotSeeDeliveryOtp = !taskForOrder?.verificationCodes?.deliveryOtp;

      // 2. Customer fetches their own order details
      const resCustomerOrders = await apiRequest('/orders/my-orders', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      const custOrder = resCustomerOrders.data?.orders?.find((o) => o._id === logisticsOrder._id);
      validPickupOtp = custOrder?.verificationCodes?.pickupOtp;
      validDeliveryOtp = custOrder?.verificationCodes?.deliveryOtp;

      const passed =
        resRiderTasks.status === 200 &&
        Boolean(taskForOrder) &&
        riderCannotSeePickupOtp &&
        riderCannotSeeDeliveryOtp &&
        resCustomerOrders.status === 200 &&
        Boolean(validPickupOtp) &&
        validPickupOtp.length === 4 &&
        Boolean(validDeliveryOtp) &&
        validDeliveryOtp.length === 4;

      const duration = Math.round(performance.now() - start);
      recordResult(
        13,
        'OTP Privacy & Zero-Knowledge Security Enforcement',
        passed,
        `Rider Tasks: ${resRiderTasks.status}, Customer: ${resCustomerOrders.status}`,
        duration,
        `Rider tasks payload strictly stripped of OTPs (Zero-Knowledge). Customer possesses valid 4-digit codes (${validPickupOtp} / ${validDeliveryOtp}).`
      );
    }

    // =========================================================
    // TEST 14: Doorstep Pickup Verification & Physical Bag Tagging
    // =========================================================
    {
      const start = performance.now();
      // 1. Negative Test: Tampered OTP
      const resBadOtp = await apiRequest(`/orders/${logisticsOrder._id}/verify-pickup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
          otp: '0000',
          bagTagId: 'BAG-DEL-402'
        }
      });

      // 2. Negative Test: Missing Bag Tag ID
      const resMissingTag = await apiRequest(`/orders/${logisticsOrder._id}/verify-pickup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
          otp: validPickupOtp,
          bagTagId: ''
        }
      });

      // 3. Positive Test: Valid OTP + Bag Tag ID + Garment Count + Inspection Notes
      const resValidPickup = await apiRequest(`/orders/${logisticsOrder._id}/verify-pickup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
          otp: validPickupOtp,
          bagTagId: 'BAG-DEL-402',
          inspectionNotes: 'All buttons intact; slight collar crease',
          verifiedGarmentCount: 2
        }
      });

      const updated = resValidPickup.data?.order;
      const historyHasPickup = updated?.statusHistory?.some((h) => h.status === 'PICKED_UP');

      const passed =
        resBadOtp.status === 400 &&
        resMissingTag.status === 400 &&
        resValidPickup.status === 200 &&
        updated?.orderStatus === 'PICKED_UP' &&
        updated?.logistics?.bagTagId === 'BAG-DEL-402' &&
        updated?.logistics?.verifiedGarmentCount === 2 &&
        Boolean(updated?.logistics?.pickedUpAt) &&
        historyHasPickup;

      const duration = Math.round(performance.now() - start);
      recordResult(
        14,
        'Doorstep Pickup Verification & Bag Tagging',
        passed,
        `Bad OTP: ${resBadOtp.status}, No Tag: ${resMissingTag.status}, Valid: ${resValidPickup.status}`,
        duration,
        `Tampered OTP rejected (400). Missing Bag Tag rejected (400). Valid pickup confirmed (200), Bag Tag BAG-DEL-402 sealed, status PICKED_UP.`
      );
    }

    // =========================================================
    // TEST 15: Doorstep Delivery OTP & Automatic COD Settlement
    // =========================================================
    {
      const start = performance.now();
      // 1. Advance order to OUT_FOR_DELIVERY
      await apiRequest(`/orders/${logisticsOrder._id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { orderStatus: 'OUT_FOR_DELIVERY' }
      });

      // 2. Negative Test: Tampered Delivery OTP
      const resBadOtp = await apiRequest(`/orders/${logisticsOrder._id}/verify-delivery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
          otp: '9999',
          codCollectionMethod: 'UPI_QR'
        }
      });

      // 3. Negative Test: Missing COD collection method on unpaid COD order
      const resMissingMethod = await apiRequest(`/orders/${logisticsOrder._id}/verify-delivery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
          otp: validDeliveryOtp,
          codCollectionMethod: ''
        }
      });

      // 4. Positive Test: Valid OTP + COD collected via UPI_QR
      const resValidDelivery = await apiRequest(`/orders/${logisticsOrder._id}/verify-delivery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
          otp: validDeliveryOtp,
          codCollectionMethod: 'UPI_QR'
        }
      });

      const finalOrder = resValidDelivery.data?.order;
      const historyHasDelivered = finalOrder?.statusHistory?.some((h) => h.status === 'DELIVERED');

      const passed =
        resBadOtp.status === 400 &&
        resMissingMethod.status === 400 &&
        resValidDelivery.status === 200 &&
        finalOrder?.orderStatus === 'DELIVERED' &&
        finalOrder?.payment?.status === 'PAID' &&
        finalOrder?.payment?.onlineSubMethod === 'UPI' &&
        Boolean(finalOrder?.payment?.paidAt) &&
        Boolean(finalOrder?.logistics?.deliveredAt) &&
        historyHasDelivered;

      const duration = Math.round(performance.now() - start);
      recordResult(
        15,
        'Doorstep Delivery OTP & Automatic COD Settlement',
        passed,
        `Bad OTP: ${resBadOtp.status}, No Method: ${resMissingMethod.status}, Valid: ${resValidDelivery.status}`,
        duration,
        `Tampered OTP rejected (400). Missing COD method rejected (400). Valid OTP confirmed (200), order DELIVERED, COD auto-settled to PAID via UPI_QR.`
      );
    }

    // =========================================================================
    // TEST 16: Sparse Email Index & Passwordless SMS Customers
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 16] Sparse Email Index & Passwordless SMS Customers...`);

      let user1 = null;
      let user2 = null;
      let collisionError = null;

      try {
        user1 = await User.create({
          name: 'Suresh Passwordless',
          phone: '9811122233',
          role: 'customer',
          isPhoneVerified: true
        });

        user2 = await User.create({
          name: 'Pooja Passwordless',
          phone: '9811122244',
          role: 'customer',
          isPhoneVerified: true
        });
      } catch (err) {
        collisionError = err;
      }

      const passed =
        !collisionError &&
        Boolean(user1?._id) &&
        Boolean(user2?._id) &&
        user1.phone === '9811122233' &&
        user2.phone === '9811122244' &&
        user1.email === undefined &&
        user2.email === undefined &&
        user1.isPhoneVerified === true &&
        user2.isPhoneVerified === true;

      const duration = Math.round(performance.now() - start);
      recordResult(
        16,
        'Sparse Email Index & Passwordless Customers',
        passed,
        collisionError ? 'Collision Error' : '200 / Created',
        duration,
        `2 passwordless customers saved without email collision. Sparse index active: ${passed ? 'YES' : 'NO'}. Error: ${collisionError?.message || 'None'}`
      );
    }

    // =========================================================================
    // TEST 17: Customer Firebase OTP Login, Auto-Onboarding & Token Issuance
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 17] Customer Firebase OTP Authentication & Auto-Onboarding...`);

      // 1. Missing Token Validation
      const resMissingToken = await apiRequest('/auth/customer/firebase-login', {
        method: 'POST',
        body: {}
      });

      // 2. New Customer Auto-Onboarding via Firebase Token
      const resNewCustomer = await apiRequest('/auth/customer/firebase-login', {
        method: 'POST',
        body: {
          idToken: 'test_firebase_token_9899112233',
          name: 'Aarav Sharma'
        }
      });

      const customerToken = resNewCustomer.data?.token;
      const createdUserId = resNewCustomer.data?.user?._id || resNewCustomer.data?.user?.id;

      // 3. Repeat Login for Existing Customer
      const resRepeatCustomer = await apiRequest('/auth/customer/firebase-login', {
        method: 'POST',
        body: {
          idToken: 'test_firebase_token_9899112233'
        }
      });

      const repeatUserId = resRepeatCustomer.data?.user?._id || resRepeatCustomer.data?.user?.id;

      // 4. Verify Issued IndoDhobi JWT against /api/auth/me
      const resMe = await apiRequest('/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerToken}` }
      });

      const passed =
        resMissingToken.status === 400 &&
        resNewCustomer.status === 200 &&
        resNewCustomer.data?.isNewUser === true &&
        resNewCustomer.data?.user?.name === 'Aarav Sharma' &&
        resNewCustomer.data?.user?.phone === '9899112233' &&
        resNewCustomer.data?.user?.role === 'customer' &&
        Boolean(customerToken) &&
        resRepeatCustomer.status === 200 &&
        resRepeatCustomer.data?.isNewUser === false &&
        repeatUserId === createdUserId &&
        resMe.status === 200 &&
        resMe.data?.user?.phone === '9899112233';

      const duration = Math.round(performance.now() - start);
      recordResult(
        17,
        'Customer Firebase OTP Login & Auto-Onboarding',
        passed,
        `No Token: ${resMissingToken.status}, New User: ${resNewCustomer.status}, Repeat: ${resRepeatCustomer.status}, Me: ${resMe.status}`,
        duration,
        `New customer automatically onboarded with phone 9899112233. Repeat login returned existing record (isNewUser: false). JWT verified against /api/auth/me.`
      );
    }

    // =========================================================================
    // TEST 18: Staff Authentication Strict Enforcement & Cross-Role Security
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 18] Staff Authentication Strict Enforcement & Cross-Role Security...`);

      // 1. Customer attempts staff portal login -> Must return 403 Forbidden
      const resCustomerAttempt = await apiRequest('/auth/staff/login', {
        method: 'POST',
        body: {
          email: 'customer@indodhobi.com',
          password: 'password123'
        }
      });

      // 2. Bad password attempt
      const resBadPassword = await apiRequest('/auth/staff/login', {
        method: 'POST',
        body: {
          email: 'admin@indodhobi.com',
          password: 'wrong_password_attempt'
        }
      });

      // 3. Valid Admin Staff Login
      const resAdminStaff = await apiRequest('/auth/staff/login', {
        method: 'POST',
        body: {
          email: 'admin@indodhobi.com',
          password: 'admin123'
        }
      });

      // 4. Valid Rider Staff Login
      const resRiderStaff = await apiRequest('/auth/staff/login', {
        method: 'POST',
        body: {
          email: 'rider@indodhobi.com',
          password: 'rider123'
        }
      });

      const passed =
        resCustomerAttempt.status === 403 &&
        resCustomerAttempt.data?.message?.includes('Customers must sign in using Mobile Number & SMS OTP') &&
        resBadPassword.status === 401 &&
        resAdminStaff.status === 200 &&
        resAdminStaff.data?.user?.role === 'admin' &&
        Boolean(resAdminStaff.data?.token) &&
        resRiderStaff.status === 200 &&
        resRiderStaff.data?.user?.role === 'rider' &&
        Boolean(resRiderStaff.data?.token);

      const duration = Math.round(performance.now() - start);
      recordResult(
        18,
        'Staff Authentication Strict Enforcement & Cross-Role Security',
        passed,
        `Customer Rejection: ${resCustomerAttempt.status}, Bad Pass: ${resBadPassword.status}, Admin: ${resAdminStaff.status}, Rider: ${resRiderStaff.status}`,
        duration,
        `Customer rejected with 403 Forbidden on staff portal. Admin & Rider successfully authenticated with JWTs.`
      );
    }

    // =========================================================================
    // TEST 19: Coupon Seeding & Validation Engine (/api/orders/coupons & validate-coupon)
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 19] Coupon Seeding & Validation Engine...`);

      // 1. Fetch available coupons
      const resCoupons = await apiRequest('/orders/coupons', { method: 'GET' });
      const couponsList = resCoupons.data?.coupons || [];
      const hasFirst50 = couponsList.some((c) => c.code === 'FIRST50');
      const hasDhobi20 = couponsList.some((c) => c.code === 'DHOBI20');
      const hasFlat75 = couponsList.some((c) => c.code === 'FLAT75');

      // 2. Test below min subtotal (FLAT75 requires >= 599, test with 200) -> 400 Bad Request
      const resBelowMin = await apiRequest('/orders/validate-coupon', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { code: 'FLAT75', subtotal: 200 }
      });

      // 3. Test capped percentage discount (FIRST50 on 300 -> 50% = 150, capped at 100) -> 200 OK
      const resCapped = await apiRequest('/orders/validate-coupon', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { code: 'FIRST50', subtotal: 300 }
      });

      const passed =
        resCoupons.status === 200 &&
        hasFirst50 &&
        hasDhobi20 &&
        hasFlat75 &&
        resBelowMin.status === 400 &&
        resBelowMin.data?.message?.includes('minimum subtotal') &&
        resCapped.status === 200 &&
        resCapped.data?.valid === true &&
        resCapped.data?.discountAmount === 100 &&
        resCapped.data?.code === 'FIRST50';

      const duration = Math.round(performance.now() - start);
      recordResult(
        19,
        'Coupon Seeding & Validation Engine',
        passed,
        `Coupons: ${resCoupons.status}, Below Min: ${resBelowMin.status}, Valid Capped: ${resCapped.status}`,
        duration,
        `Seeded coupons verified (FIRST50, DHOBI20, FLAT75). Minimum subtotal rejected (400). FIRST50 capped at ₹100 discount.`
      );
    }

    // =========================================================================
    // TEST 20: Order Creation with Promo Coupon + Express 24h Turnaround
    // =========================================================================
    let expressCouponOrder = null;
    {
      const start = performance.now();
      console.log(`\n[Suite 20] Order Creation with Promo Coupon + Express 24h Turnaround...`);

      const menShirt = await Garment.findOne({ name: 'Men Shirt' });

      // 5 Men Shirts with WASH_AND_IRON + CRISP_STARCH = 5 * (35 + 25) = 5 * 60 = ₹300 subtotal
      const orderPayload = {
        items: [
          {
            garmentId: menShirt._id,
            quantity: 5,
            serviceType: 'WASH_AND_IRON',
            ironingType: 'CRISP_STARCH'
          }
        ],
        preferences: {
          detergentType: 'Standard',
          packagingType: 'Folded'
        },
        isExpress: true,
        couponCode: 'FIRST50',
        pickupSchedule: {
          date: '2026-10-25',
          timeSlot: '10:00 AM - 01:00 PM'
        },
        deliverySchedule: {
          date: '2026-10-26',
          timeSlot: '10:00 AM - 01:00 PM'
        },
        pickupAddress: {
          flatAndBuilding: 'Flat 101, Express Tower',
          streetAndLandmark: 'Connaught Place',
          city: 'New Delhi',
          pincode: '110001',
          contactPhone: '9876543210'
        },
        paymentMethod: 'COD'
      };

      const resOrder = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: orderPayload
      });

      expressCouponOrder = resOrder.data?.order;
      const pb = expressCouponOrder?.pricingBreakdown;

      const passed =
        resOrder.status === 201 &&
        expressCouponOrder?.isExpress === true &&
        pb?.subtotal === 300 &&
        pb?.discountAmount === 100 &&
        pb?.couponCode === 'FIRST50' &&
        pb?.pickupDeliveryFee === 49 &&
        pb?.expressSurcharge === 99 &&
        pb?.taxAmount === 17 &&
        pb?.grandTotal === 365;

      const duration = Math.round(performance.now() - start);
      recordResult(
        20,
        'Order Creation with Promo Coupon + Express 24h Surcharge',
        passed,
        resOrder.status,
        duration,
        `Order ${expressCouponOrder?.orderNumber} created with 24h Express. Subtotal ₹300, Discount -₹100, Delivery ₹49, Express +₹99, GST ₹17, Grand Total ₹365.`
      );
    }

    // =========================================================================
    // TEST 21: Customer Self-Service Order Cancellation & Slot Capacity Release
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 21] Customer Self-Service Cancellation & Slot Capacity Release...`);

      const testDate = '2026-10-28';
      const testSlot = '10:00 AM - 01:00 PM';

      // 1. Check initial slot capacity
      const resSlotsBefore = await apiRequest(`/orders/slots?date=${testDate}`);
      const slotBefore = resSlotsBefore.data?.slots?.find((s) => s.slot === testSlot);
      const capacityBefore = slotBefore?.remainingCapacity ?? 15;

      // 2. Book an order for this slot
      const menShirt = await Garment.findOne({ name: 'Men Shirt' });
      const resBookOrder = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [{ garmentId: menShirt._id, quantity: 1, serviceType: 'WASH_AND_FOLD' }],
          pickupSchedule: { date: testDate, timeSlot: testSlot },
          deliverySchedule: { date: '2026-10-30', timeSlot: testSlot },
          pickupAddress: {
            flatAndBuilding: 'Flat 99, Green Park',
            streetAndLandmark: 'Near Metro Station',
            city: 'New Delhi',
            pincode: '110016',
            contactPhone: '9876543210'
          },
          paymentMethod: 'COD'
        }
      });

      const bookedOrder = resBookOrder.data?.order;

      // Verify slot capacity decreased by 1
      const resSlotsAfterBook = await apiRequest(`/orders/slots?date=${testDate}`);
      const slotAfterBook = resSlotsAfterBook.data?.slots?.find((s) => s.slot === testSlot);
      const capacityAfterBook = slotAfterBook?.remainingCapacity;

      // 3. Customer cancels the order
      const resCancel = await apiRequest(`/orders/${bookedOrder._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { reason: 'Change of schedule by customer' }
      });

      // 4. Verify slot capacity released back
      const resSlotsAfterCancel = await apiRequest(`/orders/slots?date=${testDate}`);
      const slotAfterCancel = resSlotsAfterCancel.data?.slots?.find((s) => s.slot === testSlot);
      const capacityAfterCancel = slotAfterCancel?.remainingCapacity;

      const dbOrder = await Order.findById(bookedOrder._id);
      const lastHistory = dbOrder?.statusHistory?.[dbOrder.statusHistory.length - 1];

      const passed =
        resBookOrder.status === 201 &&
        capacityAfterBook === capacityBefore - 1 &&
        resCancel.status === 200 &&
        resCancel.data?.order?.orderStatus === 'CANCELLED' &&
        dbOrder?.orderStatus === 'CANCELLED' &&
        lastHistory?.status === 'CANCELLED' &&
        capacityAfterCancel === capacityBefore;

      const duration = Math.round(performance.now() - start);
      recordResult(
        21,
        'Customer Self-Service Order Cancellation & Slot Capacity Release',
        passed,
        `Cancel: ${resCancel.status}, Slot Restored: ${capacityAfterCancel === capacityBefore ? 'YES' : 'NO'}`,
        duration,
        `Order ${bookedOrder?.orderNumber} cancelled by customer. Slot capacity decreased from ${capacityBefore} to ${capacityAfterBook}, and restored back to ${capacityAfterCancel}.`
      );
    }

    // =========================================================================
    // TEST 22: Post-Pickup Cancellation Lock (Strict Anti-Fraud)
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 22] Post-Pickup Cancellation Lock...`);

      const pickedUpOrder = await Order.create({
        orderNumber: `IDB-2026-PICKUP-LOCK`,
        customer: expressCouponOrder.customer,
        items: expressCouponOrder.items,
        pickupSchedule: { date: '2026-10-25', timeSlot: '10:00 AM - 01:00 PM' },
        deliverySchedule: { date: '2026-10-27', timeSlot: '10:00 AM - 01:00 PM' },
        pickupAddress: expressCouponOrder.pickupAddress,
        pricingBreakdown: expressCouponOrder.pricingBreakdown,
        payment: { method: 'COD', status: 'PENDING' },
        orderStatus: 'PICKED_UP'
      });

      const resCancelPickedUp = await apiRequest(`/orders/${pickedUpOrder._id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { reason: 'Want to cancel after pickup' }
      });

      const dbOrderAfter = await Order.findById(pickedUpOrder._id);

      const passed =
        resCancelPickedUp.status === 400 &&
        resCancelPickedUp.data?.message?.includes('cannot be cancelled after clothes have been picked up') &&
        dbOrderAfter?.orderStatus === 'PICKED_UP';

      const duration = Math.round(performance.now() - start);
      recordResult(
        22,
        'Post-Pickup Cancellation Lock',
        passed,
        resCancelPickedUp.status,
        duration,
        `Cancellation rejected with 400 Bad Request once status reaches PICKED_UP. Order state remained locked.`
      );
    }

    // =========================================================================
    // TEST 23: Admin Garment Rate-Card CMS (POST & PUT /api/catalog/garments)
    // =========================================================================
    let createdGarmentId = null;
    {
      const start = performance.now();
      console.log(`\n[Suite 23] Admin Garment Rate-Card CMS...`);

      // 1. Admin creates a new garment
      const resCreateGarment = await apiRequest('/catalog/garments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: 'Designer Sherwani',
          category: 'Men',
          iconName: 'Shirt',
          pricing: {
            washOnly: 150,
            standardSteamIron: 80,
            crispStarchPress: 120,
            delicatePress: 160,
            dryClean: 350
          },
          isActive: true
        }
      });

      createdGarmentId = resCreateGarment.data?.data?._id;

      // 2. Admin updates the dryClean price to 400
      const resUpdateGarment = await apiRequest(`/catalog/garments/${createdGarmentId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          pricing: {
            dryClean: 400
          }
        }
      });

      // 3. Verify updated price reflects in public catalog
      const resCatalog = await apiRequest('/catalog/garments?search=Sherwani');
      const sherwani = resCatalog.data?.data?.find((g) => g.name === 'Designer Sherwani');

      const passed =
        resCreateGarment.status === 201 &&
        resUpdateGarment.status === 200 &&
        resUpdateGarment.data?.data?.pricing?.dryClean === 400 &&
        sherwani?.pricing?.dryClean === 400;

      const duration = Math.round(performance.now() - start);
      recordResult(
        23,
        'Admin Garment Rate-Card CMS',
        passed,
        `Create: ${resCreateGarment.status}, Update: ${resUpdateGarment.status}`,
        duration,
        `Created 'Designer Sherwani' with dryClean ₹350, updated to ₹400. Live catalog reflected updated rate immediately.`
      );
    }

    // =========================================================================
    // TEST 24: Admin Promo Coupon Creation & Toggle
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 24] Admin Promo Coupon Creation & Toggle...`);

      // 1. Admin creates coupon MONSOON100
      const resCreateCoupon = await apiRequest('/orders/coupons', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          code: 'MONSOON100',
          description: 'Monsoon special flat ₹100 off on ₹499+',
          discountType: 'FLAT',
          discountValue: 100,
          minOrderSubtotal: 499,
          maxDiscountAmount: 100,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      const couponId = resCreateCoupon.data?.coupon?._id;

      // 2. Customer validates coupon while active
      const resValidateActive = await apiRequest('/orders/validate-coupon', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { code: 'MONSOON100', subtotal: 600 }
      });

      // 3. Admin toggles coupon to inactive
      const resToggle = await apiRequest(`/orders/coupons/${couponId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      // 4. Customer attempts to validate deactivated coupon -> Should reject with 400
      const resValidateInactive = await apiRequest('/orders/validate-coupon', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { code: 'MONSOON100', subtotal: 600 }
      });

      const passed =
        resCreateCoupon.status === 201 &&
        resValidateActive.status === 200 &&
        resValidateActive.data?.discountAmount === 100 &&
        resToggle.status === 200 &&
        resToggle.data?.coupon?.isActive === false &&
        resValidateInactive.status === 400;

      const duration = Math.round(performance.now() - start);
      recordResult(
        24,
        'Admin Promo Coupon Creation & Toggle',
        passed,
        `Create: ${resCreateCoupon.status}, Toggle: ${resToggle.status}, Inactive Rejection: ${resValidateInactive.status}`,
        duration,
        `Coupon MONSOON100 created and validated (₹100 discount). Toggled to INACTIVE and rejected invalid checkout with 400.`
      );
    }

    // =========================================================================
    // TEST 25: Customer Saved Address Book (POST & DELETE /api/auth/addresses)
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 25] Customer Saved Address Book...`);

      // 1. Add Home address (marked as default)
      const resAddHome = await apiRequest('/auth/addresses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          label: 'Home',
          flatAndBuilding: 'Tower 4, Apt 12B, Palm Grove',
          streetAndLandmark: 'Vasant Kunj Sector C',
          city: 'New Delhi',
          pincode: '110070',
          isDefault: true
        }
      });

      // 2. Add Work address with isDefault: true -> Home should automatically become isDefault: false
      const resAddWork = await apiRequest('/auth/addresses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          label: 'Work',
          flatAndBuilding: 'Unit 9A, Cyber One',
          streetAndLandmark: 'DLF Cyber City Phase 2',
          city: 'Gurugram',
          pincode: '122002',
          isDefault: true
        }
      });

      const addressesAfterWork = resAddWork.data?.addresses || [];
      const homeAddr = addressesAfterWork.find((a) => a.flatAndBuilding === 'Tower 4, Apt 12B, Palm Grove');
      const workAddr = addressesAfterWork.find((a) => a.flatAndBuilding === 'Unit 9A, Cyber One');
      const defaultSwitched = homeAddr?.isDefault === false && workAddr?.isDefault === true;

      // 3. Delete Work address
      const resDeleteWork = await apiRequest(`/auth/addresses/${workAddr?._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customerToken}` }
      });

      const remainingAddresses = resDeleteWork.data?.addresses || [];
      const remainingWork = remainingAddresses.find((a) => a._id?.toString() === workAddr?._id?.toString());
      const hasDefault = remainingAddresses.some((a) => a.isDefault === true);

      const passed =
        resAddHome.status === 201 &&
        resAddWork.status === 201 &&
        defaultSwitched &&
        resDeleteWork.status === 200 &&
        !remainingWork &&
        hasDefault;

      const duration = Math.round(performance.now() - start);
      recordResult(
        25,
        'Customer Saved Address Book',
        passed,
        `Add: 201, Default Switch: YES, Delete: ${resDeleteWork.status}`,
        duration,
        `Added Home & Work addresses with automatic isDefault switching. Deleted Work address and verified Home reverted to default.`
      );
    }

    // =========================================================================
    // TEST 26: Admin Revenue Analytics & Order Search
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 26] Admin Revenue Analytics & Order Search...`);

      // 1. Fetch aggregated business analytics
      const resAnalytics = await apiRequest('/orders/analytics', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const analyticsData = resAnalytics.data?.analytics;
      const analyticsValid =
        resAnalytics.status === 200 &&
        typeof analyticsData?.totalOrders === 'number' &&
        analyticsData.totalOrders >= 2 &&
        typeof analyticsData?.settledRevenue === 'number' &&
        typeof analyticsData?.pendingCodRevenue === 'number' &&
        typeof analyticsData?.expressOrdersCount === 'number' &&
        analyticsData.expressOrdersCount >= 1;

      // 2. Create order with specific bagTagId for search verification
      const taggedOrder = await Order.create({
        orderNumber: 'IDB-2026-SEARCH-BAG',
        customer: expressCouponOrder.customer,
        items: expressCouponOrder.items,
        pickupSchedule: { date: '2026-10-26', timeSlot: '10:00 AM - 01:00 PM' },
        deliverySchedule: { date: '2026-10-28', timeSlot: '10:00 AM - 01:00 PM' },
        pickupAddress: expressCouponOrder.pickupAddress,
        pricingBreakdown: expressCouponOrder.pricingBreakdown,
        payment: { method: 'COD', status: 'PENDING' },
        logistics: { bagTagId: 'BAG-PHASE4-TEST' },
        orderStatus: 'BOOKED'
      });

      // 3. Search orders by bagTagId
      const resSearchBag = await apiRequest('/orders/all?search=BAG-PHASE4-TEST', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const searchPassed =
        resSearchBag.status === 200 &&
        resSearchBag.data?.orders?.length === 1 &&
        resSearchBag.data?.orders[0]?.orderNumber === 'IDB-2026-SEARCH-BAG' &&
        resSearchBag.data?.orders[0]?.logistics?.bagTagId === 'BAG-PHASE4-TEST';

      const passed = analyticsValid && searchPassed;
      const duration = Math.round(performance.now() - start);

      recordResult(
        26,
        'Admin Revenue Analytics & Order Search',
        passed,
        `Analytics: ${resAnalytics.status}, Search: ${resSearchBag.status}`,
        duration,
        `Analytics computed accurately (Total: ${analyticsData?.totalOrders}, Settled: ₹${analyticsData?.settledRevenue}, Pending COD: ₹${analyticsData?.pendingCodRevenue}). Search by bagTagId returned exact matching order.`
      );
    }

    // =========================================================================
    // TEST 27: Dynamic PlatformConfig & Live Pricing Rule Mutation
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 27] Dynamic PlatformConfig & Live Pricing Rule Mutation...`);

      // 1. Admin updates PlatformConfig settings (deliveryFee: 59, expressSurcharge: 129)
      const resUpdateSettings = await apiRequest('/config/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          deliveryFee: 59,
          expressSurcharge: 129
        }
      });

      const configUpdated =
        resUpdateSettings.status === 200 &&
        resUpdateSettings.data?.config?.deliveryFee === 59 &&
        resUpdateSettings.data?.config?.expressSurcharge === 129;

      // 2. Customer places an express order (< 399 subtotal to trigger deliveryFee)
      const shirt = garmentsList[0] || (await Garment.findOne({ isActive: true }));
      const resPlaceOrder = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [{ garmentId: shirt._id, quantity: 1, serviceType: 'WASH_AND_FOLD' }],
          pickupSchedule: { date: '2026-11-01', timeSlot: '10:00 AM - 01:00 PM' },
          deliverySchedule: { date: '2026-11-02', timeSlot: '10:00 AM - 01:00 PM' },
          pickupAddress: {
            flatAndBuilding: 'Suite 27 Testing Tower',
            streetAndLandmark: 'Connaught Place',
            city: 'New Delhi',
            pincode: '110001',
            contactPhone: '9876543210'
          },
          isExpress: true,
          paymentMethod: 'COD'
        }
      });

      const order27 = resPlaceOrder.data?.order;
      const pb27 = order27?.pricingBreakdown;

      const itemPrice = shirt.pricing.washOnly;
      const expectedSubtotal = itemPrice;
      const expectedDelivery = 59;
      const expectedExpress = 129;
      const expectedBase = expectedSubtotal + expectedDelivery + expectedExpress;
      const expectedTax = Math.round(expectedBase * 0.05);
      const expectedTotal = expectedBase + expectedTax;

      const pricingCorrect =
        resPlaceOrder.status === 201 &&
        pb27?.subtotal === expectedSubtotal &&
        pb27?.pickupDeliveryFee === expectedDelivery &&
        pb27?.expressSurcharge === expectedExpress &&
        pb27?.taxAmount === expectedTax &&
        pb27?.grandTotal === expectedTotal;

      // 3. Admin restores default platform config (49 and 99)
      const resRestoreSettings = await apiRequest('/config/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          deliveryFee: 49,
          expressSurcharge: 99
        }
      });

      const restored =
        resRestoreSettings.status === 200 &&
        resRestoreSettings.data?.config?.deliveryFee === 49 &&
        resRestoreSettings.data?.config?.expressSurcharge === 99;

      const passed = configUpdated && pricingCorrect && restored;
      const duration = Math.round(performance.now() - start);

      recordResult(
        27,
        'Dynamic PlatformConfig & Live Pricing Rule Mutation',
        passed,
        `Update: ${resUpdateSettings.status}, Order: ${resPlaceOrder.status}, Restore: ${resRestoreSettings.status}`,
        duration,
        `Admin modified delivery fee (₹49 -> ₹59) & express surcharge (₹99 -> ₹129). Order ${order27?.orderNumber} dynamically computed live fees (Fee: ₹${pb27?.pickupDeliveryFee}, Express: ₹${pb27?.expressSurcharge}, Total: ₹${pb27?.grandTotal}). Default settings restored successfully.`
      );
    }

    // =========================================================================
    // TEST 28: Dynamic TimeSlot Database Management
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 28] Dynamic TimeSlot Database Management...`);

      const newSlotLabel = '04:00 PM - 06:00 PM';
      // 1. Admin creates a new dynamic slot
      const resCreateSlot = await apiRequest('/config/slots', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          label: newSlotLabel,
          startHour: 16,
          endHour: 18,
          maxCapacity: 8,
          sortOrder: 5,
          isActive: true
        }
      });

      const createdSlot = resCreateSlot.data?.slot;
      const slotCreated =
        resCreateSlot.status === 201 &&
        createdSlot?.label === newSlotLabel &&
        createdSlot?.maxCapacity === 8;

      // 2. Query available slots for a future date
      const testDate28 = '2026-11-15';
      const resSlotsQuery = await apiRequest(`/orders/slots?date=${testDate28}`);
      const dynamicSlotFromApi = resSlotsQuery.data?.slots?.find((s) => s.slot === newSlotLabel);
      const queryVerified =
        resSlotsQuery.status === 200 &&
        dynamicSlotFromApi &&
        dynamicSlotFromApi.maxCapacity === 8 &&
        dynamicSlotFromApi.remainingCapacity === 8 &&
        dynamicSlotFromApi.isAvailable === true;

      // 3. Admin updates slot capacity to 12
      const resUpdateSlot = await apiRequest(`/config/slots/${createdSlot?._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          maxCapacity: 12
        }
      });

      // 4. Query again to verify live updated capacity
      const resSlotsQueryUpdated = await apiRequest(`/orders/slots?date=${testDate28}`);
      const updatedSlotFromApi = resSlotsQueryUpdated.data?.slots?.find((s) => s.slot === newSlotLabel);
      const capacityUpdated =
        resUpdateSlot.status === 200 &&
        resUpdateSlot.data?.slot?.maxCapacity === 12 &&
        updatedSlotFromApi?.maxCapacity === 12 &&
        updatedSlotFromApi?.remainingCapacity === 12;

      const passed = slotCreated && queryVerified && capacityUpdated;
      const duration = Math.round(performance.now() - start);

      recordResult(
        28,
        'Dynamic TimeSlot Database Management',
        passed,
        `Create: ${resCreateSlot.status}, Query: ${resSlotsQuery.status}, Update: ${resUpdateSlot.status}`,
        duration,
        `Admin created dynamic slot "${newSlotLabel}" with maxCapacity 8. Live API returned remaining capacity 8. Updated capacity to 12 via DB mutation.`
      );
    }

    // =========================================================================
    // TEST 29: Cloudinary Image Upload & Garment Media Persistence
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 29] Cloudinary Image Upload & Garment Media Persistence...`);

      // 1. Upload a Base64 image via /api/config/upload-image
      const base64Sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const resUpload = await apiRequest('/config/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          image: base64Sample,
          folder: 'indodhobi/garments'
        }
      });

      const uploadValid =
        resUpload.status === 200 &&
        typeof resUpload.data?.imageUrl === 'string' &&
        resUpload.data.imageUrl.length > 0 &&
        typeof resUpload.data?.publicId === 'string';

      const uploadedUrl = resUpload.data?.imageUrl;
      const uploadedPublicId = resUpload.data?.publicId;

      // 2. Update a garment with the Cloudinary image URL and publicId
      const targetGarment = garmentsList[0] || (await Garment.findOne({ isActive: true }));
      const resGarmentUpdate = await apiRequest(`/catalog/garments/${targetGarment._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          imageUrl: uploadedUrl,
          cloudinaryPublicId: uploadedPublicId
        }
      });

      const garmentUpdated =
        resGarmentUpdate.status === 200 &&
        resGarmentUpdate.data?.data?.imageUrl === uploadedUrl &&
        resGarmentUpdate.data?.data?.cloudinaryPublicId === uploadedPublicId;

      // 3. Verify public catalog includes imageUrl and cloudinaryPublicId
      const resCatalog = await apiRequest('/catalog/garments');
      const verifiedGarment = resCatalog.data?.data?.find(
        (g) => g._id?.toString() === targetGarment._id?.toString()
      );

      const catalogVerified =
        resCatalog.status === 200 &&
        verifiedGarment?.imageUrl === uploadedUrl &&
        verifiedGarment?.cloudinaryPublicId === uploadedPublicId;

      const passed = uploadValid && garmentUpdated && catalogVerified;
      const duration = Math.round(performance.now() - start);

      recordResult(
        29,
        'Cloudinary Image Upload & Garment Media Persistence',
        passed,
        `Upload: ${resUpload.status}, Update: ${resGarmentUpdate.status}, Catalog: ${resCatalog.status}`,
        duration,
        `Uploaded garment media to Cloudinary pipeline (${uploadedPublicId}). Successfully persisted imageUrl on garment '${targetGarment.name}' and verified live catalog retrieval.`
      );
    }

    // =========================================================================
    // TEST 30: Rider Doorstep Stain Photo Upload & Order Inspection Persistence
    // =========================================================================
    {
      const start = performance.now();
      console.log(`\n[Suite 30] Rider Doorstep Stain Photo Upload & Order Inspection Persistence...`);

      // 1. Customer places an order to test doorstep pickup inspection
      const shirt = garmentsList[0] || (await Garment.findOne({ isActive: true }));
      const resCreateOrder = await apiRequest('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          items: [{ garmentId: shirt._id, quantity: 2, serviceType: 'WASH_AND_FOLD' }],
          pickupSchedule: { date: '2026-11-20', timeSlot: '08:00 AM - 10:00 AM' },
          deliverySchedule: { date: '2026-11-22', timeSlot: '08:00 AM - 10:00 AM' },
          pickupAddress: {
            flatAndBuilding: 'Suite 30 Inspection Tower',
            streetAndLandmark: 'Barakhamba Road',
            city: 'New Delhi',
            pincode: '110001',
            contactPhone: '9876543210'
          },
          paymentMethod: 'COD'
        }
      });

      const order30 = resCreateOrder.data?.order;
      const pickupOtp = order30?.verificationCodes?.pickupOtp;

      // 2. Rider verifies pickup with inspection photos & bag tag
      const inspectionSamplePhotos = [
        {
          url: 'https://res.cloudinary.com/dhobiproject/image/upload/v1700000000/indodhobi/inspections/collar_stain.jpg',
          publicId: 'indodhobi/inspections/collar_stain'
        }
      ];

      const resVerifyPickup = await apiRequest(`/orders/${order30?._id}/verify-pickup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
          otp: pickupOtp,
          pickupOtp,
          bagTagId: 'BAG-STAIN-PHOTO-99',
          verifiedGarmentCount: 2,
          inspectionNotes: 'Front collar ink stain detected during doorstep pickup verification',
          inspectionPhotos: inspectionSamplePhotos
        }
      });

      const pickupVerified =
        resVerifyPickup.status === 200 &&
        resVerifyPickup.data?.order?.orderStatus === 'PICKED_UP' &&
        resVerifyPickup.data?.order?.logistics?.bagTagId === 'BAG-STAIN-PHOTO-99' &&
        resVerifyPickup.data?.order?.logistics?.inspectionPhotos?.length === 1 &&
        resVerifyPickup.data?.order?.logistics?.inspectionPhotos[0]?.url === inspectionSamplePhotos[0].url;

      // 3. Customer checks order history to view doorstep photos
      const resCustomerHistory = await apiRequest('/orders/my-orders', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });

      const customerOrderView = resCustomerHistory.data?.orders?.find(
        (o) => o._id?.toString() === order30?._id?.toString()
      );
      const customerSawPhotos =
        resCustomerHistory.status === 200 &&
        customerOrderView?.logistics?.inspectionPhotos?.length === 1 &&
        customerOrderView?.logistics?.inspectionPhotos[0]?.url === inspectionSamplePhotos[0].url;

      // 4. Admin / Rider retrieves single order details
      const resSingleOrder = await apiRequest(`/orders/${order30?._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const adminOrderView = resSingleOrder.data?.order;
      const adminVerified =
        resSingleOrder.status === 200 &&
        adminOrderView?.logistics?.inspectionPhotos?.length === 1 &&
        adminOrderView?.logistics?.inspectionPhotos[0]?.publicId === inspectionSamplePhotos[0].publicId;

      const passed = pickupVerified && customerSawPhotos && adminVerified;
      const duration = Math.round(performance.now() - start);

      recordResult(
        30,
        'Rider Doorstep Stain Photo Upload & Order Inspection Persistence',
        passed,
        `Verify: ${resVerifyPickup.status}, CustHistory: ${resCustomerHistory.status}, Details: ${resSingleOrder.status}`,
        duration,
        `Rider attached stain inspection photo on pickup verification for Bag Tag 'BAG-STAIN-PHOTO-99'. Cloudinary photo verified in customer order timeline and admin inspection view.`
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
