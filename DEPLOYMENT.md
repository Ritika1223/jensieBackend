# Production Deployment Guide

## Environment Setup for EC2

### Step 1: Copy Environment File

1. Copy `env.production` to `.env` on your EC2 instance:
   ```bash
   cp env.production .env
   ```

2. Or manually create `.env` file on EC2 and copy the contents from `env.production`

### Step 2: Update Production Values

Edit the `.env` file on your EC2 instance and update the following:

#### Required Updates:

1. **MongoDB Connection String**
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@jensei-backend.mongodb.net/jensei-org
   ```

2. **JWT Secret** (Generate a strong secret)
   ```bash
   # On EC2, generate a secure secret:
   openssl rand -base64 32
   ```
   Then update:
   ```env
   JWT_SECRET=<generated-secret>
   ```

3. **Brevo API Key** (if using email service)
   ```env
   BREVO_API_KEY=your-brevo-api-key
   ```

4. **Google OAuth Credentials**
   ```env
   GOOGLE_CLIENT_ID=your-actual-google-client-id
   GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
   ```

### Step 3: Update Google Cloud Console

**IMPORTANT**: Update your Google OAuth redirect URI in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   http://api.jensei.com/api/auth/google/callback
   ```
5. Under **Authorized JavaScript origins**, add:
   ```
   http://api.jensei.com
   ```
6. Save the changes

### Step 4: Verify Environment Variables

The production `.env` file is configured with:
- ✅ `BACKEND_URL=http://api.jensei.com`
- ✅ `FRONTEND_URL=http://jensei.com`
- ✅ `GOOGLE_REDIRECT_URI=http://api.jensei.com/api/auth/google/callback`
- ✅ `NODE_ENV=production`
- ✅ `ENABLE_EMAIL_SERVICE=true` (enabled for production)

### Step 5: Security Checklist

Before deploying, ensure:

- [ ] `.env` file is in `.gitignore` (never commit secrets)
- [ ] JWT_SECRET is a strong, random string
- [ ] MongoDB connection string uses strong credentials
- [ ] Google OAuth redirect URI matches exactly
- [ ] CORS is configured correctly for production domain
- [ ] HTTPS is configured (recommended for production)
- [ ] Firewall rules allow only necessary ports

### Step 6: Start the Server

On your EC2 instance:

```bash
# Install dependencies (if not already done)
npm install

# Start the server
npm start

# Or use PM2 for process management (recommended)
pm2 start server.js --name jensei-backend
pm2 save
pm2 startup
```

## Production URLs

- **Backend API**: http://api.jensei.com
- **Frontend**: http://jensei.com
- **Google OAuth Callback**: http://api.jensei.com/api/auth/google/callback

## Notes

1. **HTTPS Recommendation**: For production, consider using HTTPS:
   - Update `BACKEND_URL=https://api.jensei.com`
   - Update `FRONTEND_URL=https://jensei.com`
   - Update `GOOGLE_REDIRECT_URI=https://api.jensei.com/api/auth/google/callback`
   - Update Google Cloud Console redirect URIs to use `https://`

2. **Cookie Security**: In production with HTTPS, cookies will automatically use the `secure` flag.

3. **CORS**: The backend is configured to accept requests from `FRONTEND_URL`, which is set to `http://jensei.com`.

4. **Database**: Make sure your MongoDB Atlas cluster allows connections from your EC2 instance's IP address.

