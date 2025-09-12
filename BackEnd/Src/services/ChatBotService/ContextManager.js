import ChatBotDBContext from '../../dal/ChatBotDBContext.js';
// ✅ IMPORT TẤT CẢ DBContext
import RoomDBContext from '../../dal/RoomDBContext.js';
import RoomTypeDBContext from '../../dal/RoomTypeDBContext.js';
import BookingDBContext from '../../dal/BookingDBContext.js';
import BookingRoomDBContext from '../../dal/BookingRoomDBContext.js';
import BookingServiceDBContext from '../../dal/BookingServiceDBContext.js';
import BookingPromotionDBContext from '../../dal/BookingPromotionDBContext.js';
import GuestDBContext from '../../dal/GuestDBContext.js';
import UserDBContext from '../../dal/UserDBContext.js';
import ServiceDBContext from '../../dal/ServiceDBContext.js';
import PromotionDBContext from '../../dal/PromotionDBContext.js';
import PaymentDBContext from '../../dal/PaymentDBContext.js';
import AmenityDBContext from '../../dal/AmenityDBContext.js';
import RoleDBContext from '../../dal/RoleDBContext.js';

class ContextManager {
    constructor() {
        // ✅ KHỞI TẠO TẤT CẢ DBContext
        this.dbContext = new ChatBotDBContext();
        this.roomDB = new RoomDBContext();
        this.roomTypeDB = new RoomTypeDBContext();
        this.bookingDB = new BookingDBContext();
        this.bookingRoomDB = new BookingRoomDBContext();
        this.bookingServiceDB = new BookingServiceDBContext();
        this.bookingPromotionDB = new BookingPromotionDBContext();
        this.guestDB = new GuestDBContext();
        this.userDB = new UserDBContext();
        this.serviceDB = new ServiceDBContext();
        this.promotionDB = new PromotionDBContext();
        this.paymentDB = new PaymentDBContext();
        this.amenityDB = new AmenityDBContext();
        this.roleDB = new RoleDBContext();
        
        // Cache for database data
        this.dataCache = {
            rooms: null,
            roomTypes: null,
            availableRooms: null,
            bookings: null,
            todayBookings: null,
            guests: null,
            users: null,
            services: null,
            promotions: null,
            payments: null,
            amenities: null,
            roles: null,
            bookingStats: null,
            databaseCounts: null,
            lastUpdate: null
        };
        
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes

        this.hotelContext = `
        Bạn là AI Assistant thông minh của Hotel HUB - khách sạn 5 sao hàng đầu tại Việt Nam.
        
        🏨 THÔNG TIN KHÁCH SẠN:
        - Tên: Hotel HUB
        - Địa chỉ: FPT University, Khu CNC Hòa Lạc, Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất, Hà Nội
        - Hotline: 0865.124.996 (24/7)
        - Email: datltthe194235@gmail.com
        - Website: hotelhub.vn
        - Check-in: 14:00 | Check-out: 12:00
        
        🛏️ LOẠI PHÒNG & GIÁ:
        - Phòng Standard: 100.000đ - 200.000đ/đêm
        - Phòng Deluxe: 250.000đ - 400.000đ/đêm
        - Phòng Family: 400.000đ - 600.000đ/đêm
        - Suite VIP: 700.000đ - 1.200.000đ/đêm
        - Penthouse: 1.500.000đ - 2.000.000đ/đêm
        
        🎯 TIỆN NGHI:
        - WiFi miễn phí tốc độ cao
        - Hồ bơi rooftop với view 360°
        - Gym & Spa hiện đại 24/7
        - Nhà hàng buffet quốc tế
        - Sky bar tầng 25
        - Bãi đỗ xe ngầm miễn phí
        - Dịch vụ phòng 24/7
        
        💳 THANH TOÁN:
        - Tiền mặt, Thẻ tín dụng
        - VNPay, MoMo, ZaloPay
        - QR Banking (Vietcombank, Techcombank, etc.)
        - Chuyển khoản ngân hàng
        
        🎁 KHUYẾN MÃI HIỆN TẠI:
        - "Happy Hour": Giảm 30% đặt phòng 18h-20h
        - "Weekend Special": Ở 2 đêm tặng 1 đêm
        - "Student Discount": Sinh viên giảm 20%
        - "Birthday Month": Giảm 50% tháng sinh nhật
        
        📱 DỊCH VỤ ONLINE:
        - Đặt phòng website hotelhub.vn
        - Mobile app Hotel HUB
        - QR check-in tự động
        - Smart room control
        
        🎯 HƯỚNG DẪN TRẢ LỜI:
        - Thân thiện, chuyên nghiệp như concierge 5 sao
        - Trả lời bằng tiếng Việt chuẩn, lịch sự
        - Thông tin chính xác, nếu không chắc thì hướng dẫn liên hệ
        - Đề xuất dịch vụ phù hợp, upsell tinh tế
        - Luôn hỏi thêm để hỗ trợ tốt hơn
        `;
    }

