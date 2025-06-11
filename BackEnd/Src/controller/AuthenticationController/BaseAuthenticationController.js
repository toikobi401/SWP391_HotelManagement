import express from 'express';
import jwt from 'jsonwebtoken';

class BaseAuthenticationController {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    // Helper method to get authenticated user from JWT token
    getAuthenticatedUser(req) {
        try {
            const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
            if (!token) return null;
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            return decoded.user;
        } catch (error) {
            return null;
        }
    }

    // Authentication middleware
    authenticate(req, res, next) {
        const user = this.getAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }
        req.user = user;
        next();
    }

    // Method to check user role
    hasRole(allowedRoles) {
        return (req, res, next) => {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }

            if (!allowedRoles.includes(user.RoleID)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied' 
                });
            }
            next();
        };
    }

    // Initialize routes - to be implemented by child classes
    initializeRoutes() {
        // This method should be overridden by child classes
    }

    // Protected GET request handler
    async handleProtectedGet(req, res, handler) {
        try {
            await handler(req, res, req.user);
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Protected POST request handler
    async handleProtectedPost(req, res, handler) {
        try {
            await handler(req, res, req.user);
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

 

    // Get the router instance
    getRouter() {
        return this.router;
    }
}

export default BaseAuthenticationController;
