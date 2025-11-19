const {
  initializePropertyPayment,
  verifyPayment,
  paystackWebhook,
  getPaymentHistory,
} = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.post('/property/initialize', authenticate, initializePropertyPayment);
router.get('/verify/:reference', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);

// Webhook route (no authentication needed)
router.post('/webhook/paystack', paystackWebhook);

module.exports = router;
