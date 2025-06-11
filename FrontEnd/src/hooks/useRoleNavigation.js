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
            routes.push({
                path: '/manager',
                name: 'Quản lý',
                icon: 'fas fa-shield-alt',
                color: '#ff6b6b'
            });
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

        const roleRequirements = {
            '/manager': [1],
            '/receptionist': [2],
            '/customer': [3],
            '/profile': [], // Any logged in user
            '/booking': [2, 3], // Receptionist or Customer
            '/rooms': [1, 2], // Manager or Receptionist
        };

        const requiredRoles = roleRequirements[path];
        if (!requiredRoles) return true; // Public route

        if (requiredRoles.length === 0) return true; // Any logged user

        return requiredRoles.some(roleId => hasRole(roleId));
    };

    return {
        navigateToRolePage,
        navigateToSpecificRole,
        getAvailableRoutes,
        canAccessRoute
    };
};