const mongoose = require('mongoose');
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travlr';

mongoose.connect(dbURI);
require('./travel');
require('./users');
require('./bookings');

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected');
});
mongoose.connection.on('error', (err) => {
  console.log('Mongoose connection error: ', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose disconnected through app termination');
  process.exit(0);
});