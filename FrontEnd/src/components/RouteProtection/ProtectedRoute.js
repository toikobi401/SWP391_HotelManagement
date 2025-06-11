import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ children, requiredRoles = [], allowGuest = false }) => {
    const { isLoggedIn, user, hasRole, loading } = useAuth();
    const location = useLocation();

    // Show loading while checking authentication
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="mt-2">Đang kiểm tra quyền truy cập...</div>
                </div>
            </div>
        );
    }

    // If guest access is allowed and no roles required
    if (allowGuest && requiredRoles.length === 0) {
        return children;
    }

    // Check if user is logged in
    if (!isLoggedIn || !user) {
        toast.warning('Vui lòng đăng nhập để tiếp tục');
        return <Navigate 
            to="/login" 
            state={{ from: location }} 
            replace 
        />;
    }

    // Check role permissions
    if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(roleId => hasRole(roleId));
        
        if (!hasRequiredRole) {
            // Get role names for better error message
            const roleNames = {
                1: 'Quản lý',
                2: 'Lễ tân', 
                3: 'Khách hàng'
            };
            
            const requiredRoleNames = requiredRoles.map(id => roleNames[id]).join(', ');
            
            toast.error(`Bạn không có quyền truy cập. Cần role: ${requiredRoleNames}`);
            
            // Redirect to appropriate page based on user's roles
            if (hasRole(1)) {
                return <Navigate to="/manager" replace />;
            } else if (hasRole(2)) {
                return <Navigate to="/receptionist" replace />;
            } else if (hasRole(3)) {
                return <Navigate to="/customer" replace />;
            } else {
                return <Navigate to="/" replace />;
            }
        }
    }

    return children;
};

export default ProtectedRoute;