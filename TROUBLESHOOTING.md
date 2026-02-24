# Troubleshooting: 500 "Something went wrong" in Production

If category creation (or other operations) works on localhost but fails in production with a 500 error, check the following.

## 1. Check Production Logs

The error handler now logs structured error details. In **Vercel**:
- Project → Deployments → select deployment → **Functions** tab
- Click the function log to see `ERROR 💥 [500]` entries with `name`, `code`, `message`

This will show the real error (e.g. MongoDB timeout, validation, etc.).

## 2. Environment Variables (Vercel / Production)

Ensure these are set in your hosting dashboard:

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URI` | Yes | Same Atlas cluster as localhost, or production DB |
| `JWT_SECRET` | Yes | Must match what was used to sign tokens (min 32 chars) |
| `FRONTEND_URL` | Yes | Your production frontend URL, e.g. `https://your-app.vercel.app` |
| `NODE_ENV` | Optional | Usually `production` |

## 3. MongoDB Atlas

- **IP whitelist**: Vercel serverless uses dynamic IPs. In Atlas → Network Access, add `0.0.0.0/0` to allow all IPs (or use Atlas Data API if you need stricter control).
- **Connection string**: Ensure `MONGODB_URI` in production points to the correct cluster and database.

## 4. Frontend API URL

In the **frontend** project, set `NEXT_PUBLIC_API_URL` in production to your backend URL, e.g.:

```
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app/api
```

## 5. Duplicate Category Title

The Category model has `title: unique: true`. If a category with the same title already exists in the production DB, you get a duplicate key error. The error handler now returns a proper 400 message for this.

## 6. CORS

If `FRONTEND_URL` is wrong or missing, the browser may block responses. Ensure it matches your production frontend origin exactly (e.g. `https://bucc-ballot.vercel.app`).
