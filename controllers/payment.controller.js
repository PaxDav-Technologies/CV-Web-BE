const { default: axios } = require('axios');
const { pool } = require('../config/db');
const { generateReference, calculateCommission } = require('../utils/payment');

exports.initializePropertyPayment = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { currency = 'NGN', propertyId, purpose } = req.body;
    const userId = req.user.id;

    if (!propertyId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!parseInt(propertyId)) {
      return res.status(400).json({ message: 'Invalid propertyId' });
    }

    await connection.beginTransaction();
    const [property] = await connection.query(
      'SELECT * FROM property WHERE id = ?',
      [propertyId]
    );

    if (property.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    let amount;

    if (purpose == `inspection_fee`) {
      amount = property[0].inspection_fee;
    } else if (purpose === `rent` || purpose === `sale`) {
      amount = property[0].total_price;
    } else {
      return res.status(400).json({ message: 'Invalid payment purpose' });
    }
    const reference = generateReference();
    const commission = calculateCommission(amount);

    const paystackData = await axios.post(
      `https://api.paystack.co/transaction/initialize`,
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

    if (!paystackData.data.status) {
      return res.status(500).json({ message: `An error occurred` });
    }

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
        purpose,
        'pending',
      ]
    );

    await connection.query(
      `UPDATE property SET paid = TRUE, publicized = FALSE WHERE id = ?`,
      [propertyId]
    );

    await connection.commit();

    return res.status(201).json({
      message: `success`,
      paymentLink: paystackData.data.data.authorization_url,
      reference
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
      `https://api.paystack.co/transaction/verify/${reference}`
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
