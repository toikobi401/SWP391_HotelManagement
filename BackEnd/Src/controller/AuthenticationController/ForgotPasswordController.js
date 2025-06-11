// Tạo file: BackEnd/Src/controller/AuthenticationController/ForgotPasswordController.js
import express from 'express';
import UserDBContext from '../../dal/UserDBContext.js';
import OTPService from '../../services/OTPService.js';
import crypto from 'crypto';

const router = express.Router();
const userDB = new UserDBContext();
const otpService = new OTPService();

// Request OTP for password reset
router.post('/forgot-password/request-otp', async (req, res) => {
    try {
        const { identifier, method } = req.body;
        
        console.log('OTP request received:', { identifier, method });

        // Validate input
        if (!identifier || !method) {
            return res.status(400).json({
                success: false,
                error: 'Identifier and method are required'
            });
        }

        // 🔧 TẠM THỜI VÔ HIỆU HÓA VOICE
        if (!['email', 'sms'].includes(method)) {
            return res.status(400).json({
                success: false,
                error: 'Method must be "email" or "sms" (voice temporarily disabled)',
                availableMethods: ['email', 'sms'],
                note: 'Voice calling feature is temporarily unavailable'
            });
        }

        // Find user by email or phone
        let user = null;
        if (method === 'email') {
            user = await userDB.getUserByEmail(identifier);
        } else if (method === 'sms') { // Chỉ còn SMS, bỏ voice
            user = await userDB.getUserByPhone(identifier);
        }

        if (!user) {
            const errorMessage = method === 'email' 
                ? 'Email không tồn tại trong hệ thống' 
                : 'Số điện thoại không tồn tại trong hệ thống';
            return res.status(404).json({
                success: false,
                error: errorMessage
            });
        }

        console.log('User found:', {
            UserID: user.UserID,
            Username: user.Username,
            Email: user.Email,
            PhoneNumber: user.PhoneNumber,
            Method: method
        });

        // Check if user account is active
        if (!user.Status) {
            return res.status(403).json({
                success: false,
                error: 'Tài khoản đã bị vô hiệu hóa'
            });
        }

        // Generate and store OTP
        const otp = otpService.generateOTP();
        otpService.storeOTP(identifier, otp, method);

        // Send OTP based on method - CHỈ EMAIL VÀ SMS
        let sendResult;
        if (method === 'email') {
            sendResult = await otpService.sendOTPEmail(user.Email, user.Fullname, otp);
        } else if (method === 'sms') {
            sendResult = await otpService.sendOTPSMS(user.PhoneNumber, user.Fullname, otp);
        }

        if (sendResult.success) {
            const methodNames = {
                email: 'email',
                sms: 'tin nhắn SMS'
            };

            const maskedIdentifier = method === 'email' 
                ? user.Email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
                : user.PhoneNumber.replace(/(\d{3})(\d{4})(\d{3})/, '$1****$3');

            res.json({
                success: true,
                message: `OTP đã được gửi qua ${methodNames[method]} đến ${maskedIdentifier}`,
                method: method,
                identifier: maskedIdentifier,
                expiresIn: 300, // 5 minutes in seconds
                simulated: sendResult.simulated || false,
                note: 'Voice calling feature is temporarily disabled'
            });
        } else {
            res.status(500).json({
                success: false,
                error: sendResult.error
            });
        }

    } catch (error) {
        console.error('Request OTP error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

// Test voice connection endpoint
router.get('/forgot-password/test-voice', async (req, res) => {
    try {
        const voiceTest = await otpService.testVoiceConnection();
        const serviceStatus = otpService.getServiceStatus();
        
        res.json({
            success: true,
            voiceTest: voiceTest,
            serviceStatus: serviceStatus,
            config: {
                applicationId: process.env.NEXMO_APPLICATION_ID,
                hasPrivateKey: !!process.env.NEXMO_PRIVATE_KEY_PATH,
                voiceNumber: process.env.NEXMO_VOICE_NUMBER
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Verify OTP (không thay đổi)
router.post('/forgot-password/verify-otp', async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        
        console.log('OTP verification request:', { identifier, otp });

        if (!identifier || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Identifier and OTP are required'
            });
        }

        const verifyResult = otpService.verifyOTP(identifier, otp);
        
        if (verifyResult.success) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            otpService.storeOTP(`reset_${identifier}`, resetToken, 'reset');
            
            res.json({
                success: true,
                message: 'OTP verified successfully',
                resetToken: resetToken,
                expiresIn: 900
            });
        } else {
            res.status(400).json({
                success: false,
                error: verifyResult.error
            });
        }

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

// Reset password - LOẠI BỎ VALIDATION
router.post('/forgot-password/reset-password', async (req, res) => {
    try {
        const { identifier, resetToken, newPassword, confirmPassword } = req.body;
        
        console.log('Password reset request:', { identifier, resetToken });

        if (!identifier || !resetToken || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match'
            });
        }

        // 🔧 LOẠI BỎ VALIDATION CHIỀU DÀI MẬT KHẨU
        // if (newPassword.length < 6) {
        //     return res.status(400).json({
        //         success: false,
        //         error: 'Password must be at least 6 characters long'
        //     });
        // }

        const verifyResult = otpService.verifyOTP(`reset_${identifier}`, resetToken);
        
        if (!verifyResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        let user = await userDB.getUserByEmail(identifier);
        if (!user) {
            user = await userDB.getUserByPhone(identifier);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const updateResult = await userDB.update(user.UserID, {
            Username: user.Username,
            Fullname: user.Fullname,
            Email: user.Email,
            PhoneNumber: user.PhoneNumber?.trim(),
            Status: user.Status,
            Password: newPassword // CHẤP NHẬN BẤT KỲ MẬT KHẨU NÀO
        });

        if (updateResult) {
            res.json({
                success: true,
                message: 'Password reset successfully',
                debug: {
                    userId: updateResult.UserID,
                    username: updateResult.Username,
                    passwordChanged: true
                }
            });
        } else {
            throw new Error('Failed to update password');
        }

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

export default router;