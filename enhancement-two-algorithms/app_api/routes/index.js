const express = require('express');
const router = express.Router();
const tripsController = require('../controllers/trips');
const authController = require('../controllers/authentication');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { tripSchema, registerSchema, loginSchema, tripQuerySchema } = require('../validation/schemas');

const adminOnly = [authenticate, authorize('admin')];
const validTrip = validate(tripSchema, { unknown: 'strip' });
const validTripQuery = validate(tripQuerySchema, { source: 'query' });

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

router.get('/resorts', tripsController.resortsList);

router
  .route('/trips')
  .get(validTripQuery, tripsController.tripsList)
  .post(...adminOnly, validTrip, tripsController.tripsAddTrip);

router
  .route('/trips/:tripCode')
  .get(tripsController.tripsFindByCode)
  .put(...adminOnly, validTrip, tripsController.tripsUpdateTrip)
  .delete(...adminOnly, tripsController.tripsDeleteTrip);

module.exports = router;