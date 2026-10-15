/**
 * IndoDhobi — Real MongoDB Atlas Persistence Verification Script
 * ──────────────────────────────────────────────────────────────
 * Connects to the REAL MONGO_URI from /server/.env.
 * Does NOT use mongodb-memory-server at any point.
 *
 * Usage:
 *   node server/tests/verifyRealDbPersistence.js
 *
 * Prerequisites: server must NOT be running (we start our own HTTP listener)
 * OR the script can be run against the already-running server on port 5001.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIMARY_PORT = Number(process.env.PORT || 5000);
const TS = Date.now();
const TEST_EMAIL = `atlas_audit_${TS}@indodhobi.com`;
const TEST_PHONE = `90${String(TS).slice(-8)}`;
const TEST_NAME = `Atlas Audit User ${TS}`;
const TEST_PASSWORD = 'auditPass99!';

// Auto-detect actual server port (handles macOS AirPlay shifting 5000 → 5001)
async function detectServerPort() {
  for (const port of [PRIMARY_PORT, PRIMARY_PORT + 1]) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return port;
      }
    } catch {}
  }
  return null;
}

let SERVER_BASE = `http://localhost:${PRIMARY_PORT}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ok  = (msg) => console.log(`  ✅  ${msg}`);
const fail = (msg) => { console.error(`  ❌  ${msg}`); process.exitCode = 1; };
const info = (msg) => console.log(`  ℹ️   ${msg}`);
const sep  = () => console.log('  ' + '─'.repeat(60));

async function apiCall(endpoint, { method = 'GET', body, token } = {}) {
  const url = `${SERVER_BASE}/api${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function runVerification() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   IndoDhobi — Real Atlas DB Persistence Verification         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Auto-detect actual running server port
  const detectedPort = await detectServerPort();
  if (detectedPort) {
    SERVER_BASE = `http://localhost:${detectedPort}`;
    if (detectedPort !== PRIMARY_PORT) {
      console.log(`  ⚠️   Server detected on port ${detectedPort} (port ${PRIMARY_PORT} is occupied by macOS AirPlay or another process)`);
      console.log(`  ℹ️   Using ${SERVER_BASE}\n`);
    }
  }

  let token = null;
  let createdUserId = null;
  let createdOrderId = null;
  let savedUser = null;

  // ── 0. Connect directly to Atlas via Mongoose ─────────────────────────────
  console.log('🔌 Step 0: Direct Atlas Connection\n');
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<db_password>')) {
    fail('MONGO_URI is missing or still has placeholder. Set it in /server/.env');
    process.exit(1);
  }

  let conn;
  try {
    conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const host = conn.connection.host;
    const dbName = conn.connection.name;
    ok(`Connected to Atlas — Host: ${host} | DB: ${dbName}`);
    info(`Full URI target: ${uri.replace(/:([^@]+)@/, ':***@')}`);
  } catch (err) {
    fail(`Direct Atlas connection failed: ${err.message}`);
    process.exit(1);
  }

  const db = mongoose.connection.db;
  sep();

  // ── 1. Verify server /api/health reports real DB ──────────────────────────
  console.log('\n🌐 Step 1: Server Health Check\n');
  try {
    const { status, data } = await apiCall('/health');
    if (status === 200 && data.dbState === 'CONNECTED') {
      ok(`Server healthy — DB State: ${data.dbState}`);
      ok(`Server DB Host: ${data.dbHost || 'not exposed'}`);
      ok(`Server DB Name: ${data.dbName || 'not exposed'}`);
      if (data.dbHost && data.dbHost !== conn.connection.host) {
        fail(`Host MISMATCH! Server is on "${data.dbHost}", script connected to "${conn.connection.host}"`);
      }
    } else {
      fail(`Server health returned status=${status}, dbState=${data?.dbState}`);
    }
  } catch (err) {
    fail(`Cannot reach server at ${SERVER_BASE}. Is it running? Error: ${err.message}`);
    fail('Start the server with: cd server && npm start');
    await mongoose.disconnect();
    process.exit(1);
  }
  sep();

  // ── 2. Register a unique user via API → verify in Atlas ──────────────────
  console.log('\n👤 Step 2: User Registration → Atlas Persistence\n');
  info(`Registering: ${TEST_EMAIL}`);

  const { status: regStatus, data: regData } = await apiCall('/auth/register', {
    method: 'POST',
    body: { name: TEST_NAME, email: TEST_EMAIL, phone: TEST_PHONE, password: TEST_PASSWORD, role: 'customer' }
  });

  if (regStatus === 201 || (regStatus === 200 && regData?.success)) {
    ok(`Register API returned ${regStatus}. User ID: ${regData.user?._id}`);
    token = regData.token;
    createdUserId = regData.user?._id;
  } else {
    fail(`Register API failed: ${regStatus} — ${JSON.stringify(regData)}`);
  }

  // Query Atlas directly
  savedUser = await db.collection('users').findOne({ email: TEST_EMAIL });
  if (savedUser) {
    ok(`User FOUND in Atlas: _id=${savedUser._id}, email=${savedUser.email}`);
    ok(`createdAt=${savedUser.createdAt}`);
  } else {
    fail(`User "${TEST_EMAIL}" NOT found in Atlas — server is writing to wrong database!`);
  }
  sep();

  // ── 3. Place a test order via API → verify in Atlas ───────────────────────
  console.log('\n📦 Step 3: Order Placement → Atlas Persistence\n');

  // Get a garment ID first
  const { data: catalogData } = await apiCall('/catalog/garments');
  const garments = catalogData?.data || [];
  if (garments.length === 0) {
    fail('No garments in catalog — cannot place test order');
  } else {
    const garment = garments[0];
    info(`Using garment: ${garment.name} (${garment._id})`);

    const orderPayload = {
      items: [{ garmentId: garment._id, quantity: 1, serviceType: 'WASH_AND_FOLD' }],
      pickupSchedule: { date: '2026-12-01', timeSlot: '10:00 AM - 01:00 PM' },
      deliverySchedule: { date: '2026-12-03', timeSlot: '10:00 AM - 01:00 PM' },
      pickupAddress: {
        flatAndBuilding: 'Atlas Audit Tower',
        streetAndLandmark: 'Test Street',
        city: 'New Delhi',
        pincode: '110001',
        contactPhone: TEST_PHONE
      },
      paymentMethod: 'COD'
    };

    const { status: orderStatus, data: orderData } = await apiCall('/orders', {
      method: 'POST',
      body: orderPayload,
      token
    });

    if (orderStatus === 201 && orderData?.success) {
      createdOrderId = orderData.order?._id;
      ok(`Order API returned 201. Order ID: ${createdOrderId}`);
      ok(`Order Number: ${orderData.order?.orderNumber}`);
    } else {
      fail(`Order creation failed: ${orderStatus} — ${JSON.stringify(orderData)}`);
    }

    // Verify in Atlas directly
    if (createdOrderId) {
      const savedOrder = await db.collection('orders').findOne({
        _id: new mongoose.Types.ObjectId(createdOrderId)
      });
      if (savedOrder) {
        ok(`Order FOUND in Atlas: _id=${savedOrder._id}`);
        ok(`orderNumber=${savedOrder.orderNumber}, status=${savedOrder.orderStatus}`);
        ok(`customer=${savedOrder.customer}`);
      } else {
        fail(`Order "${createdOrderId}" NOT found in Atlas — data loss detected!`);
      }
    }
  }
  sep();

  // ── 4. Verify /auth/me reads from Atlas ───────────────────────────────────
  console.log('\n🔑 Step 4: JWT Token → /auth/me → Atlas Read\n');
  if (token) {
    const { status: meStatus, data: meData } = await apiCall('/auth/me', { token });
    if (meStatus === 200 && meData?.user?.email === TEST_EMAIL) {
      ok(`/auth/me correctly returned user from Atlas: ${meData.user.email}`);
    } else {
      fail(`/auth/me returned unexpected data: ${meStatus} — ${JSON.stringify(meData)}`);
    }
  }
  sep();

  // ── 5. Cleanup — remove test records ──────────────────────────────────────
  console.log('\n🧹 Step 5: Cleanup Test Records\n');
  if (savedUser) {
    await db.collection('users').deleteOne({ email: TEST_EMAIL });
    ok(`Deleted test user "${TEST_EMAIL}" from Atlas`);
  }
  if (createdOrderId) {
    await db.collection('orders').deleteOne({
      _id: new mongoose.Types.ObjectId(createdOrderId)
    });
    ok(`Deleted test order "${createdOrderId}" from Atlas`);
  }
  sep();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  if (process.exitCode === 1) {
    console.log('❌  VERIFICATION FAILED — see errors above');
  } else {
    console.log('✅  ALL CHECKS PASSED — Data flows end-to-end to real Atlas DB');
    console.log(`\n   Atlas Host: ${conn.connection.host}`);
    console.log(`   Atlas DB:   ${conn.connection.name}`);
    console.log(`   User write:  ✅ persisted and confirmed`);
    console.log(`   Order write: ✅ persisted and confirmed`);
  }
  console.log('══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(process.exitCode || 0);
}

runVerification().catch((err) => {
  console.error('\n💥 Fatal error in verification script:', err.message);
  process.exit(1);
});
