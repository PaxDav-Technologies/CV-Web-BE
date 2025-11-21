const { sendMail } = require('../services/email');

exports.sendVerificationCode = async (email, code) => {
  const subject = 'Your verification code';
  const text = `Your verification code is: ${code}`;
  const html = `
  <div style="font-family: 'Inter', Arial, sans-serif; background: linear-gradient(135deg,#016644,#00a37a,#00d494); padding: 40px; color: #fff; border-radius: 12px;">
  <div style="max-width: 480px; margin: auto; background: rgba(255,255,255,0.12); padding: 30px; border-radius: 16px; backdrop-filter: blur(8px);">
    
    <h1 style="margin: 0 0 15px; text-align: center; font-size: 28px; letter-spacing: 1px;">
      🔐 Email Verification
    </h1>

    <p style="font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 25px;">
      Your verification code is below.  
      Use it to complete your sign-in.
    </p>

    <div style="
      background: #fff;
      color: #016644;
      padding: 16px 22px;
      font-size: 32px;
      font-weight: 800;
      text-align: center;
      border-radius: 10px;
      letter-spacing: 4px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.25);
    ">
      ${code}
    </div>

    <p style="margin-top: 30px; font-size: 13px; text-align: center; opacity: 0.9;">
      This code expires shortly. If you didn’t request this email, just ignore it.
    </p>
  </div>
</div>

  `;

  return sendMail({ to: email, subject, text, html });
};

exports.sendForgotPasswordCode = async (email, code) => {
  const subject = 'Password reset code';
  const text = `Use the following code to reset your password: ${code}`;
  const html = `
  <div style="font-family: 'Inter', Arial, sans-serif; background: linear-gradient(135deg,#ff416c,#ff4b2b,#ff6f2f); padding: 40px; color: #fff; border-radius: 12px;">
  <div style="max-width: 480px; margin: auto; background: rgba(255,255,255,0.13); padding: 30px; border-radius: 16px; backdrop-filter: blur(8px);">
    
    <h1 style="margin: 0 0 15px; text-align: center; font-size: 28px;">
      🔥 Reset Your Password
    </h1>

    <p style="font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 25px;">
      Use the code below to reset your password.  
      Keep it safe — it's your key to access.
    </p>

    <div style="
      background: #fff;
      color: #ff416c;
      padding: 16px 22px;
      font-size: 32px;
      font-weight: 800;
      text-align: center;
      border-radius: 10px;
      letter-spacing: 4px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.25);
    ">
      ${code}
    </div>

    <p style="margin-top: 30px; font-size: 13px; text-align: center; opacity: 0.9;">
      If you didn’t request this reset, ignore this message.
    </p>
  </div>
</div>

  `;

  return sendMail({ to: email, subject, text, html });
};
