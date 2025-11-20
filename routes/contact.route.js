const { getContactById, getAllContacts, createContact } = require('../controllers/contact.controller');
const {
  authenticate,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.post('/create', createContact);
router.get('/all', authenticate, authorizeRoles('admin', 'super_admin'), getAllContacts);
router.get('/:contactId', authenticate, authorizeRoles('admin', 'super_admin'), getContactById)

module.exports = router;
