import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from './Src/config/passport-google.js';
import session from 'express-session';

// Import controllers
import LoginController from './Src/controller/AuthenticationController/LoginController.js';
import RegisterController from './Src/controller/AuthenticationController/RegisterController.js';
import LogoutController from './Src/controller/AuthenticationController/LogoutController.js';
import GoogleAuthController from './Src/controller/AuthenticationController/GoogleAuthController.js';
import ForgotPasswordController from './Src/controller/AuthenticationController/ForgotPasswordController.js'; 
import UserProfileController from './Src/controller/UserManagerController/UserProfileController.js';
import ContactUsController from './Src/controller/UserManagerController/ContactUsController.js';
import PaymentController from './Src/controller/BookingController/PaymentController.js';
import PaymentRefundController from './Src/controller/PaymentRefundController.js';
import roomController from './Src/controller/BookingController/RoomController.js';
import roomTypeController from './Src/controller/RoomTypeController.js';
import guestController from './Src/controller/GuestController.js';
import promotionController from './Src/controller/PromotionController.js';
import bookingController from './Src/controller/BookingController/BookingController.js';
import bookingCancelController from './Src/controller/BookingCancelController.js';
import chatBotRoutes from './Src/controller/ChatBotController.js';
import SessionController from './Src/controller/AuthenticationController/SessionController.js'; 
import serviceRoutes from './Src/controller/ServiceController.js';
import invoiceController from './Src/controller/InvoiceController.js';
import invoiceItemController from './Src/controller/InvoiceItemController.js';
import blogRoutes from './Src/controller/BlogController.js';
import UserController from './Src/controller/UserController.js';
import revenueReportController from './Src/controller/RevenueReportController.js';

// ✅ SỬA: Import feedback routes với kiểm tra lỗi
let feedbackRoutes;
try {
    feedbackRoutes = (await import('./Src/controller/FeedbackController.js')).default;
    console.log('✅ FeedbackController loaded successfully');
} catch (error) {
    console.error('❌ Error loading FeedbackController:', error);
    // Create fallback route
    feedbackRoutes = express.Router();
    feedbackRoutes.all('*', (req, res) => {
        res.status(500).json({
            success: false,
            message: 'FeedbackController not available due to initialization error',
            error: error.message
        });
    });
}

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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Accept',
        'Origin',
        'X-Requested-With',
        'Cookie'
    ],
    optionsSuccessStatus: 200
}));

// Session middleware for passport
app.use(session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    name: 'connect.sid'
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ SỬA: Enhanced debug middleware cho feedback routes
app.use('/api/feedbacks', (req, res, next) => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 [APP] Feedback API Request Intercepted');
  console.log('🕐 [APP] Timestamp:', new Date().toISOString());
  console.log('🌐 [APP] Method:', req.method);
  console.log('📍 [APP] Full URL:', req.url);
  console.log('📍 [APP] Path:', req.path);
  console.log('📝 [APP] Query params:', req.query);
  console.log('🏷️ [APP] Headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent'],
    'origin': req.headers['origin'],
    'cookie': req.headers['cookie'] ? '***EXISTS***' : 'none'
  });
  
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('📦 [APP] Body:', req.body);
  }
  
  console.log('='.repeat(60) + '\n');
  next();
});

// API routes - ✅ THÊM feedbackRoutes VÀO TRƯỚC chatbot routes
app.use('/api', LoginController);         
app.use('/api', RegisterController);       
app.use('/api', LogoutController);         
app.use('/api/auth', GoogleAuthController);
app.use('/api', ForgotPasswordController); 
app.use('/api/profile', UserProfileController);
app.use('/api/contact', ContactUsController);
app.use('/api/payment', PaymentController);
app.use('/api/refunds', PaymentRefundController);
app.use('/api/rooms', roomController);
app.use('/api/room-types', roomTypeController);
app.use('/api/guests', guestController);
app.use('/api/promotions', promotionController);
app.use('/api/bookings', bookingController);
app.use('/api/booking-cancels', bookingCancelController);
app.use('/api/feedbacks', feedbackRoutes); // ✅ QUAN TRỌNG: Phải có dòng này
app.use('/api/chatbot', chatBotRoutes);
app.use('/api/services', serviceRoutes); 
app.use('/api', SessionController);
app.use('/api/invoices', invoiceController);
app.use('/api/invoice-items', invoiceItemController);
app.use('/api/users', UserController);
app.use('/api/blogs', blogRoutes);
app.use('/api/revenue-report/', revenueReportController);


// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            email: process.env.EMAIL_USER ? 'Configured' : 'Not configured',
            sms: process.env.NEXMO_API_KEY ? 'Nexmo Configured' : 'Not configured' 
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
            management: {
                rooms: 'GET /api/rooms',
                roomTypes: 'GET /api/room-types',
                bookings: 'GET /api/bookings',
                guests: 'GET /api/guests',
                promotions: 'GET /api/promotions',
                services: 'GET /api/services'
            },
            invoicing: {
                invoices: 'GET /api/invoices',
                createInvoice: 'POST /api/invoices',
                invoiceItems: 'GET /api/invoice-items',
                createInvoiceItem: 'POST /api/invoice-items',
                invoiceStatistics: 'GET /api/invoices/statistics/summary',
                itemStatistics: 'GET /api/invoice-items/statistics/summary'
            },
            blog: {
                getAllBlogs: 'GET /api/blogs',
                getPublishedBlogs: 'GET /api/blogs/published',
                getBlogById: 'GET /api/blogs/:id',
                createBlog: 'POST /api/blogs',
                updateBlog: 'PUT /api/blogs/:id',
                deleteBlog: 'DELETE /api/blogs/:id',
                updateBlogStatus: 'PATCH /api/blogs/:id/status',
                getBlogsByCategory: 'GET /api/blogs/category/:categoryId',
                getBlogsByAuthor: 'GET /api/blogs/author/:authorId',
                searchBlogs: 'GET /api/blogs/search'
            },
            // ✅ THÊM: Feedback endpoints
            feedback: {
                getAllFeedbacks: 'GET /api/feedbacks',
                getFeedbackById: 'GET /api/feedbacks/:id',
                createFeedback: 'POST /api/feedbacks',
                updateFeedback: 'PUT /api/feedbacks/:id',
                deleteFeedback: 'DELETE /api/feedbacks/:id',
                getFeedbacksByBooking: 'GET /api/feedbacks/booking/:bookingId',
                getFeedbacksByCustomer: 'GET /api/feedbacks/customer/:customerId',
                getAverageRatings: 'GET /api/feedbacks/statistics/averages'
            },
            payment: 'GET /api/payment/*',
            chatbot: {
                chat: 'POST /api/chatbot/chat',
                health: 'GET /api/chatbot/health',
                modelInfo: 'GET /api/chatbot/model-info'
            },
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

