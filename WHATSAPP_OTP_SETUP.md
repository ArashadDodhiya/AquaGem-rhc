# WhatsApp OTP Integration Guide

## Overview
The OTP system now supports sending OTPs via WhatsApp using multiple provider options.

## Supported Providers

### 1. Twilio WhatsApp API
**Setup:**
```bash
npm install twilio
```

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Uncomment in `lib/whatsapp.js`:**
- Lines for Twilio implementation

### 2. MSG91 WhatsApp API
**Environment Variables:**
```env
MSG91_AUTH_KEY=your_auth_key
MSG91_WHATSAPP_TEMPLATE_ID=your_template_id
MSG91_SENDER_ID=your_sender_id
```

**Uncomment in `lib/whatsapp.js`:**
- Lines for MSG91 implementation

### 3. WhatsApp Business API (Meta)
**Environment Variables:**
```env
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

**Requirements:**
- Meta Business account
- Approved message template
- WhatsApp Business API access

**Uncomment in `lib/whatsapp.js`:**
- Lines for Meta WhatsApp Business API implementation

## Development Mode

In development, OTPs are logged to console instead of being sent:
```
📱 [WhatsApp OTP Simulation]
   To: +918888888888
   OTP: 123456
   Message: Your AquaGem OTP is: 123456. Valid for 10 minutes.
```

## Production Setup

### Step 1: Choose a Provider
Select one of the providers above based on your needs:
- **Twilio**: Easy setup, reliable, pay-as-you-go
- **MSG91**: India-focused, competitive pricing
- **Meta WhatsApp Business**: Direct integration, requires approval

### Step 2: Configure Environment Variables
Add the required environment variables to your `.env` file.

### Step 3: Uncomment Provider Code
In `lib/whatsapp.js`, uncomment the code block for your chosen provider.

### Step 4: Install Dependencies
```bash
# For Twilio
npm install twilio

# For MSG91 or Meta (uses fetch, no extra packages needed)
```

### Step 5: Test
```bash
curl -X POST http://localhost:3000/api/auth/delivery/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobile":"8888888888"}'
```

## Message Template

The default OTP message:
```
Your AquaGem OTP is: {OTP}. Valid for 10 minutes. Do not share this code with anyone.
```

For WhatsApp Business API (Meta), you need to create and get approval for a template message.

## Error Handling

The system gracefully handles WhatsApp sending failures:
- OTP is still saved in the database
- Error is logged but doesn't block the request
- In production, you may want to return an error if sending fails

## Security Notes

✅ **10-minute expiry** - OTPs expire after 10 minutes  
✅ **Single-use** - OTPs are marked as used after verification  
✅ **Rate limiting** - Consider implementing rate limiting for OTP requests  
✅ **Mobile validation** - 10-digit format enforced  

## Testing

### Development
OTPs are logged to console - check your terminal output.

### Production
Ensure you have:
1. Valid provider credentials
2. Sufficient account balance/credits
3. Approved message templates (for Meta)
4. Correct phone number format (+91 prefix for India)

## Troubleshooting

**OTP not received:**
- Check provider credentials
- Verify account balance
- Check phone number format
- Review provider logs/dashboard

**Development mode not working:**
- Ensure `NODE_ENV=development` in `.env`
- Check console output for OTP

**Provider errors:**
- Verify API credentials
- Check provider documentation
- Review error logs
