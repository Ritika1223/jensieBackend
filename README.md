# Jensei Backend - Setup Guide

This guide will help you set up and deploy the Jensei Healthcare Backend API.

## Prerequisites

- Node.js (v18 or higher)
- npm
- MongoDB (MongoDB Atlas)
- PM2 (for production deployment)
- Git

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jenseitech/jensei-backend-node.git
cd jensei-backend-node
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit `.env` and configure the following variables:

#### Required Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
# For local: mongodb://localhost:27017/jensei-org
# For Atlas: mongodb+srv://username:password@cluster.mongodb.net/jensei-org
MONGODB_URI=mongodb://localhost:27017/jensei-org

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (Brevo)
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=noreply@jensei.com
BREVO_FROM_NAME=Jensei Healthcare
ENABLE_EMAIL_SERVICE=true

# Frontend & Backend URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 5. Seed Database (Optional) (To populate sample data in DB)

```bash
# Seed doctors
npm run seed:doctors

# Seed filters
npm run seed:filters

# Seed doctor schedules
npm run seed:schedules

# Generate time slots
npm run generate:slots
```

## Production Deployment (EC2)

### 1. Server Setup

SSH into your EC2 instance and install dependencies:

```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 2. Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/jenseitech/jensei-backend-node.git
cd jensei-backend-node
```

### 3. Environment Configuration

Create `.env` file with production values:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jensei-org
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=7d
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=noreply@jensei.com
BREVO_FROM_NAME=Jensei Healthcare
ENABLE_EMAIL_SERVICE=true
FRONTEND_URL=https://www.jensei.com
BACKEND_URL=https://api.jensei.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://api.jensei.com/api/auth/google/callback
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start with PM2

```bash
npm run pm2:start
```

### 6. Save PM2 Configuration

```bash
npm run pm2:save
```

This ensures PM2 restarts the app on server reboot.

## Deployment Commands

### Zero-Downtime Deployment

The recommended way to deploy updates:

```bash
npm run pm2:reload
```

This command will:
1. Pull latest changes from `main` branch
2. Install/update dependencies
3. Reload the application with zero downtime

### Other PM2 Commands

```bash
# View logs
npm run pm2:logs

# Monitor processes
npm run pm2:monit

# Stop application
npm run pm2:stop

# Restart application
npm run pm2:restart

# Delete application from PM2
npm run pm2:delete
```

## Health Check

The API includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

## API Endpoints

- **Health Check**: `GET /health`
- **Authentication**: `/api/auth/*`
- **Doctors**: `/api/doctors/*`
- **Appointments**: `/api/appointments/*`
- **Slots**: `/api/slots/*`
- **Filters**: `/api/filters/*`

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
```

### PM2 Not Starting

Check PM2 logs:

```bash
npm run pm2:logs
```

### Database Connection Issues

Verify MongoDB URI in `.env` and ensure:
- MongoDB is running (if local)
- Network access is configured (if Atlas)
- Credentials are correct

## Notes

- The `.env` file is gitignored - never commit it
- Always use `npm run pm2:reload` for deployments to ensure latest code
- PM2 automatically restarts the app if it crashes
"# jensieBackend" 
