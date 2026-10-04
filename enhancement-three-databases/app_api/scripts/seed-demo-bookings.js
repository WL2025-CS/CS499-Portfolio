require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
require('../models/db');

const Trip = mongoose.model('trips');
const User = mongoose.model('users');
const Booking = mongoose.model('bookings');

const DEMO_DOMAIN = '@demo.travlr.local';
const CUSTOMERS = ['Avery Brooks', 'Jordan Lee', 'Sam Patel', 'Riley Chen', 'Morgan Diaz', 'Casey Kim'];
const DAY_MS = 24 * 60 * 60 * 1000;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data is not allowed when NODE_ENV=production.');
  }

  const demoUsers = await User.find({ email: { $regex: `${DEMO_DOMAIN.replace(/\./g, '\\.')}$` } });
  const demoIds = demoUsers.map((u) => u._id);
  if (process.argv.includes('--reset')) {
    await Booking.deleteMany({ user: { $in: demoIds } });
  } else if (demoIds.length && (await Booking.countDocuments({ user: { $in: demoIds } }))) {
    console.log('Demo bookings already exist. Use --reset to recreate them.');
    return;
  }

  const trips = await Trip.find({});
  if (!trips.length) throw new Error('No trips found. Run npm run seed first.');

  const users = [];
  for (const name of CUSTOMERS) {
    const email = name.toLowerCase().replace(/\s+/g, '.') + DEMO_DOMAIN;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, role: 'user' });
      user.setPassword(crypto.randomBytes(24).toString('hex'));
      await user.save();
    }
    users.push(user);
  }

  const random = seededRandom(465);
  const now = Date.now();
  const docs = [];
  for (const user of users) {
    for (const trip of trips) {
      if (random() < 0.35) continue;
      const travelers = 1 + Math.floor(random() * 4);
      const unitPriceCents = Booking.toCents(trip.price ?? trip.perPerson);
      if (unitPriceCents === null) continue;
      const createdAt = new Date(now - Math.floor(random() * 120) * DAY_MS);
      const cancelled = random() < 0.15;
      const doc = new Booking({
        user: user._id,
        trip: trip._id,
        tripCode: trip.code,
        resort: trip.resort,
        tripStart: trip.start,
        travelers,
        unitPriceCents,
        totalCents: travelers * unitPriceCents,
        status: cancelled ? 'cancelled' : 'confirmed',
        cancelledAt: cancelled ? new Date(createdAt.getTime() + DAY_MS) : null
      });
      const error = doc.validateSync();
      if (error) throw error;
      const raw = doc.toObject();
      raw.createdAt = createdAt;
      raw.updatedAt = createdAt;
      docs.push(raw);
    }
  }

  await Booking.collection.insertMany(docs);
  console.log(`${docs.length} demo bookings created for ${users.length} demo customers.`);
}

main()
  .catch((err) => { console.error('seed-demo-bookings failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());