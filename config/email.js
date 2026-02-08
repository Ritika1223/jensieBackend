import SibApiV3Sdk from 'sib-api-v3-sdk';

// Initialize Brevo (formerly Sendinblue) API client
let defaultClient = null;

export const initializeEmail = () => {
  if (process.env.BREVO_API_KEY) {
    defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  // Check if email service is enabled
  if (process.env.ENABLE_EMAIL_SERVICE !== 'true') {
    console.log('Email service is disabled. Reset token:', resetToken);
    return { disabled: true, resetToken };
  }

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your Password - Jensei Healthcare';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>You requested to reset your password for your Jensei Healthcare account.</p>
      <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        Reset Password
      </a>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        If you didn't request this password reset, please ignore this email.
      </p>
    </div>
  `;

  return await sendEmail({ to: email, subject, html });
};

// Generic email sending function using Brevo
export const sendEmail = async ({ to, subject, html }) => {
  // Check if email service is enabled
  if (process.env.ENABLE_EMAIL_SERVICE !== 'true') {
    console.log('Email service is disabled. Would send email to:', to);
    console.log('Subject:', subject);
    return { disabled: true };
  }

  if (!defaultClient || !process.env.BREVO_API_KEY) {
    throw new Error('Brevo API not initialized. Please set BREVO_API_KEY in environment variables.');
  }

  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = {
      name: process.env.BREVO_FROM_NAME || 'Jensei Healthcare',
      email: process.env.BREVO_FROM_EMAIL,
    };
    sendSmtpEmail.to = [{ email: to }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent successfully via Brevo. Message ID:', result.messageId);
    return { disabled: false, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email via Brevo:', error);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response body:', error.response.body);
    }
    throw error;
  }
};

// Send OTP email (generic - can be used for signup, password reset, etc.)
export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  // Check if email service is enabled
  if (process.env.ENABLE_EMAIL_SERVICE !== 'true') {
    console.log('⚠️  Email service is disabled. OTP for', email, ':', otp);
    console.log('   To enable email service, set ENABLE_EMAIL_SERVICE=true in .env file');
    return { disabled: true, otp };
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set in environment variables');
    console.log('⚠️  OTP for', email, ':', otp);
    return { disabled: true, otp };
  }

  // Determine subject and content based on purpose
  let subject, title, description;
  if (purpose === 'password_reset') {
    subject = 'Reset Your Password - Jensei Healthcare';
    title = 'Password Reset Request';
    description = 'You requested to reset your password for your Jensei Healthcare account. Please use the following OTP to verify your request:';
  } else {
    subject = 'Verify Your Email - Jensei Healthcare';
    title = 'Email Verification';
    description = 'Thank you for signing up with Jensei Healthcare! Please use the following OTP to verify your email address:';
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">${title}</h2>
      <p>${description}</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this ${purpose === 'password_reset' ? 'password reset' : 'verification'}, please ignore this email.</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        Best regards,<br>Jensei Healthcare Team
      </p>
    </div>
  `;

  return await sendEmail({ to: email, subject, html });
};

