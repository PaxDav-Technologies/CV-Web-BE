// Middleware to authorize specific roles
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Assumes req.user is set by authentication middleware
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: 'Forbidden: insufficient privileges' });
    }
    next();
  };
};
const jwt = require('jsonwebtoken');

exports.authenticate = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res
        .status(401)
        .json({ message: `Authentication token is required` });
    }
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: `Invalid token` });
    }
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!user) {
      return res.status(401).json({ message: `Unauthorized` });
    }
    req.user = {
      id: user.id,
      role: user.role,
    };
    next();
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  }
};

exports.authorizeRoles = async () => {};
