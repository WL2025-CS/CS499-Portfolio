const mongoose = require('mongoose');

const BOOKING_STATUSES = ['confirmed', 'cancelled'];
const MAX_TRAVELERS = 10;

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'trips', required: true },

    tripCode: { type: String, required: true, trim: true },
    resort: { type: String, required: true, trim: true },
    tripStart: { type: Date, required: true },

    travelers: {
      type: Number, required: true, min: 1, max: MAX_TRAVELERS,
      validate: { validator: Number.isInteger, message: 'travelers must be a whole number' }
    },
    unitPriceCents: {
      type: Number, required: true, min: 0,
      validate: { validator: Number.isInteger, message: 'unitPriceCents must be whole cents' }
    },
    totalCents: {
      type: Number, required: true, min: 0,
      validate: {
        validator: function (value) {
          return value === this.travelers * this.unitPriceCents;
        },
        message: 'totalCents must equal travelers x unitPriceCents'
      }
    },

    status: { type: String, enum: BOOKING_STATUSES, default: 'confirmed', required: true },
    cancelledAt: { type: Date, default: null }
  },
  { timestamps: true } // adds createdAt (the booking date) and updatedAt
);

bookingSchema.index({ user: 1, createdAt: -1 }, { name: 'user_recent_bookings' }); 
bookingSchema.index({ trip: 1, status: 1 }, { name: 'trip_status' });              
bookingSchema.index({ createdAt: 1, status: 1 }, { name: 'report_date_range' });   

bookingSchema.index(
  { user: 1, trip: 1 },
  { name: 'one_active_booking_per_user_trip', unique: true, partialFilterExpression: { status: 'confirmed' } }
);

bookingSchema.statics.toCents = function (value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
  }
  if (typeof value === 'string' && /^\d{1,7}(\.\d{1,2})?$/.test(value.trim())) {
    return Math.round(Number(value.trim()) * 100);
  }
  return null;
};

bookingSchema.statics.STATUSES = BOOKING_STATUSES;

module.exports = mongoose.models.bookings || mongoose.model('bookings', bookingSchema);