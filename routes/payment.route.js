const {
  initializePropertyPayment,
  verifyPayment,
  paystackWebhook,
  getPaymentHistory,
  getSupportedCurrencies,
  getCurrencyRates,
} = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const getRates = require('../utils/rates');

const router = require('express').Router();

router.post('/property/initialize', authenticate, initializePropertyPayment);
router.get('/verify/:reference', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);
// router.get('/currencies', getSupportedCurrencies);
router.post('/update-rates', getRates);
router.get('/rates', getCurrencyRates);

router.post('/webhook/paystack', paystackWebhook);

module.exports = router;
