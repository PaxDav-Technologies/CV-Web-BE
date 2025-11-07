const {
  createProperty,
  addAmenities,
  getAllProperties,
  getPropertyById,
  updateProperty,
  getAmenities,
} = require('../controllers/property.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.get('/all', getAllProperties);

router.get('/amenities', getAmenities);

router.get('/:id', getPropertyById);
router.post('/create', authenticate, createProperty);
router.post('/add-amenities', authenticate, addAmenities);
router.patch('/update/:id', authenticate, updateProperty);


module.exports = router;
