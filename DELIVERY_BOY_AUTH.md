# Delivery Boy Authentication API Documentation

## Overview
Complete authentication system for delivery boys with password-based and OTP-based login methods.

## API Endpoints

### 1. Password Login
**POST** `/api/auth/delivery/login`

**Request:**
```json
{
  "mobile": "8888888888",
  "password": "delivery123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "delivery_boy": {
    "_id": "...",
    "name": "Test Delivery Boy",
    "mobile": "8888888888",
    "role": "delivery_boy"
  }
}
```

### 2. Request OTP
**POST** `/api/auth/delivery/otp/request`

**Request:**
```json
{
  "mobile": "8888888888"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456"  // Only in development mode
}
```

### 3. Verify OTP
**POST** `/api/auth/delivery/otp/verify`

**Request:**
```json
{
  "mobile": "8888888888",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "delivery_boy": {
    "_id": "...",
    "name": "Test Delivery Boy",
    "mobile": "8888888888",
    "role": "delivery_boy"
  }
}
```

### 4. Refresh Token
**POST** `/api/auth/delivery/refresh`

**Response:**
```json
{
  "success": true,
  "token": "new_access_token"
}
```

### 5. Logout
**POST** `/api/auth/delivery/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Protected Routes

All routes under `/api/delivery/*` are protected and require:
- Valid JWT token in `Authorization: Bearer <token>` header
- `role === 'delivery_boy'`

## Setup

### Create Delivery Boy User
```bash
node scripts/create-delivery-boy.js
```

## Testing

### Password Login
```bash
curl -X POST http://localhost:3000/api/auth/delivery/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"8888888888","password":"delivery123"}' \
  -c cookies.txt
```

### OTP Flow
```bash
# Request OTP
curl -X POST http://localhost:3000/api/auth/delivery/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobile":"8888888888"}'

# Verify OTP
curl -X POST http://localhost:3000/api/auth/delivery/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile":"8888888888","otp":"123456"}' \
  -c cookies.txt
```

## Security Features

✅ **10-digit mobile validation**  
✅ **OTP expiry** (10 minutes)  
✅ **OTP single-use** (marked as used after verification)  
✅ **Role-based access control**  
✅ **Account status checking** (is_active flag)  
✅ **JWT tokens** (Access: 15min, Refresh: 7 days)  
✅ **HttpOnly cookies** for refresh tokens

## Error Codes

| Status | Message | Description |
|--------|---------|-------------|
| 400 | Mobile must be 10 digits | Invalid mobile format |
| 400 | OTP must be numeric | Invalid OTP format |
| 400 | OTP has expired | OTP older than 10 minutes |
| 401 | Invalid OTP | Wrong OTP entered |
| 403 | Delivery boy access only | Wrong user role |
| 403 | Account disabled | User is_active = false |
| 404 | User not found | Mobile not registered |
| 404 | No OTP request found | No pending OTP |
