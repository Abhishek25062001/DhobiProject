import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmAuthSession, SessionConfirmationError } from '../src/services/authSession.mjs';

const user = { _id: 'user-1', name: 'Test Admin', role: 'admin', isActive: true };
const result = { success: true, session: true, user };

test('legacy token-only login cannot be reported as an authenticated cookie session', async () => {
  let checked = false;
  await assert.rejects(confirmAuthSession({ success: true, token: 'legacy-test-token', user }, async () => { checked = true; }), SessionConfirmationError);
  assert.equal(checked, false);
});

test('blocked, expired or unusable cookies fail confirmation', async () => {
  for (const getMe of [
    async () => { throw { response: { status: 401 } }; },
    async () => { throw new Error('Network unavailable'); },
    async () => ({ success: false }),
    async () => ({ success: true, user: { ...user, _id: 'another-account' } }),
    async () => ({ success: true, user: { ...user, isActive: false } }),
  ]) await assert.rejects(confirmAuthSession(result, getMe), SessionConfirmationError);
});

test('confirmed server identity and onboarding flags are retained for every role', async () => {
  for (const role of ['admin', 'rider', 'customer']) {
    const verifiedUser = { ...user, role, name: 'Verified name' };
    const response = { ...result, requiresName: true, isNewUser: true };
    const confirmed = await confirmAuthSession(response, async () => ({ success: true, user: verifiedUser }));
    assert.equal(confirmed.user, verifiedUser);
    assert.equal(confirmed.requiresName, true);
    assert.equal(confirmed.isNewUser, true);
  }
});

test('failed credentials are returned without a session lookup', async () => {
  const failed = { success: false, message: 'Invalid credentials' };
  assert.equal(await confirmAuthSession(failed, () => { throw new Error('Must not run'); }), failed);
});
