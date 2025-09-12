@echo off
title HotelHub Management System - Startup
color 0a

echo ===============================================
echo      HotelHub Management System
echo           Startup Script
echo ===============================================
echo.

echo [INFO] Starting HotelHub Management System...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

:: Navigate to Backend directory and start backend server
echo [INFO] Starting Backend Server...
cd /d "%~dp0BackEnd"
if not exist "package.json" (
    echo [ERROR] Backend package.json not found
    echo Please ensure you're running this script from the project root
    pause
    exit /b 1
)

:: Install backend dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
)

:: Start backend server in background
echo [INFO] Launching backend server on http://localhost:3000
start "HotelHub Backend" cmd /k "npm run dev"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Navigate to Frontend directory
echo [INFO] Starting Frontend Server...
cd /d "%~dp0FrontEnd"
if not exist "package.json" (
    echo [ERROR] Frontend package.json not found
    echo Please ensure the frontend directory exists
    pause
    exit /b 1
)

:: Install frontend dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

:: Start frontend server
echo [INFO] Launching frontend server on http://localhost:3001
echo.
echo ===============================================
echo  System is starting up...
echo  Backend: http://localhost:3000
echo  Frontend: http://localhost:3001
echo ===============================================
echo.
echo [INFO] Frontend will open automatically in your browser
echo [INFO] Press Ctrl+C to stop the frontend server
echo [INFO] Close the backend window to stop the backend server
echo.

:: Start frontend server (this will block until stopped)
npm start

:: If we reach here, frontend was stopped
echo.
echo [INFO] Frontend server stopped
echo [INFO] Don't forget to close the backend server window
pause