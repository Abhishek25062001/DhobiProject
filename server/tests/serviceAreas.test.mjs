import { test } from 'node:test';
import assert from 'node:assert/strict';
import ServiceArea from '../models/ServiceArea.js';
import { serviceAreaMigration } from '../services/serviceAreaMigration.js';
import { contentTestHarness } from './contentTestHarness.mjs';

test('T11 coverage ownership, administration and migration', async t => {
  const { request } = await contentTestHarness(t);
  let delhi;
  await t.test('dry run does not write; existing exact coverage is migrated once', async () => {
    assert.equal((await serviceAreaMigration()).changed, 4);
    assert.equal(await ServiceArea.countDocuments(), 0);
    assert.equal((await serviceAreaMigration({ apply: true })).changed, 4);
    assert.equal((await serviceAreaMigration({ apply: true })).changed, 0);
    delhi = (await request('/admin/service-areas', { role: 'admin' })).body.areas[0];
    assert.equal(delhi.shortName, 'Delhi NCR Central & South');
    assert.equal(delhi.pincodes.length, 15);
  });
  await t.test('only exact pincodes qualify; ranges and locality names do not', async () => {
    assert.equal((await request('/service-areas/check?pincode=110001')).body.serviceable, true);
    assert.equal((await request('/service-areas/check?pincode=110084')).body.serviceable, false);
    for (const query of ['Delhi', '000000', '1100011', '']) assert.equal((await request(`/service-areas/check?pincode=${query}`)).status, 400);
    assert.equal((await request('/service-areas')).body.areas.length, 4);
  });
  await t.test('only admins can edit; stale saves and overlapping active pincodes are rejected', async () => {
    const body = { slug: 'new-hub', name: 'New Hub', pincodes: ['110001'] };
    assert.equal((await request('/admin/service-areas', { method: 'POST', body })).status, 401);
    assert.equal((await request('/admin/service-areas', { method: 'POST', role: 'customer', body })).status, 403);
    assert.equal((await request('/admin/service-areas', { method: 'POST', role: 'admin', body })).status, 409);
    assert.equal((await request('/admin/service-areas', { method: 'POST', role: 'admin', body: { ...body, pincodes: ['110099', '110099'] } })).status, 400);
    assert.equal((await request('/admin/service-areas', { method: 'POST', role: 'admin', body: { ...body, pincodes: [] } })).status, 400);
    const updated = await request(`/admin/service-areas/${delhi._id}`, { method: 'PUT', role: 'admin', body: { revision: delhi.revision, shortName: 'Edited hub', sortOrder: 9, pincodes: ['110099'], summary: 'Edited summary' } });
    assert.equal(updated.status, 200);
    assert.equal((await request(`/admin/service-areas/${delhi._id}`, { method: 'PUT', role: 'admin', body: { revision: delhi.revision, name: 'Stale name' } })).status, 409);
    delhi = updated.body.area;
    const areas = (await request('/service-areas')).body.areas;
    assert.equal(areas.at(-1).shortName, 'Edited hub');
    assert.equal((await request('/service-areas/check?pincode=110001')).body.serviceable, false);
    assert.equal((await request('/service-areas/check?pincode=110099')).body.area.summary, 'Edited summary');
  });
  await t.test('archive, restoration and repeats preserve admin choices', async () => {
    delhi = (await request(`/admin/service-areas/${delhi._id}`, { method: 'PUT', role: 'admin', body: { revision: delhi.revision, isActive: false } })).body.area;
    assert.equal((await request('/service-areas')).body.areas.length, 3);
    assert.equal((await request('/service-areas/check?pincode=110099')).body.serviceable, false);
    assert.equal((await serviceAreaMigration({ apply: true })).changed, 0);
    assert.equal((await ServiceArea.findById(delhi._id)).isActive, false);
    const replacement = (await request('/admin/service-areas', { method: 'POST', role: 'admin', body: { slug: 'replacement', name: 'Replacement', pincodes: ['110099'] } })).body.area;
    assert.equal((await request(`/admin/service-areas/${delhi._id}`, { method: 'PUT', role: 'admin', body: { revision: delhi.revision, isActive: true } })).status, 409);
    await request(`/admin/service-areas/${replacement._id}`, { method: 'PUT', role: 'admin', body: { revision: replacement.revision, isActive: false } });
    assert.equal((await request(`/admin/service-areas/${delhi._id}`, { method: 'PUT', role: 'admin', body: { revision: delhi.revision, isActive: true } })).status, 200);
    assert.equal((await request('/service-areas/check?pincode=110099')).body.serviceable, true);
  });
  await t.test('concurrent overlapping creations cannot both succeed', async () => {
    const results = await Promise.all(['a', 'b'].map(slug => request('/admin/service-areas', { method: 'POST', role: 'admin', body: { slug: `race-${slug}`, name: 'Race hub', pincodes: ['123456'] } })));
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  });
});
