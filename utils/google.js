// auth.js
const passport = require('passport');
const { pool } = require('../config/db');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

passport.use(
  'google-register',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.GOOGLE_REGISTER_CALLBACK_URL}`,
      authorizationParams: {
        prompt: 'select_account',
      },
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      const connection = await pool.getConnection();
      connection.beginTransaction();
      const userType = req.query.state || 'customer';
      try {
        const email = profile.emails[0].value;
        const [existingUsers] = await connection.query(
          `SELECT * FROM account WHERE email = ?`,
          [email.trim()]

          
        );

        if (existingUsers.length > 0) {
          await connection.rollback();
          return done(null, false, { message: 'User already exists' });
        }

        const [result] = await connection.query(
          `INSERT INTO account (firstname, lastname, email, method, avatar, role, verified) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            profile.name?.givenName || 'User',
            profile.name?.familyName || 'Null',
            email,
            'google',
            profile.photos?.[0]?.value || '',
            userType,
            true,
          ]
        );

        await connection.query(
          `INSERT INTO agents (account_id, professional_type, experience_level, phone_number) VALUES (?, ?, ?, ?)`,
          [result.insertId, 'real_estate_agent', 'beginner', null]
        );

        const [newUsers] = await connection.query(
          `SELECT * FROM account WHERE id = ?`,
          [result.insertId]
        );

        await connection.commit();

        return done(null, newUsers[0]);
      } catch (err) {
        console.error('Google Register Error:', err);
        await connection.rollback();
        return done(err, null);
      } finally {
        if (connection) connection.release();
      }
    }
  )
);

passport.use(
  'google-login',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.GOOGLE_LOGIN_CALLBACK_URL}`,
      authorizationParams: {
        prompt: 'select_account',
      },
      passReqToCallback: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      const connection = await pool.getConnection();
      try {
        const email = profile.emails[0].value;
        const [users] = await connection.query(
          `SELECT * FROM account WHERE email = ?`,
          [email]
        );

        // FIX: Check if users array is empty
        if (users.length === 0) {
          return done(null, false, {
            message: 'Account not found. Please register first.',
          });
        }

        const user = users[0];

        if (user.method === 'password') {
          return done(null, false, { message: 'Please login with Password' });
        }

        return done(null, user);
      } catch (err) {
        console.error('Google Login Error:', err);
        return done(err, null);
      } finally {
        if (connection) connection.release();
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});
