'use strict';

const tripsEndpoint = 'http://localhost:3000/api/trips';
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

    if (!Array.isArray(json)) {
      return res.status(500).render('error', { message: 'API did not return an array of trips', error: {} });
    }
    if (json.length === 0) {
      return res.status(404).render('error', { message: 'No trips found', error: {} });
    }

    res.render('travel', { title: 'Travel', trips: json });
  } catch (err) {
    res.status(500).render('error', { message: 'Unable to load trips', error: err });
  }
};