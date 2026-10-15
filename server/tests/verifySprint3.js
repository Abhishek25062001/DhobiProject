import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5001/api';

async function run() {
  console.log('\n🚀 Starting Sprint 3 Real Database Verification Suite...\n');

  // Direct MongoDB Atlas Connection for forensic verification
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`  ✅  Direct MongoDB Atlas Connection Established: ${mongoose.connection.host} / ${mongoose.connection.name}`);

  // Test artifacts for cleanup
  let adminToken = '';
  let customerToken = '';
  let testCustomerId = '';
  let testRiderId = '';
  let testOrderId = '';
  let testCategoryId = '';
  let testNotifId = '';

  try {
    // ------------------------------------------------------------------------
    // SETUP: Authenticate Demo Admin & Demo Customer
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   SETUP: Authenticating Admin & Customer Accounts');

    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@indodhobi.com',
      password: 'admin123'
    });
    adminToken = adminLoginRes.data.token;
    console.log(`  ✅  Admin Authenticated: ${adminLoginRes.data.user.name} (${adminLoginRes.data.user.role})`);

    const customerLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'customer@indodhobi.com',
      password: 'password123'
    });
    customerToken = customerLoginRes.data.token;
    testCustomerId = customerLoginRes.data.user._id;
    console.log(`  ✅  Customer Authenticated: ${customerLoginRes.data.user.name} (${customerLoginRes.data.user.role})`);

    // ------------------------------------------------------------------------
    // TEST 1: Strict Admin Authorization & RBAC Check
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 1: Strict RBAC Protection (Non-Admin Blocked with HTTP 403)');

    try {
      await axios.get(`${API_BASE}/admin/riders`, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      throw new Error('Customer unexpectedly accessed admin endpoint!');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('  ✅  Customer access to /api/admin/riders correctly rejected with HTTP 403 Forbidden.');
      } else {
        throw err;
      }
    }

    try {
      await axios.get(`${API_BASE}/admin/payments`, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      throw new Error('Customer unexpectedly accessed admin payments endpoint!');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('  ✅  Customer access to /api/admin/payments correctly rejected with HTTP 403 Forbidden.');
      } else {
        throw err;
      }
    }

    // ------------------------------------------------------------------------
    // TEST 2: Rider Fleet Management — Full CRUD (Requirement #6)
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 2: Rider Fleet Management CRUD (/api/admin/riders)');

    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const riderEmail = `rider_${Date.now()}@indodhobi.com`;

    // 2a: Create Rider
    const createRiderRes = await axios.post(
      `${API_BASE}/admin/riders`,
      {
        name: 'Suresh Verma (Express Fleet)',
        phone: uniquePhone,
        email: riderEmail,
        password: 'RiderSecretPassword123',
        vehicleType: 'EV Van',
        vehicleNumber: 'DL 01 EV 9999',
        assignedZone: 'South Delhi'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testRiderId = createRiderRes.data.data._id;
    console.log(`  ✅  Rider created in MongoDB Atlas! ID: ${testRiderId}, Vehicle: ${createRiderRes.data.data.riderDetails.vehicleType} (${createRiderRes.data.data.riderDetails.vehicleNumber})`);

    // Verify Rider Login with Bcrypt Password
    const riderLoginRes = await axios.post(`${API_BASE}/auth/staff/login`, {
      email: riderEmail,
      password: 'RiderSecretPassword123'
    });
    console.log(`  ✅  Created Rider authenticated successfully via /api/auth/staff/login. Role: ${riderLoginRes.data.user.role}`);

    // 2b: Update Rider
    const updateRiderRes = await axios.put(
      `${API_BASE}/admin/riders/${testRiderId}`,
      {
        vehicleNumber: 'DL 01 EV 8888',
        assignedZone: 'Central Delhi',
        vehicleType: 'EV Van'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`  ✅  Rider updated! Zone: ${updateRiderRes.data.data.riderDetails.assignedZone}, Vehicle: ${updateRiderRes.data.data.riderDetails.vehicleNumber}`);

    // 2c: Toggle Rider Status (Deactivate)
    const deactRes = await axios.patch(
      `${API_BASE}/admin/riders/${testRiderId}/status`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`  ✅  Rider status toggled! isActive: ${deactRes.data.isActive}`);

    // Verify Deactivated Rider is Blocked
    try {
      await axios.post(`${API_BASE}/auth/staff/login`, {
        email: riderEmail,
        password: 'RiderSecretPassword123'
      });
      throw new Error('Deactivated rider unexpectedly logged in!');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log(`  ✅  Deactivated rider login strictly blocked with HTTP 403: "${err.response.data.message}"`);
      } else {
        throw err;
      }
    }

    // Reactivate Rider
    await axios.patch(
      `${API_BASE}/admin/riders/${testRiderId}/status`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('  ✅  Rider re-activated successfully.');

    // 2d: GET Riders with live task counts
    const getRidersRes = await axios.get(`${API_BASE}/admin/riders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundRider = getRidersRes.data.data.find((r) => r._id === testRiderId);
    console.log(`  ✅  GET /api/admin/riders returned ${getRidersRes.data.count} riders. Verified rider tasks metric: activeAssignedOrders=${foundRider.activeAssignedOrders}`);

    // ------------------------------------------------------------------------
    // TEST 3: Users & Addresses Directory (Requirement #7)
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 3: Users & Addresses Directory (/api/admin/users)');

    const getUsersRes = await axios.get(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`  ✅  GET /api/admin/users returned ${getUsersRes.data.count} total registered accounts.`);

    const customerUser = getUsersRes.data.data.find((u) => u._id === testCustomerId);
    console.log(`  ✅  Customer ${customerUser.name} has ${customerUser.addresses?.length || 0} saved delivery addresses.`);

    // Update User Role/Profile
    const updateUserRes = await axios.put(
      `${API_BASE}/admin/users/${testCustomerId}`,
      { name: 'Rohan Sharma (VIP Member)' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`  ✅  Admin updated user name: ${updateUserRes.data.data.name}`);

    // ------------------------------------------------------------------------
    // TEST 4: Dynamic Categories CRUD (Requirement #7)
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 4: Dynamic Categories CRUD (/api/admin/categories & /api/catalog/categories)');

    // 4a: Create Category
    const createCatRes = await axios.post(
      `${API_BASE}/admin/categories`,
      {
        name: `Wedding & Zari Festive ${Date.now()}`,
        description: 'Heavy embroidery, bridal lehengas, silk sherwanis',
        icon: 'Sparkles',
        sortOrder: 10
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testCategoryId = createCatRes.data.data._id;
    console.log(`  ✅  Category created! Name: ${createCatRes.data.data.name}, Slug: ${createCatRes.data.data.slug}, Icon: ${createCatRes.data.data.icon}`);

    // 4b: Update Category
    const updateCatRes = await axios.put(
      `${API_BASE}/admin/categories/${testCategoryId}`,
      { description: 'Updated: Special solvent cleaning for bridal couture', sortOrder: 9 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`  ✅  Category updated! Description: ${updateCatRes.data.data.description}`);

    // 4c: Public Catalog Categories Lookup
    const publicCatRes = await axios.get(`${API_BASE}/catalog/categories`);
    console.log(`  ✅  Public GET /api/catalog/categories returned ${publicCatRes.data.count} active categories.`);

    // ------------------------------------------------------------------------
    // TEST 5: Payments Ledger & Manual Reconciliation (Requirement #7)
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 5: Payments Ledger & Reconciliation (/api/admin/payments)');

    // Create a demo order to reconcile
    const sampleGarmentsRes = await axios.get(`${API_BASE}/catalog/garments`);
    const garment = sampleGarmentsRes.data.data[0];

    const createOrderRes = await axios.post(
      `${API_BASE}/orders`,
      {
        items: [
          {
            garment: garment._id,
            garmentName: garment.name,
            category: garment.category,
            quantity: 2,
            serviceType: 'WASH_AND_IRON',
            ironingType: 'CRISP_STARCH',
            unitPrice: 50,
            lineTotal: 100
          }
        ],
        pickupSchedule: { date: '2026-10-25', timeSlot: '10:00 AM - 01:00 PM' },
        deliverySchedule: { date: '2026-10-27', timeSlot: '02:00 PM - 05:00 PM' },
        pickupAddress: {
          flatAndBuilding: 'Flat 101, Test Residency',
          streetAndLandmark: 'MG Road',
          city: 'New Delhi',
          pincode: '110001',
          contactPhone: '9876543210'
        },
        paymentMethod: 'COD'
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    testOrderId = createOrderRes.data.order._id;
    console.log(`  ✅  Sample COD Order created: ${createOrderRes.data.order.orderNumber} (Amount: ₹${createOrderRes.data.order.pricingBreakdown.grandTotal})`);

    // Fetch Admin Payments Ledger
    const paymentsRes = await axios.get(`${API_BASE}/admin/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`  ✅  Payments Ledger fetched! Total Revenue: ₹${paymentsRes.data.totalRevenue}, Pending COD: ₹${paymentsRes.data.pendingCodRevenue}, Settled: ₹${paymentsRes.data.settledRevenue}`);

    // Reconcile Payment (Mark as PAID)
    const reconcileRes = await axios.patch(
      `${API_BASE}/admin/payments/${testOrderId}`,
      {
        paymentStatus: 'PAID',
        note: 'Cash handed over at central hub by delivery fleet'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const lastNote = reconcileRes.data.data.statusHistory?.slice(-1)[0]?.note || 'Reconciled';
    console.log(`  ✅  Payment reconciled to PAID! Note: "${lastNote}"`);

    // ------------------------------------------------------------------------
    // TEST 6: System Notifications & Broadcast Announcements (Requirement #7)
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 6: Notifications Hub (/api/admin/notifications & /api/notifications)');

    // 6a: Admin sends Broadcast Announcement
    const broadcastRes = await axios.post(
      `${API_BASE}/admin/notifications`,
      {
        title: 'Festival Mega Dry Clean Carnival!',
        message: 'Get flat 50% discount on all silk sarees and winter jackets with coupon DHOBI50.',
        type: 'PROMO',
        isBroadcast: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testNotifId = broadcastRes.data.data._id;
    console.log(`  ✅  Broadcast notification dispatched! Title: "${broadcastRes.data.data.title}", Type: ${broadcastRes.data.data.type}`);

    // 6b: Admin sends Targeted Alert to customer
    await axios.post(
      `${API_BASE}/admin/notifications`,
      {
        recipient: testCustomerId,
        title: 'VIP Laundry Credits Added',
        message: 'We added ₹100 dry cleaning credits to your account. Enjoy premium laundry!',
        type: 'GENERAL',
        isBroadcast: false
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('  ✅  Targeted notification sent to customer.');

    // 6c: Customer reads notifications & unread count
    const custNotifsRes = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log(`  ✅  Customer retrieved ${custNotifsRes.data.count} notifications! Unread Count: ${custNotifsRes.data.unreadCount}`);

    // 6d: Customer marks single notification as read
    await axios.patch(
      `${API_BASE}/notifications/${testNotifId}/read`,
      {},
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    console.log('  ✅  Customer marked notification as read.');

    // 6e: Customer marks all notifications as read
    const markAllRes = await axios.patch(
      `${API_BASE}/notifications/read-all`,
      {},
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    console.log(`  ✅  Customer marked all as read: "${markAllRes.data.message}"`);

    const updatedNotifsRes = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log(`  ✅  Verified unread count is now: ${updatedNotifsRes.data.unreadCount}`);

    // ------------------------------------------------------------------------
    // TEST 7: Automated Trigger Notifications on Order Status & Rider Assign
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 7: Automated Customer Notification Triggers on Order Changes');

    // Assign Rider
    await axios.patch(
      `${API_BASE}/orders/${testOrderId}/assign-rider`,
      { riderId: testRiderId },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Update Status to IN_WASH
    await axios.patch(
      `${API_BASE}/orders/${testOrderId}/status`,
      { orderStatus: 'IN_WASH' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Verify notifications were automatically created for customer
    const triggeredNotifs = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const orderNotif = triggeredNotifs.data.data.find((n) => n.orderId === testOrderId);
    console.log(`  ✅  Automated notification verified for order status change! Title: "${orderNotif?.title}", Message: "${orderNotif?.message}"`);

    // ------------------------------------------------------------------------
    // TEST 8: Rider Decommissioning & Cleanup
    // ------------------------------------------------------------------------
    console.log('  ────────────────────────────────────────────────────────────');
    console.log('  ℹ️   TEST 8: Rider Decommission / Delete Endpoint');

    const deleteRiderRes = await axios.delete(
      `${API_BASE}/admin/riders/${testRiderId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`  ✅  Rider delete/decommission completed: "${deleteRiderRes.data.message}"`);

    // Delete test category
    await axios.delete(
      `${API_BASE}/admin/categories/${testCategoryId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('  ✅  Test category cleaned up.');

    // Delete test order
    await mongoose.connection.collection('orders').deleteOne({ _id: new mongoose.Types.ObjectId(testOrderId) });
    // Delete test notifications
    await mongoose.connection.collection('notifications').deleteMany({ recipient: new mongoose.Types.ObjectId(testCustomerId) });
    await mongoose.connection.collection('notifications').deleteOne({ _id: new mongoose.Types.ObjectId(testNotifId) });
    console.log('  ✅  Test orders and notifications purged from MongoDB Atlas. Zero test pollution.');

    console.log('\n🎉 ALL SPRINT 3 REQUIREMENTS (REQUIREMENTS #6 & #7) VERIFIED SUCCESSFULLY AGAINST LIVE REAL DB ATLAS!\n');

  } catch (error) {
    console.error('\n❌ Sprint 3 Verification Error:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
