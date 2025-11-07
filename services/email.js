const nodemailer = require('nodemailer');

// Lazy-initialized transporter (may be a real SMTP transporter or an Ethereal test account)
let transporterPromise;

async function initTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } =
      process.env;

    // If SMTP env vars are provided, use them
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const port = SMTP_PORT ? parseInt(SMTP_PORT, 10) : undefined;
      const secure =
        SMTP_SECURE === 'true' || SMTP_SECURE === '1' || port === 465;

      return nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    // Fallback: create an Ethereal test account (development)
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return transporterPromise;
}

/**
 * Send an email using the configured transporter.
 * data: { to, subject, text, html, from }
 */
exports.sendMail = async (data) => {
  try {
    if (!data || !data.to || !data.subject) {
      throw new Error('sendMail requires at least `to` and `subject`');
    }

    const transporter = await initTransporter();

    const mailOptions = {
      from: '"CV Properties" <support@cvproperties.co>',
      to: data.to,
      subject: data.subject,
      text: data.text || undefined,
      html: data.html || undefined,
    };

    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal, a preview URL will be available for debugging
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      // log to console in development so developer can inspect the message
      // eslint-disable-next-line no-console
      console.log('Email preview URL: %s', previewUrl);
    }

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // throw error;
  }
};
