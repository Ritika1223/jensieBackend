

# Jensei Healthcare Backend API

A production-ready Node.js + Express backend API with JWT authentication for the Jensei Healthcare application.

## Features

- ✅ JWT-based authentication (access tokens only, no refresh tokens)
- ✅ HTTP-only secure cookies for web clients
- ✅ Bearer token support for mobile/API clients
- ✅ Password hashing with bcrypt
- ✅ User signup, login, logout
- ✅ Forgot password with email reset (SendGrid)
- ✅ Reset password with time-limited tokens
- ✅ User profile management (get, update, delete)
- ✅ Admin-only user deletion
- ✅ MongoDB + Mongoose integration

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- SendGrid account (for password reset emails)

## Installation

1. **Install dependencies:**
   ```bash
   cd jensei-backend
   npm install
   ```

2. **Create environment file:**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   # For local MongoDB: mongodb://localhost:27017/jensei-org
   # For MongoDB Atlas: mongodb+srv://username:password@jensei-backend.mongodb.net/jensei-org
   MONGODB_URI=mongodb://localhost:27017/jensei-org

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d

   # SendGrid Configuration
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@jensei.com

   # Frontend URL (for CORS and email links)
   FRONTEND_URL=http://localhost:5173
   ```

3. **Start MongoDB:**
   Make sure MongoDB is running on your system.

4. **Run the server:**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "user" // optional: "user", "doctor", or "admin"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt-token-here"
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt-token-here"
}
```

#### POST `/api/auth/logout`
Logout (clears HTTP-only cookie).

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### POST `/api/auth/forgot-password`
Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### POST `/api/auth/reset-password`
Reset password using the token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

### User Routes (`/api/users`)

All user routes require authentication (JWT token).

#### GET `/api/users/profile`
Get the authenticated user's profile.

**Headers:**
- `Authorization: Bearer <token>` (for mobile/API)
- Or HTTP-only cookie (for web)

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### PUT `/api/users/profile`
Update the authenticated user's profile.

**Request Body:**
```json
{
  "name": "Jane Doe", // optional
  "email": "newemail@example.com", // optional
  "password": "newpassword123" // optional
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "...",
    "email": "newemail@example.com",
    "name": "Jane Doe",
    "role": "user",
    "updatedAt": "..."
  }
}
```

#### DELETE `/api/users/profile/:userId`
Delete a user profile.

- **Admin users:** Can delete any user profile
- **Regular users:** Can only delete their own profile

**Response:**
```json
{
  "message": "User profile deleted successfully"
}
```

## Authentication

### For Web Clients
The server automatically sets an HTTP-only, secure cookie when you signup/login. This cookie is sent automatically with subsequent requests.

### For Mobile/API Clients
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Security Features

- ✅ Passwords are hashed using bcrypt (10 salt rounds)
- ✅ JWT tokens expire after 7 days (configurable)
- ✅ HTTP-only cookies prevent XSS attacks
- ✅ Secure flag enabled in production (HTTPS required)
- ✅ Password reset tokens expire after 1 hour
- ✅ Token validation on all protected routes

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message here"
}
```

## Development

- **Development mode:** `npm run dev` (uses Node.js watch mode)
- **Production mode:** `npm start`

## Production Deployment

1. Set `NODE_ENV=production` in your `.env` file
2. Use a strong, random `JWT_SECRET`
3. Ensure MongoDB connection string is secure
4. Configure SendGrid API key
5. Set `FRONTEND_URL` to your production frontend URL
6. Ensure HTTPS is enabled (required for secure cookies)

## License

ISC

