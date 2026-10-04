const mongoose = require('mongoose');
const Trip = require('../models/travel');
const Booking = require('../models/bookings');

const DUPLICATE_KEY = 11000;

const bookingsCreate = async (req, res) => {
  try {
    const trip = await Trip.findOne({ code: req.body.tripCode });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const unitPriceCents = Booking.toCents(trip.price ?? trip.perPerson);
    if (unitPriceCents === null) {
      return res.status(409).json({ message: 'This trip does not have a valid price and cannot be booked' });
    }

    const travelers = req.body.travelers;
    const booking = await Booking.create({
      user: req.auth._id,
      trip: trip._id,
      tripCode: trip.code,
      resort: trip.resort,
      tripStart: trip.start,
      travelers,
      unitPriceCents,
      totalCents: travelers * unitPriceCents,
      status: 'confirmed'
    });

    return res.status(201).json(booking);
  } catch (err) {
    if (err && err.code === DUPLICATE_KEY) {
      
      return res.status(409).json({ message: 'You already have an active booking for this trip' });
    }
    if (err && err.name === 'ValidationError') {
      return res.status(422).json({ message: 'Invalid booking', error: err.message });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

const bookingsListMine = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.auth._id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const bookingsListAll = async (req, res) => {
  try {
    const filter = {};
    if (Booking.STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'name email')
      .lean();
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

const bookingsCancel = async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.isValidObjectId(bookingId)) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const filter = { _id: bookingId, status: 'confirmed' };
  if (req.auth.role !== 'admin') {
    filter.user = req.auth._id;
  }

  try {
    const booking = await Booking.findOneAndUpdate(
      filter,
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    return res.status(200).json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { bookingsCreate, bookingsListMine, bookingsListAll, bookingsCancel };