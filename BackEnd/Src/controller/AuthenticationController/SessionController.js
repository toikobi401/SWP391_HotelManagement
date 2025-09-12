import express from 'express';
import UserDBContext from '../../dal/UserDBContext.js';

const router = express.Router();
const userDB = new UserDBContext();

// Verify session endpoint
router.get('/verify-session', async (req, res) => {
    try {
        // ✅ THÊM: Enhanced session checking
        const userId = req.session?.user?.UserID;
        
        if (!userId) {
            console.log('❌ No session found for verification');
            return res.status(401).json({
                success: false,
                message: 'No active session'
            });
        }

        console.log('🔍 Verifying session for user:', userId);

        // Get fresh user data from database
        const user = await userDB.getUserWithRoles(userId);
        
        if (!user) {
            console.log('❌ User not found in database:', userId);
            // ✅ THÊM: Clear session khi user không tồn tại
            req.session.destroy();
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is still active
        if (!user.Status) {
            console.log('❌ User account is disabled:', userId);
            // ✅ THÊM: Clear session khi user bị disable
            req.session.destroy();
            return res.status(401).json({
                success: false,
                message: 'User account is disabled'
            });
        }

        // ✅ THÊM: Update session với rolling expiration
        req.session.user = {
            UserID: user.UserID,
            Username: user.Username,
            Email: user.Email,
            Fullname: user.Fullname,
            PhoneNumber: user.PhoneNumber,
            Status: user.Status,
            roles: user.roles,
            lastActivity: new Date()
        };

        // ✅ THÊM: Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error saving session:', err);
            } else {
                console.log('✅ Session saved and refreshed');
            }
        });

        console.log('✅ Session verified successfully with roles:', {
            UserID: user.UserID,
            Username: user.Username,
            rolesCount: user.roles?.length || 0
        });

        res.json({
            success: true,
            user: user.toJSON(),
            message: 'Session valid',
            sessionInfo: {
                lastActivity: req.session.user.lastActivity,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });

    } catch (error) {
        console.error('❌ Session verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during session verification'
        });
    }
});

// ✅ THÊM: Session refresh endpoint
router.post('/refresh-session', async (req, res) => {
    try {
        const userId = req.session?.user?.UserID;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No active session to refresh'
            });
        }

        // ✅ Update session activity
        req.session.user.lastActivity = new Date();
        
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error refreshing session:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to refresh session'
                });
            }

            console.log('✅ Session refreshed for user:', userId);
            res.json({
                success: true,
                message: 'Session refreshed successfully',
                lastActivity: req.session.user.lastActivity
            });
        });

    } catch (error) {
        console.error('❌ Session refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during session refresh'
        });
    }
});

export default router;