const { sendMail } = require('../services/email');

exports.sendVerificationCode = async (email, code) => {
  const subject = 'Your verification code';
  const text = `Your verification code is: ${code}`;
  const html = `<p>Your verification code is: <strong>${code}</strong></p>`;

  return sendMail({ to: email, subject, text, html });
};

exports.sendForgotPasswordCode = async (email, code) => {
  const subject = 'Password reset code';
  const text = `Use the following code to reset your password: ${code}`;
  const html = `<p>Use the following code to reset your password: <strong>${code}</strong></p>`;

  return sendMail({ to: email, subject, text, html });
};
