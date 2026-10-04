process.env.JWT_SECRET = 'test-secret';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Aggregator } = require('mingo');
require('mingo/init/system');

const Trip = require('../app_api/models/travel');
require('../app_api/models/users');
const Booking = require('../app_api/models/bookings');
const { buildRevenuePipeline } = require('../app_api/controllers/reports');

const oid = () => new mongoose.Types.ObjectId();
const tripId = oid();
const userId = oid().toString();
const otherUserId = oid().toString();

const sampleTrip = {
  _id: tripId, code: 'GALR210214', name: 'Gale Reef', resort: 'Gale Reef Resort',
  start: new Date('2026-02-14'), perPerson: '1899.00'
};

let calls;
beforeEach(() => {
  calls = {};
  Trip.findOne = async (q) => { calls.tripFindOne = q; return q.code === sampleTrip.code ? sampleTrip : null; };
  Trip.deleteOne = async (q) => { calls.tripDeleteOne = q; return { deletedCount: 1 }; };
  Booking.create = async (data) => { calls.bookingCreate = data; return { _id: oid(), ...data }; };
  Booking.countDocuments = async (q) => { calls.count = q; return 0; };
  Booking.findOneAndUpdate = async (filter, update) => {
    calls.cancel = { filter, update };
    return { _id: filter._id, status: 'cancelled' };
  };
  Booking.find = () => {
    const chain = { sort: () => chain, limit: () => chain, populate: () => chain, lean: async () => [] };
    return chain;
  };
  Booking.aggregate = async (pipeline) => { calls.pipeline = pipeline; return [{ totals: [], byResort: [], topTrips: [] }]; };
});

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

const token = (claims) => jwt.sign({ email: 'a@b.com', ...claims }, process.env.JWT_SECRET);
const userToken = token({ _id: userId, role: 'user' });
const adminToken = token({ _id: oid().toString(), role: 'admin' });

