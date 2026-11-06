import { test } from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
import { contentTestHarness } from './contentTestHarness.mjs';
import { confirmAuthSession } from '../../client/src/services/authSession.mjs';

test('browser sign-in establishes a usable session across roles and onboarding', async t => {
  const { request } = await contentTestHarness(t);
  await User.create({ name: 'Test Rider', email: 'rider@example.test', phone: '9990000003', password: 'isolated-test-password', role: 'rider' });
  const browserHeaders = { 'X-Session-Mode': 'cookie', 'X-CSRF-Protection': '1', Origin: 'http://localhost:5173' };
  async function signIn(path, body, cookie) {
    const response = await request(path, { method: 'POST', body, headers: { ...browserHeaders, ...(cookie ? { Cookie: cookie } : {}) } });
    assert.ok([200, 201].includes(response.status), response.body.message);
    assert.equal(response.body.session, true);
    assert.equal(response.body.token, undefined);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    const savedCookie = response.headers.get('set-cookie').split(';')[0];
    const confirmed = await confirmAuthSession(response.body, async () => (await request('/auth/me', { headers: { ...browserHeaders, Cookie: savedCookie } })).body);
    return { confirmed, cookie: savedCookie };
  }
  for (const role of ['admin', 'rider', 'customer']) {
    await t.test(`${role} password login and cookie restoration`, async () => {
      const { confirmed, cookie } = await signIn('/auth/login', { email: `${role}@example.test`, password: 'isolated-test-password' });
      assert.equal(confirmed.user.role, role);
      assert.equal((await request('/auth/me', { headers: { Cookie: cookie } })).status, 200);
      const logout = await request('/auth/logout', { method: 'POST', headers: { ...browserHeaders, Cookie: cookie } });
      assert.equal(logout.status, 200);
      assert.match(logout.headers.get('set-cookie'), /indodhobi_session=;/);
    });
  }
  await t.test('staff login returns the same browser-session contract', async () => {
    const { confirmed } = await signIn('/auth/staff/login', { email: 'admin@example.test', password: 'isolated-test-password' });
    assert.equal(confirmed.user.role, 'admin');
  });
  await t.test('new OTP customer keeps onboarding and can complete the profile', async () => {
    const { confirmed, cookie } = await signIn('/auth/customer/firebase-login', { idToken: 'test_firebase_token_9888000001', phone: '9888000001' });
    assert.equal(confirmed.requiresName, true);
    const completed = await signIn('/auth/complete-onboarding', { name: 'Onboarded Customer' }, cookie);
    assert.equal(completed.confirmed.user.isProfileComplete, true);
    const returning = await signIn('/auth/customer/firebase-login', { idToken: 'test_firebase_token_9888000001', phone: '9888000001' });
    assert.equal(returning.confirmed.requiresName, false);
  });
  await t.test('registration establishes the same verified customer session', async () => {
    const { confirmed } = await signIn('/auth/register', { name: 'Registered Customer', email: 'registered@example.test', phone: '9888000002', password: 'isolated-test-password' });
    assert.equal(confirmed.user.role, 'customer');
  });
});
