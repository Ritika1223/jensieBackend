import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ProspectiveUser from '../models/ProspectiveUser.js';
import OTP from '../models/OTP.js';
import { generateToken } from '../utils/jwt.js';
import { sendPasswordResetEmail, sendOTPEmail } from '../config/email.js';
import crypto from 'crypto';

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup - Create prospective user and send OTP
export const signup = async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in User model
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if prospective user exists and email attempts limit
    let prospectiveUser = await ProspectiveUser.findOne({ email: normalizedEmail });
    
    if (prospectiveUser) {
      // Check email attempts limit
      if (prospectiveUser.emailAttempts >= 5) {
        return res.status(429).json({ 
          error: 'Email verification attempt limit reached. Please contact support.' 
        });
      }
      
      // Increment email attempts
      prospectiveUser.emailAttempts += 1;
    } else {
      // Create new prospective user
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      prospectiveUser = new ProspectiveUser({
        email: normalizedEmail,
        passwordHash,
        name: name || '',
        phone: phone || '',
        role: role || 'user',
        emailAttempts: 1,
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    prospectiveUser.otp = otp;
    prospectiveUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prospectiveUser.save();

    // Send OTP email
    let emailSent = false;
    try {
      const emailResult = await sendOTPEmail(normalizedEmail, otp);
      emailSent = !emailResult.disabled;
      if (emailResult.disabled) {
        console.log('Email service is disabled. OTP:', otp);
      } else {
        console.log('OTP email sent successfully to:', normalizedEmail);
      }
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      // Don't fail signup if email fails, but log it
      // In production, you might want to handle this differently
    }

    res.status(200).json({
      success: true,
      message: emailSent 
        ? 'OTP sent to your email. Please verify to complete signup.'
        : 'OTP generated. Please check your email or contact support if you don\'t receive it.',
      email: normalizedEmail, // Return email for OTP verification screen
      emailSent, // Indicate if email was actually sent
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate email error from MongoDB
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    res.status(500).json({ error: 'Server error during signup' });
  }
};

// Verify OTP and create user
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find prospective user
    const prospectiveUser = await ProspectiveUser.findOne({ email: normalizedEmail });
    if (!prospectiveUser) {
      return res.status(404).json({ error: 'No signup request found for this email. Please sign up again.' });
    }

    // Check if OTP is expired
    if (new Date() > prospectiveUser.otpExpiresAt) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (prospectiveUser.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Check if user already exists (race condition check)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // Delete prospective user and return error
      await ProspectiveUser.deleteOne({ email: normalizedEmail });
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user in User model
    const user = new User({
      email: prospectiveUser.email,
      passwordHash: prospectiveUser.passwordHash,
      name: prospectiveUser.name,
      phone: prospectiveUser.phone,
      role: prospectiveUser.role,
    });

    await user.save();

    // Delete prospective user
    await ProspectiveUser.deleteOne({ email: normalizedEmail });

    // Generate token
    const token = generateToken(user._id, user.email, user.role);

    // Set HTTP-only cookie for web clients
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data (without password) and token for mobile clients
    res.status(201).json({
      success: true,
      message: 'Email verified successfully. Account created!',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      token, // For mobile/API clients
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    
    // Handle duplicate email error from MongoDB
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find prospective user
    const prospectiveUser = await ProspectiveUser.findOne({ email: normalizedEmail });
    if (!prospectiveUser) {
      return res.status(404).json({ error: 'No signup request found for this email. Please sign up again.' });
    }

    // Check email attempts limit
    if (prospectiveUser.emailAttempts >= 5) {
      return res.status(429).json({ 
        error: 'Email verification attempt limit reached. Please contact support.' 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    prospectiveUser.otp = otp;
    prospectiveUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    prospectiveUser.emailAttempts += 1;

    await prospectiveUser.save();

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent to your email.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Server error while resending OTP' });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id, user.email, user.role);

    // Set HTTP-only cookie for web clients
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data and token
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token, // For mobile/API clients
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Verify token (for frontend auth checks)
// Note: This route is protected by authenticate middleware
export const verifyToken = async (req, res) => {
  try {
    // The authenticate middleware will handle token verification
    // If we reach here, token is valid
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Server error during token verification' });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    // Clear the HTTP-only cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
};

// Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    
    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({ 
        message: 'If an account with that email exists, an OTP has been sent to your email.' 
      });
    }

    // Check for existing OTP and attempts
    let otpRecord = await OTP.findOne({ 
      email: normalizedEmail, 
      type: 'forgot_password',
      verified: false 
    });

    if (otpRecord) {
      // Check if attempts limit reached
      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        return res.status(429).json({ 
          error: 'Maximum OTP verification attempts reached. Please request a new OTP.' 
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (otpRecord) {
      // Update existing OTP record
      otpRecord.otp = otp;
      otpRecord.expiresAt = expiresAt;
      otpRecord.attempts = 0; // Reset attempts for new OTP
      otpRecord.verified = false;
      await otpRecord.save();
    } else {
      // Create new OTP record
      otpRecord = new OTP({
        email: normalizedEmail,
        otp,
        type: 'forgot_password',
        expiresAt,
        attempts: 0,
        verified: false,
      });
      await otpRecord.save();
    }

    // Send OTP email
    let emailSent = false;
    try {
      const emailResult = await sendOTPEmail(normalizedEmail, otp, 'password_reset');
      emailSent = !emailResult.disabled;
      if (emailResult.disabled) {
        console.log('Email service is disabled. OTP for password reset:', otp);
      } else {
        console.log('Password reset OTP email sent successfully to:', normalizedEmail);
      }
    } catch (emailError) {
      console.error('Error sending password reset OTP email:', emailError);
      // Don't fail the request, but log the error
    }

    res.status(200).json({
      success: true,
      message: emailSent 
        ? 'OTP sent to your email. Please verify to reset your password.'
        : 'OTP generated. Please check your email or contact support if you don\'t receive it.',
      email: normalizedEmail,
      emailSent,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Verify Reset Password OTP
export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      email: normalizedEmail, 
      type: 'forgot_password',
      verified: false 
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'No password reset request found for this email.' });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id }); // Clean up expired OTP
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts limit
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(429).json({ 
        error: 'Maximum OTP verification attempts reached. Please request a new OTP.' 
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Please set your new password.',
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
};

// Reset Password (after OTP verification)
export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify that OTP was verified
    const otpRecord = await OTP.findOne({ 
      email: normalizedEmail, 
      type: 'forgot_password',
      verified: true 
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        error: 'Please verify your OTP first before resetting password.' 
      });
    }

    // Check if OTP is still valid (not expired)
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id }); // Clean up expired OTP
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Hash new password
    const saltRounds = 10;
    user.passwordHash = await bcrypt.hash(password, saltRounds);
    await user.save();

    // Delete the verified OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ 
      success: true,
      message: 'Password reset successful. Please login with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
};