    // ✅ Load comprehensive database data
    async loadDatabaseData() {
        try {
            const now = new Date();
            
            // Check cache validity
            if (this.dataCache.lastUpdate && 
                (now - this.dataCache.lastUpdate) < this.cacheTimeout) {
                console.log('✅ Using cached database data');
                return this.dataCache;
            }

            console.log('🔄 Loading comprehensive data from all database contexts...');

            // ✅ Load data from all DBContext với Promise.allSettled
            const [
                rooms, roomTypes, availableRooms, bookings, todayBookings,
                guests, users, services, promotions, payments, amenities, roles,
                bookingStats, databaseCounts
            ] = await Promise.allSettled([
                this.loadRoomsData(),
                this.loadRoomTypesData(),
                this.loadAvailableRoomsData(),
                this.loadBookingsData(),
                this.loadTodayBookingsData(),
                this.loadGuestsData(),
                this.loadUsersData(),
                this.loadServicesData(),
                this.loadPromotionsData(),
                this.loadPaymentsData(),
                this.loadAmenitiesData(),
                this.loadRolesData(),
                this.loadBookingStats(),
                this.loadDatabaseCounts()
            ]);

            // ✅ Update cache with all data
            this.dataCache = {
                rooms: rooms.status === 'fulfilled' ? rooms.value : [],
                roomTypes: roomTypes.status === 'fulfilled' ? roomTypes.value : [],
                availableRooms: availableRooms.status === 'fulfilled' ? availableRooms.value : [],
                bookings: bookings.status === 'fulfilled' ? bookings.value : [],
                todayBookings: todayBookings.status === 'fulfilled' ? todayBookings.value : [],
                guests: guests.status === 'fulfilled' ? guests.value : [],
                users: users.status === 'fulfilled' ? users.value : [],
                services: services.status === 'fulfilled' ? services.value : [],
                promotions: promotions.status === 'fulfilled' ? promotions.value : [],
                payments: payments.status === 'fulfilled' ? payments.value : [],
                amenities: amenities.status === 'fulfilled' ? amenities.value : [],
                roles: roles.status === 'fulfilled' ? roles.value : [],
                bookingStats: bookingStats.status === 'fulfilled' ? bookingStats.value : {},
                databaseCounts: databaseCounts.status === 'fulfilled' ? databaseCounts.value : {},
                lastUpdate: now
            };

            console.log('✅ Comprehensive database data loaded successfully', {
                rooms: this.dataCache.rooms.length,
                roomTypes: this.dataCache.roomTypes.length,
                availableRooms: this.dataCache.availableRooms.length,
                bookings: this.dataCache.bookings.length,
                guests: this.dataCache.guests.length,
                services: this.dataCache.services.length,
                promotions: this.dataCache.promotions.length,
                users: this.dataCache.users.length
            });

            return this.dataCache;
        } catch (error) {
            console.error('❌ Error loading comprehensive database data:', error);
            return this.dataCache;
        }
    }

