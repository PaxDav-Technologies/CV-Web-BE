const {
  toggleSaveProperty,
  viewSavedProperties,
} = require('../controllers/customer.controller');
const {
  authenticate,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.post(
  '/save-property',
  authenticate,
  authorizeRoles('customer'),
  toggleSaveProperty
);
router.get(
  '/saved-properties',
  authenticate,
  authorizeRoles('customer'),
  viewSavedProperties
);

module.exports = router;
