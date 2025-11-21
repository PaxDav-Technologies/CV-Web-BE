const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


exports.sendMail = async (data) => {
  try {
    if (!data || !data.to || !data.subject) {
      throw new Error('sendMail requires at least `to` and `subject`');
    }

    const msg = {
      to: data.to,
      from: data.from || 'support@cvproperties.co',
      subject: data.subject,
      text: data.text || undefined,
      html: data.html || undefined,
    };

    const response = await sgMail.send(msg);
    return response;
  } catch (error) {
    console.error('Error sending email:', error.response?.body || error);
  }
};
