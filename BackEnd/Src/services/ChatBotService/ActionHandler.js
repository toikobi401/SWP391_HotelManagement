class ActionHandler {
    constructor() {
        // ✅ CẬP NHẬT: Thêm tất cả routes manager có từ App.js và app.js
        this.routePermissions = {
            // Public routes
            '/': { roles: [], name: 'Trang chủ', icon: 'fas fa-home', color: '#007bff' },
            '/profile': { roles: [], name: 'Hồ sơ cá nhân', icon: 'fas fa-user', color: '#28a745' },
            '/about': { roles: [], name: 'Về chúng tôi', icon: 'fas fa-info-circle', color: '#17a2b8' },
            '/contact': { roles: [], name: 'Liên hệ', icon: 'fas fa-phone', color: '#ffc107' },
            
            // ✅ MANAGER ROUTES - Dựa theo App.js và AdminManager
            '/manager': { roles: [1], name: 'Dashboard Quản lý', icon: 'fas fa-shield-alt', color: '#dc3545' },
            '/manager/rooms': { roles: [1], name: 'Quản lý phòng', icon: 'fas fa-bed', color: '#e83e8c' },
            '/manager/booking': { roles: [1], name: 'Đặt phòng mới', icon: 'fas fa-calendar-plus', color: '#6f42c1' },
            '/manager/addroom': { roles: [1], name: 'Thêm phòng', icon: 'fas fa-plus-square', color: '#fd7e14' },
            '/manager/feedback': { roles: [1], name: 'Quản lý phản hồi', icon: 'fas fa-comments', color: '#20c997' },
            '/manager/toggleRole': { roles: [1], name: 'Quản lý tài khoản', icon: 'fas fa-user-cog', color: '#6c757d' },
            '/manager/reports': { roles: [1], name: 'Báo cáo thống kê', icon: 'fas fa-chart-bar', color: '#fd7e14' },
            '/manager/staff': { roles: [1], name: 'Quản lý nhân sự', icon: 'fas fa-users', color: '#e83e8c' },
            '/manager/settings': { roles: [1], name: 'Cài đặt hệ thống', icon: 'fas fa-cog', color: '#6c757d' },
            
            // ✅ RECEPTIONIST ROUTES
            '/receptionist': { roles: [2], name: 'Dashboard Lễ tân', icon: 'fas fa-concierge-bell', color: '#ffd700' },
            '/receptionist/invoices': {
                roles: [2,1], // Receptionist
                name: 'Quản lý hóa đơn',
                icon: 'fas fa-file-invoice-dollar',
                color: '#fd7e14'
            },
            
            // ✅ CUSTOMER ROUTES
            '/customer': { roles: [3], name: 'Trang khách hàng', icon: 'fas fa-user-circle', color: '#20c997' },
            
            // ✅ MULTI-ROLE ROUTES - Dựa theo App.js
            '/booking': { roles: [2, 3], name: 'Đặt phòng', icon: 'fas fa-calendar-check', color: '#6f42c1' },
            '/rooms': { roles: [1, 2], name: 'Xem phòng', icon: 'fas fa-bed', color: '#e83e8c' },
            
            // ✅ TEST ROUTES
            '/payment-test': { roles: [1, 2, 3], name: 'Test thanh toán', icon: 'fas fa-credit-card', color: '#28a745' },
        };

        // ✅ CẬP NHẬT: Thêm keywords cho manager routes mới
        this.pageDetectionMap = {
            // Basic navigation
            'trang chủ': '/',
            'home': '/',
            'hồ sơ': '/profile',
            'profile': '/profile',
            'thông tin cá nhân': '/profile',
            'personal info': '/profile',
            'liên hệ': '/contact',
            'contact': '/contact',
            'support': '/contact',
            'về chúng tôi': '/about',
            'about': '/about',
            'giới thiệu': '/about',
            
            // ✅ MANAGER KEYWORDS - Cập nhật đầy đủ
            'dashboard': '/manager',
            'bảng điều khiển': '/manager',
            'quản lý': '/manager',
            'manager': '/manager',
            'admin': '/manager',
            'admin manager': '/manager',
            'trang quản lý': '/manager',
            'manager dashboard': '/manager',
            
            // Manager sub-pages
            'quản lý phòng': '/manager/rooms',
            'room management': '/manager/rooms',
            'phòng khách sạn': '/manager/rooms',
            'hotel rooms': '/manager/rooms',
            
            'đặt phòng mới': '/manager/booking',
            'new booking': '/manager/booking',
            'tạo booking': '/manager/booking',
            'create booking': '/manager/booking',
            
            'thêm phòng': '/manager/addroom',
            'add room': '/manager/addroom',
            'tạo phòng mới': '/manager/addroom',
            'create new room': '/manager/addroom',
            
            'quản lý phản hồi': '/manager/feedback',
            'feedback management': '/manager/feedback',
            'phản hồi khách hàng': '/manager/feedback',
            'customer feedback': '/manager/feedback',
            
            'quản lý tài khoản': '/manager/toggleRole',
            'account management': '/manager/toggleRole',
            'phân quyền': '/manager/toggleRole',
            'role management': '/manager/toggleRole',
            'toggle role': '/manager/toggleRole',
            
            'báo cáo': '/manager/reports',
            'reports': '/manager/reports',
            'thống kê': '/manager/reports',
            'statistics': '/manager/reports',
            'analytics': '/manager/reports',
            
            'quản lý nhân sự': '/manager/staff',
            'staff management': '/manager/staff',
            'nhân viên': '/manager/staff',
            'employees': '/manager/staff',
            
            'cài đặt': '/manager/settings',
            'settings': '/manager/settings',
            'cấu hình': '/manager/settings',
            'configuration': '/manager/settings',
            'hệ thống': '/manager/settings',
            'system': '/manager/settings',
            
            // ✅ RECEPTIONIST KEYWORDS
            'lễ tân': '/receptionist',
            'receptionist': '/receptionist',
            'reception': '/receptionist',
            'front desk': '/receptionist',
            
            // ✅ CUSTOMER KEYWORDS
            'khách hàng': '/customer',
            'customer': '/customer',
            'client': '/customer',
            
            // ✅ BOOKING KEYWORDS
            'đặt phòng': '/booking',
            'booking': '/booking',
            'reservation': '/booking',
        };
    }

    // Handle navigation prompt
    async handleNavigationPrompt(message, userRole, userRoles = []) {
        const lowerMessage = message.toLowerCase();
        
        console.log('🧭 Processing navigation prompt:', {
            message: message.substring(0, 50) + '...',
            userRole,
            userRoles
        });
        
        // Find requested page
        let requestedRoute = null;
        let requestedPageName = '';
        
        for (const [keyword, route] of Object.entries(this.pageDetectionMap)) {
            if (lowerMessage.includes(keyword)) {
                requestedRoute = route;
                requestedPageName = this.routePermissions[route]?.name || route;
                console.log('🎯 Found matching route:', { keyword, route, pageName: requestedPageName });
                break;
            }
        }

        // Check permission
        if (requestedRoute) {
            if (this.checkPermission(requestedRoute, userRoles)) {
                console.log('✅ Navigation allowed:', requestedRoute);
                return {
                    canNavigate: true,
                    route: requestedRoute,
                    routeName: requestedPageName,
                    icon: this.routePermissions[requestedRoute].icon,
                    message: `Tôi sẽ đưa bạn đến trang "${requestedPageName}". Vui lòng nhấn nút bên dưới để điều hướng.`,
                    action: 'NAVIGATE',
                    actionData: {
                        route: requestedRoute,
                        name: requestedPageName,
                        icon: this.routePermissions[requestedRoute].icon,
                        color: this.routePermissions[requestedRoute].color
                    }
                };
            } else {
                console.log('❌ Navigation denied:', requestedRoute);
                return {
                    canNavigate: false,
                    route: requestedRoute,
                    message: `Bạn không có quyền truy cập trang "${requestedPageName}". Vui lòng liên hệ quản trị viên để được hỗ trợ.`,
                    action: 'PERMISSION_DENIED',
                    actionData: null
                };
            }
        }

        // Show available routes
        console.log('🔍 No specific page found, showing available routes');
        const availableRoutes = this.getAvailableRoutes(userRoles);
        
        return {
            canNavigate: false,
            route: null,
            message: `Tôi không tìm thấy trang cụ thể mà bạn muốn đến. Dưới đây là các trang bạn có thể truy cập:`,
            action: 'SHOW_AVAILABLE_ROUTES',
            actionData: availableRoutes
        };
    }

    // Check route permission
    checkPermission(route, userRoles) {
        const permission = this.routePermissions[route];
        if (!permission) return false;
        if (permission.roles.length === 0) return true; // Public route
        return permission.roles.some(roleId => userRoles.includes(roleId));
    }

    // ✅ CẬP NHẬT: Get available routes cho manager
    getAvailableRoutes(userRoles = []) {
        const availableRoutes = [];
        
        console.log('🔍 Checking available routes for userRoles:', userRoles);
        
        for (const [route, info] of Object.entries(this.routePermissions)) {
            if (info.roles.length === 0 || info.roles.some(roleId => userRoles.includes(roleId))) {
                availableRoutes.push({
                    route: route,
                    name: info.name,
                    icon: info.icon,
                    color: info.color
                });
                console.log('✅ Available route:', route, info.name);
            } else {
                console.log('❌ Route not available:', route, info.name, 'Required roles:', info.roles);
            }
        }

        console.log('📋 Final available routes:', availableRoutes.length, 'routes');
        return availableRoutes;
    }

    // Process action result
    processActionResult(actionType, actionData) {
        switch (actionType) {
            case 'NAVIGATE':
                return {
                    type: 'navigation',
                    success: true,
                    data: actionData
                };
            
            case 'SHOW_AVAILABLE_ROUTES':
                return {
                    type: 'route_list',
                    success: true,
                    data: actionData
                };
                
            case 'PERMISSION_DENIED':
                return {
                    type: 'error',
                    success: false,
                    message: 'Permission denied'
                };
                
            default:
                return {
                    type: 'unknown',
                    success: false,
                    message: 'Unknown action type'
                };
        }
    }
}

export default ActionHandler;