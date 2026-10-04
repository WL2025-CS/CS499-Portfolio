const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const mongoose = require('mongoose');
require('../../app_api/models/db');
const Trip = require('../../app_api/models/travel');
const Booking = require('../../app_api/models/bookings');

const force = process.argv.includes('--force');
const tripsFile = path.join(__dirname, '..', 'data', 'trips.json');

async function main() {
  if (process.env.NODE_ENV === 'production' && !force) {
    throw new Error('Refusing to reseed while NODE_ENV=production. Re-run with --force if you really mean it.');
  }

  const bookingCount = await Booking.countDocuments({});
  if (bookingCount > 0 && !force) {
    throw new Error(
      `Refusing to reseed: ${bookingCount} booking(s) reference the current trips. ` +
      'Re-run with --force to delete the bookings and trips together.'
    );
  }

  const trips = JSON.parse(fs.readFileSync(tripsFile, 'utf8'));
  if (force) {
    await Booking.deleteMany({});
  }
  await Trip.deleteMany({});
  const result = await Trip.insertMany(trips);
  console.log(`${result.length} trips inserted`);
}

main()
  .catch((err) => { console.error('Seed failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());