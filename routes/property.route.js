const {
  createProperty,
  addAmenities,
  getAllProperties,
  getPropertyById,
  updateProperty,
  getAmenities,
  deleteProperty,
  getRecommendedProperties,
  getPropertiesForYou,
  getTopCategories,
  getSpotlights,
} = require('../controllers/property.controller');
const {
  authenticate,
  optionalAuth,
  authorizePermissions,
} = require('../middlewares/auth.middleware');

const router = require('express').Router();

router.get('/all', optionalAuth, getAllProperties);

router.get('/amenities', getAmenities);

router.get('/recommended', optionalAuth, getRecommendedProperties);

router.get('/for-you', getPropertiesForYou);

router.get('/top-categories', getTopCategories);

router.get('/spotlight', getSpotlights);

router.get('/:id', optionalAuth, getPropertyById);
router.post('/create', authenticate, createProperty);
router.post('/add-amenities', authenticate, addAmenities);
router.patch(
  '/update/:propertyId',
  authenticate,
  async (req, res, next) => {
    const { ROLES: _R, PERMISSIONS: _P } = require('../config/permissions');
    const user = req.user;

    if (user.role === 'super_admin') {
      return updateProperty(req, res);
    }

    return authorizePermissions(_P.UPDATE_OWN_PROPERTY, {
      checkOwnership: true,
      resourceParam: 'propertyId',
      resource: 'property',
    })(req, res, next);
  },
  updateProperty
);
router.delete(
  '/delete/:propertyId',
  authenticate,
  async (req, res, next) => {
    const { ROLES: _R, PERMISSIONS: _P } = require('../config/permissions');
    const user = req.user;

    if (user.role === 'super_admin') {
      return deleteProperty(req, res);
    }

    return authorizePermissions(_P.DELETE_OWN_PROPERTY, {
      checkOwnership: true,
      resourceParam: 'propertyId',
      resource: 'property',
    })(req, res, next);
  },
  deleteProperty
);

module.exports = router;
