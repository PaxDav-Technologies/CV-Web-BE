const { default: axios } = require('axios');
const { pool } = require('../config/db');
const {
  generateReference,
  calculateCommission,
  validatePaymentPurpose,
} = require('../utils/payment');

const isValidCurrency = (currency) =>
  ['NGN', 'USD', 'GBP', 'EUR'].includes(currency);

const convertFromNGN = async (amountInNGN, currency) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM exchange_rates');
    if (rows.length === 0) {
      throw new Error('Exchange rates not found');
    }
    const rates = rows[0];
    return parseFloat((amountInNGN * rates[currency.toLowerCase()]).toFixed(2));
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw new Error('Failed to fetch exchange rates');
  } finally {
    if (connection) connection.release();
  }
};

exports.initializePropertyPayment = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const {
      currency = 'NGN',
      propertyId,
      purpose,
      durationMonths = 12,
      durationDays = 1,
      startDate = new Date(),
    } = req.body;
    const userId = req.user.id;

    if (!propertyId || !purpose) {
      return res.status(400).json({
        message: 'Missing required fields: propertyId and purpose are required',
      });
    }

    if (!parseInt(propertyId)) {
      return res.status(400).json({ message: 'Invalid propertyId' });
    }

    if (!isValidCurrency(currency)) {
      return res.status(400).json({
        message: 'Invalid currency. Supported currencies: NGN, USD, GBP',
      });
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

    if (property[0].paid && purpose !== 'inspection_fee') {
      await connection.rollback();
      return res.status(400).json({
        message: `Property is already paid for. You cannot make another payment for this property.`,
      });
    }

    const [existingSuccessfulTx] = await connection.query(
      `SELECT id FROM transactions 
       WHERE property_id = ? AND status = 'success' AND type != 'inspection_fee'
       LIMIT 1`,
      [propertyId]
    );

    if (existingSuccessfulTx.length > 0 && purpose !== 'inspection_fee') {
      await connection.rollback();
      return res.status(400).json({
        message: `This property already has a successful payment. You cannot make another payment.`,
      });
    }

    const purposeValidation = validatePaymentPurpose(purpose, property[0]);
    if (!purposeValidation.valid) {
      await connection.rollback();
      return res.status(400).json({ message: purposeValidation.message });
    }

    let amountInNGN;
    let finalDurationMonths = 0;
    let finalDurationDays = 0;
    let finalStartDate = new Date(startDate);
    let finalEndDate = new Date();

    switch (purpose) {
      case 'inspection_fee':
        amountInNGN = property[0].inspection_fee;
        finalDurationMonths = 0;
        finalDurationDays = 0;
        break;

      case 'rent':
        if (!durationMonths || durationMonths < 1) {
          await connection.rollback();
          return res.status(400).json({
            message: 'Duration in months is required for rent payments',
          });
        }

        amountInNGN = property[0].total_price * durationMonths;
        finalDurationMonths = durationMonths;
        finalDurationDays = 0;
        finalEndDate = new Date(finalStartDate);
        finalEndDate.setMonth(finalEndDate.getMonth() + durationMonths);
        break;

      case 'sale':
        amountInNGN = property[0].total_price;
        finalDurationMonths = 0;
        finalDurationDays = 0;
        finalEndDate = new Date();
        finalEndDate.setFullYear(finalEndDate.getFullYear() + 100);
        break;

      case 'shortlet':
        if (!durationDays || durationDays < 1) {
          await connection.rollback();
          return res.status(400).json({
            message: 'Duration in days is required for shortlet payments',
          });
        }

        const pricePerYear = property[0].total_price;
        const dailyRate = pricePerYear;
        amountInNGN = dailyRate * durationDays;
        finalDurationMonths = 0;
        finalDurationDays = durationDays;
        finalEndDate = new Date(finalStartDate);
        finalEndDate.setDate(finalEndDate.getDate() + durationDays);
        break;

      default:
        await connection.rollback();
        return res.status(400).json({ message: 'Invalid payment purpose' });
    }

    if (!amountInNGN || amountInNGN <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid amount for payment' });
    }

    if (finalStartDate < new Date().getMonth()) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Start date cannot be in the past',
      });
    }

    const reference = generateReference();
    const commission = calculateCommission(amountInNGN);

    const amountInUserCurrency = await convertFromNGN(amountInNGN, currency);

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount:
          currency === 'NGN'
            ? Math.round(amountInNGN * 100)
            : Math.round(amountInUserCurrency * 100),
        currency: currency,
        reference,
        metadata: {
          userId,
          propertyId,
          purpose,
          originalCurrency: 'NGN',
          originalAmount: amountInNGN,
          displayCurrency: currency,
          displayAmount: amountInUserCurrency,
          durationMonths: finalDurationMonths,
          durationDays: finalDurationDays,
          startDate: finalStartDate.toISOString(),
          endDate: finalEndDate.toISOString(),
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
            {
              display_name: 'Original Amount (NGN)',
              variable_name: 'original_amount_ngn',
              value: amountInNGN,
            },
            {
              display_name: 'Display Currency',
              variable_name: 'display_currency',
              value: currency,
            },
            {
              display_name: 'Display Amount',
              variable_name: 'display_amount',
              value: amountInUserCurrency,
            },
            {
              display_name: 'Duration Months',
              variable_name: 'duration_months',
              value: finalDurationMonths,
            },
            {
              display_name: 'Duration Days',
              variable_name: 'duration_days',
              value: finalDurationDays,
            },
            {
              display_name: 'Start Date',
              variable_name: 'start_date',
              value: finalStartDate.toISOString(),
            },
            {
              display_name: 'End Date',
              variable_name: 'end_date',
              value: finalEndDate.toISOString(),
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

    // Store the original NGN amount in database
    await connection.query(
      `INSERT INTO transactions 
      (property_id, account_id, reference, commission, amount, currency, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        propertyId,
        userId,
        reference,
        commission,
        amountInNGN, // Store original NGN amount
        'NGN', // Always store base currency as NGN
        purpose,
        'pending',
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Payment initialized successfully',
      paymentLink: paystackResponse.data.data.authorization_url,
      reference,
      accessCode: paystackResponse.data.data.access_code,
      amount: amountInUserCurrency, // Return converted amount to user
      currency: currency, // Return user's chosen currency
      originalAmount: amountInNGN, // For reference
      originalCurrency: 'NGN', // For reference
      durationMonths: finalDurationMonths,
      durationDays: finalDurationDays,
      startDate: finalStartDate,
      endDate: finalEndDate,
      conversionInfo: {
        // exchangeRate: CURRENCY_RATES[currency],
        note: `Amount displayed in ${currency}. Paystack will handle currency conversion during payment.`,
      },
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

      const metadata = paymentData.metadata || {};
      const durationMonths = metadata.durationMonths || 0;
      const durationDays = metadata.durationDays || 0;
      const startDate = metadata.startDate
        ? new Date(metadata.startDate)
        : new Date();
      const endDate = metadata.endDate
        ? new Date(metadata.endDate)
        : new Date();

      await connection.query(
        `INSERT INTO property_transactions 
        (amount, duration_months, duration_days, property_id, account_id, transaction_id, 
         start_date, end_date, created_at, expires_at, expired) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, FALSE)`,
        [
          transactionRecord.amount, // Store original NGN amount
          durationMonths,
          durationDays,
          transactionRecord.property_id,
          transactionRecord.account_id,
          transactionRecord.id,
          startDate,
          endDate,
          endDate,
        ]
      );

      if (transactionRecord.type !== 'inspection_fee') {
        await connection.query(
          `UPDATE property SET paid = TRUE, publicized = TRUE WHERE id = ?`,
          [transactionRecord.property_id]
        );
      }
    }

    await connection.commit();

    const [propertyTransaction] = await connection.query(
      `SELECT * FROM property_transactions WHERE transaction_id = ?`,
      [transaction[0].id]
    );

    const responseData = {
      message: 'Payment verification completed',
      status: paymentStatus,
      reference,
      amount: transaction[0].amount, // Return NGN amount
      currency: 'NGN', // Return base currency
    };

    if (propertyTransaction.length > 0) {
      responseData.durationMonths = propertyTransaction[0].duration_months;
      responseData.durationDays = propertyTransaction[0].duration_days;
      responseData.startDate = propertyTransaction[0].start_date;
      responseData.endDate = propertyTransaction[0].end_date;
    }

    return res.status(200).json(responseData);
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

exports.paystackWebhook = async (req, res) => {
  let connection;
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers['x-paystack-signature'];

    if (!signature) {
      return res.status(400).json({ message: 'No signature provided' });
    }

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

      const [transaction] = await connection.query(
        `SELECT * FROM transactions WHERE reference = ?`,
        [reference]
      );

      if (transaction.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Transaction not found' });
      }

      await connection.query(
        `UPDATE transactions SET status = 'success', updated_at = NOW() WHERE reference = ?`,
        [reference]
      );

      const transactionRecord = transaction[0];

      const durationMonths = metadata.durationMonths || 0;
      const durationDays = metadata.durationDays || 0;
      const startDate = metadata.startDate
        ? new Date(metadata.startDate)
        : new Date();
      const endDate = metadata.endDate
        ? new Date(metadata.endDate)
        : new Date();

      await connection.query(
        `INSERT INTO property_transactions 
        (amount, duration_months, duration_days, property_id, account_id, transaction_id, 
         start_date, end_date, created_at, expires_at, expired) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, FALSE)`,
        [
          transactionRecord.amount,
          durationMonths,
          durationDays,
          transactionRecord.property_id,
          transactionRecord.account_id,
          transactionRecord.id,
          startDate,
          endDate,
          endDate,
        ]
      );

      if (transactionRecord.type !== 'inspection_fee') {
        await connection.query(
          `UPDATE property SET paid = TRUE, publicized = TRUE WHERE id = ?`,
          [transactionRecord.property_id]
        );
      }

      await connection.commit();
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

// Helper function to get supported currencies
exports.getSupportedCurrencies = async (req, res) => {
  try {
    const currencies = [
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
    ];

    return res.status(200).json({
      message: 'Supported currencies retrieved successfully',
      currencies,
      exchangeRates: CURRENCY_RATES,
    });
  } catch (error) {
    console.error('Error getting currencies:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getCurrencyRates = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM exchange_rates');

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Exchange rates not found' });
    }

    return res.status(200).json({
      message: 'Currency rates retrieved successfully',
      rates: {
        USD: rows[0].usd,
        EUR: rows[0].eur,
        GBP: rows[0].gbp,
        lastUpdated: rows[0].last_updated,
      },
    });
  } catch (error) {
    console.error('Error getting currency rates:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
