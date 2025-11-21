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
const { uploadFileToCloudinary } = require('../utils/fileUpload');

exports.googleRegister = (req, res, next) => {
  passport.authenticate(
    'google-register',
    { session: false, prompt: 'select_account' },
    async (err, user, info) => {
      if (err) {
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/create-account?error=${encodeURIComponent(err.message)}`
        );
      }

      if (info.message) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/create-account?error=${encodeURIComponent(
            info.message
          )}`
        );
      }

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/create-account?error=${encodeURIComponent(
            'Account not found'
          )}`
        );
      }
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }
  )(req, res, next);
};

exports.googleLogin = (req, res, next) => {
  passport.authenticate(
    'google-login',
    { session: false, prompt: 'select_account' },
    (err, user, info) => {
      if (err) return res.redirect(`${process.env.FRONTEND_URL}/login`);

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(
            info?.message || 'Login failed'
          )}`
        );
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      if (err) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(
            `Login failed`
          )}`
        );
      }

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
      'SELECT * FROM account WHERE email = ? AND (role = ? OR role = ?)',
      [email, 'admin', 'super_admin']
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
    const { firstname, lastname, email, password, phone_number, username } =
      req.body;
    if (
      !firstname ||
      !lastname ||
      !email ||
      !password ||
      !phone_number ||
      !username
    ) {
      return res.status(400).json({
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
    let avatar;
    if (req.file) {
      avatar = await uploadFileToCloudinary(req.file, 'avatars');
    }
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
    // const code = 1234;
      const code = Math.floor(1000 + Math.random() * 9000);
    sendVerificationCode(email.trim().toLowerCase(), code);

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
      return res.status(400).json({
        message: 'Firstname, lastname, email and password are required',
      });
    }

    if (isAgent) {
      if (
        !req.body.phone_number ||
        !req.body.professional_type ||
        !req.body.experience_level
      ) {
        return res.status(400).json({
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

    const hashedPasssword = await bcrypt.hash(req.body.password.trim(), 10);

    const defaultImage = `https://imgs.search.brave.com/7JPVrX1-rrex4c53w-1YqddoSVInG8opEOsfUQYuBpU/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/dmVjdG9yc3RvY2su/Y29tL2kvNTAwcC83/MC8wMS9kZWZhdWx0/LW1hbGUtYXZhdGFy/LXByb2ZpbGUtaWNv/bi1ncmV5LXBob3Rv/LXZlY3Rvci0zMTgy/NzAwMS5qcGc`;
    const newUser = await connection.query(
      'INSERT INTO account (firstname, lastname, email, password, method, role, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        firstname,
        lastname,
        email.trim().toLowerCase(),
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

    // const code = 1234;
    const code = Math.floor(1000 + Math.random() * 9000);
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
      [req.body.email.trim().toLowerCase()]
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

    if (
      user[0].role === userRoles.ADMIN ||
      user[0].role === userRoles.SUPER_ADMIN
    ) {
      return res.status(403).json({ message: `Account not found` });
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
    return res.status(200).json({
      message: 'Login successful',
      token,
      role: user[0].role,
      firstname: user[0].firstname,
      lastname: user[0].lastname,
    });
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
    // const code = 1234;
    const code = Math.floor(1000 + Math.random() * 9000);
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
      JOIN account a ON a.id = c.account_id 
      WHERE c.code = ? and c.purpose = ?`,
      [code, `verification`]
    );
    if (!codeData || codeData.length === 0) {
      return res.status(400).json({ message: `Invalid code` });
    }
    let valid = false;
    let validCode;
    for (let code of codeData) {
      if (code.email === email) {
        valid = true;
        validCode = code;
        break;
      }
    }
    if (!valid) {
      return res.status(400).json({ message: `Invalid code` });
    }
    await Promise.all([
      connection.query(`UPDATE account SET verified = ? WHERE id = ?`, [
        true,
        validCode.account_id,
      ]),
      connection.query(`DELETE FROM codes WHERE id = ?`, [validCode.id]),
    ]);

    await connection.query(`DELETE FROM codes WHERE id = ?`, [validCode.id]);
    return res.status(200).json({ message: `Verification successful` });
  } catch (error) {
    console.log(error);
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
    // const code = 1234;
    const code = Math.floor(1000 + Math.random() * 9000);
    await connection.query(
      `INSERT INTO codes (code, account_id, purpose, expires_at) VALUES (?, ?, ?, ?)`,
      [code, user[0].id, 'verification', new Date(Date.now() + 60 * 60 * 1000)]
    );
    sendVerificationCode(email.trim().toLowerCase(), code);
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
      `SELECT c.code, c.expires_at, a.id AS account_id, a.firstname, a.lastname, a.email, a.avatar, a.method, a.role
       FROM codes c
       JOIN account a ON a.id = c.account_id
       WHERE c.code = ? AND c.purpose = 'reset_password'`,
      [code]
    );
    if (!codeData || codeData.length === 0 || email !== codeData[0].email) {
      return res.status(400).json({ message: `Invalid code` });
    }

    let valid = false;
    let validCode;
    for (let code of codeData) {
      if (code.email === email) {
        valid = true;
        validCode = code;
        break;
      }
    }
    if (!valid) {
      return res.status(400).json({ message: `Invalid code` });
    }

    const entry = validCode;
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return res.status(400).json({ message: `Code has expired` });
    }

    const token = jwt.sign(
      { id: entry.account_id, role: entry.role },
      process.env.JWT_SECRET,
      {
        expiresIn: '10m',
      }
    );

    await connection.query(`DELETE FROM codes WHERE id = ?`, [validCode.id]);

    return res.status(200).json({
      message: `Code verified`,
      token,
    });
  } catch (error) {
    console.log(error);
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
      `SELECT id, firstname, lastname, email, avatar, role 
       FROM account 
       WHERE id = ?`,
      [req.user.id]
    );

    if (!account.length) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const user = account[0];
    let responseData = { account: user };

    if (user.role === 'customer') {
      const [transactions] = await connection.query(
        `SELECT t.id, t.property_id, t.reference, t.amount, t.currency, 
                t.type, t.status, t.created_at, p.name
         FROM transactions t 
         JOIN property p ON p.id = t.property_id
         WHERE t.account_id = ?`,
        [user.id]
      );

      const [savedProperties] = await connection.query(
        `SELECT p.id, p.name, p.address, p.total_price, p.main_photo, p.category, p.type
         FROM save s 
         JOIN property p ON p.id = s.property_id
         WHERE s.account_id = ?`,
        [user.id]
      );

      // Updated: Use property_transactions instead of bookings
      const [activeBookings] = await connection.query(
        `SELECT pt.id, 
                CASE 
                  WHEN pt.expired = TRUE THEN 'completed'
                  WHEN pt.expires_at < NOW() THEN 'completed' 
                  ELSE 'active' 
                END as status,
                pt.created_at as start_date,
                pt.expires_at as end_date,
                p.name, p.address, p.main_photo
         FROM property_transactions pt
         JOIN property p ON p.id = pt.property_id
         WHERE pt.account_id = ? 
         AND pt.expired = FALSE
         AND pt.expires_at > NOW()`,
        [user.id]
      );

      responseData = {
        ...responseData,
        transactions,
        savedProperties,
        activeBookings,
      };
    } else if (user.role === 'agent') {
      const [transactions] = await connection.query(
        `SELECT t.id, t.property_id, t.commission, t.reference, 
                t.amount AS listed_price, t.currency, t.type, 
                t.status, t.created_at, p.name, p.owner_id
         FROM transactions t 
         JOIN property p ON p.id = t.property_id
         WHERE p.owner_id = ?`,
        [user.id]
      );

      // Calculate available balance only from successful transactions
      const successfulTransactions = transactions.filter(
        (t) => t.status === 'success'
      );
      const availableBalance = successfulTransactions.reduce((sum, t) => {
        const balance = Number(t.listed_price) - Number(t.commission);
        t.balance = balance;
        return sum + balance;
      }, 0);

      const [listedProperties] = await connection.query(
        `SELECT id, name, address, total_price, main_photo, category, type, created_at, publicized
         FROM property 
         WHERE owner_id = ?`,
        [user.id]
      );

      responseData = {
        ...responseData,
        transactions,
        availableBalance,
        listedProperties,
      };
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in getLoggedInUser:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.uploadAvatar = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'avatar not uploaded' });
    }

    const uploadUrl = await uploadFileToCloudinary(req.file, 'avatars');

    await connection.query('UPDATE account SET avatar = ? WHERE id = ?', [
      uploadUrl,
      req.user.id,
    ]);

    return res
      .status(200)
      .json({ message: 'Avatar updated successfully', avatar: uploadUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
