import express from 'express';
import jwt from 'jsonwebtoken';
import UserDBContext from '../../dal/UserDBContext.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });

    try {
        const userDB = new UserDBContext();
        const user = await userDB.getUserByUsernameAndPassword(username, password);

        if (user) {
            const token = jwt.sign(
                { userId: user.UserID, username: user.Username },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000
            });

            return res.json({
                success: true,
                user: {
                    id: user.UserID,
                    username: user.Username
                }
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi đăng nhập'
        });
    }
});

router.get('/check-auth', (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.json({ authenticated: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        res.json({
            authenticated: true,
            user: {
                id: decoded.userId,
                username: decoded.username
            }
        });
    } catch (err) {
        res.json({ authenticated: false });
    }
});

export default router;
