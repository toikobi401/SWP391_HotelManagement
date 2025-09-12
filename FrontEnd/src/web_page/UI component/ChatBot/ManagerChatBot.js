import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleNavigation } from '../../../hooks/useRoleNavigation';
import ChatBotDatabaseService from '../../../services/ChatBotDatabaseService';
import styles from './ChatBot.module.css';

const ManagerChatBot = ({ isOpen, onClose, user }) => {
    const navigate = useNavigate();
    const { executeNavigation, getUserRoles, canAccessRoute } = useRoleNavigation();
    
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Chào mừng Manager! Tôi là Hotel HUB AI Assistant dành cho quản lý.\n\n🏨 **Tính năng quản lý nâng cao:**\n\n📊 **Dashboard & Báo cáo:**\n• Thống kê doanh thu theo thời gian thực\n• Phân tích xu hướng đặt phòng\n• Báo cáo hiệu suất nhân sự\n• Dashboard tổng quan hoạt động\n\n🛏️ **Quản lý phòng & đặt phòng:**\n• Quản lý 120 phòng toàn khách sạn\n• Thêm/sửa/xóa phòng và loại phòng\n• Tạo booking cho walk-in guests\n• Theo dõi occupancy rate\n\n👥 **Quản lý nhân sự & tài khoản:**\n• Phân quyền người dùng (Role Management)\n• Quản lý tài khoản staff\n• Theo dõi ca làm việc\n• Đánh giá hiệu suất\n\n💬 **Quản lý phản hồi:**\n• Xem feedback từ khách hàng\n• Phân tích satisfaction score\n• Trả lời reviews và complaints\n• Cải thiện chất lượng dịch vụ\n\n⚙️ **Cài đặt hệ thống:**\n• Cấu hình khách sạn\n• Quản lý giá phòng và promotion\n• Thiết lập quy trình hoạt động\n• Backup và bảo mật dữ liệu\n\n🗄️ **Truy cập Database Toàn diện:**\n• Xem tất cả dữ liệu hệ thống\n• Quản lý người dùng và phân quyền\n• Thống kê toàn bộ hoạt động\n• Báo cáo doanh thu chi tiết\n\n🧭 **Điều hướng thông minh:**\n*Nói: \"Đi đến quản lý phòng\" hoặc \"Dashboard báo cáo\"*\n\n*Bạn có toàn quyền truy cập tất cả tính năng quản lý! 💼*",
            sender: 'bot',
            timestamp: new Date().toISOString(),
            // ✅ CẬP NHẬT: Quick replies cho manager với tất cả quyền
            quickReplies: [
                '📊 Dashboard tổng quan', 
                '🛏️ Quản lý phòng', 
                '� Quản lý nhân sự',
                '� Doanh thu & báo cáo',
                '💬 Phản hồi khách hàng',
                '🗄️ Thống kê hệ thống',
                '⚙️ Cài đặt hệ thống',
                '🧭 Điều hướng'
            ]
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const getUserRolesList = () => {
        if (!user || !user.roles) return [];
        return user.roles.map(role => role.RoleID || role.roleId || role.id).filter(Boolean);
    };

    // ✅ NEW: Check if message requires database access for manager
    const requiresDatabaseAccess = (message) => {
        const lowerMessage = message.toLowerCase();
        return lowerMessage.includes('doanh thu') || 
               lowerMessage.includes('revenue') || 
               lowerMessage.includes('thống kê') ||
               lowerMessage.includes('báo cáo') ||
               lowerMessage.includes('người dùng') ||
               lowerMessage.includes('user') ||
               lowerMessage.includes('nhân viên') ||
               lowerMessage.includes('staff') ||
               lowerMessage.includes('phòng') ||
               lowerMessage.includes('room') ||
               lowerMessage.includes('booking') ||
               lowerMessage.includes('feedback') ||
               lowerMessage.includes('phản hồi') ||
               lowerMessage.includes('tổng quan') ||
               lowerMessage.includes('dashboard') ||
               lowerMessage.includes('overview');
    };

    // ✅ NEW: Handle database queries for manager (full access)
    const handleDatabaseQuery = async (message) => {
        const lowerMessage = message.toLowerCase();
        
        try {
            if (lowerMessage.includes('tổng quan') || lowerMessage.includes('dashboard') || lowerMessage.includes('overview')) {
                console.log('🔍 Fetching comprehensive manager dashboard data...');
                const result = await ChatBotDatabaseService.getManagerData(message);
                
                if (result.success && result.data) {
                    const data = result.data;
                    const summary = result.data.summary;
                    
                    let responseText = `📊 **Dashboard Tổng Quan Quản Lý:**\n\n`;
                    
                    responseText += `🏨 **Thống Kê Phòng:**\n`;
                    responseText += `• Tổng số phòng: ${summary.totalRooms}\n`;
                    responseText += `• Phòng trống: ${data.rooms.filter(r => r.Status === 'Available').length}\n`;
                    responseText += `• Phòng đang sử dụng: ${data.rooms.filter(r => r.Status === 'Occupied').length}\n`;
                    responseText += `• Tỷ lệ lấp đầy: ${Math.round((data.rooms.filter(r => r.Status === 'Occupied').length / summary.totalRooms) * 100)}%\n\n`;
                    
                    responseText += `📋 **Thống Kê Booking:**\n`;
                    responseText += `• Tổng booking: ${summary.totalBookings}\n`;
                    responseText += `• Booking hôm nay: ${data.bookings.filter(b => 
                        new Date(b.BookingAt).toDateString() === new Date().toDateString()
                    ).length}\n`;
                    responseText += `• Booking Confirmed: ${data.bookings.filter(b => b.BookingStatus === 'Confirmed').length}\n`;
                    responseText += `• Booking Pending: ${data.bookings.filter(b => b.BookingStatus === 'Pending').length}\n\n`;
                    
                    responseText += `👥 **Thống Kê Người Dùng:**\n`;
                    responseText += `• Tổng users: ${summary.totalUsers}\n`;
                    responseText += `• Staff active: ${data.users.filter(u => u.Status === 'Active').length}\n`;
                    responseText += `• Customers: ${data.users.filter(u => u.roles && u.roles.some(r => r.RoleID === 3)).length}\n\n`;
                    
                    responseText += `💰 **Doanh Thu:**\n`;
                    responseText += `• Tổng doanh thu: ${summary.totalRevenue.toLocaleString('vi-VN')} VND\n`;
                    responseText += `• Promotion active: ${summary.activePromotions}\n\n`;
                    
                    responseText += `⭐ **Phản Hồi:**\n`;
                    responseText += `• Tổng feedback: ${data.feedback.length}\n`;
                    responseText += `• Đánh giá trung bình: ${summary.averageRating}/5 ⭐\n`;
                    responseText += `• Feedback hôm nay: ${data.feedback.filter(f => 
                        new Date(f.CreatedAt).toDateString() === new Date().toDateString()
                    ).length}`;
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['💰 Chi tiết doanh thu', '👥 Quản lý nhân sự', '📊 Báo cáo chi tiết', '🏨 Chi tiết phòng']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy dữ liệu tổng quan."
                    };
                }
                
            } else if (lowerMessage.includes('doanh thu') || lowerMessage.includes('revenue')) {
                console.log('🔍 Fetching revenue data for manager...');
                const result = await ChatBotDatabaseService.getManagerData(message);
                
                if (result.success && result.data.invoices) {
                    const invoices = result.data.invoices;
                    const summary = result.data.summary;
                    
                    // Tính toán doanh thu theo thời gian
                    const today = new Date();
                    const todayInvoices = invoices.filter(inv => 
                        new Date(inv.CreatedAt).toDateString() === today.toDateString() && 
                        inv.PaymentStatus === 'Paid'
                    );
                    const thisWeek = invoices.filter(inv => {
                        const invDate = new Date(inv.CreatedAt);
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return invDate >= weekAgo && inv.PaymentStatus === 'Paid';
                    });
                    const thisMonth = invoices.filter(inv => {
                        const invDate = new Date(inv.CreatedAt);
                        return invDate.getMonth() === today.getMonth() && 
                               invDate.getFullYear() === today.getFullYear() && 
                               inv.PaymentStatus === 'Paid';
                    });
                    
                    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
                    const weekRevenue = thisWeek.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
                    const monthRevenue = thisMonth.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
                    
                    let responseText = `💰 **Báo Cáo Doanh Thu Chi Tiết:**\n\n`;
                    
                    responseText += `📊 **Tổng Quan:**\n`;
                    responseText += `• Tổng doanh thu tích lũy: ${summary.totalRevenue.toLocaleString('vi-VN')} VND\n`;
                    responseText += `• Tổng hóa đơn: ${invoices.length}\n`;
                    responseText += `• Hóa đơn đã thanh toán: ${invoices.filter(inv => inv.PaymentStatus === 'Paid').length}\n\n`;
                    
                    responseText += `📅 **Doanh Thu Theo Thời Gian:**\n`;
                    responseText += `• **Hôm nay:** ${todayRevenue.toLocaleString('vi-VN')} VND (${todayInvoices.length} hóa đơn)\n`;
                    responseText += `• **Tuần này:** ${weekRevenue.toLocaleString('vi-VN')} VND (${thisWeek.length} hóa đơn)\n`;
                    responseText += `• **Tháng này:** ${monthRevenue.toLocaleString('vi-VN')} VND (${thisMonth.length} hóa đơn)\n\n`;
                    
                    responseText += `💳 **Trạng Thái Thanh Toán:**\n`;
                    responseText += `• Đã thanh toán: ${invoices.filter(inv => inv.PaymentStatus === 'Paid').length}\n`;
                    responseText += `• Chưa thanh toán: ${invoices.filter(inv => inv.PaymentStatus !== 'Paid').length}\n`;
                    responseText += `• Tỷ lệ thanh toán: ${Math.round((invoices.filter(inv => inv.PaymentStatus === 'Paid').length / invoices.length) * 100)}%`;
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['📈 Xu hướng doanh thu', '💳 Chi tiết thanh toán', '📊 So sánh tháng', '🏨 Doanh thu theo phòng']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy dữ liệu doanh thu."
                    };
                }
                
            } else if (lowerMessage.includes('người dùng') || lowerMessage.includes('nhân viên') || lowerMessage.includes('user') || lowerMessage.includes('staff')) {
                console.log('🔍 Fetching user management data for manager...');
                const result = await ChatBotDatabaseService.getManagerData(message);
                
                if (result.success && result.data.users) {
                    const users = result.data.users;
                    const summary = result.data.summary;
                    
                    // Phân loại users theo role
                    const managers = users.filter(u => u.roles && u.roles.some(r => r.RoleID === 1));
                    const receptionists = users.filter(u => u.roles && u.roles.some(r => r.RoleID === 2));
                    const customers = users.filter(u => u.roles && u.roles.some(r => r.RoleID === 3));
                    const activeUsers = users.filter(u => u.Status === 'Active');
                    
                    let responseText = `👥 **Quản Lý Người Dùng Hệ Thống:**\n\n`;
                    
                    responseText += `📊 **Tổng Quan:**\n`;
                    responseText += `• Tổng số users: ${summary.totalUsers}\n`;
                    responseText += `• Users active: ${activeUsers.length}\n`;
                    responseText += `• Users inactive: ${users.length - activeUsers.length}\n\n`;
                    
                    responseText += `🛡️ **Phân Quyền:**\n`;
                    responseText += `• **Managers:** ${managers.length} người\n`;
                    responseText += `• **Lễ tân:** ${receptionists.length} người\n`;
                    responseText += `• **Khách hàng:** ${customers.length} người\n\n`;
                    
                    if (managers.length > 0) {
                        responseText += `👨‍💼 **Managers:**\n`;
                        responseText += managers.slice(0, 3).map(user => 
                            `• ${user.FullName || user.Username} (${user.Email || 'N/A'}) - ${user.Status}`
                        ).join('\n');
                        if (managers.length > 3) {
                            responseText += `\n... và ${managers.length - 3} manager khác`;
                        }
                        responseText += '\n\n';
                    }
                    
                    if (receptionists.length > 0) {
                        responseText += `🛎️ **Lễ tân:**\n`;
                        responseText += receptionists.slice(0, 5).map(user => 
                            `• ${user.FullName || user.Username} (${user.Status})`
                        ).join('\n');
                        if (receptionists.length > 5) {
                            responseText += `\n... và ${receptionists.length - 5} lễ tân khác`;
                        }
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['➕ Thêm nhân viên', '🔧 Phân quyền', '📊 Thống kê nhân sự', '👥 Chi tiết users']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy dữ liệu người dùng."
                    };
                }
                
            } else if (lowerMessage.includes('feedback') || lowerMessage.includes('phản hồi')) {
                console.log('🔍 Fetching feedback data for manager...');
                const result = await ChatBotDatabaseService.getManagerData(message);
                
                if (result.success && result.data.feedback) {
                    const feedback = result.data.feedback;
                    const summary = result.data.summary;
                    
                    // Phân tích feedback
                    const todayFeedback = feedback.filter(f => 
                        new Date(f.CreatedAt).toDateString() === new Date().toDateString()
                    );
                    const highRatingFeedback = feedback.filter(f => f.OverallRating >= 4);
                    const lowRatingFeedback = feedback.filter(f => f.OverallRating <= 2);
                    
                    let responseText = `💬 **Quản Lý Phản Hồi Khách Hàng:**\n\n`;
                    
                    responseText += `📊 **Tổng Quan:**\n`;
                    responseText += `• Tổng feedback: ${feedback.length}\n`;
                    responseText += `• Đánh giá trung bình: ${summary.averageRating}/5 ⭐\n`;
                    responseText += `• Feedback hôm nay: ${todayFeedback.length}\n\n`;
                    
                    responseText += `⭐ **Phân Tích Đánh Giá:**\n`;
                    responseText += `• Đánh giá cao (≥4⭐): ${highRatingFeedback.length} (${Math.round((highRatingFeedback.length / feedback.length) * 100)}%)\n`;
                    responseText += `• Đánh giá thấp (≤2⭐): ${lowRatingFeedback.length} (${Math.round((lowRatingFeedback.length / feedback.length) * 100)}%)\n\n`;
                    
                    if (lowRatingFeedback.length > 0) {
                        responseText += `⚠️ **Feedback Cần Chú Ý:**\n`;
                        responseText += lowRatingFeedback.slice(0, 3).map((fb, index) => 
                            `${index + 1}. **${fb.OverallRating}⭐** - Booking #${fb.BookingID}\n` +
                            `   💬 "${fb.Comment?.substring(0, 100) || 'Không có comment'}${fb.Comment?.length > 100 ? '...' : ''}"`
                        ).join('\n\n');
                        if (lowRatingFeedback.length > 3) {
                            responseText += `\n\n... và ${lowRatingFeedback.length - 3} feedback khác`;
                        }
                        responseText += '\n\n';
                    }
                    
                    if (highRatingFeedback.length > 0) {
                        responseText += `🌟 **Feedback Tích Cực Gần Đây:**\n`;
                        responseText += highRatingFeedback.slice(-2).map((fb, index) => 
                            `• **${fb.OverallRating}⭐** - "${fb.Comment?.substring(0, 80) || 'Khách hàng hài lòng'}${fb.Comment?.length > 80 ? '...' : ''}"`
                        ).join('\n');
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['💬 Trả lời feedback', '📊 Phân tích chi tiết', '⚠️ Xử lý khiếu nại', '🌟 Feedback tốt']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy dữ liệu feedback."
                    };
                }
                
            } else if (lowerMessage.includes('thống kê') || lowerMessage.includes('báo cáo')) {
                console.log('🔍 Fetching comprehensive stats for manager...');
                const result = await ChatBotDatabaseService.getManagerStats();
                
                if (result.success) {
                    const { rooms, bookings, revenue, users } = result.data;
                    
                    let responseText = `📊 **Báo Cáo Thống Kê Toàn Diện:**\n\n`;
                    
                    if (rooms) {
                        responseText += `🏨 **Thống Kê Phòng:**\n`;
                        responseText += `• Tổng phòng: ${rooms.total || 'N/A'}\n`;
                        responseText += `• Tỷ lệ lấp đầy: ${rooms.occupancyRate || 'N/A'}%\n`;
                        responseText += `• Phòng maintenance: ${rooms.maintenance || 'N/A'}\n\n`;
                    }
                    
                    if (bookings) {
                        responseText += `📋 **Thống Kê Booking:**\n`;
                        responseText += `• Booking tuần này: ${bookings.thisWeek || 'N/A'}\n`;
                        responseText += `• Tỷ lệ check-in đúng hạn: ${bookings.onTimeCheckIn || 'N/A'}%\n`;
                        responseText += `• Booking bị hủy: ${bookings.cancelled || 'N/A'}\n\n`;
                    }
                    
                    if (revenue) {
                        responseText += `💰 **Thống Kê Doanh Thu:**\n`;
                        responseText += `• Doanh thu tháng: ${revenue.thisMonth?.toLocaleString('vi-VN') || 'N/A'} VND\n`;
                        responseText += `• Tăng trưởng: ${revenue.growthRate || 'N/A'}%\n`;
                        responseText += `• ADR (Average Daily Rate): ${revenue.averageDailyRate?.toLocaleString('vi-VN') || 'N/A'} VND\n\n`;
                    }
                    
                    if (users) {
                        responseText += `👥 **Thống Kê Nhân Sự:**\n`;
                        responseText += `• Staff online: ${users.onlineStaff || 'N/A'}\n`;
                        responseText += `• Hiệu suất trung bình: ${users.averagePerformance || 'N/A'}%\n`;
                        responseText += `• Khách hàng mới: ${users.newCustomers || 'N/A'}`;
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['📈 Xu hướng', '💼 Hiệu suất', '📊 So sánh kỳ trước', '🎯 KPI']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy thống kê tổng hợp."
                    };
                }
            }
            
            return { success: false, message: "Không hiểu yêu cầu database." };
            
        } catch (error) {
            console.error('❌ Manager Database query error:', error);
            return {
                success: false,
                message: "Lỗi khi truy cập database. Vui lòng thử lại sau."
            };
        }
    };

    // ✅ NAVIGATION BUTTON COMPONENT
    const NavigationButton = ({ navigationAction }) => {
        if (!navigationAction) return null;

        return (
            <div className={styles['navigation-action']}>
                <button 
                    className={`btn btn-primary btn-sm ${styles['navigation-btn']}`}
                    onClick={() => executeNavigationAction(navigationAction.route)}
                    style={{
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '8px 16px',
                        color: 'white',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginTop: '8px'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    <i className={navigationAction.icon}></i>
                    {` Đi đến ${navigationAction.name}`}
                </button>
            </div>
        );
    };

    // ✅ AVAILABLE ROUTES COMPONENT
    const AvailableRoutes = ({ routes }) => {
        if (!routes || routes.length === 0) return null;

        return (
            <div className={styles['available-routes']}>
                <div className={styles['routes-grid']}>
                    {routes.map((route, index) => (
                        <button 
                            key={index}
                            className={styles['route-button']}
                            style={{ 
                                borderColor: route.color, 
                                color: route.color,
                                background: 'white',
                                border: `1px solid ${route.color}`,
                                borderRadius: '15px',
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                margin: '2px'
                            }}
                            onClick={() => executeNavigationAction(route.route)}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = route.color;
                                e.target.style.color = 'white';
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'white';
                                e.target.style.color = route.color;
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <i className={route.icon}></i>
                            {` ${route.name}`}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const sendMessage = async (messageText = null) => {
        const text = messageText || inputMessage.trim();
        if (!text) return;

        const userMessage = {
            id: Date.now(),
            text: text,
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);

        try {
            const response = await fetch('http://localhost:3000/api/chatbot/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    userRole: 'manager',
                    userId: user?.UserID || null,
                    userName: user?.Fullname || 'Manager',
                    userRoles: getUserRolesList(),
                    sessionId: `manager_${user?.UserID || 'anonymous'}_${Date.now()}`,
                    context: {
                        hasFullAccess: true,
                        hasReportAccess: true,
                        hasStaffAccess: true,
                        canManageAll: true,
                        accessLevel: 'manager',
                        hotelData: true,
                        realtimeData: true
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                const responseText = typeof data.response === 'string' 
                    ? data.response 
                    : JSON.stringify(data.response);

                const botMessage = {
                    id: Date.now() + 1,
                    text: responseText,
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: data.quickReplies || ['📊 Analytics', '💰 Revenue', '👥 Staff', '🧭 Navigation'],
                    navigation: data.navigation || null,
                    isManagerMode: true
                };
                setMessages(prev => [...prev, botMessage]);

                if (data.navigation) {
                    handleNavigationResponse(data.navigation, botMessage.id);
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Manager Chat error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "Hệ thống tạm thời gặp sự cố. Vui lòng:\n\n🔄 Thử lại sau ít phút\n💻 Sử dụng dashboard quản lý trực tiếp\n📞 Liên hệ IT Support: 0865.124.996\n\nCác chức năng offline vẫn khả dụng.",
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true,
                quickReplies: ['🔄 Thử lại', '💻 Dashboard', '📞 IT Support', '🧭 Navigation']
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleNavigationResponse = (navigationData, messageId) => {
        if (navigationData.action === 'NAVIGATE') {
            setMessages(prev => {
                const newMessages = [...prev];
                const messageIndex = newMessages.findIndex(msg => msg.id === messageId);
                if (messageIndex !== -1) {
                    newMessages[messageIndex].navigationAction = navigationData.actionData;
                }
                return newMessages;
            });
        } else if (navigationData.action === 'SHOW_AVAILABLE_ROUTES') {
            setMessages(prev => {
                const newMessages = [...prev];
                const messageIndex = newMessages.findIndex(msg => msg.id === messageId);
                if (messageIndex !== -1) {
                    newMessages[messageIndex].availableRoutes = navigationData.actionData;
                }
                return newMessages;
            });
        }
    };

    const executeNavigationAction = (route) => {
        if (canAccessRoute(route)) {
            navigate(route);
            const successMessage = {
                id: Date.now(),
                text: `✅ Đang chuyển đến trang "${route}"...`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isNavigationSuccess: true
            };
            setMessages(prev => [...prev, successMessage]);
        } else {
            const errorMessage = {
                id: Date.now(),
                text: `❌ Không thể truy cập trang "${route}".`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    // ✅ CẬP NHẬT: Handle quick reply với tất cả routes manager
    const handleQuickReply = (reply) => {
        const routeMap = {
            // ✅ Manager Dashboard routes
            '📊 Dashboard tổng quan': '/manager',
            '💻 Dashboard': '/manager',
            '🧭 Dashboard': '/manager',
            '📊 Dashboard Analytics': '/manager',
            
            // ✅ Manager sub-pages
            '🛏️ Quản lý phòng': '/manager/rooms',
            '🏨 Quản lý phòng': '/manager/rooms',
            '📋 Xem danh sách phòng': '/manager/rooms',
            
            '📅 Tạo booking mới': '/manager/booking',
            '📅 Đặt phòng mới': '/manager/booking',
            '➕ Tạo booking': '/manager/booking',
            
            '➕ Thêm phòng mới': '/manager/addroom',
            '🏨 Thêm phòng': '/manager/addroom',
            
            '💬 Xem phản hồi': '/manager/feedback',
            '📝 Quản lý phản hồi': '/manager/feedback',
            '💬 Feedback khách hàng': '/manager/feedback',
            
            '👥 Quản lý nhân sự': '/manager/staff',
            '👥 Quản lý tài khoản': '/manager/toggleRole',
            '🔐 Phân quyền': '/manager/toggleRole',
            
            '📈 Báo cáo thống kê': '/manager/reports',
            '📊 Xem báo cáo': '/manager/reports',
            '📈 Analytics': '/manager/reports',
            
            '⚙️ Cài đặt hệ thống': '/manager/settings',
            '🔧 Cấu hình': '/manager/settings',
            '⚙️ Settings': '/manager/settings',
            
            // ✅ Navigation options
            '🧭 Điều hướng': null,
            '🧭 Navigation': null,
            '🗺️ Xem tất cả trang': null,
            
            // ✅ Support options  
            '📞 IT Support': 'tel:0865124996',
            '🔄 Thử lại': null,
            '🔄 Refresh': null,
        };

        const route = routeMap[reply];
        if (route === 'tel:0865124996') {
            window.open(route, '_self');
            return;
        } else if (route) {
            executeNavigationAction(route);
            return;
        } else if (reply === '🔄 Thử lại' || reply === '🔄 Refresh') {
            sendMessage('Xin chào Manager, tôi cần hỗ trợ quản lý khách sạn');
            return;
        } else if (reply === '🧭 Điều hướng' || reply === '🧭 Navigation' || reply === '🗺️ Xem tất cả trang') {
            sendMessage('Hiển thị tất cả trang tôi có thể truy cập');
            return;
        }

        sendMessage(reply);
    };

    // ✅ CẬP NHẬT: Get manager quick replies
    const getManagerQuickReplies = (message) => {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('phòng') || lowerMessage.includes('room')) {
            return ['🛏️ Quản lý phòng', '➕ Thêm phòng mới', '📋 Tình trạng phòng', '🔧 Maintenance'];
        } else if (lowerMessage.includes('booking') || lowerMessage.includes('đặt phòng')) {
            return ['📅 Tạo booking mới', '📋 Danh sách booking', '✅ Confirm booking', '❌ Cancel booking'];
        } else if (lowerMessage.includes('nhân sự') || lowerMessage.includes('staff') || lowerMessage.includes('tài khoản')) {
            return ['👥 Quản lý nhân sự', '🔐 Phân quyền', '👤 Thêm tài khoản', '📊 Hiệu suất'];
        } else if (lowerMessage.includes('báo cáo') || lowerMessage.includes('report') || lowerMessage.includes('thống kê')) {
            return ['📈 Báo cáo doanh thu', '📊 Occupancy rate', '💰 Profit analysis', '👥 Customer stats'];
        } else if (lowerMessage.includes('phản hồi') || lowerMessage.includes('feedback')) {
            return ['💬 Xem phản hồi', '⭐ Rating analysis', '📝 Response draft', '🔄 Follow up'];
        } else if (lowerMessage.includes('cài đặt') || lowerMessage.includes('setting') || lowerMessage.includes('cấu hình')) {
            return ['⚙️ Cài đặt hệ thống', '💰 Cấu hình giá', '🎁 Quản lý promotion', '🔒 Bảo mật'];
        }
        
        return [
            '📊 Dashboard tổng quan', 
            '🛏️ Quản lý phòng', 
            '👥 Quản lý nhân sự', 
            '📈 Báo cáo thống kê',
            '💬 Xem phản hồi',
            '⚙️ Cài đặt hệ thống'
        ];
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className={`${styles['chatbot-window']} ${styles.open}`}>
            {/* Header - Updated styling */}
            <div className={styles['chatbot-header']} style={{background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'}}>
                <div className={styles['header-info']}>
                    <div className={styles['bot-avatar']}>
                        <i className="fas fa-shield-alt"></i>
                    </div>
                    <div className={styles['header-text']}>
                        <h4>Manager Executive Assistant</h4>
                        <span className={styles.status}>
                            <span className={styles['status-dot']}></span>
                            🏨 Full Hotel Management Access
                        </span>
                    </div>
                </div>
                <div className={styles['header-actions']}>
                    <button 
                        className={styles['btn-refresh']} 
                        onClick={() => {
                            sendMessage('Cập nhật dashboard và báo cáo mới nhất');
                        }}
                        title="Cập nhật dashboard"
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                    <button 
                        className={styles['btn-close']} 
                        onClick={onClose}
                        title="Đóng chat"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className={styles['chatbot-messages']}>
                {messages.map((message) => (
                    <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                        <div className={styles['message-content']}>
                            <div className={`${styles['message-bubble']} ${
                                message.isError ? styles.error : 
                                message.isManagerMode ? styles.manager : 
                                message.isNavigationSuccess ? styles.success : ''
                            }`}>
                                <p style={{whiteSpace: 'pre-line'}}>{message.text}</p>
                                
                                {/* ✅ NAVIGATION ACTION BUTTON */}
                                {message.navigationAction && (
                                    <NavigationButton navigationAction={message.navigationAction} />
                                )}
                                
                                {/* ✅ AVAILABLE ROUTES */}
                                {message.availableRoutes && (
                                    <AvailableRoutes routes={message.availableRoutes} />
                                )}
                                
                                <span className={styles['message-time']}>
                                    {formatTime(message.timestamp)}
                                </span>
                            </div>
                            
                            {message.quickReplies && message.quickReplies.length > 0 && (
                                <div className={styles['quick-replies']}>
                                    {message.quickReplies.map((reply, index) => (
                                        <button
                                            key={index}
                                            className={styles['quick-reply-btn']}
                                            onClick={() => handleQuickReply(reply)}
                                        >
                                            {reply}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className={`${styles.message} ${styles.bot}`}>
                        <div className={styles['message-content']}>
                            <div className={`${styles['message-bubble']} ${styles.typing}`}>
                                <div className={styles['typing-dots']}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={styles['chatbot-input']}>
                <div className={styles['input-container']}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Tính năng đang phát triển..."
                        disabled={isTyping}
                        maxLength={500}
                    />
                    <button 
                        className={styles['send-button']}
                        onClick={() => sendMessage()}
                        disabled={!inputMessage.trim() || isTyping}
                        style={{background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'}}
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div className={styles['input-footer']}>
                    <small>
                        {inputMessage.length}/500 • 🛠️ Đang phát triển • Coming Soon
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ManagerChatBot;