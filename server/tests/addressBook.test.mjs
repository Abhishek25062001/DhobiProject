import { test } from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
import Order from '../models/Order.js';
import ServiceArea from '../models/ServiceArea.js';
import PlatformConfig from '../models/PlatformConfig.js';
import Category from '../models/Category.js';
import Garment from '../models/Garment.js';
import TimeSlot from '../models/TimeSlot.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';

test('saved addresses, explicit checkout consent, defaults and coverage', async t => {
  const { request } = await contentTestHarness(t);
  const customer = await User.findOne({ role: 'customer' });
  const area = await ServiceArea.create({ slug: 'address-test', name: 'Address test', pincodes: ['110001'] });
  await PlatformConfig.create({ detergentOptions: [{ code: 'regular', name: 'Regular' }], packagingOptions: [{ code: 'bag', name: 'Bag' }] });
  const category = await Category.create({ name: 'Men' });
  const garment = await Garment.create({ name: 'Shirt', category: category.name, categoryId: category._id, pricing: testPrices });
  const slot = await TimeSlot.create({ label: 'Morning', startHour: 8, endHour: 10, maxCapacity: 50 });
  const address = { flatAndBuilding: '1 Test building', streetAndLandmark: 'Test road', city: 'Delhi', pincode: '110001', contactPhone: '9990000003' };
  const valid = () => ({ items: [{ garmentId: String(garment._id), quantity: 2, serviceType: 'WASH_AND_IRON', ironingType: 'STANDARD_STEAM' }], preferences: { detergentType: 'regular', packagingType: 'bag' }, pickupSchedule: { date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), timeSlot: slot.label }, deliverySchedule: { date: new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10), timeSlot: slot.label }, pickupAddress: address, paymentMethod: 'COD', isExpress: false });
  const book = patch => request('/orders', { method: 'POST', role: 'customer', body: { ...valid(), ...patch } });
  const saved = async () => (await User.findById(customer._id)).addresses.toObject();
  const change = (path, method, body, role = 'customer') => request(`/auth/addresses${path}`, { method, body, role });
  let firstOrder;
  let home;
  let work;
  await t.test('no consent never saves, even when address metadata is supplied', async () => {
    for (const addressBook of [undefined, { save: false, label: 'Home', isDefault: true }]) assert.equal((await book({ addressBook })).status, 201);
    assert.equal((await saved()).length, 0);
    assert.equal((await book({ addressBook: { save: 'true' } })).status, 400);
  });
  await t.test('consent saves first Home as default atomically and returns address book', async () => {
    const result = await book({ addressBook: { save: true } });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    firstOrder = result.body.order;
    home = result.body.addresses[0];
    assert.equal(home.label, 'Home');
    assert.equal(home.isDefault, true);
    assert.equal(home.contactPhone, address.contactPhone);
    assert.equal((await saved()).length, 1);
  });
  await t.test('repeated saves deduplicate and new addresses preserve the existing default', async () => {
    await book({ addressBook: { save: true } });
    assert.equal((await saved()).length, 1);
    const result = await change('', 'POST', { ...address, flatAndBuilding: '2 Office', label: 'Work', contactPhone: '+91 99900 00004' });
    assert.equal(result.status, 201);
    work = result.body.addresses[1];
    assert.equal(work.isDefault, false);
    assert.equal(work.contactPhone, '9990000004');
    assert.equal(result.body.addresses[0].isDefault, true);
  });
  await t.test('only owner can edit/delete; invalid fields stay unsaved and profile bulk writes cannot bypass validation', async () => {
    assert.equal((await change(`/${home._id}`, 'PUT', { isDefault: true }, 'admin')).status, 404);
    assert.equal((await change(`/${home._id}`, 'DELETE', undefined, 'admin')).status, 404);
    for (const patch of [{ flatAndBuilding: ' ' }, { pincode: '123' }, { contactPhone: '123' }, { label: 'Invalid' }, { isDefault: 'false' }]) assert.equal((await change(`/${home._id}`, 'PUT', patch)).status, 400);
    assert.equal((await request('/auth/profile', { method: 'PUT', role: 'customer', body: { addresses: [] } })).status, 400);
    assert.equal((await saved()).length, 2);
  });
  await t.test('one-order edits leave saved address unchanged; consent updates it but never historical orders', async () => {
    const pickupAddress = { ...address, flatAndBuilding: 'New Home' };
    assert.equal((await book({ pickupAddress, addressBook: { save: false } })).status, 201);
    assert.equal((await saved())[0].flatAndBuilding, address.flatAndBuilding);
    assert.equal((await book({ pickupAddress, addressBook: { save: true, addressId: home._id, label: 'Home' } })).status, 201);
    assert.equal((await saved())[0].flatAndBuilding, 'New Home');
    assert.equal((await Order.findById(firstOrder._id)).pickupAddress.flatAndBuilding, address.flatAndBuilding);
  });
  await t.test('unsupported or inactive coverage and a failed booking never save an address', async () => {
    const before = await saved();
    assert.equal((await book({ pickupAddress: { ...address, pincode: '110002' }, addressBook: { save: true } })).status, 400);
    await ServiceArea.updateOne({ _id: area._id }, { isActive: false });
    assert.equal((await book({ pickupAddress: work, addressBook: { save: true, addressId: work._id } })).status, 400);
    await ServiceArea.updateOne({ _id: area._id }, { isActive: true });
    assert.equal((await book({ items: [], addressBook: { save: true } })).status, 400);
    assert.deepEqual(await saved(), before);
  });
  await t.test('an unavailable or foreign saved-address ID rolls back the booking', async () => {
    const other = await change('', 'POST', { ...address, label: 'Home' }, 'admin');
    const count = await Order.countDocuments();
    assert.equal((await book({ addressBook: { save: true, addressId: other.body.addresses[0]._id } })).status, 404);
    assert.equal(await Order.countDocuments(), count);
  });
  await t.test('concurrent default changes keep one default and deletion chooses a remaining address', async () => {
    const results = await Promise.all([change(`/${home._id}`, 'PUT', { isDefault: true }), change(`/${work._id}`, 'PUT', { isDefault: true })]);
    results.forEach(result => assert.equal(result.status, 200));
    let addresses = await saved();
    assert.equal(addresses.filter(item => item.isDefault).length, 1);
    const defaultId = addresses.find(item => item.isDefault)._id;
    assert.equal((await change(`/${defaultId}`, 'DELETE')).status, 200);
    addresses = await saved();
    assert.equal(addresses.length, 1);
    assert.equal(addresses[0].isDefault, true);
    assert.equal((await change(`/${addresses[0]._id}`, 'DELETE')).status, 200);
    assert.equal((await saved()).length, 0);
  });
});
