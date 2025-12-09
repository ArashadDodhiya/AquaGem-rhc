/**
 * WhatsApp OTP Utility
 * Uses WhatsApp Business API or third-party services like Twilio, MSG91, etc.
 */

/**
 * Send OTP via WhatsApp
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - OTP code
 * @returns {Promise<boolean>} - Success status
 */
export async function sendWhatsAppOTP(mobile, otp) {
    try {
        // Format mobile number with country code (assuming India +91)
        const formattedMobile = `91${mobile}`;

        // Option 1: Using Twilio WhatsApp API
        // Uncomment and configure when you have Twilio credentials
        /*
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'
        
        const client = require('twilio')(accountSid, authToken);
        
        await client.messages.create({
          from: twilioWhatsAppNumber,
          to: `whatsapp:+${formattedMobile}`,
          body: `Your AquaGem OTP is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`
        });
        */

        // Option 2: Using MSG91 WhatsApp API
        // Uncomment and configure when you have MSG91 credentials
        /*
        const authKey = process.env.MSG91_AUTH_KEY;
        const templateId = process.env.MSG91_WHATSAPP_TEMPLATE_ID;
        
        const response = await fetch('https://api.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'authkey': authKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            flow_id: templateId,
            sender: process.env.MSG91_SENDER_ID,
            mobiles: formattedMobile,
            otp: otp
          })
        });
        
        const data = await response.json();
        return data.type === 'success';
        */

        // Option 3: Using WhatsApp Business API (Meta)
        // Uncomment and configure when you have Meta Business credentials
        /*
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedMobile,
              type: 'template',
              template: {
                name: 'otp_template', // Your approved template name
                language: { code: 'en' },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: otp }
                    ]
                  }
                ]
              }
            })
          }
        );
        
        const data = await response.json();
        return data.messages && data.messages.length > 0;
        */

        // For development: Log OTP instead of sending
        if (process.env.NODE_ENV === 'development') {
            console.log('📱 [WhatsApp OTP Simulation]');
            console.log(`   To: +${formattedMobile}`);
            console.log(`   OTP: ${otp}`);
            console.log(`   Message: Your AquaGem OTP is: ${otp}. Valid for 10 minutes.`);
            return true;
        }

        // In production, throw error if no service is configured
        throw new Error('WhatsApp OTP service not configured. Please set up Twilio, MSG91, or WhatsApp Business API.');

    } catch (error) {
        console.error('WhatsApp OTP sending failed:', error);
        throw error;
    }
}

/**
 * Validate mobile number format
 * @param {string} mobile - Mobile number
 * @returns {boolean} - Is valid
 */
export function isValidMobile(mobile) {
    return /^[0-9]{10}$/.test(mobile);
}
