# Setup Guide for Google OAuth Integration

## Backend Setup

### 1. Install Dependencies
All dependencies are already installed. The following packages are used:
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth 2.0 strategy
- `passport-jwt` - JWT strategy (for token verification)
- `mongoose` - MongoDB ODM

### 2. Configure Google OAuth

1. **Create Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)

2. **Update `.env` file**:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   ```

### 3. Start MongoDB
Make sure MongoDB is running:
```bash
# If using local MongoDB
mongod
```

### 4. Start the Backend Server
```bash
npm run dev
```

## Frontend Setup

### 1. Configure API URL
Create or update `.env.local` in the frontend project:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 2. Start the Frontend
```bash
npm run dev
```

## Testing the Integration

1. **Start both servers**:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:4060`

2. **Test Google Login**:
   - Navigate to `http://localhost:4060/login`
   - Click "Continue with Google"
   - Complete Google OAuth flow
   - You should be redirected back to the frontend with a token
   - The token will be stored and user data loaded

## API Endpoints

### User Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback (handled automatically)
- `POST /api/auth/verify-token` - Verify JWT token
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout (requires auth)

### Voting
- `POST /api/votes` - Cast a vote (requires auth)
- `GET /api/votes/me` - Get my votes (requires auth)
- `GET /api/votes/status` - Get voting status (requires auth)

### Admin Voting (Admin only)
- `GET /api/admin/votes` - Get all votes
- `GET /api/admin/votes/category/:categoryId` - Get votes by category

## Troubleshooting

### Google OAuth Not Working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Check that the callback URL matches exactly in Google Cloud Console
- Ensure the redirect URI includes the correct protocol (http/https)

### Token Verification Failing
- Check that `JWT_SECRET` is set in `.env`
- Verify the token is being sent in the Authorization header
- Check browser console for CORS errors

### MongoDB Connection Issues
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env`
- Ensure the database name is correct

## Security Notes

- Never commit `.env` files
- Use strong `JWT_SECRET` in production
- Use HTTPS in production
- Configure proper CORS origins
- Rate limiting is already configured
