'use strict';

const tripsEndpoint = 'http://localhost:3000/api/trips?sortBy=start&order=asc&limit=50';
const options = {
  method: 'GET',
  headers: {
    Accept: 'application/json'
  }
};

module.exports.index = async (req, res) => {
  try {
    const response = await fetch(tripsEndpoint, options);
    const json = await response.json();
    const trips = json && json.data;

    if (!Array.isArray(trips)) {
      return res.status(500).render('error', { message: 'API did not return a list of trips', error: {} });
    }
    if (trips.length === 0) {
      return res.status(404).render('error', { message: 'No trips found', error: {} });
    }

    res.render('travel', { title: 'Travel', trips });
  } catch (err) {
    res.status(500).render('error', { message: 'Unable to load trips', error: err });
  }
};