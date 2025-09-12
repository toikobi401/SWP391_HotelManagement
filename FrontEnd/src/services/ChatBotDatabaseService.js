// Dịch vụ cho phép ChatBot truy cập database với phân quyền
import axios from 'axios';

class ChatBotDatabaseService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
        });

        // Interceptor để thêm token vào mọi request
        this.axiosInstance.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    // ===============================
    // 🛡️ PHÂN QUYỀN TRUY CẬP DATABASE
    // ===============================

    // ✅ CUSTOMER - Chỉ truy cập thông tin của chính họ
    async getCustomerData(userID) {
        try {
            console.log('🔍 Fetching customer data for user:', userID);
            
            const [bookingHistory, userProfile] = await Promise.all([
                this.axiosInstance.get(`/bookings/user/${userID}/history?page=1&pageSize=50`),
                this.axiosInstance.get(`/users/${userID}`)
            ]);

            console.log('📊 API responses:', {
                bookingHistoryStatus: bookingHistory.status,
                bookingHistoryData: bookingHistory.data,
                userProfileStatus: userProfile.status,
                userProfileData: userProfile.data
            });

            // ✅ SỬA: Xử lý đúng format API response
            let bookings = [];
            
            // Kiểm tra nhiều format có thể có
            if (bookingHistory.data.success && bookingHistory.data.data && bookingHistory.data.data.bookings) {
                bookings = bookingHistory.data.data.bookings;
            } else if (bookingHistory.data.data && Array.isArray(bookingHistory.data.data)) {
                bookings = bookingHistory.data.data;
            } else if (bookingHistory.data.bookings && Array.isArray(bookingHistory.data.bookings)) {
                bookings = bookingHistory.data.bookings;
            } else if (Array.isArray(bookingHistory.data)) {
                bookings = bookingHistory.data;
            }
            
            // Kiểm tra user profile
            let profile = null;
            if (userProfile.data.success && userProfile.data.data) {
                profile = userProfile.data.data;
            } else if (userProfile.data.data) {
                profile = userProfile.data.data;
            } else {
                profile = userProfile.data;
            }

            console.log('📋 Processed data:', {
                bookingsCount: Array.isArray(bookings) ? bookings.length : 'Not array',
                bookingsType: typeof bookings,
                profile: profile ? 'Found' : 'Not found'
            });

            return {
                success: true,
                data: {
                    bookings: Array.isArray(bookings) ? bookings : [],
                    profile: profile || null,
                    summary: {
                        totalBookings: Array.isArray(bookings) ? bookings.length : 0,
                        latestBooking: Array.isArray(bookings) && bookings.length > 0 ? bookings[0] : null
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error getting customer data:', error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            
            // Trả về thông tin lỗi chi tiết hơn
            let errorMessage = 'Không thể lấy thông tin khách hàng';
            if (error.response?.status === 404) {
                errorMessage = 'Không tìm thấy thông tin khách hàng';
            } else if (error.response?.status === 401) {
                errorMessage = 'Không có quyền truy cập thông tin';
            } else if (error.response?.status === 500) {
                errorMessage = 'Lỗi server khi lấy dữ liệu';
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.response?.data?.message || error.message,
                debug: {
                    status: error.response?.status,
                    url: error.config?.url,
                    method: error.config?.method
                }
            };
        }
    }

    // ✅ RECEPTIONIST - Truy cập phòng, hóa đơn, booking
    async getReceptionistData(query = '') {
        try {
            const requests = [];
            
            // Thông tin cơ bản luôn lấy
            requests.push(
                this.axiosInstance.get('/rooms'),
                this.axiosInstance.get('/bookings'),
                this.axiosInstance.get('/invoices')
            );

            // Nếu có query cụ thể, lấy thêm thông tin
            if (query.toLowerCase().includes('phòng')) {
                requests.push(this.axiosInstance.get('/rooms/available'));
            }
            
            if (query.toLowerCase().includes('hóa đơn') || query.toLowerCase().includes('thanh toán')) {
                // Không có separate payments endpoint, dùng invoices
                requests.push(this.axiosInstance.get('/invoices'));
            }

            const responses = await Promise.all(requests);
            const [roomsRes, bookingsRes, invoicesRes, ...extraRes] = responses;

            return {
                success: true,
                data: {
                    rooms: roomsRes.data.data || [],
                    bookings: bookingsRes.data.data || [],
                    invoices: invoicesRes.data.data || [],
                    availableRooms: extraRes[0]?.data.data || null,
                    summary: {
                        totalRooms: roomsRes.data.data?.length || 0,
                        availableRoomsCount: roomsRes.data.data?.filter(r => r.Status === 'Available')?.length || 0,
                        todayBookings: bookingsRes.data.data?.filter(b => 
                            new Date(b.BookingAt).toDateString() === new Date().toDateString()
                        )?.length || 0,
                        pendingInvoices: invoicesRes.data.data?.filter(i => i.PaymentStatus !== 'Paid')?.length || 0
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error getting receptionist data:', error);
            return {
                success: false,
                message: 'Không thể lấy thông tin cho lễ tân',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // ✅ MANAGER - Truy cập toàn bộ thông tin
    async getManagerData(query = '') {
        try {
            const requests = [
                this.axiosInstance.get('/rooms'),
                this.axiosInstance.get('/bookings'),
                this.axiosInstance.get('/invoices'),
                this.axiosInstance.get('/users'),
                this.axiosInstance.get('/services'),
                this.axiosInstance.get('/promotions'),
                this.axiosInstance.get('/room-types'),
                this.axiosInstance.get('/feedbacks')
            ];

            // Thêm requests dựa trên query
            if (query.toLowerCase().includes('doanh thu') || query.toLowerCase().includes('báo cáo')) {
                // Sử dụng revenue-report endpoint nếu có
                try {
                    requests.push(this.axiosInstance.get('/revenue-report'));
                } catch (e) {
                    // Fallback nếu revenue-report không available
                    console.log('Revenue report endpoint not available, using invoices');
                }
            }

            const responses = await Promise.all(requests.map(req => 
                req.catch(err => {
                    console.log('Request failed:', err.config?.url);
                    return { data: { data: [] } };
                })
            ));
            
            const [roomsRes, bookingsRes, invoicesRes, usersRes, servicesRes, promotionsRes, roomTypesRes, feedbackRes, ...extraRes] = responses;

            return {
                success: true,
                data: {
                    rooms: roomsRes.data.data || [],
                    bookings: bookingsRes.data.data || [],
                    invoices: invoicesRes.data.data || [],
                    users: usersRes.data.data || [],
                    services: servicesRes.data.data || [],
                    promotions: promotionsRes.data.data || [],
                    roomTypes: roomTypesRes.data.data || [],
                    feedback: feedbackRes.data.data || [],
                    revenue: extraRes[0]?.data.data || null,
                    summary: {
                        totalRooms: roomsRes.data.data?.length || 0,
                        totalUsers: usersRes.data.data?.length || 0,
                        totalBookings: bookingsRes.data.data?.length || 0,
                        totalRevenue: invoicesRes.data.data?.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0) || 0,
                        activePromotions: promotionsRes.data.data?.filter(p => p.IsActive)?.length || 0,
                        averageRating: this.calculateAverageRating(feedbackRes.data.data || [])
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error getting manager data:', error);
            return {
                success: false,
                message: 'Không thể lấy thông tin quản lý',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // ===============================
    // 🔍 TRUY VẤN CỤ THỂ THEO PHÂN QUYỀN
    // ===============================

    // Tìm kiếm phòng (Receptionist + Manager)
    async searchRooms(query, userRole) {
        if (!['receptionist', 'manager'].includes(userRole)) {
            return { success: false, message: 'Không có quyền truy cập thông tin phòng' };
        }

        try {
            // Sử dụng API có sẵn - GET /api/rooms với filter
            const response = await this.axiosInstance.get(`/rooms?search=${encodeURIComponent(query)}`);
            return {
                success: true,
                data: response.data.data || [],
                message: `Tìm thấy ${response.data.data?.length || 0} phòng`
            };
        } catch (error) {
            return {
                success: false,
                message: 'Không thể tìm kiếm phòng',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // Tìm kiếm booking (Receptionist + Manager)
    async searchBookings(query, userRole, userID = null) {
        try {
            let endpoint = '/bookings';
            const params = new URLSearchParams();

            // Customer chỉ được xem booking của mình
            if (userRole === 'customer' && userID) {
                endpoint = `/bookings/user/${userID}/history`;
                params.append('searchTerm', query);
            } else if (['receptionist', 'manager'].includes(userRole)) {
                params.append('searchTerm', query);
            } else {
                return { success: false, message: 'Không có quyền truy cập thông tin booking' };
            }

            const response = await this.axiosInstance.get(`${endpoint}?${params}`);
            return {
                success: true,
                data: response.data.data || [],
                message: `Tìm thấy ${response.data.data?.length || 0} booking`
            };
        } catch (error) {
            return {
                success: false,
                message: 'Không thể tìm kiếm booking',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // Tìm kiếm người dùng (Chỉ Manager)
    async searchUsers(query, userRole) {
        if (userRole !== 'manager') {
            return { success: false, message: 'Chỉ quản lý mới có quyền truy cập thông tin người dùng' };
        }

        try {
            // Sử dụng API có sẵn - GET /api/users với search
            const response = await this.axiosInstance.get(`/users?search=${encodeURIComponent(query)}`);
            return {
                success: true,
                data: response.data.data || [],
                message: `Tìm thấy ${response.data.data?.length || 0} người dùng`
            };
        } catch (error) {
            return {
                success: false,
                message: 'Không thể tìm kiếm người dùng',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // ===============================
    // 📊 THỐNG KÊ THEO PHÂN QUYỀN
    // ===============================

    // Thống kê cho Customer
    async getCustomerStats(userID) {
        try {
            // Sử dụng endpoint booking history với stats
            const response = await this.axiosInstance.get(`/bookings/user/${userID}/history?includeStats=true`);
            return {
                success: true,
                data: response.data.stats || {},
                message: 'Lấy thống kê thành công'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Không thể lấy thống kê cá nhân',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // Thống kê cho Receptionist
    async getReceptionistStats() {
        try {
            const [roomsRes, bookingsRes] = await Promise.all([
                this.axiosInstance.get('/rooms'),
                this.axiosInstance.get('/bookings')
            ]);

            // Tính toán stats từ dữ liệu có sẵn
            const rooms = roomsRes.data.data || [];
            const bookings = bookingsRes.data.data || [];
            
            const roomStats = {
                total: rooms.length,
                available: rooms.filter(r => r.Status === 'Available').length,
                occupied: rooms.filter(r => r.Status === 'Occupied').length,
                maintenance: rooms.filter(r => r.Status === 'Maintenance').length,
                occupancyRate: Math.round((rooms.filter(r => r.Status === 'Occupied').length / rooms.length) * 100)
            };

            const today = new Date().toDateString();
            const bookingStats = {
                total: bookings.length,
                today: bookings.filter(b => new Date(b.BookingAt).toDateString() === today).length,
                pending: bookings.filter(b => b.BookingStatus === 'Pending').length,
                confirmed: bookings.filter(b => b.BookingStatus === 'Confirmed').length,
                checkedIn: bookings.filter(b => b.BookingStatus === 'CheckedIn').length
            };

            return {
                success: true,
                data: {
                    rooms: roomStats,
                    bookings: bookingStats
                },
                message: 'Lấy thống kê lễ tân thành công'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Không thể lấy thống kê lễ tân',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // Thống kê cho Manager
    async getManagerStats() {
        try {
            const [roomsRes, bookingsRes, invoicesRes, usersRes] = await Promise.all([
                this.axiosInstance.get('/rooms'),
                this.axiosInstance.get('/bookings'),
                this.axiosInstance.get('/invoices'),
                this.axiosInstance.get('/users')
            ]);

            // Tính toán comprehensive stats
            const rooms = roomsRes.data.data || [];
            const bookings = bookingsRes.data.data || [];
            const invoices = invoicesRes.data.data || [];
            const users = usersRes.data.data || [];

            const today = new Date();
            const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const roomStats = {
                total: rooms.length,
                available: rooms.filter(r => r.Status === 'Available').length,
                occupancyRate: Math.round((rooms.filter(r => r.Status === 'Occupied').length / rooms.length) * 100),
                maintenance: rooms.filter(r => r.Status === 'Maintenance').length
            };

            const bookingStats = {
                today: bookings.filter(b => new Date(b.BookingAt).toDateString() === today.toDateString()).length,
                thisWeek: bookings.filter(b => new Date(b.BookingAt) >= thisWeek).length,
                thisMonth: bookings.filter(b => new Date(b.BookingAt) >= thisMonth).length,
                cancelled: bookings.filter(b => b.BookingStatus === 'Cancelled').length
            };

            const revenueStats = {
                thisMonth: invoices.filter(i => 
                    new Date(i.CreatedAt) >= thisMonth && i.PaymentStatus === 'Paid'
                ).reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0),
                paid: invoices.filter(i => i.PaymentStatus === 'Paid').length,
                pending: invoices.filter(i => i.PaymentStatus !== 'Paid').length,
                averageDailyRate: invoices.length > 0 ? 
                    invoices.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0) / invoices.length : 0
            };

            const userStats = {
                total: users.length,
                active: users.filter(u => u.Status === 'Active').length,
                managers: users.filter(u => u.roles && u.roles.some(r => r.RoleID === 1)).length,
                receptionists: users.filter(u => u.roles && u.roles.some(r => r.RoleID === 2)).length,
                customers: users.filter(u => u.roles && u.roles.some(r => r.RoleID === 3)).length
            };

            return {
                success: true,
                data: {
                    rooms: roomStats,
                    bookings: bookingStats,
                    revenue: revenueStats,
                    users: userStats
                },
                message: 'Lấy thống kê quản lý thành công'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Không thể lấy thống kê quản lý',
                error: error.response?.data?.message || error.message
            };
        }
    }

    // ===============================
    // 🛠️ HELPER METHODS
    // ===============================

    calculateAverageRating(feedbackList) {
        if (!feedbackList || feedbackList.length === 0) return 0;
        const totalRating = feedbackList.reduce((sum, fb) => sum + (fb.OverallRating || 0), 0);
        return Math.round((totalRating / feedbackList.length) * 10) / 10;
    }

    formatDataForDisplay(data, dataType) {
        if (!data || data.length === 0) {
            return `Không có dữ liệu ${dataType}`;
        }

        switch (dataType) {
            case 'rooms':
                return `📊 **Thông tin phòng (${data.length} phòng):**\n` +
                       data.slice(0, 5).map(room => 
                           `• Phòng ${room.RoomNumber} (${room.TypeName || 'N/A'}) - ${room.Status}`
                       ).join('\n') +
                       (data.length > 5 ? `\n... và ${data.length - 5} phòng khác` : '');

            case 'bookings':
                return `📋 **Thông tin booking (${data.length} booking):**\n` +
                       data.slice(0, 5).map(booking => 
                           `• Booking #${booking.BookingID} - ${booking.BookingStatus} (${new Date(booking.BookingAt).toLocaleDateString()})`
                       ).join('\n') +
                       (data.length > 5 ? `\n... và ${data.length - 5} booking khác` : '');

            case 'users':
                return `👥 **Thông tin người dùng (${data.length} user):**\n` +
                       data.slice(0, 5).map(user => 
                           `• ${user.Username} (${user.FullName || 'N/A'}) - ${user.Status || 'Active'}`
                       ).join('\n') +
                       (data.length > 5 ? `\n... và ${data.length - 5} người dùng khác` : '');

            default:
                return `📊 Có ${data.length} mục dữ liệu`;
        }
    }

    // Kiểm tra quyền truy cập
    hasPermission(userRole, action) {
        const permissions = {
            customer: ['viewOwnData', 'viewOwnBookings', 'viewOwnProfile'],
            receptionist: ['viewOwnData', 'viewOwnBookings', 'viewOwnProfile', 'viewRooms', 'viewAllBookings', 'viewInvoices'],
            manager: ['*'] // Toàn quyền
        };

        const userPermissions = permissions[userRole] || [];
        return userPermissions.includes('*') || userPermissions.includes(action);
    }
}

// Export singleton instance
export default new ChatBotDatabaseService();
