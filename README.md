# Project01# SWP391 Hotel Management System

A comprehensive hotel management system built with React frontend and Node.js backend, featuring user authentication, booking management, and payment integration.

## 🏗️ Project Structure

```
SWP391_HotelManagement/
├── BackEnd/                    # Node.js Express API Server
│   ├── .env                   # Environment variables
│   ├── app.js                 # Main application entry point
│   ├── package.json           # Backend dependencies
│   ├── private.key            # Nexmo voice API private key
│   └── Src/
│       ├── config/            # Configuration files
│       │   └── passport-google.js
│       ├── controller/        # Route controllers
│       │   └── AuthenticationController/
│       ├── dal/               # Data Access Layer
│       ├── model/             # Data models
│       └── services/          # Business logic services
│           └── OTPService.js  # OTP handling for SMS/Voice
├── FrontEnd/                   # React Application
│   ├── .env                   # Frontend environment variables
│   ├── package.json           # Frontend dependencies
│   ├── public/                # Static assets
│   └── src/
│       ├── App.js             # Main React component
│       ├── contexts/          # React contexts
│       ├── images/            # Image assets
│       └── web_page/          # Page components
│           └── auth/          # Authentication pages
└── Documentation/
    ├── ContextDiagram.drawio   # System context diagram
    ├── ERDiagram.png          # Database design
    ├── UseCase.drawio         # Use case diagrams
    └── *.sql                  # Database scripts
```

## 🚀 Features

### Authentication System
- **User Registration/Login** with JWT tokens
- **Google OAuth 2.0** integration
- **Forgot Password** with OTP verification
- **Multi-factor Authentication** via Email/SMS/Voice (Nexmo/Vonage)

### Payment Integration
- **VNPay** payment gateway
- **VietQR** QR code generation for bank transfers

### Hotel Management
- Room booking and management
- User profile management with image upload
- Role-based access control

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MSSSQL** database
- **JWT** for authentication
- **Nexmo/Vonage** for SMS and Voice OTP
- **Nodemailer** for email services
- **Multer** for file uploads
- **Passport.js** for OAuth

### Frontend
- **React** with hooks
- **React Router** for navigation
- **CSS Modules** for styling
- **Axios** for API calls

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL database
- Gmail account for email services
- Nexmo/Vonage account for SMS/Voice
- Google Cloud Console project for OAuth

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd SWP391_HotelManagement
```

### 2. Backend Setup
```bash
cd BackEnd
npm install
```

Create `.env` file in BackEnd directory:
```env
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=SWP391

# JWT
JWT_SECRET=your-secret-key

# Email
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Nexmo/Vonage
NEXMO_API_KEY=your-nexmo-key
NEXMO_API_SECRET=your-nexmo-secret
NEXMO_APPLICATION_ID=your-app-id
NEXMO_FROM_NUMBER=your-sender-id

# VNPay
VNP_TMN_CODE=your-vnpay-code
VNP_HASH_SECRET=your-vnpay-secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### 3. Frontend Setup
```bash
cd ../FrontEnd
npm install
```

### 4. Database Setup
```bash
# Import the database schema
mysql -u your_username -p SWP391 < InitSql.sql
```

## 🚀 Running the Application

### Start Backend Server
```bash
cd BackEnd
npm run dev  # Development mode with auto-reload
# or
npm start    // filepath: c:\Users\PC\OneDrive\Desktop\LEARNING\SWP391\Assignment\SWP391_HotelManagement\README.md
# SWP391 Hotel Management System

A comprehensive hotel management system built with React frontend and Node.js backend, featuring user authentication, booking management, and payment integration.

## 🏗️ Project Structure

```
SWP391_HotelManagement/
├── BackEnd/                    # Node.js Express API Server
│   ├── .env                   # Environment variables
│   ├── app.js                 # Main application entry point
│   ├── package.json           # Backend dependencies
│   ├── private.key            # Nexmo voice API private key
│   └── Src/
│       ├── config/            # Configuration files
│       │   └── passport-google.js
│       ├── controller/        # Route controllers
│       │   └── AuthenticationController/
│       ├── dal/               # Data Access Layer
│       ├── model/             # Data models
│       └── services/          # Business logic services
│           └── OTPService.js  # OTP handling for SMS/Voice
├── FrontEnd/                   # React Application
│   ├── .env                   # Frontend environment variables
│   ├── package.json           # Frontend dependencies
│   ├── public/                # Static assets
│   └── src/
│       ├── App.js             # Main React component
│       ├── contexts/          # React contexts
│       ├── images/            # Image assets
│       └── web_page/          # Page components
│           └── auth/          # Authentication pages
└── Documentation/
    ├── ContextDiagram.drawio   # System context diagram
    ├── ERDiagram.png          # Database design
    ├── UseCase.drawio         # Use case diagrams
    └── *.sql                  # Database scripts
```

## 🚀 Features

### Authentication System
- **User Registration/Login** with JWT tokens
- **Google OAuth 2.0** integration
- **Forgot Password** with OTP verification
- **Multi-factor Authentication** via Email/SMS/Voice (Nexmo/Vonage)

### Payment Integration
- **VNPay** payment gateway
- **VietQR** QR code generation for bank transfers

### Hotel Management
- Room booking and management
- User profile management with image upload
- Role-based access control

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MySQL** database
- **JWT** for authentication
- **Nexmo/Vonage** for SMS and Voice OTP
- **Nodemailer** for email services
- **Multer** for file uploads
- **Passport.js** for OAuth

### Frontend
- **React** with hooks
- **React Router** for navigation
- **CSS Modules** for styling
- **Axios** for API calls

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL database
- Gmail account for email services
- Nexmo/Vonage account for SMS/Voice
- Google Cloud Console project for OAuth

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd SWP391_HotelManagement
```

### 2. Backend Setup
```bash
cd BackEnd
npm install
```

Create `.env` file in BackEnd directory:
```env
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=SWP391

# JWT
JWT_SECRET=your-secret-key

# Email
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Nexmo/Vonage
NEXMO_API_KEY=your-nexmo-key
NEXMO_API_SECRET=your-nexmo-secret
NEXMO_APPLICATION_ID=your-app-id
NEXMO_FROM_NUMBER=your-sender-id

# VNPay
VNP_TMN_CODE=your-vnpay-code
VNP_HASH_SECRET=your-vnpay-secret
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### 3. Frontend Setup
```bash
cd ../FrontEnd
npm install
```

### 4. Database Setup
```bash
# Import the database schema
mysql -u your_username -p SWP391 < InitSql.sql
```

## 🚀 Running the Application

### Start Backend Server
```bash
cd BackEnd
npm run dev  # Development mode with auto-reload
# or
npm start    