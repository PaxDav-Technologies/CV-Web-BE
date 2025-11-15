const { authenticate } = require('passport');
const {
  initializePropertyPayment,
  verifyPayment,
} = require('../controllers/payment.controller');

const router = require('express').Router();

router.post('/property/initialize', authenticate, initializePropertyPayment);
router.get('/verify/:reference', authenticate, verifyPayment);

module.exports = router;
