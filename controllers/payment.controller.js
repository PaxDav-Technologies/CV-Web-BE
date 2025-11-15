const { default: axios } = require('axios');
const { pool } = require('../config/db');
const { generateReference, calculateCommission } = require('../utils/payment');

exports.initializePropertyPayment = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { currency = 'NGN', propertyId } = req.body;
    const userId = req.user.id;

    if (!propertyId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const [property] = await connection.query(
      'SELECT * FROM properties WHERE id = ?',
      [propertyId]
    );

    if (property.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const amount = property[0].total_price;
    const reference = generateReference();
    const commission = calculateCommission(amount);

    const paystackData = await axios.post(
      `https://paystack.com/api/transaction/initialize`,
      {
        email: req.user.email,
        amount: amount * 100,
        currency,
        reference,
        metadata: {
          userId,
          propertyId,
        },
        callback_url: 'https://yourdomain.com/payment/callback',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await connection.query(
      `INSERT INTO transactions 
      (property_id, account_id, reference, commission, amount, currency, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        propertyId,
        userId,
        reference,
        commission,
        amount,
        currency,
        property[0].type,
        'pending',
      ]
    );

    return res.status(201).json({
      message: `success`,
      paymentInfo: paystackData.authorization_url,
    });
  } catch (error) {
    console.log(`Error initiating payment: ${error.message}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.verifyPayment = async (req, res) => {
  let connection;
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ message: `Reference is required` });
    }
    connection = await pool.getConnection();
    const [transaction] = await connection.query(
      `SELECT * FROM transacitions WHERE reference = ?`,
      [reference]
    );
    if (transaction.length === 0) {
      return res.status(400).json({ message: `Invalid transaction reference` });
    }
    const paystackDetails = await axios.get(
      `https://paystack.co/transaction/verify/${reference}`
    );
    if (!paystackDetails) {
      return res.status(500).json({ message: `An error occurred` });
    }

    return res.status(200);
  } catch (error) {
    console.log(`Error verifying payment: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};
