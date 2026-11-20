import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffCart, cartSummary, productProps } from '../src/services/cartAnalytics.mjs';

const shirt = { _id: 'shirt', name: 'Shirt', category: 'Men' };
const line = (quantity, extra = {}) => ({ garment: shirt, quantity, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE', unitPrice: 35, lineTotal: 35 * quantity, ...extra });

test('cart diff reports additions, removals and option changes', () => {
  assert.deepEqual(diffCart([], [line(2)]).map(c => [c.type, c.quantity]), [['add', 2]]);
  assert.deepEqual(diffCart([line(3)], [line(1)]).map(c => [c.type, c.quantity]), [['remove', 2]]);
  assert.deepEqual(diffCart([line(2)], []).map(c => [c.type, c.quantity]), [['remove', 2]]);
  assert.deepEqual(diffCart([line(1)], [line(1, { serviceType: 'DRY_CLEAN' })]).map(c => c.type), ['option']);
  assert.deepEqual(diffCart([line(1)], [line(1, { garment: { ...shirt, name: 'Renamed' } })]), []);
});

test('cart summary and product props never include custom descriptions', () => {
  assert.deepEqual(cartSummary([line(2), line(1, { garment: { _id: 'kurta' }, lineTotal: 50 })]), { cartValue: 120, cartItems: 3, cartLines: 2 });
  const custom = productProps({ ...line(1), cartItemId: 'custom_1', isCustomItem: true, customDescription: 'Grandma wedding saree' });
  assert.equal(custom.productName, 'Custom item');
  assert.ok(!JSON.stringify(custom).includes('Grandma'));
});