async function call(method, url, { auth, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const validBooking = () => ({
  user: oid(), trip: tripId, tripCode: 'GALR210214', resort: 'Gale Reef Resort',
  tripStart: new Date('2026-02-14'), travelers: 2, unitPriceCents: 189900, totalCents: 379800
});

test('a well-formed booking passes schema validation', () => {
  assert.equal(new Booking(validBooking()).validateSync(), undefined);
});

test('travelers must be a whole number from 1 to 10', () => {
  for (const travelers of [0, 11, 2.5]) {
    const b = new Booking({ ...validBooking(), travelers, totalCents: Math.round(travelers * 189900) });
    assert.ok(b.validateSync()?.errors.travelers, `travelers=${travelers} should fail`);
  }
});

test('a total that does not equal travelers x unit price is rejected', () => {
  const err = new Booking({ ...validBooking(), totalCents: 1 }).validateSync();
  assert.ok(err?.errors.totalCents);
});

test('status only accepts confirmed or cancelled', () => {
  const err = new Booking({ ...validBooking(), status: 'pending' }).validateSync();
  assert.ok(err?.errors.status);
});

test('indexes: one active booking per user per trip is enforced by a partial unique index', () => {
  const idx = Booking.schema.indexes().find(([, opts]) => opts.name === 'one_active_booking_per_user_trip');
  assert.ok(idx, 'index is declared');
  assert.deepEqual(idx[0], { user: 1, trip: 1 });
  assert.equal(idx[1].unique, true);
  assert.deepEqual(idx[1].partialFilterExpression, { status: 'confirmed' });
  const names = Booking.schema.indexes().map(([, o]) => o.name);
  for (const n of ['user_recent_bookings', 'trip_status', 'report_date_range']) assert.ok(names.includes(n), n);
});

test('toCents converts prices exactly and rejects bad values', () => {
  assert.equal(Booking.toCents('1899.00'), 189900);
  assert.equal(Booking.toCents('2199'), 219900);
  assert.equal(Booking.toCents(0.1 + 0.2), 30);
  assert.equal(Booking.toCents(1999.99), 199999);
  for (const bad of ['', '$1,899', '-5', 'abc', null, undefined, -1, NaN]) {
    assert.equal(Booking.toCents(bad), null, String(bad));
  }
});

test('booking requires a signed-in user (401 without a token)', async () => {
  assert.equal((await call('POST', '/bookings', { body: { tripCode: 'GALR210214', travelers: 2 } })).status, 401);
});

test('price, user and trip details come from the database and token, not the request', async () => {
  const r = await call('POST', '/bookings', { auth: userToken, body: { tripCode: 'GALR210214', travelers: 2 } });
  assert.equal(r.status, 201);
  const saved = calls.bookingCreate;
  assert.equal(saved.user, userId);
  assert.equal(saved.trip.toString(), tripId.toString());
  assert.equal(saved.resort, 'Gale Reef Resort');
  assert.equal(saved.unitPriceCents, 189900);
  assert.equal(saved.totalCents, 379800);
  assert.equal(saved.status, 'confirmed');
});

test('a client trying to set its own price or owner is rejected (422)', async () => {
  const r = await call('POST', '/bookings', {
    auth: userToken, body: { tripCode: 'GALR210214', travelers: 2, totalCents: 1, user: otherUserId }
  });
  assert.equal(r.status, 422);
  assert.equal(calls.bookingCreate, undefined);
});

test('invalid traveler counts and operator injection are rejected (422)', async () => {
  for (const body of [
    { tripCode: 'GALR210214', travelers: 0 },
    { tripCode: 'GALR210214', travelers: 11 },
    { tripCode: 'GALR210214', travelers: 1.5 },
    { tripCode: { $ne: null }, travelers: 1 }
  ]) {
    assert.equal((await call('POST', '/bookings', { auth: userToken, body })).status, 422, JSON.stringify(body));
  }
});

test('booking an unknown trip returns 404', async () => {
  const r = await call('POST', '/bookings', { auth: userToken, body: { tripCode: 'NOPE123', travelers: 1 } });
  assert.equal(r.status, 404);
});

test('a duplicate active booking (unique index violation) returns 409', async () => {
  Booking.create = async () => { const e = new Error('E11000 duplicate key'); e.code = 11000; throw e; };
  const r = await call('POST', '/bookings', { auth: userToken, body: { tripCode: 'GALR210214', travelers: 1 } });
  assert.equal(r.status, 409);
});

test('a trip with an unusable stored price cannot be booked (409)', async () => {
  Trip.findOne = async () => ({ ...sampleTrip, perPerson: 'call us' });
  const r = await call('POST', '/bookings', { auth: userToken, body: { tripCode: 'GALR210214', travelers: 1 } });
  assert.equal(r.status, 409);
});

test('only admins can list every booking', async () => {
  assert.equal((await call('GET', '/bookings', { auth: userToken })).status, 403);
  assert.equal((await call('GET', '/bookings', { auth: adminToken })).status, 200);
});

test('any signed-in user can list their own bookings', async () => {
  assert.equal((await call('GET', '/bookings/mine')).status, 401);
  assert.equal((await call('GET', '/bookings/mine', { auth: userToken })).status, 200);
});

test('a user cancel is scoped to their own confirmed bookings in the query filter', async () => {
  const id = oid().toString();
  const r = await call('PATCH', `/bookings/${id}/cancel`, { auth: userToken });
  assert.equal(r.status, 200);
  assert.deepEqual(calls.cancel.filter, { _id: id, status: 'confirmed', user: userId });
  assert.equal(calls.cancel.update.$set.status, 'cancelled');
});

test('an admin cancel is not limited to one owner', async () => {
  const id = oid().toString();
  await call('PATCH', `/bookings/${id}/cancel`, { auth: adminToken });
  assert.equal(calls.cancel.filter.user, undefined);
});

test('cancelling someone else\'s, a missing, or a malformed booking id returns 404', async () => {
  Booking.findOneAndUpdate = async () => null;
  assert.equal((await call('PATCH', `/bookings/${oid()}/cancel`, { auth: userToken })).status, 404);
  assert.equal((await call('PATCH', '/bookings/not-an-id/cancel', { auth: userToken })).status, 404);
});

test('a trip with confirmed bookings cannot be deleted (409)', async () => {
  Booking.countDocuments = async (q) => { calls.count = q; return 3; };
  const r = await call('DELETE', '/trips/GALR210214', { auth: adminToken });
  assert.equal(r.status, 409);
  assert.equal(r.json.activeBookings, 3);
  assert.deepEqual(calls.count, { trip: tripId, status: 'confirmed' });
  assert.equal(calls.tripDeleteOne, undefined, 'trip must not be deleted');
});

test('a trip with no confirmed bookings can still be deleted', async () => {
  const r = await call('DELETE', '/trips/GALR210214', { auth: adminToken });
  assert.equal(r.status, 200);
  assert.deepEqual(calls.tripDeleteOne, { _id: tripId });
});

test('the revenue report is admin only', async () => {
  assert.equal((await call('GET', '/reports/revenue')).status, 401);
  assert.equal((await call('GET', '/reports/revenue', { auth: userToken })).status, 403);
  assert.equal((await call('GET', '/reports/revenue', { auth: adminToken })).status, 200);
});

test('report date range is validated (422 for bad dates or to before from)', async () => {
  assert.equal((await call('GET', '/reports/revenue?from=yesterday', { auth: adminToken })).status, 422);
  assert.equal((await call('GET', '/reports/revenue?from=2026-05-01&to=2026-04-01', { auth: adminToken })).status, 422);
  assert.equal((await call('GET', '/reports/revenue?from=2026-04-01&to=2026-05-01', { auth: adminToken })).status, 200);
});

test('report with no bookings returns zero totals instead of failing', async () => {
  const r = await call('GET', '/reports/revenue', { auth: adminToken });
  assert.equal(r.json.totals.revenue, 0);
  assert.deepEqual(r.json.byResort, []);
});

test('the date filter is the first pipeline stage so it can use the createdAt index', () => {
  const [first] = buildRevenuePipeline({ from: '2026-04-01', to: '2026-05-01' });
  assert.deepEqual(first, {
    $match: {
      status: { $in: ['confirmed', 'cancelled'] },
      createdAt: { $gte: new Date('2026-04-01'), $lt: new Date('2026-05-01') }
    }
  });
});

test('revenue pipeline produces correct totals, per-resort figures and top trips', () => {
  const reef = oid();
  const sunset = oid();
  const deletedTrip = oid();
  const trips = [
    { _id: reef, code: 'GALR210214', name: 'Gale Reef' },
    { _id: sunset, code: 'TRSY210415', name: 'Tropical Sunset' }
  ];
  const b = (trip, tripCode, resort, travelers, unit, status, day) => ({
    trip, tripCode, resort, travelers, unitPriceCents: unit, totalCents: travelers * unit, status,
    createdAt: new Date(`2026-04-${String(day).padStart(2, '0')}`)
  });
  const bookings = [
    b(reef, 'GALR210214', 'Gale Reef Resort', 2, 189900, 'confirmed', 1),        // 3,798.00
    b(reef, 'GALR210214', 'Gale Reef Resort', 1, 189900, 'confirmed', 2),        // 1,899.00
    b(reef, 'GALR210214', 'Gale Reef Resort', 4, 189900, 'cancelled', 3),        // not revenue
    b(sunset, 'TRSY210415', 'Sunset Bay Resort', 3, 219900, 'confirmed', 4),     // 6,597.00
    b(deletedTrip, 'OLDT200101', 'Sunset Bay Resort', 1, 10001, 'confirmed', 5), // 100.01
    b(sunset, 'TRSY210415', 'Sunset Bay Resort', 9, 219900, 'confirmed', 28)     // outside range
  ];

  const pipeline = buildRevenuePipeline({ from: '2026-04-01', to: '2026-04-20' });
  const [report] = new Aggregator(pipeline, {
    collectionResolver: (name) => (name === 'trips' ? trips : [])
  }).run(bookings);

  assert.deepEqual(report.totals[0], {
    bookings: 4, cancellations: 1, travelers: 7, revenue: 12394.01,
    averageBookingValue: 3098.5, cancellationRate: 0.2
  });

  const [sunsetRow, reefRow] = report.byResort;
  assert.equal(sunsetRow.resort, 'Sunset Bay Resort');
  assert.equal(sunsetRow.revenue, 6697.01);
  assert.equal(sunsetRow.tripCount, 2);
  assert.equal(reefRow.resort, 'Gale Reef Resort');
  assert.equal(reefRow.revenue, 5697);
  assert.equal(reefRow.bookings, 2);
  assert.equal(reefRow.cancellations, 1);
  assert.equal(reefRow.cancellationRate, 0.333);

  assert.deepEqual(report.topTrips.map((t) => [t.tripCode, t.tripName, t.revenue]), [
    ['TRSY210415', 'Tropical Sunset', 6597],
    ['GALR210214', 'Gale Reef', 5697],
    ['OLDT200101', 'OLDT200101', 100.01]
  ]);
});