const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  code: { type: String, required: true, index: true },
  name: { type: String, required: true },
  length: { type: String, required: true },
  start: { type: Date, required: true },
  resort: { type: String, required: true },
  perPerson: { type: String, required: true },
  pricePerPerson: { type: Number, min: 0 },
  image: { type: String, required: true },
  description: { type: String, required: true },
});

tripSchema.pre('validate', function () {
  const price = Number(this.perPerson);
  if (Number.isFinite(price)) this.pricePerPerson = price;
});

tripSchema.index({ resort: 1, start: 1 });
tripSchema.index({ start: 1 });
tripSchema.index({ pricePerPerson: 1 });

const Trip = mongoose.model('trips', tripSchema);
module.exports = Trip;