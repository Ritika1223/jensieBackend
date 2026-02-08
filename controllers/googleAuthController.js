import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

// Lazy initialization of OAuth2Client to ensure env vars are loaded
const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.');
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

// Initiate Google OAuth flow
export const googleAuth = (req, res) => {
  try {
    const client = getOAuthClient();
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Google auth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};

// Handle Google OAuth callback
export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    const client = getOAuthClient();

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google using the access token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    // Check if user exists by email or googleId
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { googleId: googleId },
      ],
    });

    if (user) {
      // User exists - update googleId if not set and log them in
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.name && name) {
          user.name = name;
        }
        await user.save();
      }
    } else {
      // New user - create account
      user = new User({
        email: email.toLowerCase().trim(),
        googleId: googleId,
        name: name || '',
        passwordHash: '', // Empty for Google OAuth users
        role: 'user',
      });
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Set HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // Changed to 'lax' for OAuth redirects
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/doctors?google_auth=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};

