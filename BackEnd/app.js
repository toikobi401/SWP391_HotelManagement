import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import LoginController from './Src/controller/AuthenticationController/LoginController.js';
import LogoutController from './Src/controller/AuthenticationController/LogoutController.js';

const app = express();
const PORT = 3000;

app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// API routes
app.use('/api', LoginController);
app.use('/api', LogoutController);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});