/**
 * SMS OTP Utility
 * Supports multiple SMS providers: Twilio, MSG91, AWS SNS, etc.
 */

/**
 * Send OTP via SMS
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - OTP code
 * @returns {Promise<boolean>} - Success status
 */
export async function sendSMSOTP(mobile, otp) {
    try {
        // Format mobile number with country code (assuming India +91)
        const formattedMobile = `91${mobile}`;

        // Option 1: Using Twilio SMS API
        // Uncomment and configure when you have Twilio credentials
        /*
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        
        const client = require('twilio')(accountSid, authToken);
        
        await client.messages.create({
          from: twilioPhoneNumber,
          to: `+${formattedMobile}`,
          body: `Your AquaGem OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`
        });
        
        return true;
        */

        // Option 2: Using MSG91 SMS API
        // Uncomment and configure when you have MSG91 credentials
        /*
        const authKey = process.env.MSG91_AUTH_KEY;
        const senderId = process.env.MSG91_SENDER_ID;
        const templateId = process.env.MSG91_TEMPLATE_ID;
        
        const response = await fetch(
          `https://api.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${formattedMobile}&authkey=${authKey}&otp=${otp}`,
          { method: 'GET' }
        );
        
        const data = await response.json();
        return data.type === 'success';
        */

        // Option 3: Using AWS SNS
        // Uncomment and configure when you have AWS credentials
        /*
        const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
        
        const snsClient = new SNSClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        });
        
        const params = {
          Message: `Your AquaGem OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`,
          PhoneNumber: `+${formattedMobile}`,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
              DataType: 'String',
              StringValue: 'Transactional'
            }
          }
        };
        
        await snsClient.send(new PublishCommand(params));
        return true;
        */

        // Option 4: Using Fast2SMS (India)
        // Uncomment and configure when you have Fast2SMS credentials
        /*
        const apiKey = process.env.FAST2SMS_API_KEY;
        
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            sender_id: process.env.FAST2SMS_SENDER_ID,
            message: `Your AquaGem OTP is ${otp}. Valid for 10 minutes.`,
            variables_values: otp,
            flash: 0,
            numbers: mobile
          })
        });
        
        const data = await response.json();
        return data.return === true;
        */

        // For development: Log SMS instead of sending
        if (process.env.NODE_ENV === 'development') {
            console.log('📨 [SMS OTP Simulation]');
            console.log(`   To: +${formattedMobile}`);
            console.log(`   OTP: ${otp}`);
            console.log(`   Message: Your AquaGem OTP is: ${otp}. Valid for 10 minutes.`);
            return true;
        }

        // In production, throw error if no service is configured
        throw new Error('SMS OTP service not configured. Please set up Twilio, MSG91, AWS SNS, or Fast2SMS.');

    } catch (error) {
        console.error('SMS OTP sending failed:', error);
        throw error;
    }
}

/**
 * Send OTP via both SMS and WhatsApp
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - OTP code
 * @param {object} whatsappModule - WhatsApp module
 * @returns {Promise<object>} - Status of both channels
 */
export async function sendOTPBothChannels(mobile, otp, whatsappModule) {
    const results = {
        sms: { success: false, error: null },
        whatsapp: { success: false, error: null }
    };

    // Send SMS
    try {
        await sendSMSOTP(mobile, otp);
        results.sms.success = true;
    } catch (error) {
        results.sms.error = error.message;
    }

    // Send WhatsApp
    try {
        await whatsappModule.sendWhatsAppOTP(mobile, otp);
        results.whatsapp.success = true;
    } catch (error) {
        results.whatsapp.error = error.message;
    }

    return results;
}
