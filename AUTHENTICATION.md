# Admin Authentication API Documentation

## Overview
Complete password-based authentication system for admin users with JWT tokens and HttpOnly cookies.

## Setup

### 1. Install Dependencies
```bash
npm install jsonwebtoken bcryptjs
```

### 2. Environment Variables
Add to your `.env` file:
```env
MONGO_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
NODE_ENV=development
```

### 3. Create Admin User
```bash
node scripts/create-admin.js
```

## API Endpoints

### 1. Login
**POST** `/api/auth/admin/login`

**Request:**
```json
{
  "mobile": "9999999999",
  "password": "admin123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "_id": "...",
    "name": "Test Admin",
    "mobile": "9999999999",
    "role": "admin"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 2. Refresh Token
**POST** `/api/auth/admin/refresh`

**Response:**
```json
{
  "success": true,
  "token": "new_access_token"
}
```

### 3. Logout
**POST** `/api/auth/admin/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Protected Routes

All routes under `/api/admin/*` are protected by middleware.

**Example Protected Route:**
```javascript
// app/api/admin/dashboard/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  // Access user data from headers (set by middleware)
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  
  return NextResponse.json({
    message: 'Admin dashboard data',
    userId,
    userRole
  });
}
```

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","password":"admin123"}' \
  -c cookies.txt
```

### Access Protected Route
```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/admin/refresh \
  -b cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/admin/logout \
  -b cookies.txt
```

## Security Features

✅ **Password Hashing**: bcrypt with 10 salt rounds  
✅ **JWT Tokens**: Access (15min) + Refresh (7 days)  
✅ **HttpOnly Cookies**: Refresh token stored securely  
✅ **Role-Based Access**: Admin-only middleware  
✅ **Account Status**: Checks `is_active` flag  
✅ **Secure Cookies**: HTTPS-only in production

## Error Codes

| Status | Message | Description |
|--------|---------|-------------|
| 400 | Mobile and password are required | Missing credentials |
| 401 | Invalid credentials | Wrong mobile/password |
| 401 | Unauthorized. No token provided. | Missing JWT token |
| 401 | Invalid or expired token | Token verification failed |
| 403 | Unauthorized. Admin access only. | Non-admin user |
| 403 | Account disabled | User is_active = false |
| 500 | Internal server error | Server error |
