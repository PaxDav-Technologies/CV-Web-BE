const { PERMISSIONS, ROLES } = require('../config/permissions');
const {
  getAllCustomers,
  getAllAgents,
  approveProperty,
  getAllUsers,
} = require('../controllers/admin.controller');
const {
  authorizePermissions,
  authorizeRoles,
  authenticate,
} = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.get(
  '/customers',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  getAllCustomers
);
router.get(
  '/agents',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  getAllAgents
);

router.patch(
  '/approve-property',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  approveProperty
);

router.get('/all-users', authenticate, authorizeRoles('admin', 'super_admin'), getAllUsers)

router.patch('/account/suspend', authenticate, authorizeRoles('super_admin'));

module.exports = router;
