const express = require('express');
const router = express.Router();
const tripsController = require('../controllers/trips');
const authController = require('../controllers/authentication');
const bookingsController = require('../controllers/bookings');
const reportsController = require('../controllers/reports');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  tripSchema, registerSchema, loginSchema, bookingSchema, reportQuerySchema
} = require('../validation/schemas');

const adminOnly = [authenticate, authorize('admin')];
const validTrip = validate(tripSchema, { unknown: 'strip' });

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

router
  .route('/trips')
  .get(tripsController.tripsList)
  .post(...adminOnly, validTrip, tripsController.tripsAddTrip);

router
  .route('/trips/:tripCode')
  .get(tripsController.tripsFindByCode)
  .put(...adminOnly, validTrip, tripsController.tripsUpdateTrip)
  .delete(...adminOnly, tripsController.tripsDeleteTrip);

router
  .route('/bookings')
  .get(...adminOnly, bookingsController.bookingsListAll)
  .post(authenticate, validate(bookingSchema), bookingsController.bookingsCreate);

router.get('/bookings/mine', authenticate, bookingsController.bookingsListMine);
router.patch('/bookings/:bookingId/cancel', authenticate, bookingsController.bookingsCancel);

router.get(
  '/reports/revenue',
  ...adminOnly,
  validate(reportQuerySchema, { source: 'query' }),
  reportsController.revenueReport
);

module.exports = router;