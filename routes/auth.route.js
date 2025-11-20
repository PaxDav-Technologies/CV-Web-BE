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
  resendVerificationCode,
  uploadAvatar,
  googleRegister,
  googleLogin,
} = require('../controllers/auth.controller');
const {
  authenticate,
  authorizeRoles,
} = require('../middlewares/auth.middleware');
const passport = require('passport');

const router = require('express').Router();
const multer = require('multer');
const { ROLES } = require('../config/permissions');
require('../utils/google');

const upload = multer({ storage: multer.memoryStorage() });

router.use(passport.initialize());

router.get(
  '/google/login',
  passport.authenticate('google-login', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get('/google/register', (req, res, next) => {
  const userType = req.query.type || 'customer';
  passport.authenticate('google-register', {
    scope: ['profile', 'email'],
    session: false,
    state: userType,
  })(req, res, next);
});

router.get('/google/register/callback', googleRegister);

router.get('/google/login/callback', googleLogin);

router.post('/register', register);
router.post(
  '/admin/register',
  upload.single('avatar'),
  authenticate,
  authorizeRoles(ROLES.admin, ROLES.super_admin),
  registerAdmin
);
router.post('/admin/login', adminLogin);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/verify-forgot-password', verifyForgotPasswordCode);
router.post('/reset-password', authenticate, resetPassword);
router.post(
  '/upload-avatar',
  authenticate,
  upload.single('avatar'),
  uploadAvatar
);

router.get('/me', authenticate, getLoggedInUser);

module.exports = router;
