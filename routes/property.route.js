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
router.patch('/update/:propertyId', authenticate,
  async (req, res, next) => {
      const { ROLES: _R, PERMISSIONS: _P } = require('../config/permissions');
      const user = req.user;
  
      // If super_admin → allow update immediately
      if (user.role === 'super_admin') {
        return updateProperty(req, res);
      }
  
      // Otherwise, check if the user owns the blog
      return authorizePermissions(_P.UPDATE_OWN_BLOG, {
        checkOwnership: true,
        resourceParam: 'propertyId',
        resource: 'property',
      })(req, res, next);
    },
    updateProperty
);
router.delete('/delete/:propertyId', authenticate, deleteProperty);



module.exports = router;
