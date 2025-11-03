const {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyForgotPasswordCode,
  verifyEmail,
  adminLogin,
  registerAdmin,
  getLoggedInUser,
  resendVerificationCode
} = require('../controllers/auth.controller');
const {
  authenticate,
  authorizeRoles,
} = require('../middlewares/auth.middleware');
const passport = require('passport');

const router = require('express').Router();

// router.use(passport.initialize());

// router.get(
//   '/google/login',
//   passport.authenticate('google-login', {
//     scope: ['profile', 'email'],
//     session: false,
//   })
// );

// router.get(
//   '/google/register',
//   passport.authenticate('google-register', {
//     scope: ['profile', 'email'],
//     session: false,
//   })
// );

// router.get('/google/register/callback', googleRegister);

// router.get('/google/login/callback', googleLogin);

router.post('/register', register);
router.post(
  '/admin/register',
  authenticate,
  authorizeRoles('admin'),
  registerAdmin
);
router.post('/admin/login', adminLogin);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/verify-forgot-password', verifyForgotPasswordCode);
router.post('/reset-password', authenticate, resetPassword);

router.get('/me', authenticate, getLoggedInUser)

module.exports = router;
