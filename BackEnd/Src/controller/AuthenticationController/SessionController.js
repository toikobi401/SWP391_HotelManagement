import express from 'express';
import UserDBContext from '../../dal/UserDBContext.js';

const router = express.Router();
const userDB = new UserDBContext();

// Verify session endpoint
router.get('/verify-session', async (req, res) => {
    try {
        // Check if user session exists
        const userId = req.session?.user?.UserID;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No active session'
            });
        }

        // Get fresh user data from database
        const user = await userDB.getUserWithRoles(userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is still active
        if (!user.Status) {
            return res.status(401).json({
                success: false,
                message: 'User account is disabled'
            });
        }

        // Update session with latest roles
        req.session.user = {
            UserID: user.UserID,
            Username: user.Username,
            Email: user.Email,
            Fullname: user.Fullname,
            PhoneNumber: user.PhoneNumber,
            Status: user.Status,
            roles: user.roles
        };

        console.log('Session verified with roles:', {
            UserID: user.UserID,
            Username: user.Username,
            rolesCount: user.roles?.length || 0,
            roles: user.roles
        });

        res.json({
            success: true,
            user: user.toJSON(), // Return full user with roles
            message: 'Session valid'
        });

    } catch (error) {
        console.error('Session verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

export default router;