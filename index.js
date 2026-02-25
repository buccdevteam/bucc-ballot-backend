require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const { globalErrorHandler } = require('./middleware/errorHandler');
const connectDB = require('./config/database');
const passport = require('./config/passport');

// Validate critical environment variables (deferred to runtime - do NOT throw at module load)
// Throwing during load fails Vercel build when env vars are not yet available
const validateEnv = () => {
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters long');
  }
  return true;
};

// Initialize Express app
const app = express();

// Initialize database connection
// In serverless, this will be called on each request and use cached connection
let dbConnected = false;
const initDB = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      // Reset connection flag to allow retry
      dbConnected = false;
      throw error; // Re-throw to be caught by middleware
    }
  }
};

// Initialize database immediately in non-serverless environments
if (!process.env.VERCEL) {
  initDB().catch(err => {
    console.error('Initial database connection failed:', err.message);
  });
}

// Trust proxy (important if behind reverse proxy like nginx)
app.set('trust proxy', 1);

// Security Middleware
// Helmet - Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - Configure Cross-Origin Resource Sharing
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:4060',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Body parser middleware (5mb to allow candidate photos as base64 data URLs)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Initialize Passport middleware
app.use(passport.initialize());



// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all requests
app.use('/api/', limiter);

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  if (!validateEnv()) {
    return res.status(503).json({
      status: 'error',
      message: 'Server is misconfigured. Missing required environment variables.',
    });
  }
  try {
    await initDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed. Please try again.',
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const userAuthRoutes = require('./routes/userAuthRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const { publicRouter: candidatePublicRoutes, adminRouter: candidateAdminRoutes } = require('./routes/candidateRoutes');
const { publicRouter: voteRoutes, adminRouter: voteAdminRoutes } = require('./routes/voteRoutes');
const validVoterRoutes = require('./routes/validVoterRoutes');

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// User authentication routes (Google OAuth)
app.use('/api/auth', userAuthRoutes);

// Admin authentication routes
app.use('/api/admin/auth', adminAuthRoutes);

// Public candidate routes (fetch candidates)
app.use('/api/candidates', candidatePublicRoutes);

// Vote routes (user)
app.use('/api/votes', voteRoutes);

// Admin routes (require authentication)
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/candidates', candidateAdminRoutes);
app.use('/api/admin/votes', voteAdminRoutes);
app.use('/api/admin/valid-voters', validVoterRoutes);

// 404 handler (must be after all routes)
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  
  // In serverless, don't exit - just log the error
  if (!process.env.VERCEL && !process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  
  // In serverless, don't exit - just log the error
  if (!process.env.VERCEL && !process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start server only in non-serverless environments
if (!process.env.VERCEL && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

// Export for Vercel serverless
module.exports = app;
