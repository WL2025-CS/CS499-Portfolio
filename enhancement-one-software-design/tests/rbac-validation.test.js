process.env.JWT_SECRET = 'test-secret';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const Trip = require('../app_api/models/travel');
const User = require('../app_api/models/users');

Trip.find = async () => [];
Trip.findOne = async (q) => ({ code: q.code });
Trip.create = async (data) => ({ ...data });
Trip.findOneAndUpdate = async (q, data) => ({ ...data });
Trip.findOneAndDelete = async (q) => ({ code: q.code });
User.prototype.save = async function () { return this; };

const authorize = require('../app_api/middleware/authorize');
const { tripSchema } = require('../app_api/validation/schemas');
const routes = require('../app_api/routes');

let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const token = (claims) => jwt.sign({ _id: '1', email: 'a@b.com', ...claims }, process.env.JWT_SECRET);
const adminToken = token({ role: 'admin' });
const userToken = token({ role: 'user' });
const legacyToken = token({}); // issued before roles existed: no role claim

const validTrip = {
  code: 'TEST210101', name: 'Test Trip', length: '3 nights', start: '2026-10-01',
  resort: 'Test Resort', perPerson: '999.00', image: 'reef1.jpg', description: 'A test trip.'
};

async function call(method, url, { auth, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

test('anyone can read trips (public endpoint unchanged)', async () => {
  assert.equal((await call('GET', '/trips')).status, 200);
});

test('write without a token is rejected with 401', async () => {
  assert.equal((await call('POST', '/trips', { body: validTrip })).status, 401);
});

test('logged-in normal user gets 403 on create, update, and delete', async () => {
  assert.equal((await call('POST', '/trips', { auth: userToken, body: validTrip })).status, 403);
  assert.equal((await call('PUT', '/trips/TEST210101', { auth: userToken, body: validTrip })).status, 403);
  assert.equal((await call('DELETE', '/trips/TEST210101', { auth: userToken })).status, 403);
});

test('token with no role claim fails closed (403)', async () => {
  assert.equal((await call('POST', '/trips', { auth: legacyToken, body: validTrip })).status, 403);
});

test('admin can create, update, and delete', async () => {
  assert.equal((await call('POST', '/trips', { auth: adminToken, body: validTrip })).status, 201);
  assert.equal((await call('PUT', '/trips/TEST210101', { auth: adminToken, body: validTrip })).status, 200);
  assert.equal((await call('DELETE', '/trips/TEST210101', { auth: adminToken })).status, 200);
});

test('authorization runs before validation: a normal user sees 403, not field errors', async () => {
  const r = await call('POST', '/trips', { auth: userToken, body: {} });
  assert.equal(r.status, 403);
  assert.equal(r.json.errors, undefined);
});

test('authorize middleware unit behaviour', () => {
  const run = (req) => {
    let out = { next: false };
    const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
    authorize('admin')(req, res, () => { out.next = true; });
    return out;
  };
  assert.equal(run({}).status, 401);
  assert.equal(run({ auth: { role: 'user' } }).status, 403);
  assert.equal(run({ auth: { role: 'admin' } }).next, true);
});

test('admin sending an empty body gets 422 listing every missing field', async () => {
  const r = await call('POST', '/trips', { auth: adminToken, body: {} });
  assert.equal(r.status, 422);
  const fields = r.json.errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ['code', 'description', 'image', 'length', 'name', 'perPerson', 'resort', 'start']);
});

test('bad price, bad image path, and bad date are each rejected', async () => {
  const r = await call('POST', '/trips', {
    auth: adminToken,
    body: { ...validTrip, perPerson: '$1,000', image: '../../etc/passwd', start: 'not-a-date' }
  });
  assert.equal(r.status, 422);
  assert.deepEqual(r.json.errors.map((e) => e.field).sort(), ['image', 'perPerson', 'start']);
});

test('NoSQL operator object in a field is rejected (injection blocked)', async () => {
  const r = await call('POST', '/trips', { auth: adminToken, body: { ...validTrip, code: { $ne: null } } });
  assert.equal(r.status, 422);
});

test('unknown fields on trips are stripped, not passed to the controller', async () => {
  const r = await call('POST', '/trips', { auth: adminToken, body: { ...validTrip, isAdmin: true, _id: 'x' } });
  assert.equal(r.status, 201);
  assert.equal(r.json.isAdmin, undefined);
  assert.equal(r.json._id, undefined);
});

test('all seeded trips still pass validation (no regression for existing data)', () => {
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app_server', 'data', 'trips.json'), 'utf8'));
  for (const trip of seed) assert.equal(tripSchema.validate(trip).error, undefined, trip.code);
});

test('an edited trip as the Angular app sends it (ISO date, _id, __v) is accepted', () => {
  const edited = { ...validTrip, start: '2026-02-14T00:00:00.000Z', _id: 'abc', __v: 0 };
  assert.equal(tripSchema.validate(edited, { stripUnknown: true }).error, undefined);
});

test('register cannot be used to self-assign the admin role (422)', async () => {
  const r = await call('POST', '/register', { body: { name: 'Eve', email: 'eve@example.com', password: 'longenough1', role: 'admin' } });
  assert.equal(r.status, 422);
});

test('register rejects a short password', async () => {
  const r = await call('POST', '/register', { body: { name: 'Eve', email: 'eve@example.com', password: 'short' } });
  assert.equal(r.status, 422);
});

test('a newly registered account gets role "user" in its token', async () => {
  const r = await call('POST', '/register', { body: { name: 'Sam', email: 'sam@example.com', password: 'longenough1' } });
  assert.equal(r.status, 201);
  assert.equal(jwt.verify(r.json.token, process.env.JWT_SECRET).role, 'user');
});

test('login rejects an operator object in place of the email (422)', async () => {
  const r = await call('POST', '/login', { body: { email: { $ne: null }, password: 'x' } });
  assert.equal(r.status, 422);
});

test('login token carries the stored role claim', async () => {
  const admin = new User({ name: 'Ada', email: 'ada@example.com', role: 'admin' });
  admin.setPassword('longenough1');
  User.findOne = async () => admin;
  const r = await call('POST', '/login', { body: { email: 'ada@example.com', password: 'longenough1' } });
  assert.equal(r.status, 200);
  assert.equal(jwt.verify(r.json.token, process.env.JWT_SECRET).role, 'admin');
});

test('an existing account with no stored role defaults to "user"', () => {
  const legacy = new User({ name: 'Old', email: 'old@example.com' });
  assert.equal(legacy.role, 'user');
});