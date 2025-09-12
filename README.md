# Hotel Management System

This is a full-stack web application for managing a hotel. It includes features for guests, receptionists, and managers, providing a comprehensive solution for booking, management, and customer interaction.

## Overview

The project is divided into two main parts: a **Backend API** built with Node.js and Express, and a **Frontend** web application built with React. The system supports various functionalities including user authentication, room booking, service management, payment processing, and role-based access control.

## Features

### Backend
-   **Authentication**: Secure user registration, login, and logout. Supports both local and Google OAuth authentication. Includes session management and password recovery (Forgot Password with OTP).
-   **Role-Based Access Control (RBAC)**: Differentiates between Managers, Receptionists, and Customers, restricting access to certain features based on user roles.
-   **Room & Booking Management**: CRUD operations for rooms and room types. Handling of online and walk-in bookings.
-   **Service & Promotion Management**: Allows managers to create, update, and delete hotel services and promotional offers.
-   **Invoice & Payment**: Automatic invoice generation from booking data. Integration with payment gateways (VietQR simulated).
-   **User & Profile Management**: Users can view and update their profiles, including profile pictures. Managers can manage user accounts and roles.
-   **Blog**: A complete blog module for creating, publishing, and managing articles.
-   **ChatBot**: An intelligent, role-based chatbot to assist users with navigation and information queries.
-   **Contact Form**: Sends inquiries directly to the hotel's email.

### Frontend
-   **Responsive UI**: User-friendly interface built with React and Bootstrap, ensuring compatibility across various devices.
-   **Role-Based Dashboards**: Separate dashboards and functionalities for Manager, Receptionist, and Customer roles.
-   **Protected Routes**: Secures routes based on user authentication status and roles.
-   **Dynamic Booking Form**: A multi-step form for creating walk-in bookings with real-time validation.
-   **Interactive Room Availability**: View available rooms with filters and detailed information.
-   **Invoice Management**: Receptionists and Managers can view, manage, and process invoices.
-   **User Profile**: Allows users to view and edit their personal information and upload an avatar.
-   **Toast Notifications**: Provides user-friendly feedback for actions.
-   **Integrated ChatBot**: A floating chatbot accessible across the site, providing role-specific assistance.

## Technology Stack

### Backend
-   **Framework**: Node.js, Express.js
-   **Database**: Microsoft SQL Server
-   **Authentication**: Passport.js (Google OAuth 2.0), JSON Web Tokens (JWT), `bcryptjs` for password hashing.
-   **API & Communication**: RESTful API, `cors`, `cookie-parser`.
-   **Email & OTP**: `nodemailer`, `vonage/server-sdk` (simulated).
-   **File Uploads**: `multer`.

### Frontend
-   **Library**: React.js
-   **Routing**: `react-router-dom`
-   **Styling**: CSS Modules, Bootstrap, `react-toastify`.
-   **API Client**: `axios`
-   **State Management**: React Context API (`AuthContext`)

## Project Structure

```
.
├── BackEnd/
│   ├── Src/
│   │   ├── config/         # Passport.js configuration
│   │   ├── controller/     # API route handlers (Express controllers)
│   │   ├── dal/            # Data Access Layer (database logic)
│   │   ├── model/          # Data models (classes)
│   │   └── services/       # Business logic services
│   └── app.js              # Main Express server file
└── FrontEnd/
    ├── public/
    └── src/
        ├── components/     # Reusable UI components
        ├── config/         # Axios instance configuration
        ├── contexts/       # React Context for state management
        ├── hooks/          # Custom React hooks
        ├── services/       # API service wrappers
        └── web_page/       # Application pages/views
```

## Setup and Installation

### Prerequisites
-   Node.js and npm
-   Microsoft SQL Server
-   A configured `.env` file in both `BackEnd` and `FrontEnd` directories.

### Backend Setup
1.  Navigate to the `BackEnd` directory: `cd BackEnd`
2.  Install dependencies: `npm install`
3.  Create a `.env` file and add the necessary environment variables (see below).
4.  Initialize the database using the `InitSql.sql` and `NoDataScript.sql` scripts.
5.  Start the server: `npm start` (or `node app.js`). The server will run on `http://localhost:3000`.

### Frontend Setup
1.  Navigate to the `FrontEnd` directory: `cd FrontEnd`
2.  Install dependencies: `npm install`
3.  Create a `.env` file and add the necessary environment variables.
4.  Start the React development server: `npm start`. The application will be available at `http://localhost:3001`.

## Environment Variables

### Backend (`BackEnd/.env`)
```
# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_NAME=SWP391

# JWT
JWT_SECRET=your_jwt_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Nodemailer (for Contact Us & OTP)
EMAIL_USER=your_gmail_address
EMAIL_PASSWORD=your_gmail_app_password

# VietQR (for Payment)
BANK_ID=970422
ACCOUNT_NO=your_account_number
ACCOUNT_NAME=YOUR_ACCOUNT_NAME
```

### Frontend (`FrontEnd/.env`)
```
REACT_APP_BASE_URL=http://localhost:3000
```

## Running the Application
1.  Start the Backend server from the `BackEnd` directory: `npm start`
2.  Start the Frontend development server from the `FrontEnd` directory: `npm start`
3.  Open your browser and navigate to `http://localhost:3001`.
