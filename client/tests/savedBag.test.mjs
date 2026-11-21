import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bagPayload, cartFromSavedBag } from '../src/services/savedBag.mjs';

const pricing = { washOnly: 35, standardSteamIron: 15, crispStarchPress: 25, delicatePress: 30, dryClean: 90 };
const shirt = { _id: 'shirt', name: 'Shirt', pricing };

test('saved bag round-trips through the browser bag shape with current prices', () => {
  const saved = [{ garmentId: 'shirt', quantity: 2, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE' }, { garmentId: 'gone', quantity: 1, serviceType: 'WASH_AND_FOLD' }];
  const cart = cartFromSavedBag(saved, [shirt]);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].cartItemId, 'shirt');
  assert.equal(cart[0].unitPrice, 35);
  assert.equal(cart[0].lineTotal, 70);
  assert.deepEqual(bagPayload(cart), [{ cartItemId: 'shirt', garmentId: 'shirt', quantity: 2, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE', isCustomItem: false, customDescription: '' }]);
});
