const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
// require('../utils/google');

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
      sendWelcomeEmail(user.email, user.firstName);
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

exports.adminLogin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }
    const [user] = await connection.query(
      'SELECT * FROM account WHERE email = ? AND role = ?',
      [email, 'admin']
    );
    if (user.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (user[0].password == null) {
      return res.status(400).json({ message: 'Please login with social auth' });
    }
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }
    if (!user[0].verified) {
      return res
        .status(401)
        .json({ message: 'Please verify your email address' });
    }
    const token = jwt.sign(
      { id: user[0].id, role: user[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    return res.status(200).json({ message: 'Admin login successful', token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.registerAdmin = async (req, res) => {
  let connection;
  try {
    const {
      firstname,
      lastname,
      email,
      password,
      avatar,
      phone_number,
      username,
    } = req.body;
    if (
      !firstname ||
      !lastname ||
      !email ||
      !password ||
      !phone_number ||
      !username
    ) {
      return res
        .status(400)
        .json({
          message: 'Firstname, Lastname, email, and password are required',
        });
    }

    connection = await pool.getConnection();
    // Check if email already exists
    const [userExists] = await connection.query(
      'SELECT * FROM account WHERE email = ?',
      [email]
    );
    if (userExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultMethod = 'password';
    // const avatar = `https://imgs.search.brave.com/7JPVrX1-rrex4c53w-1YqddoSVInG8opEOsfUQYuBpU/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvNTAwcC83/MC8wMS9kZWZhdWx0/LW1hbGUtYXZhdGFy/LXByb2ZpbGUtaWNv/bi1ncmV5LXBob3Rv/LXZlY3Rvci0zMTgy/NzAwMS5qcGc`;
    const role = 'admin';
    const result = await connection.query(
      'INSERT INTO account (firstname, lastname, email, password, avatar, method, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [firstname, lastname, email, hashedPassword, avatar, defaultMethod, role]
    );

    await connection.query(
      `INSERT INTO admins (account_id, phone_number, username) VALUES (?, ?, ?)`,
      [result[0].insertId, phone_number, username]
    );

    // Generate and send verification code
    const code = 1234;
    // const code = Math.floor(1000 + Math.random() * 9000); // 4-digit code
    sendVerificationCode(email, code);

    return res
      .status(201)
      .json({ message: 'Admin registered successfully', email });
  } catch (error) {
    console.error(`Error registering new admin: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.register = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { email, password, firstname, lastname, isAgent = false } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({
          message: 'Firstname, lastname, email and password are required',
        });
    }

    if (isAgent) {
      if (
        !req.body.phone_number ||
        !req.body.professional_type ||
        !req.body.experience_level
      ) {
        return res
          .status(400)
          .json({
            message: `phone number, professional type and experience level are required`,
          });
      }
    }

    const [userExists] = await connection.query(
      'SELECT * FROM account WHERE email = ?',
      [email]
    );
    if (userExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPasssword = await bcrypt.hash(req.body.password, 10);

    const defaultImage = `https://imgs.search.brave.com/7JPVrX1-rrex4c53w-1YqddoSVInG8opEOsfUQYuBpU/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvNTAwcC83/MC8wMS9kZWZhdWx0/LW1hbGUtYXZhdGFy/LXByb2ZpbGUtaWNv/bi1ncmV5LXBob3Rv/LXZlY3Rvci0zMTgy/NzAwMS5qcGc`;
    const newUser = await connection.query(
      'INSERT INTO account (firstname, lastname, email, password, method, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        firstname,
        lastname,
        email,
        hashedPasssword,
        'password',
        isAgent ? 'agent' : 'customer',
        defaultImage,
      ]
    );

    if (isAgent) {
      await connection.query(
        `INSERT INTO agents (account_id, phone_number, professional_type, experience_level) VALUES (?, ?, ?, ?)`,
        [
          newUser[0].insertId,
          req.body.phone_number,
          req.body.professional_type || 'real_estate_agent',
          req.body.experience_level || 'beginner',
        ]
      );
    }

    const code = 1234;
    await connection.query(
      `INSERT INTO codes (code, account_id, purpose, expires_at) VALUES (?, ?, ?, ?)`,
      [
        code,
        newUser[0].insertId,
        'verification',
        new Date(Date.now() + 60 * 60 * 1000),
      ]
    );
    sendVerificationCode(req.body.email, code);

    return res
      .status(201)
      .json({ message: 'User registered successfully', email: req.body.email });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.login = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [user] = await connection.query(
      'SELECT * FROM account WHERE email = ?',
      [req.body.email]
    );
    if (user.length === 0) {
      return res.status(404).json({ message: `User not found` });
    }
    if (user[0].password == null) {
      return res.status(400).json({ message: `Please login with social auth` });
    }
    const isMatch = await bcrypt.compare(req.body.password, user[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: `Incorrect password` });
    }

    if (!user[0].verified) {
      return res
        .status(401)
        .json({ message: `Please verify your email address` });
    }

    const token = jwt.sign(
      { id: user[0].id, role: user[0].role },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );
    return res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.forgotPassword = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { email } = req.body;
    const [user] = await connection.query(
      'SELECT id, email FROM account WHERE email = ?',
      [email]
    );
    if (user.length === 0) {
      return res
        .status(400)
        .json({ message: `Account with this email not found` });
    }
    const code = 1234;
    await connection.query(
      `INSERT INTO codes (code, account_id, purpose, expires_at) VALUES (?, ?, ?, ?)`,
      [
        code,
        user[0].id,
        'reset_password',
        new Date(Date.now() + 15 * 60 * 1000),
      ]
    );
    sendForgotPasswordCode(email, code);
    return res
      .status(200)
      .json({ message: `A code has been sent to ${email}` });
  } catch (error) {
    console.log(error);
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
      `SELECT c.code, c.account_id, c.created_at, c.expires_at, a.email, a.role 
      FROM codes c 
      JOIN account a on a.id = c.account_id 
      WHERE c.code = ? and c.purpose = ?`,
      [code, `verification`]
    );
    if (!codeData || codeData.length === 0) {
      return res.status(400).json({ message: `Invalid code` });
    }
    if (codeData[0].email !== email) {
      return res.status(400).json({ message: `Invalid code` });
    }
    await connection.query(`UPDATE account SET verified = ? WHERE id = ?`, [
      true,
      codeData[0].account_id,
    ]);
    return res.status(200).json({ message: `Verification successful` });
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.resendVerificationCode = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { email } = req.body;
    const [user] = await connection.query(
      'SELECT id, email, verified FROM account WHERE email = ?',
      [email]
    );
    if (user.length === 0) {
      return res
        .status(400)
        .json({ message: `Account with this email not found` });
    }
    if (user[0].verified) {
      return res.status(400).json({ message: `Account is already verified` });
    }
    const code = 1234;
    await connection.query(
      `INSERT INTO codes (code, account_id, purpose, expires_at) VALUES (?, ?, ?, ?)`,
      [code, user[0].id, 'verification', new Date(Date.now() + 60 * 60 * 1000)]
    );
    sendVerificationCode(email, code);
    return res
      .status(200)
      .json({ message: `A new code has been sent to ${email}` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.verifyForgotPasswordCode = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { code, email } = req.body;
    const [codeData] = await connection.query(
      `SELECT c.code, c.expires_at, a.id AS account_id, a.name, a.email, a.avatar, a.method, a.role
       FROM codes c
       JOIN account a ON a.id = c.account_id
       WHERE c.code = ? AND c.purpose = 'reset_password'`,
      [code]
    );
    if (!codeData || codeData.length === 0 || email !== codeData[0].email) {
      return res.status(400).json({ message: `Invalid code` });
    }

    const entry = codeData[0];
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return res.status(400).json({ message: `Code has expired` });
    }

    const token = jwt.sign(
      { id: codeData[0].account_id, role: codeData[0].role },
      process.env.JWT_SECRET,
      {
        expiresIn: '10m',
      }
    );

    return res.status(200).json({
      message: `Code verified`,
      token,
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
    await connection.query('UPDATE account SET password = ? WHERE id = ?', [
      hashedPasssword,
      req.user.id,
    ]);
    return res.status(200).json({ message: `Password reset successful` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.getLoggedInUser = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [account] = await connection.query(
      `SELECT id, firstname, lastname, email, avatar, role FROM account WHERE id = ?`,
      [req.user.id]
    );
    return res.status(200).json({ message: `Success`, data: account });
  } catch (error) {
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};
