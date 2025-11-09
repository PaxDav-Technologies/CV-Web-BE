const {
  createProperty,
  addAmenities,
  getAllProperties,
  getPropertyById,
  updateProperty,
  getAmenities,
  deleteProperty,
} = require('../controllers/property.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.get('/all', optionalAuth, getAllProperties);

router.get('/amenities', getAmenities);

router.get('/:id', optionalAuth, getPropertyById);
router.post('/create', authenticate, createProperty);
router.post('/add-amenities', authenticate, addAmenities);
router.patch('/update/:id', authenticate, updateProperty);
router.delete('/delete/:id', authenticate, deleteProperty);



module.exports = router;
