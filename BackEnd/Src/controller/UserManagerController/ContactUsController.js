import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

router.post('/send-email', async (req, res) => {
    console.log('Received contact form data:', req.body);
    
    try {
        const { name, email, message } = req.body;

        // Validate input
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }

        // Send email
        await transporter.sendMail({
            from: `"${name}" <${email}>`,
            to: process.env.EMAIL_USER,
            subject: `Liên hệ mới từ ${name}`,
            html: `
                <h3>Thông tin liên hệ mới:</h3>
                <p><strong>Họ và tên:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Nội dung:</strong></p>
                <p>${message}</p>
            `
        });

        res.json({
            success: true,
            message: 'Email đã được gửi thành công!'
        });
    } catch (error) {
        console.error('Error in contact form:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi gửi email',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;