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
const { pool } = require('../config/db');
const { PERMISSIONS } = require('../config/permissions');

exports.authenticate = async (req, res, next) => {
  let connection;
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
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, role, verified FROM account WHERE id = ?`,
      [user.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: `User not found` });
    }

    if (rows[0].verified === 0) {
      return res
        .status(401)
        .json({ message: `Please verify your email to proceed.` });
    }
    req.user = {
      id: user.id,
      role: user.role,
    };
    next();
  } catch (error) {
    console.log(`An error occurred in authentication middleware: ${error}`);
    if (error.message == 'jwt expired') {
      return res
        .status(401)
        .json({ message: `Session expired. Please log in again.` });
    }
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.optionalAuth = async (req, res, next) => {
  let connection;
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      req.user = null;
      return next();
    }

    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, role, verified FROM account WHERE id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      req.user = null;
      return next();
    }

    req.user = {
      id: decoded.id,
      role: rows[0].role,
      verified: rows[0].verified,
    };

    next();
  } catch (error) {
    console.error(`An error occurred in optionalAuth middleware: ${error}`);
    req.user = null;
    next();
  } finally {
    if (connection) connection.release();
  }
};


exports.authorizePermissions = (permission, options = {}) => {
  // options = {checkOwnership: true, resourceParam: 'blogId', resourceType: 'blogs'}
  return async (req, res, next) => {
    let connection;
    try {
      const userRole = req.user?.role;
      if (!userRole) {
        return res.status(401).json({ message: `Unauthorized` });
      }

      const rolePermissions = PERMISSIONS[userRole] || [];
      if (!rolePermissions.includes(permission)) {
        return res
          .status(403)
          .json({ message: `Forbidden: insufficient privileges` });
      }

      if (options.checkOwnership) {
        const resourceId = req.params[options.resourceParam];
        connection = await pool.getConnection();
        const [resource] = await connection.query(
          `SELECT * FROM ${options.resourceType} WHERE id = ?`,
          [options[resourceParam]]
        );
        if (resource.length == 0) {
          return res.status(404).json({ message: `Not found` });
        }
        switch (options.resourceType) {
          case `blogs`:
            if (resource.author_id !== req.user.id) {
              return res.status(401).json({ message: `Unauthorized` });
            }
            break;
          case `property`:
            if (resource.owner_id !== req.user.id) {
              return res.status(401).json({ message: `Unauthorized` });
            }
            break;
          case `account`:
            if (resource.id !== req.user.id) {
              return res.status(401).json({ message: `Unauthorized` });
            }
            break;
          default:
            break;
        }
      }

      next();
    } catch (error) {
      console.log(`Error in permission authorization middleware: ${error}`);
      return res.status(500).json({ message: `Internal Server Error` });
    } finally {
      if (connection) connection.release();
    }
  };
};
