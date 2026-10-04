const express = require('express');
const router = express.Router();
const tripsController = require('../controllers/trips');
const authController = require('../controllers/authentication');
const authenticate = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

router
  .route('/trips')
  .get(tripsController.tripsList)
  .post(authenticate, tripsController.tripsAddTrip);

router
  .route('/trips/:tripCode')
  .get(tripsController.tripsFindByCode)
  .put(authenticate, tripsController.tripsUpdateTrip)
  .delete(authenticate, tripsController.tripsDeleteTrip);

module.exports = router;