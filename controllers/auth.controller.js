const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
require('../utils/google');


const {
  sendVerificationCode,
  sendForgotPasswordCode,
} = require('../utils/emails');
const { userRoles } = require('../utils/enum');



exports.googleRegister = (req, res, next) => {
  passport.authenticate(
    'google-register',
    { session: false, prompt: 'select_account' },
    async (err, user, info) => {
      if (err) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/signup?error=${encodeURIComponent(
            err.message
          )}`
        );
      }
      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/signup?error=${encodeURIComponent(
            'User not found'
          )}`
        );
      }
      await sendWelcomeEmail(user.email, user.firstName);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login`);
    }
  )(req, res, next);
};

exports.googleLogin = (req, res, next) => {
  passport.authenticate(
    'google-login',
    { session: false, prompt: 'select_account' },
    (err, user, info) => {
      if (err) return res.redirect(`${process.env.FRONTEND_URL}/auth/login`);

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth/login?error=${encodeURIComponent(
            info?.message || 'Login failed'
          )}`
        );
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.redirect(
        `${process.env.DASHBOARD_URL}/dashboard/?token=${token}`
      );
    }
  )(req, res, next);
};











exports.register = async (req, res) => {
  const connection = await pool.getConnection();
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
  const connection = await pool.getConnection();
  try {
    const [user] = connection.query('SELECT * FROM user WHERE email = ?', [
      req.body.email,
    ]);
    if (user.length < 0) {
      return res.status(404).json({ message: `User not found` });
    }
    if(user.password == null) {
      return res.status(400).json({message: `Please login with social auth`})
    }
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: `Incorrect password` });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );
    return res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if(connection) connection.release();
  }
};

exports.forgotPassword = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { email } = req.body;
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
  } finally {
    if (connection) connection.release();
  }
};

exports.verifyEmail = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { code, email } = req.body;
    const [codeData] = await connection.query(
      `SELECT c.code, c.user_id, c.created_at, c.expires_at, u.email, u.role 
      FROM codes c 
      JOIN user u on u.id = c.user_id 
      WHERE c.code = ? and c.purpose = ?`,
      [code, `verification`]
    );
    if (!codeData || codeData.length === 0) {
      return res.status(400).json({ message: `Invalid code` });
    }
    if (codeData[0].email !== email) {
      return res.status(400).json({ message: `Invalid code` });
    }
    await connection.query(`UPDATE user SET verified = ? WHERE id = ?`, [
      'TRUE',
      codeData.user_id,
    ]);
    return res.status(200).json({ message: `Verification successful` });
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.verifyForgotPasswordCode = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { code } = req.body;
    const [codeData] = await connection.query(
      `SELECT c.code, c.expires_at, u.id AS user_id, u.name, u.email, u.avatar, u.method, u.role
       FROM codes c
       JOIN user u ON u.id = c.user_id
       WHERE c.code = ? AND c.purpose = 'reset_password'`,
      [code]
    );
    if (!codeData || codeData.length === 0) {
      return res.status(400).json({ message: `Invalid code` });
    }

    const entry = codeData[0];
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return res.status(400).json({ message: `Code has expired` });
    }

    return res.status(200).json({
      message: `Code verified`,
      user: {
        id: entry.user_id,
        name: entry.name,
        email: entry.email,
        avatar: entry.avatar,
        role: entry.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.resetPassword = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { password } = req.body;
    const hashedPasssword = await bcrypt.hash(password, 10);
    await connection.query('UPDATE user SET password = ? WHERE id = ?', [
      hashedPasssword,
      req.user.id,
    ]);
    return res.status(200).json({ message: `Password reset successful` });
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};
