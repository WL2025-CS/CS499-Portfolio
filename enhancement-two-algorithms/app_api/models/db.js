const mongoose = require('mongoose');
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travlr';

mongoose.connect(dbURI);
require('./travel');
require('./users');

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected');
});
mongoose.connection.on('error', (err) => {
  console.log('Mongoose connection error: ', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Mongoose disconnected through app termination');
    process.exit(0);
  });
});
