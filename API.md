# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All admin endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Or the token will be sent automatically via cookies if using cookie-based auth.

---

## Public Endpoints

### Get All Candidates
- **GET** `/candidates`
- **Description**: Get all candidates with their category information
- **Access**: Public
- **Response**:
```json
{
  "status": "success",
  "results": 10,
  "data": {
    "candidates": [
      {
        "_id": "...",
        "name": "John Doe",
        "photoURL": "https://...",
        "manifesto": "...",
        "department": "Computer Science",
        "level": "400 Level",
        "category": {
          "_id": "...",
          "title": "President",
          "description": "..."
        }
      }
    ]
  }
}
```

### Get Candidates by Category
- **GET** `/candidates/category/:categoryId`
- **Description**: Get all candidates for a specific category
- **Access**: Public
- **Parameters**: `categoryId` (MongoDB ObjectId)
- **Response**:
```json
{
  "status": "success",
  "results": 3,
  "data": {
    "category": {
      "id": "...",
      "title": "President",
      "description": "...",
      "allowAbstain": true
    },
    "candidates": [...]
  }
}
```

---

## Admin Authentication Endpoints

### Admin Login
- **POST** `/admin/auth/login`
- **Description**: Login as admin
- **Access**: Public (rate limited: 5 requests per 15 minutes)
- **Body**:
```json
{
  "email": "admin@bucc.edu.ng",
  "password": "admin123"
}
```
- **Response**:
```json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "user": {
      "_id": "...",
      "email": "admin@bucc.edu.ng",
      "name": "Admin User",
      "role": "admin"
    }
  }
}
```

### Admin Logout
- **POST** `/admin/auth/logout`
- **Description**: Logout admin
- **Access**: Private (Admin)
- **Response**:
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### Get Current Admin
- **GET** `/admin/auth/me`
- **Description**: Get current logged in admin details
- **Access**: Private (Admin)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "admin": {
      "id": "...",
      "email": "admin@bucc.edu.ng",
      "name": "Admin User",
      "role": "admin",
      "lastLogin": "2026-01-24T10:00:00.000Z"
    }
  }
}
```

---

## Admin Category Endpoints

### Get All Categories
- **GET** `/admin/categories`
- **Description**: Get all categories with their candidates
- **Access**: Private (Admin)
- **Response**:
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "categories": [
      {
        "_id": "...",
        "title": "President",
        "description": "...",
        "allowAbstain": true,
        "isActive": true,
        "candidates": [...]
      }
    ]
  }
}
```

### Get Single Category
- **GET** `/admin/categories/:id`
- **Description**: Get a single category with its candidates
- **Access**: Private (Admin)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "category": {
      "_id": "...",
      "title": "President",
      "description": "...",
      "allowAbstain": true,
      "isActive": true,
      "candidates": [...]
    }
  }
}
```

### Create Category
- **POST** `/admin/categories`
- **Description**: Create a new category
- **Access**: Private (Admin)
- **Body**:
```json
{
  "title": "President",
  "description": "The President oversees all club activities",
  "allowAbstain": true
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "category": {
      "_id": "...",
      "title": "President",
      "description": "...",
      "allowAbstain": true,
      "isActive": true
    }
  }
}
```

### Update Category
- **PATCH** `/admin/categories/:id`
- **Description**: Update a category
- **Access**: Private (Admin)
- **Body** (all fields optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "allowAbstain": false,
  "isActive": true
}
```

### Delete Category
- **DELETE** `/admin/categories/:id`
- **Description**: Delete a category and all its candidates
- **Access**: Private (Admin)
- **Response**: 204 No Content

---

## Admin Candidate Endpoints

### Get All Candidates (Admin)
- **GET** `/admin/candidates`
- **Description**: Get all candidates (admin view)
- **Access**: Private (Admin)
- **Response**: Same as public `/candidates` endpoint

### Get Single Candidate
- **GET** `/admin/candidates/:id`
- **Description**: Get a single candidate
- **Access**: Private (Admin)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "candidate": {
      "_id": "...",
      "name": "John Doe",
      "photoURL": "https://...",
      "manifesto": "...",
      "department": "Computer Science",
      "level": "400 Level",
      "category": {...}
    }
  }
}
```

### Create Candidate
- **POST** `/admin/candidates`
- **Description**: Create a new candidate
- **Access**: Private (Admin)
- **Body**:
```json
{
  "name": "John Doe",
  "photoURL": "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
  "manifesto": "My vision is to...",
  "department": "Computer Science",
  "level": "400 Level",
  "category": "category_mongodb_id_here"
}
```

### Update Candidate
- **PATCH** `/admin/candidates/:id`
- **Description**: Update a candidate
- **Access**: Private (Admin)
- **Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "photoURL": "https://...",
  "manifesto": "Updated manifesto",
  "department": "Updated Department",
  "level": "300 Level",
  "category": "new_category_id"
}
```

### Delete Candidate
- **DELETE** `/admin/candidates/:id`
- **Description**: Delete a candidate
- **Access**: Private (Admin)
- **Response**: 204 No Content

---

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "Error message here"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests
- `RateLimit-Reset`: Time when limit resets

---

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update `MONGODB_URI` if needed
   - Set a strong `JWT_SECRET`

3. **Start MongoDB** (if running locally):
   ```bash
   # Make sure MongoDB is running on localhost:27017
   ```

4. **Seed initial admin user**:
   ```bash
   npm run seed:admin
   ```
   Default credentials:
   - Email: `admin@bucc.edu.ng`
   - Password: `admin123`

5. **Start the server**:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:5000` (or the port specified in `.env`).
