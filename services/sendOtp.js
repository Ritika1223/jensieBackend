import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MSG_SERVICE_SID;

const client = twilio(accountSid, authToken);

export default async function sendOtp(phone, otp) {
  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  // 👇 SHOW OTP IN CONSOLE (DEV PURPOSE)
  console.log(`📲 OTP GENERATED: ${otp} | PHONE: ${formattedPhone}`);

  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      messagingServiceSid,
      to: formattedPhone,
    });

    console.log(`✅ OTP SENT | SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP:', error.message);
    return false;
  }
}
        