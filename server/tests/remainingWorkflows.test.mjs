import { test } from 'node:test';
import assert from 'node:assert/strict';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import { contentTestHarness, testPrices } from './contentTestHarness.mjs';
import { expireBookingHolds, recoverPaymentSession, runPaymentMaintenance } from '../services/paymentMaintenance.js';
import { applyCapturedPayment, refundCancelledOrder } from '../services/payments.js';
import { MongoRateLimitStore } from '../services/mongoRateLimitStore.js';
import { verifyTransactionDatabase } from '../services/databaseReadiness.js';

test('reservation expiry, provider recovery, sessions, shared limits and paging', async t => {
 const { request } = await contentTestHarness(t);
 await verifyTransactionDatabase();
 const customer = await User.findOne({ role: 'customer' });
 const category = await Category.create({ name: 'Test' });
 const garment = await Garment.create({ name: 'Shirt', category: 'Test', categoryId: category._id, pricing: testPrices });
 let number = 0;
 const fixture = extra => Order.create({ orderNumber: `REMAINING-${++number}`, customer: customer._id, items: [{ garment: garment._id, garmentName: 'Shirt', category: 'Test', quantity: 1, serviceType: 'WASH_AND_FOLD', ironingType: 'NONE', unitPrice: 35, lineTotal: 35 }], pickupAddress: { flatAndBuilding: 'Test', streetAndLandmark: 'Test road', city: 'Delhi', pincode: '110001', contactPhone: '9990000002' }, pickupSchedule: { date: '2030-01-01', timeSlot: 'Morning' }, deliverySchedule: { date: '2030-01-04', timeSlot: 'Morning' }, pricingBreakdown: { subtotal: 35, taxAmount: 0, grandTotal: 35 }, payment: { method: 'ONLINE', status: 'PENDING' }, ...extra });
 await t.test('expiry and capture races cannot confirm an expired reservation', async () => {
   for (let i=0; i<5; i++) {
    const order = await fixture({ holdExpiresAt: new Date(Date.now()-1000), payment: { method: 'ONLINE', status: 'PENDING', razorpayOrderId: `order_expiry_${i}` } });
    await Promise.all([expireBookingHolds(), applyCapturedPayment(order._id, { id: `pay_expiry_${i}`, order_id: `order_expiry_${i}`, amount: 3500, currency: 'INR', status: 'captured', captured: true })]);
    const result = await Order.findById(order._id);
    assert.equal(result.orderStatus, 'CANCELLED'); assert.equal(result.payment.status, 'PAID'); assert.equal(result.payment.refundRequired, true);
   }
   const cod = await fixture({ holdExpiresAt: new Date(0), payment: { method: 'COD', status: 'PENDING' } });
   await expireBookingHolds(); assert.equal((await Order.findById(cod._id)).orderStatus, 'BOOKED');
 });
 await t.test('unknown original session recovers once, mismatched or ambiguous results remain blocked', async () => {
   const order = await fixture({ payment: { method: 'ONLINE', sessionState: 'UNKNOWN' } });
   const remote = { id: 'order_recovered', receipt: order.orderNumber, amount: 3500, currency: 'INR' };
   for (const items of [[], [remote, {...remote,id:'order_duplicate'}], [{...remote,currency:'USD'}]]) await assert.rejects(recoverPaymentSession(order, { gateway: { orders: { all: async () => ({ items }) } } }));
   await Promise.all(Array.from({length:5},()=>recoverPaymentSession(order,{gateway:{orders:{all:async()=>({items:[remote]})}}})));
   const result = await Order.findById(order._id); assert.equal(result.payment.razorpayOrderId, remote.id); assert.equal(result.statusHistory.length,1);
 });
 await t.test('refund timeout retries use the original provider idempotency key', async () => {
   let order = await fixture({ orderStatus: 'CANCELLED', payment: { method: 'ONLINE', status: 'PAID', razorpayOrderId: 'order_refund_retry', razorpayPaymentId: 'pay_refund_retry', refundRequired: true } });
   const keys = []; let refunded = false;
   const gateway = { payments: { fetch: async () => ({ id: 'pay_refund_retry', order_id: 'order_refund_retry', amount: 3500, currency: 'INR', status: refunded ? 'refunded' : 'captured', amount_refunded: refunded ? 3500 : 0 }) }, refundIdempotent: async (id, amount, key) => {
     keys.push(key); if(keys.length === 1) throw new Error('Response lost after provider accepted refund');
     refunded = true; return { id: 'rfnd_original', payment_id: id, amount };
   } };
   order = await refundCancelledOrder(order, { gateway });
   assert.equal(order.payment.refundState, 'UNKNOWN');
   await Promise.all(Array.from({length:5}, () => refundCancelledOrder(order, { gateway })));
   order = await Order.findById(order._id);
   assert.equal(keys.length, 2); assert.equal(new Set(keys).size, 1);
   assert.equal(order.payment.status, 'REFUNDED'); assert.equal(order.payment.refundRequired, false);
   await refundCancelledOrder(order, { gateway }); assert.equal(keys.length, 2);
 });
 await t.test('shared rate-limit counters are atomic across two server instances', async () => {
   const a = new MongoRateLimitStore('test-shared'), b = new MongoRateLimitStore('test-shared');
   a.init({windowMs:60000}); b.init({windowMs:60000});
   const hits = await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).increment('same-user-order')));
   assert.deepEqual(hits.map(x=>x.totalHits).sort((a,b)=>a-b),Array.from({length:30},(_,i)=>i+1));
   await a.resetKey('same-user-order'); assert.equal((await b.increment('same-user-order')).totalHits,1);
 });
 await t.test('cookie login hides JWT, authenticates subsequent requests, and blocks CSRF', async () => {
   const login = await request('/auth/login', { method:'POST', headers:{'X-Session-Mode':'cookie','X-CSRF-Protection':'1'}, body:{email:'customer@example.test',password:'isolated-test-password'} });
   assert.equal(login.status,200); assert.equal(login.body.token,undefined); assert.equal(login.body.session,true);
   const cookie = login.headers.get('set-cookie'); assert.match(cookie,/HttpOnly/);
   const headers={Cookie:cookie.split(';')[0]};
   assert.equal((await request('/auth/me',{headers})).status,200);
   assert.equal((await request('/auth/logout',{method:'POST',headers})).status,403);
   assert.equal((await request('/auth/logout',{method:'POST',headers:{...headers,'X-CSRF-Protection':'1',Origin:'https://attacker.example'}})).status,403);
   assert.equal((await request('/auth/logout',{method:'POST',headers:{...headers,'X-CSRF-Protection':'1'}})).status,200);
 });
 await t.test('cursor pagination has no duplicates and never exposes another customer', async () => {
   for(let i=0;i<7;i++) await fixture({payment:{method:'COD',status:'PENDING'}});
   let cursor, ids=[];
   do { const page=await request('/orders/my-orders?limit=3'+(cursor?'&cursor='+cursor:''),{role:'customer'}); assert.equal(page.status,200); assert.ok(page.body.orders.length<=3); ids.push(...page.body.orders.map(x=>x._id)); cursor=page.body.nextCursor; } while(cursor);
   assert.equal(new Set(ids).size,ids.length); assert.equal(ids.length,await Order.countDocuments({customer:customer._id}));
   assert.equal((await request('/orders/my-orders?limit=1000',{role:'customer'})).status,400);
   assert.equal((await request('/orders/my-orders?cursor=bad',{role:'customer'})).status,400);
 });
 await t.test('maintenance reports unresolved records without fabricating payment', async () => {
   const logs=[]; const summary=await runPaymentMaintenance({gateway:null,log:x=>logs.push(JSON.parse(x)),limit:2});
   assert.ok(summary.checked<=2);assert.ok(summary.unresolved>0);assert.ok(logs.some(x=>x.event==='payment_reconciliation_pending'));
 });
});
