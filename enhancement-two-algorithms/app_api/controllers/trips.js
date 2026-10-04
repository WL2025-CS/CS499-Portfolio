const mongoose = require('mongoose');
const Trip = mongoose.model('trips');
const { buildTripQuery, pageInfo } = require('../utils/tripQuery');

const tripsList = async (req, res) => {
  try {
    const { filter, sort, skip, limit, page } = buildTripQuery(req.validatedQuery);

    const [trips, total] = await Promise.all([
      Trip.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Trip.countDocuments(filter)
    ]);

    return res.status(200).json({ data: trips, ...pageInfo(total, page, limit) });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resortsList = async (req, res) => {
  try {
    const resorts = await Trip.distinct('resort');
    return res.status(200).json(resorts.sort((a, b) => a.localeCompare(b)));
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
      pricePerPerson: Number(req.body.perPerson),
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
        pricePerPerson: Number(req.body.perPerson),
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
    const deletedTrip = await Trip.findOneAndDelete({ code: req.params.tripCode });
    if (!deletedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.status(200).json({ message: 'Trip deleted', trip: deletedTrip });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  tripsList,
  resortsList,
  tripsFindByCode,
  tripsAddTrip,
  tripsUpdateTrip,
  tripsDeleteTrip
};