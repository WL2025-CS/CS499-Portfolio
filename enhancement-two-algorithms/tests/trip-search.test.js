process.env.JWT_SECRET = 'test-secret';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const Trip = require('../app_api/models/travel');
const { buildTripQuery, pageInfo } = require('../app_api/utils/tripQuery');
const { tripQuerySchema } = require('../app_api/validation/schemas');

const DATA = [];
const resorts = ['Gale Reef Resort', 'Sunset Bay Resort', 'Blue Lagoon Resort'];
for (let i = 0; i < 23; i++) {
  DATA.push({
    _id: String(i).padStart(3, '0'),
    code: `TRIP${String(i).padStart(3, '0')}`,
    name: `Trip ${i}`,
    resort: resorts[i % 3],
    start: new Date(Date.UTC(2026, 0, 1 + (i % 10))),
    pricePerPerson: 500 + ((i * 137) % 2000)
  });
}

function matches(doc, filter) {
  return Object.entries(filter).every(([k, cond]) => {
    const v = doc[k];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if (cond.$gte !== undefined && !(v >= cond.$gte)) return false;
      if (cond.$lte !== undefined && !(v <= cond.$lte)) return false;
      return true;
    }
    return v === cond;
  });
}
function compare(sort) {
  return (a, b) => {
    for (const [k, dir] of Object.entries(sort)) {
      if (a[k] < b[k]) return -dir;
      if (a[k] > b[k]) return dir;
    }
    return 0;
  };
}
Trip.find = (filter) => {
  let s = {}, sk = 0, lim = Infinity;
  const q = {
    sort(x) { s = x; return q; },
    skip(x) { sk = x; return q; },
    limit(x) { lim = x; return q; },
    lean: async () => DATA.filter((d) => matches(d, filter)).sort(compare(s)).slice(sk, sk + lim)
  };
  return q;
};
Trip.countDocuments = async (filter) => DATA.filter((d) => matches(d, filter)).length;
Trip.distinct = async (field) => [...new Set(DATA.map((d) => d[field]))];

const routes = require('../app_api/routes');
let server, base;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());
const get = async (url) => {
  const res = await fetch(base + url);
  return { status: res.status, json: await res.json() };
};

test('no parameters: empty filter, date sort with _id tie-breaker, first page of 10', () => {
  const q = buildTripQuery(tripQuerySchema.validate({}).value);
  assert.deepEqual(q.filter, {});
  assert.deepEqual(q.sort, { start: 1, _id: 1 });
  assert.equal(q.skip, 0);
  assert.equal(q.limit, 10);
});

test('filters combine into one equality and two range predicates', () => {
  const q = buildTripQuery({ resort: 'Gale Reef Resort', minPrice: 1000, maxPrice: 2000, startFrom: '2026-01-01', page: 3, limit: 5 });
  assert.equal(q.filter.resort, 'Gale Reef Resort');
  assert.deepEqual(q.filter.pricePerPerson, { $gte: 1000, $lte: 2000 });
  assert.ok(q.filter.start.$gte instanceof Date);
  assert.equal(q.skip, 10);
});

test('price sort uses the numeric field, not the display string', () => {
  assert.deepEqual(buildTripQuery({ sortBy: 'price', order: 'desc' }).sort, { pricePerPerson: -1, _id: -1 });
});

test('pageInfo computes page counts and edges', () => {
  assert.deepEqual(pageInfo(23, 3, 10), { page: 3, limit: 10, total: 23, totalPages: 3, hasPrev: true, hasNext: false });
  assert.equal(pageInfo(0, 1, 10).totalPages, 1);
});

test('limit is capped at 50 so no request can return the whole collection', async () => {
  assert.equal((await get('/trips?limit=1000')).status, 422);
});

test('bad values, unknown keys, and empty ranges are rejected with 422', async () => {
  assert.equal((await get('/trips?page=0')).status, 422);
  assert.equal((await get('/trips?sortBy=password')).status, 422);
  assert.equal((await get('/trips?foo=bar')).status, 422);
  assert.equal((await get('/trips?minPrice=2000&maxPrice=1000')).status, 422);
  assert.equal((await get('/trips?startFrom=2026-05-01&startTo=2026-01-01')).status, 422);
});

test('NoSQL operator in the query string is rejected', async () => {
  assert.equal((await get('/trips?resort[$ne]=x')).status, 422);
});

test('response is a page envelope with metadata', async () => {
  const r = await get('/trips');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.length, 10);
  assert.equal(r.json.total, 23);
  assert.equal(r.json.totalPages, 3);
  assert.equal(r.json.hasNext, true);
});

test('walking every page returns each trip exactly once, even with duplicate dates', async () => {
  const seen = [];
  for (let p = 1; p <= 5; p++) {
    const r = await get(`/trips?limit=5&page=${p}`);
    seen.push(...r.json.data.map((t) => t.code));
  }
  assert.equal(seen.length, 23);
  assert.equal(new Set(seen).size, 23);
});

test('resort + price filter returns only matching trips, sorted by price', async () => {
  const r = await get('/trips?resort=Gale%20Reef%20Resort&minPrice=800&sortBy=price&limit=50');
  assert.ok(r.json.data.length > 0);
  for (const t of r.json.data) {
    assert.equal(t.resort, 'Gale Reef Resort');
    assert.ok(t.pricePerPerson >= 800);
  }
  const prices = r.json.data.map((t) => t.pricePerPerson);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

test('page past the end returns an empty list, not an error', async () => {
  const r = await get('/trips?page=99');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.length, 0);
});

test('GET /resorts lists distinct resorts alphabetically', async () => {
  const r = await get('/resorts');
  assert.deepEqual(r.json, [...resorts].sort());
});

test('model derives numeric pricePerPerson from the perPerson string', async () => {
  const t = new Trip({ code: 'X', name: 'n', length: '1', start: new Date(), resort: 'r', perPerson: '999.00', image: 'a.jpg', description: 'd' });
  await t.validate();
  assert.equal(t.pricePerPerson, 999);
});