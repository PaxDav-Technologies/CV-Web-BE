const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { testConnection, pool } = require('./config/db');
const authRouter = require('./routes/auth.route');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json({ limit: '100mb', extended: true }));

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api/auth', authRouter);
app.use('/api/property', require('./routes/property.route'));
app.use('/api/blog', require('./routes/blog.route'));
app.use('/api/admin', require('./routes/admin.route'));
app.use('/api/customer', require('./routes/customer.route'));
app.use('/api/payment', require('./routes/payment.route'));
app.use('/api/contact', require('./routes/contact.route'));
app.use('/api/private', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM account;');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  } finally {
    if (connection) connection.release();
  }
});

app.listen(PORT, async () => {
  await testConnection();
  console.log(`Server is running on port ${PORT}`);
});
