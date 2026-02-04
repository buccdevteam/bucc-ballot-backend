/**
 * Passport Configuration
 * Google OAuth 2.0 Strategy
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Validate email domain (adjust based on your requirements)
        const email = profile.emails[0].value;
        const allowedDomains = ['@babcock.edu.ng', '@student.babcock.edu.ng'];
        const isValidDomain = allowedDomains.some(domain => email.endsWith(domain));

        if (!isValidDomain) {
          // Use 403 Forbidden status code for domain restriction
          return done(new AppError('Only Babcock University email addresses are allowed', 403), null);
        }

        // Check if user exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update last login
          await user.updateLastLogin();
          return done(null, user);
        }

        // Check if user exists with same email (link accounts)
        user = await User.findOne({ email });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.provider = 'google';
          user.photoURL = profile.photos[0]?.value || user.photoURL;
          await user.save();
          await user.updateLastLogin();
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          email,
          name: profile.displayName || profile.name?.givenName || email.split('@')[0],
          photoURL: profile.photos[0]?.value,
          provider: 'google',
          googleId: profile.id,
          hasVoted: false,
        });

        await user.updateLastLogin();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
  );
} else {
  console.warn('⚠️  Google OAuth credentials not configured. Google login will not work.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
