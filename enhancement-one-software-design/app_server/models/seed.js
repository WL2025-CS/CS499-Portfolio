const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('./db');
const Trip = require('./travel');

const tripsFile = path.join(__dirname, '..', 'data', 'trips.json');
const trips = JSON.parse(fs.readFileSync(tripsFile, 'utf8'));

Trip.deleteMany({})
  .then(() => Trip.insertMany(trips))
  .then((result) => {
    console.log(`${result.length} trips inserted`);
    mongoose.connection.close();
  })
  .catch((err) => {
    console.log('Error seeding trips: ', err);
    mongoose.connection.close();
  });