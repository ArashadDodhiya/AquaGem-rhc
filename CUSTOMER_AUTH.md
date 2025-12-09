# Customer Authentication API Documentation

## Overview
Complete customer authentication system with registration and OTP-based login.

## API Endpoints

### 1. Register Customer
**POST** `/api/auth/customer/register`

**Request:**
```json
{
  "name": "John Doe",
  "mobile": "9876543210",
  "whatsapp": "9876543210",
  "address": {
    "flat": "101",
    "building": "Tower A",
    "society": "Green Valley",
    "area": "Sector 21",
    "city": "Mumbai",
    "pincode": "400001",
    "landmark": "Near Metro Station"
  },
  "delivery_schedule": "daily"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. OTP sent.",
  "otp": "123456"  // Only in development
}
```

### 2. Request OTP
**POST** `/api/auth/customer/otp/request`

**Request:**
```json
{
  "mobile": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456"  // Only in development
}
```

### 3. Verify OTP
**POST** `/api/auth/customer/otp/verify`

**Request:**
```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer": {
    "_id": "...",
    "name": "John Doe",
    "mobile": "9876543210",
    "role": "customer"
  }
}
```

### 4. Refresh Token
**POST** `/api/auth/customer/refresh`

**Response:**
```json
{
  "success": true,
  "token": "new_access_token"
}
```

### 5. Logout
**POST** `/api/auth/customer/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Protected Routes

All routes under `/api/customer/*` are protected and require:
- Valid JWT token in `Authorization: Bearer <token>` header
- `role === 'customer'`

## Testing

### Register New Customer
```bash
curl -X POST http://localhost:3000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "mobile": "9876543210",
    "whatsapp": "9876543210",
    "address": {
      "flat": "101",
      "building": "Tower A",
      "city": "Mumbai",
      "pincode": "400001"
    },
    "delivery_schedule": "daily"
  }'
```

### Request OTP
```bash
curl -X POST http://localhost:3000/api/auth/customer/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/customer/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","otp":"123456"}' \
  -c cookies.txt
```

## Security Features

✅ **Mobile validation** (10 digits)  
✅ **Duplicate prevention** (unique mobile)  
✅ **OTP expiry** (10 minutes)  
✅ **Single-use OTP**  
✅ **Role-based access control**  
✅ **JWT tokens** (Access: 15min, Refresh: 7 days)  
✅ **HttpOnly cookies**

## Error Codes

| Status | Message | Description |
|--------|---------|-------------|
| 400 | Mobile must be 10 digits | Invalid mobile format |
| 400 | OTP has expired | OTP older than 10 minutes |
| 401 | Invalid OTP | Wrong OTP entered |
| 403 | Customer access only | Wrong user role |
| 404 | User not found | Mobile not registered |
| 409 | Mobile already registered | Duplicate registration |
