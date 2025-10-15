const router = require('express').Router();


router.post('/register');
router.post('/login');
router.post('/verify-email');
router.post('/resend-verification');
router.post('/forgot-password');
router.post('/reset-password');

module.exports = router;