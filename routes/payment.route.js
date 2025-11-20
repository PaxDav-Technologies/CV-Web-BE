const {
  initializePropertyPayment,
  verifyPayment,
  paystackWebhook,
  getPaymentHistory,
  getSupportedCurrencies,
} = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.post('/property/initialize', authenticate, initializePropertyPayment);
router.get('/verify/:reference', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);
router.get('/currencies', getSupportedCurrencies);

router.post('/webhook/paystack', paystackWebhook);

module.exports = router;
