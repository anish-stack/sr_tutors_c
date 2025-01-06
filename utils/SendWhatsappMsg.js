const axios = require('axios');
require('dotenv').config();

const SendWhatsAppMessage = async (Message, MobileNumber) => {
    try {
        if (!Message || !MobileNumber) {
            return {
                success: false,
                message: 'Please provide details for sending a message on WhatsApp.',
            };
        }

        const ValidateNumber = /^(?:\+91|91)?[6-9]\d{9}$/;
        if (!ValidateNumber.test(MobileNumber)) {
            return {
                success: false,
                message: `Invalid mobile number. Please provide a valid mobile number: ${MobileNumber}`,
            };
        }

        if (!process.env.WHATSAPP_API_KEY) {
            return {
                success: false,
                message: 'WhatsApp API key is missing.',
            };
        }

        const response = await axios.get('https://api.wtap.sms4power.com/wapp/v2/api/send', {
            params: {
                apikey: process.env.WHATSAPP_API_KEY,
                mobile: MobileNumber,
                msg: Message,
            },
        });

        if (response.status === 200) {
            return {
                success: true,
                message: 'WhatsApp message sent successfully!',
            };
        } else {
            return {
                success: false,
                message: 'Failed to send WhatsApp message.',
            };
        }
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.message || error);
        return {
            success: false,
            message: 'An error occurred while sending the WhatsApp message.',
        };
    }
};

module.exports = SendWhatsAppMessage;
