import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
    baseURL: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
    timeout: 10000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log('📤 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data
        });
        
        return config;
    },
    (error) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log('📥 API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data
        });
        return response;
    },
    (error) => {
        console.error('❌ Response error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            // ✅ SỬA: Không sử dụng navigate trong axios interceptor
            window.location.href = '/login';
        }
        
        return Promise.reject(error);
    }
);

export default api;