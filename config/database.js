/**
 * MongoDB Database Connection
 * Optimized for serverless environments (Vercel)
 */

const mongoose = require('mongoose');

// Cache the database connection
let cachedConnection = null;

// Configure mongoose for serverless
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 30000);

const connectDB = async () => {
  // If we have a cached connection and it's ready, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('♻️  Using cached MongoDB connection');
    return cachedConnection;
  }

  // Validate MONGODB_URI exists
  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI is not defined in environment variables');
    console.error('❌', error.message);
    throw error;
  }

  try {
    // Connection options optimized for serverless
    const options = {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Limit connection pool size
      minPoolSize: 2,
      maxIdleTimeMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    cachedConnection = conn;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
    });
    cachedConnection = null;
    
    // In serverless, don't exit process - throw error instead
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw error;
    }
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
  cachedConnection = null;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
  cachedConnection = null;
});

// Graceful shutdown (only for non-serverless environments)
if (!process.env.VERCEL) {
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });
}

module.exports = connectDB;
