// Tạo file: BackEnd/Src/services/OTPService.js
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Vonage } from '@vonage/server-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OTPService {
    constructor() {
        // Email transporter
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
                this.emailTransporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });
                console.log('✅ Email transporter initialized');
            } else {
                console.log('⚠️ Email credentials not found, email OTP disabled');
                this.emailTransporter = null;
            }
        } catch (error) {
            console.error('❌ Email transporter initialization failed:', error);
            this.emailTransporter = null;
        }

        // Nexmo (Vonage) client for SMS
        try {
            if (process.env.NEXMO_API_KEY && process.env.NEXMO_API_SECRET) {
                this.vonageClient = new Vonage({
                    apiKey: process.env.NEXMO_API_KEY,
                    apiSecret: process.env.NEXMO_API_SECRET
                });
                console.log('✅ Nexmo SMS client initialized');
            } else {
                console.log('⚠️ Nexmo SMS credentials not found');
                this.vonageClient = null;
            }
        } catch (error) {
            console.error('❌ Nexmo SMS client initialization failed:', error);
            this.vonageClient = null;
        }

        // 🔧 TẠM THỜI VÔ HIỆU HÓA VOICE CLIENT
        console.log('⚠️ Voice calling feature temporarily disabled');
        this.vonageVoiceClient = null;

        // In-memory store for OTPs
        this.otpStore = new Map();

        // Clean expired OTPs every 5 minutes
        setInterval(() => {
            this.cleanExpiredOTPs();
        }, 5 * 60 * 1000);
    }

    // Generate 6-digit OTP
    generateOTP() {
        return crypto.randomInt(100000, 999999).toString();
    }

    // Store OTP with expiration
    storeOTP(identifier, otp, method) {
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
        this.otpStore.set(identifier, {
            otp,
            method,
            expiresAt,
            attempts: 0,
            maxAttempts: 3
        });
        
        console.log(`✅ OTP stored for ${identifier}: ${otp} (expires in 5 minutes)`);
    }

    // Verify OTP
    verifyOTP(identifier, inputOTP) {
        const stored = this.otpStore.get(identifier);
        
        if (!stored) {
            return {
                success: false,
                error: 'OTP not found or expired'
            };
        }

        if (Date.now() > stored.expiresAt) {
            this.otpStore.delete(identifier);
            return {
                success: false,
                error: 'OTP has expired'
            };
        }

        if (stored.attempts >= stored.maxAttempts) {
            this.otpStore.delete(identifier);
            return {
                success: false,
                error: 'Too many attempts. Please request a new OTP'
            };
        }

        stored.attempts++;

        if (stored.otp === inputOTP) {
            this.otpStore.delete(identifier);
            return {
                success: true,
                message: 'OTP verified successfully'
            };
        } else {
            return {
                success: false,
                error: `Invalid OTP. ${stored.maxAttempts - stored.attempts} attempts remaining`
            };
        }
    }

    // Send OTP via Email
    async sendOTPEmail(email, fullname, otp) {
        try {
            if (!this.emailTransporter) {
                console.log('⚠️ Email not configured, simulating email send...');
                console.log(`📧 SIMULATED EMAIL TO: ${email}`);
                console.log(`👤 NAME: ${fullname}`);
                console.log(`🔢 OTP: ${otp}`);
                
                return {
                    success: true,
                    message: 'OTP email simulated successfully (check console)',
                    simulated: true
                };
            }

            const mailOptions = {
                from: `"Hotel HUB" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Mã OTP khôi phục mật khẩu - Hotel HUB',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 28px;">Hotel HUB</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px;">Khôi phục mật khẩu</p>
                        </div>
                        
                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                            <h2 style="color: #333; margin-top: 0;">Xin chào ${fullname}!</h2>
                            
                            <p style="color: #666; line-height: 1.6;">
                                Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản Hotel HUB của mình. 
                                Vui lòng sử dụng mã OTP bên dưới để tiếp tục:
                            </p>
                            
                            <div style="background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${otp}</div>
                                <p style="margin: 10px 0 0 0; color: #888; font-size: 14px;">Mã OTP có hiệu lực trong 5 phút</p>
                            </div>
                        </div>
                    </div>
                `
            };

            const result = await this.emailTransporter.sendMail(mailOptions);
            console.log('✅ OTP email sent successfully:', result.messageId);
            
            return {
                success: true,
                message: 'OTP sent to email successfully',
                messageId: result.messageId
            };
        } catch (error) {
            console.error('❌ Error sending OTP email:', error);
            
            console.log('📧 FALLBACK - SIMULATED EMAIL TO:', email);
            console.log('🔢 OTP:', otp);
            
            return {
                success: true,
                message: 'OTP email simulated (real email failed)',
                simulated: true,
                error: error.message
            };
        }
    }

    // Send OTP via SMS
    async sendOTPSMS(phoneNumber, fullname, otp) {
        try {
            console.log(`📱 Attempting to send SMS to: ${phoneNumber}`);
            
            if (!this.vonageClient) {
                console.log('⚠️ Nexmo SMS not configured, simulating SMS send...');
                console.log(`📱 SIMULATED SMS TO: ${phoneNumber}`);
                console.log(`🔢 OTP: ${otp}`);
                
                return {
                    success: true,
                    message: 'OTP SMS simulated successfully (check console)',
                    simulated: true
                };
            }

            // Format phone number
            let formattedPhone = phoneNumber.trim();
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '84' + formattedPhone.slice(1);
            } else if (!formattedPhone.startsWith('84')) {
                formattedPhone = '84' + formattedPhone;
            }

            const message = `Hotel HUB: Ma OTP khoi phuc mat khau cua ban la: ${otp}. Ma co hieu luc trong 5 phut. Khong chia se ma nay voi bat ky ai.`;

            console.log(`📤 Sending SMS via Nexmo to: ${formattedPhone}`);

            const result = await this.vonageClient.sms.send({
                to: formattedPhone,
                from: process.env.NEXMO_FROM_NUMBER || 'Hotel HUB',
                text: message
            });

            console.log('✅ OTP SMS sent successfully via Nexmo:', result);

            if (result.messages && result.messages[0].status === '0') {
                return {
                    success: true,
                    message: 'OTP sent to phone successfully via SMS',
                    messageId: result.messages[0]['message-id'],
                    provider: 'Nexmo SMS'
                };
            } else {
                const error = result.messages[0]['error-text'] || 'Unknown error';
                throw new Error(`Nexmo SMS failed: ${error}`);
            }

        } catch (error) {
            console.error('❌ Error sending OTP SMS via Nexmo:', error);
            
            console.log('📱 FALLBACK - SIMULATED SMS TO:', phoneNumber);
            console.log('🔢 OTP:', otp);
            
            return {
                success: true,
                message: 'OTP SMS simulated (Nexmo SMS failed)',
                simulated: true,
                error: error.message,
                provider: 'Nexmo SMS'
            };
        }
    }

    // Send OTP via Voice Call
    async sendOTPVoiceCall(phoneNumber, fullname, otp) {
        console.log('⚠️ Voice calling feature is temporarily disabled');
        console.log(`📞 SIMULATED VOICE CALL TO: ${phoneNumber}`);
        console.log(`👤 NAME: ${fullname}`);
        console.log(`🔢 OTP: ${otp}`);
        console.log(`🎵 Voice message: Xin chào ${fullname}, mã OTP của bạn là ${otp.split('').join(' ')}`);
        
        return {
            success: true,
            message: 'Voice calling feature is temporarily disabled - OTP simulated',
            simulated: true,
            provider: 'Disabled'
        };
    }

    // Clean expired OTPs
    cleanExpiredOTPs() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, value] of this.otpStore.entries()) {
            if (now > value.expiresAt) {
                this.otpStore.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned ${cleanedCount} expired OTPs`);
        }
    }

    // Get service status
    getServiceStatus() {
        return {
            email: {
                configured: !!this.emailTransporter,
                service: 'Gmail'
            },
            sms: {
                configured: !!this.vonageClient,
                service: 'Nexmo SMS (Vonage)'
            },
            voice: {
                configured: false, // Tạm thời false
                service: 'Temporarily Disabled',
                note: 'Voice calling feature is temporarily unavailable'
            }
        };
    }
}

export default OTPService;