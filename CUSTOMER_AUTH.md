# Customer Authentication API Documentation

## Overview
Complete customer authentication system with separate registration and login flows.

## API Endpoints

### 1. Register Customer (New Users Only)
**POST** `/api/auth/customer/register`

Strictly for new users. Returns error if mobile already exists.

**Request:**
```json
{
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
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. OTP sent.",
  "otp": "123456"
}
```

**Error Response (409 - Already Registered):**
```json
{
  "success": false,
  "message": "Mobile number already registered. Please login.",
  "already_registered": true
}
```

### 2. Login (Existing Users Only)
**POST** `/api/auth/customer/login`

**Request:**
```json
{
  "mobile": "9876543210"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456"
}
```

**Error Response (404 - Not Registered):**
```json
{
  "success": false,
  "message": "User not found. Please register first.",
  "not_registered": true
}
```

### 3. Verify OTP
**POST** `/api/auth/customer/otp/verify`
(Same as before)

### 4. Refresh Token & Logout
(Same as before)
