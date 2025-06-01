import express from 'express';
import BaseAuthenticationController from './BaseAuthenticationController.js';

class LogoutController extends BaseAuthenticationController {
    initializeRoutes() {
        this.router.post('/logout', this.logout.bind(this));
    }

    logout(req, res) {
        try {
            // Clear the JWT cookie
            res.clearCookie('token');
            
            res.json({
                success: true,
                message: 'Đăng xuất thành công'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi đăng xuất'
            });
        }
    }
}

export default new LogoutController().getRouter();