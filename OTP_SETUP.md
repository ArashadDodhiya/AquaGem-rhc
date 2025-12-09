# SMS & WhatsApp OTP Integration Guide

## Overview
The OTP system sends OTPs via **both SMS and WhatsApp** for maximum delivery reliability.

## SMS Providers

### 1. Twilio SMS API
**Setup:**
```bash
npm install twilio
```

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Uncomment in `lib/sms.js`:** Twilio implementation block

### 2. MSG91 SMS API
**Environment Variables:**
```env
MSG91_AUTH_KEY=your_auth_key
MSG91_SENDER_ID=your_sender_id
MSG91_TEMPLATE_ID=your_template_id
```

**Uncomment in `lib/sms.js`:** MSG91 implementation block

### 3. AWS SNS
**Setup:**
```bash
npm install @aws-sdk/client-sns
```

**Environment Variables:**
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

**Uncomment in `lib/sms.js`:** AWS SNS implementation block

### 4. Fast2SMS (India)
**Environment Variables:**
```env
FAST2SMS_API_KEY=your_api_key
FAST2SMS_SENDER_ID=your_sender_id
```

**Uncomment in `lib/sms.js`:** Fast2SMS implementation block

## WhatsApp Providers

See `WHATSAPP_OTP_SETUP.md` for WhatsApp configuration (Twilio, MSG91, or Meta).

## How It Works

When an OTP is requested:
1. **SMS** is sent first
2. **WhatsApp** is sent second
3. Both attempts are independent (one failure doesn't block the other)
4. Response includes status of both channels

### Response Format:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "channels": {
    "sms": true,
    "whatsapp": true
  },
  "otp": "123456"  // Only in development
}
```

## Development Mode

Both SMS and WhatsApp are logged to console:
```
📨 [SMS OTP Simulation]
   To: +918888888888
   OTP: 123456
   Message: Your AquaGem OTP is: 123456. Valid for 10 minutes.

📱 [WhatsApp OTP Simulation]
   To: +918888888888
   OTP: 123456
   Message: Your AquaGem OTP is: 123456. Valid for 10 minutes.
```

## Production Setup

### Quick Start (Choose One Provider for Each Channel)

**For SMS:**
1. Choose: Twilio / MSG91 / AWS SNS / Fast2SMS
2. Add credentials to `.env`
3. Uncomment provider code in `lib/sms.js`
4. Install dependencies if needed

**For WhatsApp:**
1. Choose: Twilio / MSG91 / Meta
2. Add credentials to `.env`
3. Uncomment provider code in `lib/whatsapp.js`
4. Install dependencies if needed

### Recommended Combinations

**Budget-friendly (India):**
- SMS: Fast2SMS or MSG91
- WhatsApp: MSG91

**Enterprise:**
- SMS: AWS SNS
- WhatsApp: Meta WhatsApp Business

**Easy Setup:**
- SMS: Twilio
- WhatsApp: Twilio

## Error Handling

The system is fault-tolerant:
- ✅ If SMS fails, WhatsApp still attempts
- ✅ If WhatsApp fails, SMS still attempts
- ✅ OTP is always saved in database
- ✅ Request succeeds even if both channels fail (OTP can still be verified)

## Testing

```bash
curl -X POST http://localhost:3000/api/auth/delivery/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobile":"8888888888"}'
```

Check console for simulated messages in development mode.

## Security

✅ **Dual-channel delivery** - Higher success rate  
✅ **10-minute expiry** - Time-limited validity  
✅ **Single-use** - Cannot be reused  
✅ **Rate limiting** - Recommended for production  
✅ **Mobile validation** - 10-digit format enforced

## Cost Optimization

**Tip:** You can configure to send via only one channel by commenting out the other in the OTP request route.

**Example:** SMS only (comment out WhatsApp block)
**Example:** WhatsApp only (comment out SMS block)
