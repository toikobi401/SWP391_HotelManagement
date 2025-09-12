import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

export const useRoleNavigation = () => {
    const navigate = useNavigate();
    const { user, hasRole, isLoggedIn } = useAuth();

    const navigateToRolePage = () => {
        if (!isLoggedIn || !user) {
            toast.warning('Vui lòng đăng nhập để tiếp tục');
            navigate('/login');
            return;
        }

        // Priority: Manager > Receptionist > Customer
        if (hasRole(1)) {
            navigate('/manager');
        } else if (hasRole(2)) {
            navigate('/receptionist');
        } else if (hasRole(3)) {
            navigate('/customer');
        } else {
            toast.warning('Tài khoản chưa được phân quyền');
            navigate('/');
        }
    };

    const navigateToSpecificRole = (roleId) => {
        if (!isLoggedIn || !user) {
            toast.warning('Vui lòng đăng nhập để tiếp tục');
            navigate('/login');
            return false;
        }

        if (!hasRole(roleId)) {
            const roleNames = {
                1: 'Quản lý',
                2: 'Lễ tân',
                3: 'Khách hàng'
            };
            toast.error(`Bạn không có quyền ${roleNames[roleId]}`);
            return false;
        }

        const routes = {
            1: '/manager',
            2: '/receptionist', 
            3: '/customer'
        };

        navigate(routes[roleId]);
        return true;
    };

    const getAvailableRoutes = () => {
        if (!isLoggedIn || !user) return [];

        const routes = [];
        
        if (hasRole(1)) {
            routes.push(
                {
                    path: '/manager',
                    name: 'Dashboard Quản lý',
                    icon: 'fas fa-shield-alt',
                    color: '#dc3545'
                },
                {
                    path: '/manager/rooms',
                    name: 'Quản lý phòng',
                    icon: 'fas fa-bed',
                    color: '#e83e8c'
                },
                {
                    path: '/manager/reports',
                    name: 'Báo cáo thống kê',
                    icon: 'fas fa-chart-bar',
                    color: '#fd7e14'
                }
            );
        }
        
        if (hasRole(2)) {
            routes.push({
                path: '/receptionist',
                name: 'Lễ tân', 
                icon: 'fas fa-concierge-bell',
                color: '#ffd700'
            });
        }
        
        if (hasRole(3)) {
            routes.push({
                path: '/customer',
                name: 'Khách hàng',
                icon: 'fas fa-user-circle',
                color: '#4ecdc4'
            });
        }

        return routes;
    };

    const canAccessRoute = (path) => {
        if (!isLoggedIn || !user) return false;

        // ✅ CẬP NHẬT: Role requirements cho tất cả routes
        const roleRequirements = {
            // Public routes
            '/': [],
            '/about': [],
            '/contact': [],
            '/profile': [], // Any logged in user
            
            // ✅ MANAGER ROUTES - Role ID: 1
            '/manager': [1],
            '/manager/rooms': [1],
            '/manager/booking': [1],
            '/manager/addroom': [1], 
            '/manager/feedback': [1],
            '/manager/toggleRole': [1],
            '/manager/reports': [1],
            '/manager/staff': [1],
            '/manager/settings': [1],
            
            // ✅ RECEPTIONIST ROUTES - Role ID: 2
            '/receptionist': [2],
            
            // ✅ CUSTOMER ROUTES - Role ID: 3
            '/customer': [3],
            
            // ✅ MULTI-ROLE ROUTES
            '/booking': [2, 3], // Receptionist or Customer
            '/rooms': [1, 2], // Manager or Receptionist
            '/payment-test': [1, 2, 3], // All roles
        };

        const requiredRoles = roleRequirements[path];
        if (!requiredRoles) return true; // Public route
        if (requiredRoles.length === 0) return true; // Any logged user

        return requiredRoles.some(roleId => hasRole(roleId));
    };

    // ✅ THÊM CHỨC NĂNG NAVIGATION CHO CHATBOT
    const executeNavigation = (route) => {
        console.log('🚀 Executing navigation to:', route);
        
        if (canAccessRoute(route)) {
            navigate(route);
            toast.success(`Đang chuyển đến ${route}`);
            return true;
        } else {
            toast.error(`Bạn không có quyền truy cập ${route}`);
            return false;
        }
    };

    // ✅ THÊM GET USER ROLES CHO CHATBOT
    const getUserRoles = () => {
        if (!user || !user.roles) return [];
        return user.roles.map(role => role.RoleID || role.roleId || role.id).filter(Boolean);
    };

    return {
        navigateToRolePage,
        navigateToSpecificRole,
        getAvailableRoutes,
        canAccessRoute,
        // ✅ THÊM CÁC FUNCTION MỚI CHO CHATBOT
        executeNavigation,
        getUserRoles
    };
};