# Ballot App Backend

Secure backend API for the BUCC Ballot Application.

## Security Features

This backend is configured with multiple layers of security:

### 1. **Helmet** - Security Headers
   - Sets various HTTP headers to help protect the app from well-known web vulnerabilities
   - Configures Content Security Policy (CSP)
   - Prevents clickjacking, XSS, and other attacks

### 2. **CORS** - Cross-Origin Resource Sharing
   - Configured to allow requests only from the frontend URL
   - Supports credentials for authenticated requests

### 3. **Rate Limiting**
   - General API: 100 requests per 15 minutes per IP
   - Authentication endpoints: 5 requests per 15 minutes per IP
   - Prevents brute force attacks and API abuse

### 4. **Data Sanitization**
   - **express-mongo-sanitize**: Prevents NoSQL injection attacks
   - **xss-clean**: Sanitizes user input to prevent XSS attacks
   - **hpp**: Prevents HTTP Parameter Pollution

### 5. **Input Validation**
   - **express-validator**: Validates and sanitizes all incoming data
   - Prevents malformed or malicious input

### 6. **Password Security**
   - **bcryptjs**: Hashes passwords using bcrypt algorithm
   - Never stores plain text passwords

### 7. **JWT Authentication**
   - **jsonwebtoken**: Secure token-based authentication
   - Tokens expire after configured time
   - Secure cookie storage option

### 8. **Request Logging**
   - **morgan**: Logs all HTTP requests
   - Development: detailed logs
   - Production: combined format

### 9. **Response Compression**
   - **compression**: Compresses responses to reduce bandwidth

### 10. **Body Parser Limits**
   - Limits request body size to 10kb
   - Prevents DoS attacks via large payloads

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration:
   - Set `JWT_SECRET` to a strong random string
   - Update `FRONTEND_URL` to match your frontend URL
   - Configure database connection if needed

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:4060` |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRE` | JWT token expiration | `7d` |
| `JWT_COOKIE_EXPIRE` | Cookie expiration in days | `7` |

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong JWT secrets** - Generate using: `openssl rand -base64 32`
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Use HTTPS in production** - Configure SSL/TLS certificates
5. **Monitor rate limits** - Adjust based on your traffic patterns
6. **Regular security audits** - Run `npm audit fix`

## API Structure

The API will be organized as follows:
- `/api/auth` - Authentication endpoints
- `/api/ballot` - Ballot and voting endpoints
- `/api/admin` - Admin-only endpoints
- `/health` - Health check endpoint

## Next Steps

1. Set up database connection (MongoDB/PostgreSQL)
2. Create authentication routes
3. Implement ballot and voting endpoints
4. Add admin routes
5. Set up error handling middleware
6. Add request validation schemas
