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
