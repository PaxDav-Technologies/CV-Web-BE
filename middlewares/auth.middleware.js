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
    next();
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  }
};

exports.authorizeRoles = async () => {};
