import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from './Src/config/passport-google.js';
import session from 'express-session';

// Import controllers - SỬA TẠI ĐÂY
import LoginController from './Src/controller/AuthenticationController/LoginController.js';
import RegisterController from './Src/controller/AuthenticationController/RegisterController.js';
import LogoutController from './Src/controller/AuthenticationController/LogoutController.js';
import GoogleAuthController from './Src/controller/AuthenticationController/GoogleAuthController.js';
import ForgotPasswordController from './Src/controller/AuthenticationController/ForgotPasswordController.js'; // Add this
import UserProfileController from './Src/controller/UserManagerController/UserProfileController.js';
import ContactUsController from './Src/controller/UserManagerController/ContactUsController.js';
import PaymentController from './Src/controller/BookingController/PaymentController.js';
import RoomController from './Src/controller/BookingController/RoomController.js';
import promotionRoutes from './Src/services/promotionRoutes.js';
// Import RoomType controller
import roomTypeRoutes from './Src/controller/RoomTypeController.js';
import chatBotRoutes from './Src/controller/ChatBotController.js';
import SessionController from './Src/controller/AuthenticationController/SessionController.js'; // Add this

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Accept',
        'Origin',
        'X-Requested-With'
    ],
    optionsSuccessStatus: 200
}));

// Session middleware for passport
app.use(session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// API routes - SỬA TẠI ĐÂY
app.use('/api', LoginController);          // Sử dụng chữ hoa
app.use('/api', RegisterController);       // Sử dụng chữ hoa
app.use('/api', LogoutController);         // Sử dụng chữ hoa
app.use('/api/auth', GoogleAuthController);
app.use('/api', ForgotPasswordController); // Add forgot password routes
app.use('/api/profile', UserProfileController);
app.use('/api/contact', ContactUsController);
app.use('/api/payment', PaymentController);
app.use('/api', RoomController);
app.use('/api/promotions', promotionRoutes);
// Register routes
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/chatbot', chatBotRoutes); // ✅ THÊM CHATBOT ROUTES
app.use('/api', SessionController); // Add this route

// Health check endpoint - CẬP NHẬT
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            email: process.env.EMAIL_USER ? 'Configured' : 'Not configured',
            sms: process.env.NEXMO_API_KEY ? 'Nexmo Configured' : 'Not configured' // THAY ĐỔI
        }
    });
});

// Basic health check
app.get('/', (req, res) => {
    res.json({ 
        message: 'Hotel Management API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            authentication: {
                login: 'POST /api/login',
                register: 'POST /api/register',
                logout: 'POST /api/logout',
                googleAuth: 'GET /api/auth/google',
                forgotPassword: 'POST /api/forgot-password/request-otp'
            },
            payment: 'GET /api/payment/*',
            profile: 'GET /api/profile/*'
        }
    });
});

// Test endpoints
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`,
        availableRoutes: [
            'POST /api/login',
            'POST /api/register',
            'POST /api/logout',
            'GET /api/auth/google',
            'POST /api/forgot-password/request-otp',
            'POST /api/forgot-password/verify-otp',
            'POST /api/forgot-password/reset-password',
            'POST /api/payment/vietqr/generate'
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
});

// Start server - CẬP NHẬT LOG
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
    console.log(`📱 SMS service: ${process.env.NEXMO_API_KEY ? 'Nexmo Configured' : 'Not configured'}`); // THAY ĐỔI
    console.log(`🔗 Available endpoints:`);
    console.log(`   POST /api/login`);
    console.log(`   POST /api/register`);
    console.log(`   POST /api/forgot-password/request-otp`);
    console.log(`   POST /api/forgot-password/verify-otp`);
    console.log(`   POST /api/forgot-password/reset-password`);
    console.log(`   POST /api/payment/vietqr/generate`);
    console.log(`   GET  /forgot-password (Frontend)`);
});

// Global error handlers
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    setTimeout(() => process.exit(1), 1000);
});
app.use((req, res, next) => {
    const availableRoutes = [
        "POST /api/login",
        "POST /api/register", 
        "POST /api/logout",
        "GET /api/auth/google",
        "POST /api/forgot-password/request-otp",
        "POST /api/forgot-password/verify-otp",
        "POST /api/forgot-password/reset-password",
        "POST /api/payment/vietqr/generate",
        // ✅ ADD CHATBOT ROUTES TO ERROR MESSAGE
        "GET /api/chatbot/health",
        "GET /api/chatbot/model-info",
        "POST /api/chatbot/chat",
        "POST /api/chatbot/prompt",
        "GET /api/chatbot/prompt-examples",
        "GET /api/chatbot/weather-info",
        "GET /api/chatbot/local-attractions",
        "POST /api/chatbot/refresh-cache",
        "GET /api/chatbot/cache-status"
    ];

    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        availableRoutes: availableRoutes
    });
});
// ✅ GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
    console.error('❌ Global Error:', error);
    
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});



export default app;