// ✅ THÊM: Test endpoint để kiểm tra feedback routes
app.get('/api/test-feedbacks', (req, res) => {
    console.log('🧪 Test feedback endpoint called');
    res.json({ 
        message: 'Feedback routes test successful',
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
            'POST /api/payment/vietqr/generate',
            // Invoice routes
            'GET /api/invoices',
            'POST /api/invoices',
            'GET /api/invoices/:id',
            'PUT /api/invoices/:id',
            'DELETE /api/invoices/:id',
            'GET /api/invoice-items',
            'POST /api/invoice-items',
            'GET /api/invoice-items/:id',
            'PUT /api/invoice-items/:id',
            'DELETE /api/invoice-items/:id',
            'GET /api/invoice-items/invoice/:invoiceId',
            'POST /api/invoice-items/bulk',
            // Blog routes
            'GET /api/blogs',
            'POST /api/blogs',
            'GET /api/blogs/published',
            'GET /api/blogs/:id',
            'PUT /api/blogs/:id',
            'DELETE /api/blogs/:id',
            'PATCH /api/blogs/:id/status',
            'GET /api/blogs/category/:categoryId',
            'GET /api/blogs/author/:authorId',
            'GET /api/blogs/search',
            // ✅ THÊM: Feedback routes
            'GET /api/feedbacks',
            'POST /api/feedbacks',
            'GET /api/feedbacks/:id',
            'PUT /api/feedbacks/:id',
            'DELETE /api/feedbacks/:id',
            'GET /api/feedbacks/booking/:bookingId',
            'GET /api/feedbacks/customer/:customerId',
            'GET /api/feedbacks/statistics/averages',
            // ChatBot routes
            'GET /api/chatbot/health',
            'GET /api/chatbot/model-info',
            'POST /api/chatbot/chat',
            'POST /api/chatbot/refresh-cache',
            'GET /api/chatbot/cache-status'
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
    console.log(`📱 SMS service: ${process.env.NEXMO_API_KEY ? 'Nexmo Configured' : 'Not configured'}`);
    console.log(`🔗 Available endpoints:`);
    console.log(`   POST /api/login`);
    console.log(`   POST /api/register`);
    console.log(`   POST /api/forgot-password/request-otp`);
    console.log(`   POST /api/forgot-password/verify-otp`);
    console.log(`   POST /api/forgot-password/reset-password`);
    console.log(`   POST /api/payment/vietqr/generate`);
    console.log(`   📄 INVOICE MANAGEMENT:`);
    console.log(`   GET  /api/invoices`);
    console.log(`   POST /api/invoices`);
    console.log(`   GET  /api/invoices/:id`);
    console.log(`   PUT  /api/invoices/:id`);
    console.log(`   DELETE /api/invoices/:id`);
    console.log(`   📝 INVOICE ITEMS:`);
    console.log(`   GET  /api/invoice-items`);
    console.log(`   POST /api/invoice-items`);
    console.log(`   GET  /api/invoice-items/:id`);
    console.log(`   PUT  /api/invoice-items/:id`);
    console.log(`   DELETE /api/invoice-items/:id`);
    console.log(`   POST /api/invoice-items/bulk`);
    console.log(`   📝 BLOG MANAGEMENT:`);
    console.log(`   GET  /api/blogs`);
    console.log(`   POST /api/blogs`);
    console.log(`   GET  /api/blogs/published`);
    console.log(`   GET  /api/blogs/:id`);
    console.log(`   PUT  /api/blogs/:id`);
    console.log(`   DELETE /api/blogs/:id`);
    console.log(`   PATCH /api/blogs/:id/status`);
    console.log(`   GET  /api/blogs/category/:categoryId`);
    console.log(`   GET  /api/blogs/author/:authorId`);
    console.log(`   GET  /api/blogs/search`);
    // ✅ THÊM: Feedback endpoints log
    console.log(`   📊 FEEDBACK MANAGEMENT:`);
    console.log(`   GET  /api/feedbacks`);
    console.log(`   POST /api/feedbacks`);
    console.log(`   GET  /api/feedbacks/:id`);
    console.log(`   PUT  /api/feedbacks/:id`);
    console.log(`   DELETE /api/feedbacks/:id`);
    console.log(`   GET  /api/feedbacks/booking/:bookingId`);
    console.log(`   GET  /api/feedbacks/customer/:customerId`);
    console.log(`   GET  /api/feedbacks/statistics/averages`);
    console.log(`   🤖 CHATBOT ENHANCED:`);
    console.log(`   POST /api/chatbot/chat`);
    console.log(`   GET  /api/chatbot/health`);
    console.log(`   GET  /api/chatbot/model-info`);
    console.log(`   💰 PAYMENT & REFUNDS:`);
    console.log(`   POST /api/payment/vietqr/generate`);
    console.log(`   POST /api/payment/:paymentId/refund`);
    console.log(`   GET  /api/payment/:paymentId/refunds`);
    console.log(`   GET  /api/refunds`);
    console.log(`   POST /api/refunds`);
    console.log(`   PATCH /api/refunds/:id/process`);
    console.log(`   POST /api/invoices/create-from-booking-data`);
});

// Global error handlers
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    setTimeout(() => process.exit(1), 1000);
});

export default app;