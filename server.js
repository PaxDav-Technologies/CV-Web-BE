const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { testConnection } = require('./config/db');
const authRouter = require('./routes/auth.route');

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
app.use('/api/property', require('./routes/property.route'))

app.listen(PORT, async () => {
  await testConnection();
  console.log(`Server is running on port ${PORT}`);
});
