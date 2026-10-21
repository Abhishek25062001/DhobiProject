import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyFirebaseIdToken } from '../utils/firebaseVerify.js';

test('production rejects simulated identities and unsigned JWT claims', async () => {
  const keys = ['NODE_ENV', 'MOCK_FIREBASE', 'FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    process.env.NODE_ENV = 'production'; process.env.MOCK_FIREBASE = 'true';
    delete process.env.FIREBASE_API_KEY; delete process.env.VITE_FIREBASE_API_KEY;
    const forged = `e30.${Buffer.from(JSON.stringify({ sub: 'admin', phone_number: '+919999999999', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.forged`;
    for (const token of ['test_firebase_token_9999999999', 'mock_firebase_token_9999999999', forged]) assert.equal((await verifyFirebaseIdToken(token)).success, false);
    process.env.NODE_ENV = 'test';
    assert.equal((await verifyFirebaseIdToken('test_firebase_token_9999999999')).success, true);
  } finally { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
});
