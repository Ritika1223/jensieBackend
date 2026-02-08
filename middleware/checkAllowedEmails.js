/**
 * Middleware to check if the authenticated user's email is in the allowed list
 * Used for protecting routes that should only be accessible to specific users
 */
export const checkAllowedEmails = (req, res, next) => {
  try {
    // Get allowed emails from environment variable
    // Format: "email1@example.com,email2@example.com,email3@example.com"
    const allowedEmailsStr = process.env.ALLOWED_DOCTOR_ONBOARDING_EMAILS || '';
    
    if (!allowedEmailsStr) {
      return res.status(500).json({ 
        error: 'Allowed emails not configured. Please contact administrator.' 
      });
    }

    // Parse allowed emails into array
    const allowedEmails = allowedEmailsStr
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);

    // Get user email from authenticated user (set by authenticate middleware)
    const userEmail = req.user?.email?.toLowerCase().trim();

    if (!userEmail) {
      return res.status(401).json({ error: 'User email not found' });
    }

    // Check if user's email is in the allowed list
    if (!allowedEmails.includes(userEmail)) {
      return res.status(403).json({ 
        error: 'Access denied. You do not have permission to access this resource.' 
      });
    }

    // User is allowed, proceed
    next();
  } catch (error) {
    console.error('Error checking allowed emails:', error);
    return res.status(500).json({ error: 'Error verifying access permissions' });
  }
};

