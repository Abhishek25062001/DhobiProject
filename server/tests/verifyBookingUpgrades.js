import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { app } from '../server.js';
import Garment from '../models/Garment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { seedData } from '../utils/seeder.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_indodhobi_2026';

async function runBookingUpgradeVerification() {
  console.log('--- Starting IndoDhobi Booking Upgrades Verification ---');
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.disconnect();
  await mongoose.connect(uri);
  console.log('✓ Connected to In-Memory MongoDB');

  // Seed DB
  await seedData();

  const PORT = 5099;
  const server = app.listen(PORT);
  console.log(`✓ Test server running on port ${PORT}`);

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

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`PASS: ${message}`);
      passed++;
    } else {
      console.error(`FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify "Miscellaneous / Special Item" exists in Garment collection
    const miscGarment = await Garment.findOne({ isCustom: true });
    assert(!!miscGarment, 'Seeded Miscellaneous / Special Item found with isCustom: true');
    assert(miscGarment?.name === 'Miscellaneous / Special Item', 'Garment name matches Miscellaneous / Special Item');
    assert(miscGarment?.pricing?.washOnly === 40, 'Pricing washOnly is 40');
    assert(miscGarment?.pricing?.standardSteamIron === 15, 'Pricing standardSteamIron is 15');
    assert(miscGarment?.pricing?.crispStarchPress === 25, 'Pricing crispStarchPress is 25');
    assert(miscGarment?.pricing?.delicatePress === 30, 'Pricing delicatePress is 30');
    assert(miscGarment?.pricing?.dryClean === 120, 'Pricing dryClean is 120');

    // 2. Verify strict authentication: unauthenticated order placement must be rejected (401)
    const unauthRes = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ garmentId: miscGarment._id.toString(), quantity: 1, serviceType: 'WASH_AND_FOLD' }],
        pickupSchedule: { date: '2026-10-25', timeSlot: '10:00 AM - 01:00 PM' },
        deliverySchedule: { date: '2026-10-27', timeSlot: '10:00 AM - 01:00 PM' },
        pickupAddress: { flatAndBuilding: '402', streetAndLandmark: 'MG Road', pincode: '110001' },
        paymentMethod: 'COD'
      })
    });
    assert(unauthRes.status === 401, `Unauthenticated order placement returns 401 Unauthorized (got ${unauthRes.status})`);

    // 3. Create/retrieve a test customer and generate token
    let testCustomer = await User.findOne({ role: 'customer' });
    if (!testCustomer) {
      testCustomer = await User.create({
        name: 'Test Customer',
        phone: '9876543210',
        role: 'customer',
        password: 'password123'
      });
    }
    const token = jwt.sign({ id: testCustomer._id.toString(), role: 'customer' }, JWT_SECRET, { expiresIn: '1d' });

    // 4. Authenticated order placement with Custom Item + Doorstep rate
    const authRes = await api('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [
          {
            garmentId: miscGarment._id.toString(),
            quantity: 2,
            serviceType: 'DRY_CLEAN',
            ironingType: 'NONE',
            customDescription: 'Antique Banarasi Silk Shawl with Zari',
            isCustomItem: true
          },
          {
            garmentId: miscGarment._id.toString(),
            quantity: 1,
            serviceType: 'WASH_AND_IRON',
            ironingType: 'NONE',
            customDescription: 'Handloom Cotton Curtain',
            isCustomItem: true
          }
        ],
        preferences: {
          detergentType: 'Hypoallergenic',
          packagingType: 'Folded',
          specialInstructions: 'Delicate handloom handling required'
        },
        pickupSchedule: { date: '2026-10-25', timeSlot: '10:00 AM - 01:00 PM' },
        deliverySchedule: { date: '2026-10-27', timeSlot: '10:00 AM - 01:00 PM' },
        pickupAddress: {
          flatAndBuilding: 'Suite 9, Chanakya Puri',
          streetAndLandmark: 'Shanti Path',
          city: 'New Delhi',
          pincode: '110021',
          contactPhone: '9876543210'
        },
        paymentMethod: 'COD'
      })
    });

    assert(authRes.status === 201, `Authenticated custom order placed with status 201 (got ${authRes.status})`);
    const createdOrder = authRes.data?.order;
    assert(!!createdOrder, 'Created order object returned in response');
    assert(createdOrder?.items?.length === 2, 'Created order has 2 items');

    // Item 1: Dry Clean custom garment (2 x 120 = 240)
    const item1 = createdOrder.items[0];
    assert(item1.isCustomItem === true, 'Item 1 has isCustomItem === true');
    assert(item1.customDescription === 'Antique Banarasi Silk Shawl with Zari', 'Item 1 customDescription matches input');
    assert(item1.unitPrice === 120, `Item 1 unitPrice is ₹120 (got ${item1.unitPrice})`);
    assert(item1.lineTotal === 240, `Item 1 lineTotal is ₹240 (got ${item1.lineTotal})`);

    // Item 2: Wash & Iron with 'NONE' ironing finish (1 x 40 = 40)
    const item2 = createdOrder.items[1];
    assert(item2.isCustomItem === true, 'Item 2 has isCustomItem === true');
    assert(item2.customDescription === 'Handloom Cotton Curtain', 'Item 2 customDescription matches input');
    assert(item2.unitPrice === 40, `Item 2 unitPrice with NONE ironing finish is ₹40 base without iron charge (got ${item2.unitPrice})`);
    assert(item2.lineTotal === 40, `Item 2 lineTotal is ₹40 (got ${item2.lineTotal})`);

    // Subtotal: 240 + 40 = 280
    assert(createdOrder.pricingBreakdown.subtotal === 280, `Order subtotal is ₹280 (got ${createdOrder.pricingBreakdown.subtotal})`);

    // 5. Query order directly from MongoDB to verify persistence
    const dbOrder = await Order.findById(createdOrder._id);
    assert(!!dbOrder, 'Order successfully retrieved directly from MongoDB');
    assert(dbOrder.items[0].isCustomItem === true, 'MongoDB document item 0 isCustomItem persisted');
    assert(dbOrder.items[0].customDescription === 'Antique Banarasi Silk Shawl with Zari', 'MongoDB document item 0 customDescription persisted');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  }

  console.log(`\n--- Verification Summary: ${passed} Passed, ${failed} Failed ---`);
  if (failed > 0) process.exit(1);
}

runBookingUpgradeVerification();
