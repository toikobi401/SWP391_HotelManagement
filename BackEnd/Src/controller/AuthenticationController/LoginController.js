import express from 'express';
import jwt from 'jsonwebtoken';
import UserDBContext from '../../dal/UserDBContext.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập và mật khẩu không được để trống'
            });
        }

        // Get user with roles
        const userDB = new UserDBContext();
        const user = await userDB.getUserByUsernameAndPassword(username, password);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        if (!user.Status) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        // ✅ LẤY USER VỚI ROLES
        const userWithRoles = await userDB.getUserWithRoles(user.UserID);
        
        if (!userWithRoles) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin user'
            });
        }

        // ✅ SAVE SESSION VỚI ENHANCED DATA
        req.session.user = {
            UserID: userWithRoles.UserID,
            Username: userWithRoles.Username,
            Email: userWithRoles.Email,
            Fullname: userWithRoles.Fullname,
            PhoneNumber: userWithRoles.PhoneNumber,
            Status: userWithRoles.Status,
            roles: userWithRoles.roles,
            loginTime: new Date(),
            lastActivity: new Date()
        };

        // ✅ THÊM: Save session explicitly để đảm bảo persistence
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error saving session after login:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Đăng nhập thành công nhưng lỗi lưu session'
                });
            }

            console.log('✅ Login successful with session saved:', {
                UserID: userWithRoles.UserID,
                Username: userWithRoles.Username,
                rolesCount: userWithRoles.roles?.length || 0,
                sessionID: req.sessionID
            });

            res.json({
                success: true,
                message: 'Đăng nhập thành công',
                user: userWithRoles.toJSON(),
                sessionInfo: {
                    loginTime: req.session.user.loginTime,
                    lastActivity: req.session.user.lastActivity,
                    sessionID: req.sessionID
                }
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập'
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
                username: decoded.username,
                email: decoded.email,        // Add email
                fullname: decoded.fullname,  // Add fullname
                phoneNumber: decoded.phoneNumber // Add phone number
            }
        });
    } catch (err) {
        res.json({ authenticated: false });
    }
});

export default router;
