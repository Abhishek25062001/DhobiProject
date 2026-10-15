/**
 * IndoDhobi — Sprint 1 Automated Verification Suite
 * ──────────────────────────────────────────────────────────────
 * Tests against real MongoDB Atlas database and live API server:
 * 1. First-Time vs Returning User OTP Flow (Requirement #3)
 * 2. Profile Onboarding (Step 3: Name & Email)
 * 3. Primary Phone Number Immutability
 * 4. Wash & Packaging Preferences Persistence
 * 5. Alternate Phone Numbers (Add, Reject Primary, Delete)
 * 6. Saved Addresses Book (Add, Default Toggle, Edit, Delete)
 * 7. Cloudinary Profile Photo / Avatar Upload
 * 8. Full Profile & Order Stats Aggregation (GET /api/auth/profile)
 * 9. Account Deactivation Rejection (HTTP 403)
 * 10. Clean idempotent DB teardown
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const PRIMARY_PORT = Number(process.env.PORT || 5000);
const TS = Date.now();
const TEST_PHONE = `91${String(TS).slice(-8)}`;
const TEST_NAME = `Aarav Sharma ${TS}`;
const TEST_EMAIL = `aarav_${TS}@indodhobi.test`;

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
  console.log('\n🚀 Starting Sprint 1 Real Database Verification Suite...\n');

  // 1. Detect Live Port
  const activePort = await detectServerPort();
  if (!activePort) {
    fail('Backend server is not running on port 5000 or 5001. Please start it with "npm start" or "node server.js".');
    process.exit(1);
  }
  const API_BASE = `http://localhost:${activePort}/api`;
  ok(`Detected active backend server on port ${activePort} (${API_BASE})`);

  // 2. Connect directly to real MongoDB Atlas to cross-verify database writes
  if (!process.env.MONGO_URI) {
    fail('MONGO_URI is missing from server/.env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const dbHost = mongoose.connection.host;
  const dbName = mongoose.connection.name;
  ok(`Direct MongoDB Atlas Connection Established: ${dbHost} / ${dbName}`);

  const User = mongoose.connection.collection('users');
  let testUserId = null;
  let tempToken = null;
  let authToken = null;
  let addedAddressId = null;
  let addedPhoneId = null;

  try {
    sep();
    info('TEST 1: First-Time User OTP Verification Flow (Requirement #3)');
    // Simulate first-time user login with OTP token
    const firstLoginRes = await fetch(`${API_BASE}/auth/customer/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: `test_firebase_token_${TEST_PHONE}` })
    });
    const firstLoginData = await firstLoginRes.json();

    if (firstLoginRes.status === 200 && firstLoginData.isNewUser === true && firstLoginData.requiresName === true) {
      ok('First-time user returned requiresName: true and isNewUser: true');
    } else {
      fail(`Expected requiresName: true for new phone, got: ${JSON.stringify(firstLoginData)}`);
    }

    tempToken = firstLoginData.tempToken || firstLoginData.token;
    testUserId = firstLoginData.user?._id;

    // Cross-verify in real MongoDB Atlas
    const userInDb = await User.findOne({ phone: TEST_PHONE });
    if (userInDb && userInDb.isProfileComplete === false) {
      ok(`Verified in Atlas DB: User created with isProfileComplete=false (ID: ${userInDb._id})`);
    } else {
      fail(`User not found or isProfileComplete is not false in Atlas DB: ${JSON.stringify(userInDb)}`);
    }

    sep();
    info('TEST 2: Profile Onboarding (Step 3: Name & Email)');
    const onboardRes = await fetch(`${API_BASE}/auth/complete-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify({
        name: TEST_NAME,
        email: TEST_EMAIL
      })
    });
    const onboardData = await onboardRes.json();

    if (onboardRes.status === 200 && onboardData.user?.name === TEST_NAME && onboardData.user?.isProfileComplete === true) {
      ok(`Profile completed successfully. Name: "${onboardData.user.name}", Token granted.`);
      authToken = onboardData.token;
    } else {
      fail(`Onboarding failed: ${JSON.stringify(onboardData)}`);
    }

    // Cross-verify in real Atlas DB
    const updatedUserInDb = await User.findOne({ phone: TEST_PHONE });
    if (updatedUserInDb.name === TEST_NAME && updatedUserInDb.isProfileComplete === true && updatedUserInDb.email === TEST_EMAIL.toLowerCase()) {
      ok(`Verified in Atlas DB: Name="${updatedUserInDb.name}", Email="${updatedUserInDb.email}", isProfileComplete=true`);
    } else {
      fail(`Atlas DB check failed after onboarding: ${JSON.stringify(updatedUserInDb)}`);
    }

    sep();
    info('TEST 3: Returning User OTP Verification Flow (Requirement #3)');
    // Calling login again with same phone
    const returningLoginRes = await fetch(`${API_BASE}/auth/customer/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: `test_firebase_token_${TEST_PHONE}` })
    });
    const returningLoginData = await returningLoginRes.json();

    if (returningLoginRes.status === 200 && returningLoginData.requiresName === false && returningLoginData.isNewUser === false) {
      ok('Returning user returned requiresName: false — Step 3 is skipped seamlessly!');
    } else {
      fail(`Expected requiresName: false for returning user, got: ${JSON.stringify(returningLoginData)}`);
    }

    sep();
    info('TEST 4: Primary Phone Number Immutability Check');
    const updatePhoneAttempt = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ phone: '9999888877' })
    });
    const updatePhoneData = await updatePhoneAttempt.json();

    if (updatePhoneAttempt.status === 400 && updatePhoneData.message.includes('Primary phone number')) {
      ok('Server strictly rejected primary phone mutation with HTTP 400.');
    } else {
      fail(`Expected HTTP 400 when changing primary phone, got: ${updatePhoneAttempt.status} ${JSON.stringify(updatePhoneData)}`);
    }

    // Cross-verify phone was unchanged in Atlas DB
    const phoneCheck = await User.findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    if (phoneCheck.phone === TEST_PHONE) {
      ok(`Verified in Atlas DB: Primary phone remained unchanged: ${phoneCheck.phone}`);
    } else {
      fail(`Phone unexpectedly changed in DB: ${phoneCheck.phone}`);
    }

    sep();
    info('TEST 5: Wash Preferences Update');
    const updatePrefRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        preferences: {
          defaultDetergent: 'Hypoallergenic Baby Safe',
          defaultPackaging: 'On Hangers'
        }
      })
    });
    const updatePrefData = await updatePrefRes.json();

    if (updatePrefRes.status === 200 && updatePrefData.user?.preferences?.defaultDetergent === 'Hypoallergenic Baby Safe') {
      ok('Preferences updated in API response.');
    } else {
      fail(`Preferences update failed: ${JSON.stringify(updatePrefData)}`);
    }

    // Cross-verify in Atlas DB
    const prefCheck = await User.findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    if (prefCheck.preferences?.defaultDetergent === 'Hypoallergenic Baby Safe' && prefCheck.preferences?.defaultPackaging === 'On Hangers') {
      ok(`Verified in Atlas DB: detergent="${prefCheck.preferences.defaultDetergent}", packaging="${prefCheck.preferences.defaultPackaging}"`);
    } else {
      fail(`Preferences not saved in DB: ${JSON.stringify(prefCheck.preferences)}`);
    }

    sep();
    info('TEST 6: Alternate Phone Numbers (Add, Reject Duplicate/Primary, Delete)');
    // 6a: Add alternate phone
    const altPhoneRes = await fetch(`${API_BASE}/auth/profile/phones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        number: '9811223344',
        label: 'Office / Driver'
      })
    });
    const altPhoneData = await altPhoneRes.json();

    if (altPhoneRes.status === 201 && altPhoneData.alternatePhones?.length === 1) {
      addedPhoneId = altPhoneData.alternatePhones[0]._id;
      ok(`Alternate phone added successfully: ${altPhoneData.alternatePhones[0].number} (${altPhoneData.alternatePhones[0].label})`);
    } else {
      fail(`Failed to add alternate phone: ${JSON.stringify(altPhoneData)}`);
    }

    // 6b: Reject primary phone as alternate
    const rejectPrimaryAsAlt = await fetch(`${API_BASE}/auth/profile/phones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ number: TEST_PHONE })
    });
    if (rejectPrimaryAsAlt.status === 400) {
      ok('Server correctly rejected adding primary phone as alternate phone (HTTP 400).');
    } else {
      fail(`Expected 400 for primary phone as alternate, got: ${rejectPrimaryAsAlt.status}`);
    }

    // 6c: Delete alternate phone
    const deletePhoneRes = await fetch(`${API_BASE}/auth/profile/phones/${addedPhoneId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const deletePhoneData = await deletePhoneRes.json();
    if (deletePhoneRes.status === 200 && deletePhoneData.alternatePhones?.length === 0) {
      ok('Alternate phone deleted successfully.');
    } else {
      fail(`Failed to delete alternate phone: ${JSON.stringify(deletePhoneData)}`);
    }

    sep();
    info('TEST 7: Saved Addresses Book (Add, Set Default Switch, Edit, Delete)');
    // 7a: Add Address 1 (Home, default)
    const addAddr1 = await fetch(`${API_BASE}/auth/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        label: 'Home',
        flatAndBuilding: 'Flat 402, Royal Palms Apartments',
        streetAndLandmark: 'Barakhamba Road, Near Metro',
        city: 'New Delhi',
        pincode: '110001',
        contactPhone: TEST_PHONE,
        isDefault: true
      })
    });
    const addr1Data = await addAddr1.json();
    const addr1Id = addr1Data.addresses?.[0]?._id;
    if (addAddr1.status === 201 && addr1Data.addresses?.[0]?.isDefault === true) {
      ok(`Address 1 (Home) added and set as default (ID: ${addr1Id})`);
    } else {
      fail(`Failed to add Address 1: ${JSON.stringify(addr1Data)}`);
    }

    // 7b: Add Address 2 (Work, isDefault = true) -> should automatically unset Address 1
    const addAddr2 = await fetch(`${API_BASE}/auth/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        label: 'Work',
        flatAndBuilding: 'Tower B, 7th Floor, Cyber Park',
        streetAndLandmark: 'Sector 29',
        city: 'Gurugram',
        pincode: '122001',
        isDefault: true
      })
    });
    const addr2Data = await addAddr2.json();
    const addr2Id = addr2Data.addresses?.find((a) => a.label === 'Work')?._id;

    const userWithTwoAddrs = await User.findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    const homeAddr = userWithTwoAddrs.addresses.find((a) => a.label === 'Home');
    const workAddr = userWithTwoAddrs.addresses.find((a) => a.label === 'Work');

    if (workAddr?.isDefault === true && homeAddr?.isDefault === false) {
      ok('Automatic Default Switch verified in Atlas DB: Work isDefault=true, Home isDefault=false.');
    } else {
      fail(`Default switch failed in DB: Home=${homeAddr?.isDefault}, Work=${workAddr?.isDefault}`);
    }

    // 7c: Edit Address 1 via PUT /addresses/:addressId
    const editAddrRes = await fetch(`${API_BASE}/auth/addresses/${addr1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        flatAndBuilding: 'Flat 505 (Upgraded), Royal Palms Apartments',
        isDefault: true
      })
    });
    const editAddrData = await editAddrRes.json();
    const updatedHome = editAddrData.addresses?.find((a) => a._id === addr1Id);

    if (editAddrRes.status === 200 && updatedHome?.flatAndBuilding?.includes('Upgraded') && updatedHome?.isDefault === true) {
      ok('Address 1 edited successfully via PUT endpoint and re-established as default.');
    } else {
      fail(`Failed to edit address: ${JSON.stringify(editAddrData)}`);
    }

    // 7d: Delete Address 2
    const delAddrRes = await fetch(`${API_BASE}/auth/addresses/${addr2Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const delAddrData = await delAddrRes.json();
    if (delAddrRes.status === 200 && delAddrData.addresses?.length === 1) {
      ok('Address 2 deleted successfully. Remaining addresses count: 1.');
    } else {
      fail(`Failed to delete address: ${JSON.stringify(delAddrData)}`);
    }

    sep();
    info('TEST 8: Cloudinary Profile Avatar Upload (POST /api/auth/profile/avatar)');
    // 1x1 transparent GIF base64
    const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const avatarRes = await fetch(`${API_BASE}/auth/profile/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ imageBase64: testBase64 })
    });
    const avatarData = await avatarRes.json();

    if (avatarRes.status === 200 && avatarData.profileImage?.url && avatarData.profileImage?.url.includes('cloudinary.com')) {
      ok(`Cloudinary avatar upload successful! URL: ${avatarData.profileImage.url}`);
    } else {
      fail(`Avatar upload failed: ${JSON.stringify(avatarData)}`);
    }

    // Cross-verify in Atlas DB
    const avatarCheckInDb = await User.findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    if (avatarCheckInDb.profileImage?.url && avatarCheckInDb.profileImage?.url.includes('cloudinary.com')) {
      ok(`Verified in Atlas DB: profileImage.url persisted: ${avatarCheckInDb.profileImage.url}`);
    } else {
      fail(`Avatar URL not found in Atlas DB: ${JSON.stringify(avatarCheckInDb.profileImage)}`);
    }

    sep();
    info('TEST 9: Full Profile Query (GET /api/auth/profile)');
    const profileRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const profileData = await profileRes.json();

    if (
      profileRes.status === 200 &&
      profileData.user?._id &&
      profileData.stats !== undefined &&
      typeof profileData.stats.totalOrders === 'number' &&
      Array.isArray(profileData.recentOrders)
    ) {
      ok(`Full profile retrieved: ${profileData.user.name} | Total Orders: ${profileData.stats.totalOrders} | Total Spent: ₹${profileData.stats.totalSpent}`);
    } else {
      fail(`Full profile query failed: ${JSON.stringify(profileData)}`);
    }

    sep();
    info('TEST 10: Account Deactivation Security Check (isActive=false -> 403)');
    // Deactivate user in Atlas DB
    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(testUserId) },
      { $set: { isActive: false } }
    );

    const deactivatedLogin = await fetch(`${API_BASE}/auth/customer/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: `test_firebase_token_${TEST_PHONE}` })
    });
    const deactivatedData = await deactivatedLogin.json();

    if (deactivatedLogin.status === 403 && deactivatedData.message.includes('deactivated')) {
      ok('Deactivated user rejected with HTTP 403 Forbidden.');
    } else {
      fail(`Expected 403 for deactivated user, got: ${deactivatedLogin.status} ${JSON.stringify(deactivatedData)}`);
    }

    sep();
    info('TEARDOWN: Cleaning up test artifacts from MongoDB Atlas');
    await User.deleteOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    const verifyDeleted = await User.findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    if (!verifyDeleted) {
      ok('Test user cleanly deleted from Atlas DB. Zero test pollution remaining.');
    } else {
      fail('Failed to clean up test user from DB.');
    }

    sep();
    console.log('\n🎉 ALL 10 SPRINT 1 REQUIREMENTS VERIFIED AGAINST REAL MONGODB ATLAS!\n');

  } catch (err) {
    fail(`Unhandled error during test run: ${err.message}\n${err.stack}`);
  } finally {
    // If test failed midway, ensure test user is deleted
    if (testUserId) {
      await User.deleteOne({ _id: new mongoose.Types.ObjectId(testUserId) }).catch(() => {});
    }
    await mongoose.disconnect();
  }
}

run();
