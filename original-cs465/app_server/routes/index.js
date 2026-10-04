var express = require('express');
var router = express.Router();
var mainController = require('../controllers/main');
var travelController = require('../controllers/travel');

router.get('/', mainController.index);

router.get('/travel', travelController.index);

module.exports = router;