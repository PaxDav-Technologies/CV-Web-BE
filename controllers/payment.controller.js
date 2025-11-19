const { default: axios } = require('axios');
const { pool } = require('../config/db');
const {
  generateReference,
  calculateCommission,
  validatePaymentPurpose,
} = require('../utils/payment');

exports.initializePropertyPayment = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { currency = 'NGN', propertyId, purpose } = req.body;
    const userId = req.user.id;

    if (!propertyId || !purpose) {
      return res.status(400).json({
        message: 'Missing required fields: propertyId and purpose are required',
      });
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
      await connection.rollback();
      return res.status(404).json({ message: 'Property not found' });
    }

    const purposeValidation = validatePaymentPurpose(purpose, property[0]);
    if (!purposeValidation.valid) {
      await connection.rollback();
      return res.status(400).json({ message: purposeValidation.message });
    }

    let amount;
    switch (purpose) {
      case 'inspection_fee':
        amount = property[0].inspection_fee;
        break;
      case 'rent':
      case 'sale':
      case 'shortlet':
        amount = property[0].total_price;
        break;
      default:
        await connection.rollback();
        return res.status(400).json({ message: 'Invalid payment purpose' });
    }

    if (!amount || amount <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid amount for payment' });
    }

    const reference = generateReference();
    const commission = calculateCommission(amount);

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: Math.round(amount * 100), // Convert to kobo
        currency,
        reference,
        metadata: {
          userId,
          propertyId,
          purpose,
          custom_fields: [
            {
              display_name: 'User ID',
              variable_name: 'user_id',
              value: userId,
            },
            {
              display_name: 'Property ID',
              variable_name: 'property_id',
              value: propertyId,
            },
            {
              display_name: 'Payment Purpose',
              variable_name: 'purpose',
              value: purpose,
            },
          ],
        },
        callback_url: `${process.env.FRONTEND_URL}/payment/verify?reference=${reference}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.data.status) {
      await connection.rollback();
      return res.status(500).json({
        message:
          paystackResponse.data.message || 'Failed to initialize payment',
      });
    }

    // Save transaction record
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

    // Update property payment status only for inspection fee or full payment
    if (
      purpose === 'inspection_fee' ||
      purpose === 'rent' ||
      purpose === 'sale'
    ) {
      await connection.query(
        `UPDATE property SET paid = TRUE, publicized = FALSE WHERE id = ?`,
        [propertyId]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Payment initialized successfully',
      paymentLink: paystackResponse.data.data.authorization_url,
      reference,
      accessCode: paystackResponse.data.data.access_code,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error initiating payment:', error.message);

    if (error.response) {
      console.error('Paystack error:', error.response.data);
    }

    return res.status(500).json({
      message: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
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
      return res.status(400).json({ message: 'Reference is required' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get transaction details
    const [transaction] = await connection.query(
      `SELECT * FROM transactions WHERE reference = ?`,
      [reference]
    );

    if (transaction.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction[0].status !== 'pending') {
      await connection.rollback();
      return res.status(200).json({
        message: 'Transaction already processed',
        status: transaction[0].status,
      });
    }

    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!paystackResponse.data.status) {
      await connection.rollback();
      return res.status(400).json({
        message: paystackResponse.data.message || 'Failed to verify payment',
      });
    }

    const paymentData = paystackResponse.data.data;
    const paymentStatus =
      paymentData.status === 'success' ? 'success' : 'failed';

    await connection.query(
      `UPDATE transactions SET status = ?, updated_at = NOW() WHERE reference = ?`,
      [paymentStatus, reference]
    );

    if (paymentStatus === 'success') {
      const transactionRecord = transaction[0];

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 12);

      await connection.query(
        `INSERT INTO property_transactions 
        (amount, duration_months, property_id, account_id, transaction_id, created_at, expires_at, expired) 
        VALUES (?, ?, ?, ?, ?, NOW(), ?, FALSE)`,
        [
          transactionRecord.amount,
          12,
          transactionRecord.property_id,
          transactionRecord.account_id,
          transactionRecord.id,
          expiresAt,
        ]
      );

      await connection.query(
        `UPDATE property SET publicized = TRUE WHERE id = ?`,
        [transactionRecord.property_id]
      );
    } else {
      await connection.query(`UPDATE property SET paid = FALSE WHERE id = ?`, [
        transaction[0].property_id,
      ]);
    }

    await connection.commit();

    return res.status(200).json({
      message: 'Payment verification completed',
      status: paymentStatus,
      reference,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error verifying payment:', error.message);

    if (error.response) {
      console.error('Paystack verification error:', error.response.data);
    }

    return res.status(500).json({
      message: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  } finally {
    if (connection) connection.release();
  }
};

// Webhook handler for Paystack
exports.paystackWebhook = async (req, res) => {
  let connection;
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers['x-paystack-signature'];

    if (!signature) {
      return res.status(400).json({ message: 'No signature provided' });
    }

    // Validate webhook signature
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;

      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Update transaction status
      await connection.query(
        `UPDATE transactions SET status = 'success', updated_at = NOW() WHERE reference = ?`,
        [reference]
      );

      // Get transaction details
      const [transaction] = await connection.query(
        `SELECT * FROM transactions WHERE reference = ?`,
        [reference]
      );

      if (transaction.length > 0) {
        const transactionRecord = transaction[0];

        // Create property transaction record
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 12);

        await connection.query(
          `INSERT INTO property_transactions 
          (amount, duration_months, property_id, account_id, transaction_id, created_at, expires_at, expired) 
          VALUES (?, ?, ?, ?, ?, NOW(), ?, FALSE)`,
          [
            transactionRecord.amount,
            12,
            transactionRecord.property_id,
            transactionRecord.account_id,
            transactionRecord.id,
            expiresAt,
          ]
        );

        // Update property status
        await connection.query(
          `UPDATE property SET publicized = TRUE WHERE id = ?`,
          [transactionRecord.property_id]
        );
      } else {
        await connection.query(
          `UPDATE property SET paid = FALSE WHERE id = ?`,
          [transaction[0].property_id]
        );
      }

      await connection.commit();
      connection.release();
    }

    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Webhook error:', error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// Get payment history for user
exports.getPaymentHistory = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    connection = await pool.getConnection();

    const [transactions] = await connection.query(
      `SELECT t.*, p.name as property_name, p.main_photo 
       FROM transactions t 
       LEFT JOIN property p ON t.property_id = p.id 
       WHERE t.account_id = ? 
       ORDER BY t.created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );

    const [total] = await connection.query(
      `SELECT COUNT(*) as total FROM transactions WHERE account_id = ?`,
      [userId]
    );

    return res.status(200).json({
      message: 'Payment history retrieved successfully',
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].total,
        pages: Math.ceil(total[0].total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
