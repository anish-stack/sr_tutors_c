class OtpService {
    constructor() {
        this.otp = null;
        this.expiryTime = null;
    }

    generateOtp() {
        this.otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.expiryTime = Date.now() + 2 * 60 * 1000; 
        return { otp: this.otp, expiryTime: this.expiryTime }; 
    }

    validateOtp(inputOtp) {
        if (Date.now() > this.expiryTime) {
            return { valid: false, message: 'OTP has expired' };
        }
        if (inputOtp === this.otp) {
            return { valid: true, message: 'OTP is valid' };
        }
        return { valid: false, message: 'Invalid OTP' };
    }
}

module.exports = OtpService;
