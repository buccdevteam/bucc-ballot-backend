require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const { globalErrorHandler } = require('./middleware/errorHandler');
const connectDB = require('./config/database');
const passport = require('./config/passport');

// Connect to database
connectDB();

// Initialize Passport
require('./config/passport');

const app = express();

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

// Body parser middleware
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser middleware
app.use(cookieParser());

// Initialize Passport middleware
app.use(passport.initialize());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const userAuthRoutes = require('./routes/userAuthRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const { publicRouter: candidatePublicRoutes, adminRouter: candidateAdminRoutes } = require('./routes/candidateRoutes');
const { publicRouter: voteRoutes, adminRouter: voteAdminRoutes } = require('./routes/voteRoutes');

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

// 404 handler (must be after all routes)
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
