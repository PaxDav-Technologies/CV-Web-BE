const { PERMISSIONS, ROLES } = require('../config/permissions');
const {
  getAllCustomers,
  getAllAgents,
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
  authorizeRoles(ROLES.admin, ROLES.super_admin),
  getAllCustomers
);
router.get(
  '/agents',
  authenticate,
  authorizeRoles(ROLES.admin, ROLES.super_admin),
  getAllAgents
);

module.exports = router;
