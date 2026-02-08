import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { initializeEmail } from './config/email.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import filterRoutes from './routes/filterRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import doctorAuthRoutes from './routes/doctorAuthRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Initialize email service
initializeEmail();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
// Build allowed origins list based on environment
const getAllowedOrigins = () => {
  const origins = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // PRODUCTION: Only allow production frontend URLs
    // Support both www and non-www versions, and both http and https
    const productionUrls = [
      'https://www.jensei.com',
      'https://jensei.com',
      // Note: http versions removed for security (HTTPS only in production)
    ];
    
    origins.push(...productionUrls);
    
    // Also add from FRONTEND_URL env variable if set
    if (process.env.FRONTEND_URL) {
      const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash
      
      // Only add HTTPS URLs in production
      if (frontendUrl.startsWith('https://')) {
        origins.push(frontendUrl);
        
        // Add www/non-www variants
        if (frontendUrl.includes('jensei.com')) {
          if (frontendUrl.includes('www.')) {
            origins.push(frontendUrl.replace('www.', ''));
          } else {
            origins.push(frontendUrl.replace('jensei.com', 'www.jensei.com'));
          }
        }
      }
    }
  } else {
    // DEVELOPMENT: Allow localhost origins
    origins.push('http://localhost:5173', 'http://localhost:3000');
    
    // Also allow production URLs for testing (optional)
    // Uncomment if you want to test production frontend against local backend
    // origins.push('https://www.jensei.com', 'https://jensei.com');
  }
  
  // Remove duplicates and return
  return [...new Set(origins)];
};

const allowedOrigins = getAllowedOrigins();

// Log allowed origins on startup (for debugging)
console.log('🌐 CORS Allowed Origins:', allowedOrigins.join(', '));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log for debugging
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctor',doctorAuthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Signal PM2 that the app is ready (for zero-downtime reload)
  if (process.send) {
    process.send('ready');
  }
});

// Handle server startup errors (e.g., port already in use)
server.on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please free the port or use a different port.`);
  } else {
    console.error('❌ Server error:', error);
  }
  
  // Exit with error code so PM2 knows it failed
  process.exit(1);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, but log it
  // Some rejections might be recoverable
});

// Graceful shutdown for PM2 reload
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 5 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 5 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
});

