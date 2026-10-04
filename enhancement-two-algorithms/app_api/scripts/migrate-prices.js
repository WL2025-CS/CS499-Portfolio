require('dotenv').config();
const mongoose = require('mongoose');
require('../models/db');
const Trip = require('../models/travel');

async function main() {
  const trips = await Trip.find({}, { perPerson: 1 }).lean();
  const ops = [];
  for (const t of trips) {
    const price = Number(t.perPerson);
    if (Number.isFinite(price)) {
      ops.push({ updateOne: { filter: { _id: t._id }, update: { $set: { pricePerPerson: price } } } });
    } else {
      console.warn(`Skipped ${t._id}: perPerson "${t.perPerson}" is not a number`);
    }
  }
  
  if (ops.length) await Trip.bulkWrite(ops);
  console.log(`Updated pricePerPerson on ${ops.length} of ${trips.length} trips.`);

  await Trip.syncIndexes();
  const indexes = await Trip.collection.indexes();
  console.log('Indexes:', indexes.map((i) => JSON.stringify(i.key)).join('  '));
}

main()
  .catch((err) => { console.error('migrate-prices failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());