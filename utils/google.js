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
    },
    async (accessToken, refreshToken, profile, done) => {
      const connection = await pool.getConnection();
      try {
        // console.log(accessToken, refreshToken, profile);
        const email = profile.emails[0].value;
        let [user] = await connection.query(
          `SELECT * FROM account WHERE email = ?`,
          [email]
        );
        console.log(user)
        if (user.length > 0) {
          return done(null, false, { message: 'User already exists' });
        }

        if (user.length === 0) {
          [user] = await connection.query(
            `INSERT INTO account (firstname, lastname, email, method, avatar, role, verified) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              profile.name?.givenName,
              profile.name?.familyName || "Null",
              email,
              'google',
              profile.photos?.[0]?.value,
              'customer',
              true,
            ]
          );
        }

        // console.log(user);
        return done(null, user[0]);
      } catch (err) {
        console.error('Google Register Error:', err);
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
    },
    async (accessToken, refreshToken, profile, done) => {
      const connection = await pool.getConnection();
      try {
        const email = profile.emails[0].value;
        const [user] = await connection.query(
          `SELECT * FROM account WHERE email = ?`,
          [email]
        );

        if (!user) {
          return done(null, false, {
            message: 'Account not found. Please register first.',
          });
        }

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
