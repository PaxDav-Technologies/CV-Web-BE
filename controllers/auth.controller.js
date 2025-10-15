const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const {
  sendVerificationCode,
  sendForgotPasswordCode,
} = require('../utils/emails');
const { userRoles } = require('../utils/enum');

exports.register = async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    if (!userRoles.includes(req.body.role)) {
      return res
        .status(400)
        .json({ message: `${req.body.role} is not a valid role` });
    }

    const connection = await pool.getConnection();
    const [userExists] = await connection.query(
      'SELECT * FROM user WHERE email = ?',
      [req.body.email]
    );
    if (userExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPasssword = await bcrypt.hash(req.body.password, 10);

    const newUser = await connection.query(
      'INSERT INTO user (name, email, password, avatar, method, role) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.body.name,
        req.body.email,
        hashedPasssword,
        req.body.avatar || '',
        req.body.method || 'password',
        req.body.role || 'customer',
      ]
    );

    const code = 1234;

    await sendVerificationCode(req.body.email, code);

    return res
      .status(201)
      .json({ message: 'User registered successfully', email: req.body.email });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.login = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [user] = connection.query('SELECT * FROM user WHERE email = ?', [
      req.body.email,
    ]);
    if (user.length < 0) {
      return res.status(404).json({ message: `User not found` });
    }
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: `Incorrect password` });
    }
    return res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const connection = await pool.getConnection();
    const [user] = connection.query('SELECT email FROM user WHERE email = ?', [
      email,
    ]);
    if (user.length === 0) {
      return res
        .status(400)
        .json({ message: `Account with this email not found` });
    }
    const code = 1234;
    await sendForgotPasswordCode(email, code);
    return res
      .status(200)
      .json({ message: `A code has been sent to ${email}` });
  } catch (error) {
    return res.status(500).json({ message: 'InternalServer Error' });
  }
};

exports.verifyForgotPasswordCode = async (req, res) => {
  try {
    const { code } = req.body;
    const connection = await pool.getConnection();
    const [codeData] = await connection.query(
      `SELECT code, expires_at, user_id FROM codes WHERE code = ?`,
      [code]
    );
    if(codeData === 0) {
      return res.status(400).json({message: `Invalid code`});
    }
    const [userData] = connection.query();
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
  } catch (error) {
    return res.status(500).json({ message: `Internal Serever Error` });
  }
};
