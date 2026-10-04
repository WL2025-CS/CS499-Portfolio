const mongoose = require('mongoose');
const Trip = mongoose.model('trips');
const Booking = require('../models/bookings');

const tripsList = async (req, res) => {
  try {
    const trips = await Trip.find({});
    return res.status(200).json(trips);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const tripsFindByCode = async (req, res) => {
  try {
    const trip = await Trip.findOne({ code: req.params.tripCode });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.status(200).json(trip);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const tripsAddTrip = async (req, res) => {
  try {
    const newTrip = await Trip.create({
      code: req.body.code,
      name: req.body.name,
      length: req.body.length,
      start: req.body.start,
      resort: req.body.resort,
      perPerson: req.body.perPerson,
      image: req.body.image,
      description: req.body.description
    });
    return res.status(201).json(newTrip);
  } catch (err) {
    return res.status(400).json({ message: 'Error creating trip', error: err.message });
  }
};

const tripsUpdateTrip = async (req, res) => {
  try {
    const updatedTrip = await Trip.findOneAndUpdate(
      { code: req.params.tripCode },
      {
        code: req.body.code,
        name: req.body.name,
        length: req.body.length,
        start: req.body.start,
        resort: req.body.resort,
        perPerson: req.body.perPerson,
        image: req.body.image,
        description: req.body.description
      },
      { new: true, runValidators: true }
    );
    if (!updatedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.status(200).json(updatedTrip);
  } catch (err) {
    return res.status(400).json({ message: 'Error updating trip', error: err.message });
  }
};

const tripsDeleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ code: req.params.tripCode });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const activeBookings = await Booking.countDocuments({ trip: trip._id, status: 'confirmed' });
    if (activeBookings > 0) {
      return res.status(409).json({
        message: `This trip has ${activeBookings} confirmed booking(s) and cannot be deleted. Cancel them first.`,
        activeBookings
      });
    }

    await Trip.deleteOne({ _id: trip._id });
    return res.status(200).json({ message: 'Trip deleted', trip });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  tripsList,
  tripsFindByCode,
  tripsAddTrip,
  tripsUpdateTrip,
  tripsDeleteTrip
};