    // ✅ Individual data loading methods
    async loadRoomsData() {
        try {
            const result = await this.roomDB.getAll();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading rooms:', error);
            return [];
        }
    }

    async loadRoomTypesData() {
        try {
            const result = await this.roomTypeDB.getAll();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading room types:', error);
            return [];
        }
    }

    async loadAvailableRoomsData() {
        try {
            const result = await this.roomDB.getAvailableRooms();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading available rooms:', error);
            return [];
        }
    }

    async loadBookingsData() {
        try {
            // ✅ SỬA: BookingDBContext sử dụng list() thay vì getAll()
            const result = await this.bookingDB.list();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading bookings:', error);
            return [];
        }
    }

    async loadTodayBookingsData() {
        try {
            // ✅ SỬA: Sử dụng list() và filter theo ngày thay vì getBookingsByDate()
            const allBookings = await this.bookingDB.list();
            const today = new Date().toISOString().split('T')[0];
            
            if (Array.isArray(allBookings)) {
                return allBookings.filter(booking => {
                    const bookingDate = new Date(booking.CreateAt || booking.BookingAt).toISOString().split('T')[0];
                    return bookingDate === today;
                });
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading today bookings:', error);
            return [];
        }
    }

    async loadGuestsData() {
        try {
            // ✅ SỬA: GuestDBContext có list() method
            const result = await this.guestDB.list();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading guests:', error);
            return [];
        }
    }

    async loadUsersData() {
        try {
            // ✅ SỬA: UserDBContext sử dụng list() thay vì getAll()
            const result = await this.userDB.list();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading users:', error);
            return [];
        }
    }

    async loadServicesData() {
        try {
            // ✅ SỬA: ServiceDBContext có getAll() method
            const result = await this.serviceDB.getAll();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading services:', error);
            return [];
        }
    }

    async loadPromotionsData() {
        try {
            // ✅ SỬA: PromotionDBContext sử dụng list() thay vì getAll()
            const result = await this.promotionDB.list();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading promotions:', error);
            return [];
        }
    }

    async loadPaymentsData() {
        try {
            // ✅ SỬA: PaymentDBContext không có list() method, bỏ qua loading payments
            console.log('⚠️ PaymentDBContext does not have list() method, skipping payments data');
            return [];
        } catch (error) {
            console.error('❌ Error loading payments:', error);
            return [];
        }
    }

    async loadAmenitiesData() {
        try {
            // ✅ SỬA: AmenityDBContext sử dụng getAllAmenities() thay vì getAll()
            const result = await this.amenityDB.getAllAmenities();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading amenities:', error);
            return [];
        }
    }

    async loadRolesData() {
        try {
            // ✅ SỬA: RoleDBContext có list() method
            const result = await this.roleDB.list();
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('❌ Error loading roles:', error);
            return [];
        }
    }

    // ✅ THÊM: Method để lấy thống kê user theo role
    async getUserRoleStats() {
        try {
            console.log('🔍 Loading user role statistics...');
            
            // Lấy dữ liệu users và roles từ cache hoặc database
            const users = this.dataCache.users || await this.loadUsersData();
            const roles = this.dataCache.roles || await this.loadRolesData();
            
            if (!Array.isArray(users) || !Array.isArray(roles)) {
                console.warn('⚠️ Users or roles data not available');
                return [];
            }

            // Tạo map role statistics
            const roleStatsMap = {};
            
            // Initialize với roles có sẵn
            roles.forEach(role => {
                roleStatsMap[role.RoleID] = {
                    RoleID: role.RoleID,
                    RoleName: role.RoleName,
                    Description: role.Description,
                    UserCount: 0,
                    users: []
                };
            });
            
            // Đếm users theo role
            users.forEach(user => {
                if (user.roles && Array.isArray(user.roles)) {
                    user.roles.forEach(userRole => {
                        const roleId = userRole.RoleID;
                        if (roleStatsMap[roleId]) {
                            roleStatsMap[roleId].UserCount++;
                            roleStatsMap[roleId].users.push({
                                UserID: user.UserID,
                                FullName: user.FullName || user.Fullname,
                                Username: user.Username,
                                Status: user.Status
                            });
                        }
                    });
                }
            });
            
            // Convert to array và sort theo UserCount
            const roleStats = Object.values(roleStatsMap)
                .sort((a, b) => b.UserCount - a.UserCount);
            
            console.log('📊 Role statistics generated:', roleStats.map(r => `${r.RoleName}: ${r.UserCount}`));
            return roleStats;
            
        } catch (error) {
            console.error('❌ Error getting user role stats:', error);
            return [];
        }
    }

    async loadBookingStats() {
        try {
            const result = await this.dbContext.getBookingStats();
            return result || {};
        } catch (error) {
            console.error('❌ Error loading booking stats:', error);
            return {};
        }
    }

    async loadDatabaseCounts() {
        try {
            const result = await this.dbContext.getDatabaseCounts();
            return result || {};
        } catch (error) {
            console.error('❌ Error loading database counts:', error);
            return {};
        }
    }

    // ✅ Build enhanced dynamic context with all data
    async buildDynamicContext() {
        const data = await this.loadDatabaseData();
        
        let dynamicContext = "\n\n📊 DỮ LIỆU THỜI GIAN THỰC TỪ CƠ SỞ DỮ LIỆU:\n\n";

        // ✅ Room Types với thống kê chi tiết
        if (data.roomTypes && data.roomTypes.length > 0) {
            dynamicContext += "🛏️ LOẠI PHÒNG HIỆN CÓ:\n";
            data.roomTypes.forEach(type => {
                dynamicContext += `- ${type.TypeName}: ${type.BasePrice?.toLocaleString('vi-VN')}đ/đêm`;
                if (type.TotalRooms) dynamicContext += ` (${type.TotalRooms} phòng)`;
                if (type.AvailableRooms) dynamicContext += ` - Còn trống: ${type.AvailableRooms}`;
                if (type.Description) dynamicContext += ` - ${type.Description}`;
                dynamicContext += `\n`;
            });
            dynamicContext += "\n";
        }

        // ✅ Available Rooms với chi tiết vị trí
        if (data.availableRooms && data.availableRooms.length > 0) {
            dynamicContext += `🟢 PHÒNG CÒN TRỐNG (${data.availableRooms.length} phòng):\n`;
            const roomsByType = {};
            data.availableRooms.forEach(room => {
                if (!roomsByType[room.TypeName]) {
                    roomsByType[room.TypeName] = [];
                }
                roomsByType[room.TypeName].push({
                    number: room.RoomNumber,
                    floor: room.Floor,
                    price: room.CurrentPrice
                });
            });

            Object.keys(roomsByType).forEach(typeName => {
                const rooms = roomsByType[typeName];
                dynamicContext += `- ${typeName}: `;
                dynamicContext += rooms.slice(0, 3).map(r => 
                    `${r.number}(T${r.floor})`
                ).join(', ');
                if (rooms.length > 3) {
                    dynamicContext += ` (+${rooms.length - 3} phòng khác)`;
                }
                dynamicContext += `\n`;
            });
            dynamicContext += "\n";
        }

        // ✅ Today's Bookings
        if (data.todayBookings && data.todayBookings.length > 0) {
            dynamicContext += `📅 BOOKING HÔM NAY (${data.todayBookings.length} booking):\n`;
            const statusCount = {};
            data.todayBookings.forEach(booking => {
                statusCount[booking.BookingStatus] = (statusCount[booking.BookingStatus] || 0) + 1;
            });
            
            Object.entries(statusCount).forEach(([status, count]) => {
                dynamicContext += `- ${status}: ${count} booking\n`;
            });
            dynamicContext += "\n";
        }

        // ✅ Active Promotions
        if (data.promotions && data.promotions.length > 0) {
            const activePromotions = data.promotions.filter(p => 
                new Date(p.EndDate) > new Date()
            );
            
            if (activePromotions.length > 0) {
                dynamicContext += "🎁 KHUYẾN MÃI ĐANG DIỄN RA:\n";
                activePromotions.forEach(promo => {
                    dynamicContext += `- ${promo.PromotionName}: Giảm ${promo.DiscountPercent}%`;
                    if (promo.EndDate) {
                        const endDate = new Date(promo.EndDate).toLocaleDateString('vi-VN');
                        dynamicContext += ` (đến ${endDate})`;
                    }
                    dynamicContext += `\n`;
                    if (promo.Description) dynamicContext += `  ${promo.Description}\n`;
                });
                dynamicContext += "\n";
            }
        }

        // ✅ Services Available
        if (data.services && data.services.length > 0) {
            dynamicContext += "🏨 DỊCH VỤ KHÁCH SẠN:\n";
            const serviceCategories = {};
            data.services.forEach(service => {
                const category = service.Category || 'General';
                if (!serviceCategories[category]) {
                    serviceCategories[category] = [];
                }
                serviceCategories[category].push(service);
            });

            Object.entries(serviceCategories).forEach(([category, services]) => {
                dynamicContext += `📋 ${category}:\n`;
                services.slice(0, 3).forEach(service => {
                    dynamicContext += `  • ${service.ServiceName}`;
                    if (service.Price) dynamicContext += `: ${service.Price.toLocaleString('vi-VN')}đ`;
                    dynamicContext += `\n`;
                });
                if (services.length > 3) {
                    dynamicContext += `  • ...và ${services.length - 3} dịch vụ khác\n`;
                }
            });
            dynamicContext += "\n";
        }

        // ✅ Guest Statistics
        if (data.guests && data.guests.length > 0) {
            dynamicContext += `👥 THỐNG KÊ KHÁCH HÀNG:\n`;
            dynamicContext += `- Tổng số khách đăng ký: ${data.guests.length}\n`;
            
            const vipGuests = data.guests.filter(g => g.MembershipLevel === 'VIP').length;
            if (vipGuests > 0) {
                dynamicContext += `- Khách VIP: ${vipGuests}\n`;
            }
            dynamicContext += "\n";
        }

        // ✅ Staff Information
        if (data.users && data.users.length > 0) {
            const staffByRole = {};
            data.users.forEach(user => {
                const roleName = user.RoleName || 'Unknown';
                staffByRole[roleName] = (staffByRole[roleName] || 0) + 1;
            });

            dynamicContext += "👨‍💼 NHÂN SỰ HIỆN TẠI:\n";
            Object.entries(staffByRole).forEach(([role, count]) => {
                dynamicContext += `- ${role}: ${count} người\n`;
            });
            dynamicContext += "\n";
        }

        // ✅ System Statistics
        if (data.bookingStats && Object.keys(data.bookingStats).length > 0) {
            dynamicContext += "📈 THỐNG KÊ HÔM NAY:\n";
            if (data.bookingStats.TotalBookings) {
                dynamicContext += `- Tổng booking: ${data.bookingStats.TotalBookings}\n`;
            }
            if (data.bookingStats.OnlineBookings) {
                dynamicContext += `- Online booking: ${data.bookingStats.OnlineBookings}\n`;
            }
            if (data.bookingStats.WalkInBookings) {
                dynamicContext += `- Walk-in: ${data.bookingStats.WalkInBookings}\n`;
            }
            if (data.bookingStats.TotalRevenue) {
                dynamicContext += `- Doanh thu: ${data.bookingStats.TotalRevenue.toLocaleString('vi-VN')}đ\n`;
            }
            if (data.bookingStats.AverageGuests) {
                dynamicContext += `- TB khách/booking: ${data.bookingStats.AverageGuests}\n`;
            }
            dynamicContext += "\n";
        }

        dynamicContext += "⏰ Cập nhật lúc: " + new Date().toLocaleString('vi-VN') + "\n";
        dynamicContext += "🔄 Cache sẽ refresh sau 30 phút\n";
        
        return dynamicContext;
    }

    // ✅ Query specific data by intent
    async queryDataByIntent(intentData) {
        try {
            const { subtype, queryType } = intentData;
            
            console.log('🔍 Querying data by intent:', { subtype, queryType });
            
            switch (subtype) {
                case 'rooms':
                    return await this.queryRoomsData(queryType);
                    
                case 'bookings':
                    return await this.queryBookingsData(queryType);
                    
                case 'pricing':
                    return await this.queryPricingData(queryType);
                    
                case 'services':
                    return await this.queryServicesData(queryType);
                    
                case 'reports':
                    return await this.queryReportsData(queryType);
                    
                case 'staff':
                    return await this.queryStaffData(queryType);
                    
                default:
                    return await this.loadDatabaseData();
            }
        } catch (error) {
            console.error('❌ Error querying data by intent:', error);
            return null;
        }
    }

    // ✅ Specific query methods
    async queryRoomsData(queryType) {
        switch (queryType) {
            case 'available_rooms':
                return await this.loadAvailableRoomsData();
            case 'room_types':
                return await this.loadRoomTypesData();
            case 'room_status':
                return await this.loadRoomsData();
            default:
                return await this.loadRoomsData();
        }
    }

    async queryBookingsData(queryType) {
        switch (queryType) {
            case 'today_bookings':
                return await this.loadTodayBookingsData();
            case 'checkin_list':
                // Implementation for check-in list
                return await this.loadTodayBookingsData();
            case 'checkout_list':
                // Implementation for check-out list
                return await this.loadTodayBookingsData();
            default:
                return await this.loadBookingsData();
        }
    }

    async queryPricingData(queryType) {
        switch (queryType) {
            case 'price_list':
                return await this.loadRoomTypesData();
            case 'promotions':
                return await this.loadPromotionsData();
            default:
                return {
                    roomTypes: await this.loadRoomTypesData(),
                    promotions: await this.loadPromotionsData()
                };
        }
    }

    async queryServicesData(queryType) {
        return await this.loadServicesData();
    }

    async queryReportsData(queryType) {
        return {
            bookingStats: await this.loadBookingStats(),
            databaseCounts: await this.loadDatabaseCounts()
        };
    }

    async queryStaffData(queryType) {
        return {
            users: await this.loadUsersData(),
            roles: await this.loadRolesData()
        };
    }

    // ✅ Get hotel context
    getHotelContext() {
        return this.hotelContext;
    }

    // ✅ Get enhanced local context for prompts
    getLocalContext() {
        const currentTime = new Date().toLocaleString('vi-VN');
        
        return `
        🌍 THÔNG TIN KHU VỰC HÀ NỘI:
        - Thủ đô: Hà Nội, Việt Nam
        - Khí hậu: Nhiệt đới gió mùa, 4 mùa rõ rệt
        - Dân số: Khoảng 8 triệu người
        - Múi giờ: UTC+7 (Giờ Đông Dương)
        - Ngôn ngữ: Tiếng Việt (chính), Tiếng Anh (du lịch)
        
        🌤️ THÔNG TIN THỜI TIẾT HÀ NỘI (Cập nhật ${currentTime}):
        - Mùa xuân (Feb-Apr): 18-25°C, mát mẻ, ít mưa, thời tiết dễ chịu
        - Mùa hè (May-Aug): 25-35°C, nóng ẩm, mưa nhiều, cần chuẩn bị kỹ
        - Mùa thu (Sep-Nov): 20-28°C, mát mẻ, đẹp nhất năm, lý tưởng
        - Mùa đông (Dec-Jan): 10-20°C, lạnh, khô ráo, cần giữ ấm
        
        🚗 GIAO THÔNG & DI CHUYỂN:
        - Từ sân bay Nội Bài đến Hotel HUB: 25km, 35-45 phút
        - Taxi/Grab: 15.000-20.000đ/km
        - Xe buýt: Route 86 (Nội Bài - Hòa Lạc), 30.000đ
        - Thuê xe máy: 150.000-200.000đ/ngày (cần bằng lái)
        
        🗺️ ĐỊA ĐIỂM THAM QUAN GẦN HOTEL HUB:
        - Chùa Hương: 15km, 30 phút (tâm linh, thiên nhiên)
        - Ba Vì National Park: 40km, 1 giờ (leo núi, camping)
        - Đầm Vạc - Vân Hòa: 20km, 40 phút (chèo thuyền, cảnh đẹp)
        - Phố Cổ Hà Nội: 45km, 1 giờ (văn hóa, ẩm thực)
        
        🍜 ẨM THỰC ĐỊA PHƯƠNG:
        - Phở Bò: 50.000-80.000đ/tô (đặc sản sáng)
        - Bún Chả: 60.000-100.000đ/suất (món trưa nổi tiếng)
        - Bánh Mì: 20.000-40.000đ/ổ (ăn vặt tiện lợi)
        - Cà Phê: 25.000-50.000đ/ly (văn hóa cafe Hà Nội)
        `;
    }

    // ✅ Refresh cache
    async refreshCache() {
        console.log('🔄 Force refreshing all database cache...');
        this.dataCache.lastUpdate = null;
        return await this.loadDatabaseData();
    }

    // ✅ Get cache status
    getCacheStatus() {
        return {
            hasCache: !!this.dataCache.lastUpdate,
            lastUpdate: this.dataCache.lastUpdate,
            cacheAge: this.dataCache.lastUpdate ? 
                Math.floor((new Date() - this.dataCache.lastUpdate) / 1000) : 0,
            dataCount: {
                rooms: this.dataCache.rooms?.length || 0,
                roomTypes: this.dataCache.roomTypes?.length || 0,
                availableRooms: this.dataCache.availableRooms?.length || 0,
                bookings: this.dataCache.bookings?.length || 0,
                todayBookings: this.dataCache.todayBookings?.length || 0,
                guests: this.dataCache.guests?.length || 0,
                users: this.dataCache.users?.length || 0,
                services: this.dataCache.services?.length || 0,
                promotions: this.dataCache.promotions?.length || 0,
                payments: this.dataCache.payments?.length || 0,
                amenities: this.dataCache.amenities?.length || 0,
                roles: this.dataCache.roles?.length || 0
            },
            totalRecords: Object.values(this.dataCache)
                .filter(Array.isArray)
                .reduce((sum, arr) => sum + arr.length, 0)
        };
    }

    // ✅ Get database connection status
    async getDatabaseStatus() {
        const connectionTests = {};
        
        try {
            // Test all database connections
            const connections = [
                { name: 'ChatBot', db: this.dbContext },
                { name: 'Room', db: this.roomDB },
                { name: 'RoomType', db: this.roomTypeDB },
                { name: 'Booking', db: this.bookingDB },
                { name: 'Guest', db: this.guestDB },
                { name: 'User', db: this.userDB },
                { name: 'Service', db: this.serviceDB },
                { name: 'Promotion', db: this.promotionDB }
            ];

            for (const { name, db } of connections) {
                try {
                    await db.pool; // Test connection
                    connectionTests[name] = 'Connected';
                } catch (error) {
                    connectionTests[name] = 'Failed: ' + error.message;
                }
            }

            return {
                success: true,
                connections: connectionTests,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                connections: connectionTests
            };
        }
    }
}

export default ContextManager;