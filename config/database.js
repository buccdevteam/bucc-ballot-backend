const mongoose = require('mongoose');

/**
 * Serverless-optimized options for Vercel:
 * - minPoolSize: 0 avoids holding idle connections (saves Atlas connection quota)
 * - maxPoolSize: 5 limits connections per serverless instance
 * - Longer timeouts for cold starts and cross-region latency
 * - retryWrites in URI handles transient failures
 */
const mongoOptions = {
  serverSelectionTimeoutMS: 20000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5,
  minPoolSize: 0,
  maxIdleTimeMS: 10000,
  connectTimeoutMS: 15000,
  heartbeatFrequencyMS: 30000,
};

// Cache connection for Vercel serverless - reuse across warm invocations
let connectionPromise = null;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Reuse existing connection if already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Reuse in-flight connection attempt (avoid parallel connects from concurrent cold starts)
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log('Attempting to connect to MongoDB...');

      const conn = await mongoose.connect(mongoURI, mongoOptions);

      console.log(`MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        connectionPromise = null;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      if (!process.env.VERCEL) {
        process.on('SIGINT', async () => {
          await mongoose.connection.close();
          console.log('MongoDB connection closed due to app termination');
          process.exit(0);
        });
      }

      return conn;
    } catch (error) {
      connectionPromise = null;
      console.error('MongoDB connection failed:', error.message);
      // On Vercel, don't exit - allow retry on next request (cold start may succeed)
      if (!process.env.VERCEL) {
        process.exit(1);
      }
      throw error;
    }
  })();

  return connectionPromise;
};

module.exports = connectDB;
