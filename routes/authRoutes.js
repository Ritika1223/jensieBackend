import express from 'express';
import {
  signup,
  verifyOTP,
  resendOTP,
  login,
  logout,
  verifyToken,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from '../controllers/authController.js';
import {
  googleAuth,
  googleCallback,
} from '../controllers/googleAuthController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', authenticate, verifyToken); // Protected route to verify token
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;

