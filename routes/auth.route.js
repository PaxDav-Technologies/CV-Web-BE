const { register, login, forgotPassword, resetPassword, verifyForgotPasswordCode } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = require('express').Router();


router.post('/register', register);
router.post('/login', login);
router.post('/verify-email');
router.post('/resend-verification');
router.post('/forgot-password', forgotPassword);
router.post('verify-forgot-password', verifyForgotPasswordCode)
router.post('/reset-password', authenticate, resetPassword);

module.exports = router;