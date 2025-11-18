const {
  initializePropertyPayment,
  verifyPayment,
} = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.post('/property/initialize', authenticate, initializePropertyPayment);
router.get('/verify/:reference', authenticate, verifyPayment);

module.exports = router;
