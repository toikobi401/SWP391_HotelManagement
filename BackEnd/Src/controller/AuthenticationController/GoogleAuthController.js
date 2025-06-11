import express from 'express';
import passport from '../../config/passport-google.js'; // Fix import path
import jwt from 'jsonwebtoken';

const router = express.Router();

router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        try {
            const user = req.user;
            const token = jwt.sign(
                { 
                    userId: user.UserID, 
                    username: user.Username,
                    email: user.Email,
                    fullname: user.Fullname,
                    // Add all necessary user data here
                    phoneNumber: user.PhoneNumber || ''
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000
            });

            // Redirect to frontend with success
            res.redirect('http://localhost:3001/login-success');
        } catch (error) {
            console.error('Google auth callback error:', error);
            res.redirect('http://localhost:3001/login-error');
        }
    }
);

export default router;