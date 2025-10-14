const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {testConnection} = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.listen(PORT, async () => {
  await testConnection()
  console.log(`Server is running on port ${PORT}`);
});