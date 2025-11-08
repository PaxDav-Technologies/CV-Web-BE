const {
  getAllCustomers,
  getAllAgents,
} = require('../controllers/admin.controller');

const router = require('express').Router();

router.get('/customers', getAllCustomers);
router.get('/agents', getAllAgents);

module.exports = router;
