import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleNavigation } from '../../../hooks/useRoleNavigation';
import ChatBotDatabaseService from '../../../services/ChatBotDatabaseService';
import styles from './ChatBot.module.css';

const ReceptionistChatBot = ({ isOpen, onClose, user }) => {
    const navigate = useNavigate();
    const { executeNavigation, getUserRoles, canAccessRoute } = useRoleNavigation();
    
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Xin chào! Tôi là Hotel HUB AI Assistant dành cho lễ tân. Tôi có thể hỗ trợ bạn:\n\n🏨 **Quản lý phòng thông minh:**\n• Kiểm tra tình trạng 120 phòng real-time\n• Cập nhật trạng thái phòng nhanh chóng\n• Thống kê occupancy và availability\n• Quản lý booking và reservation\n\n👥 **Hỗ trợ khách hàng chuyên nghiệp:**\n• Trả lời thông tin phòng và dịch vụ\n• Xử lý yêu cầu đặc biệt của khách\n• Hướng dẫn check-in/check-out\n• Giải quyết khiếu nại và phản hồi\n\n💰 **Quản lý thanh toán:**\n• Xử lý các phương thức thanh toán\n• In hóa đơn và receipt\n• Theo dõi doanh thu theo ca\n• Báo cáo payment method statistics\n\n📊 **Báo cáo và thống kê:**\n• Báo cáo hoạt động hàng ngày\n• Thống kê booking patterns\n• Occupancy rate analysis\n• Guest feedback summary\n\n🌤️ **Thông tin du lịch Hà Nội:**\n• Thời tiết và khí hậu theo mùa\n• Địa điểm tham quan gần hotel\n• Hướng dẫn di chuyển cho khách\n• Gợi ý ẩm thực địa phương\n\n📝 **AI Assistant cho công việc:**\n• Viết email thông báo cho khách\n• Tạo thông báo nội bộ\n• Phân tích feedback và review\n• Hướng dẫn quy trình hotel\n\n🗄️ **Truy cập Database:**\n• Xem thông tin phòng và trạng thái\n• Quản lý booking và check-in/out\n• Xem hóa đơn và thanh toán\n• Thống kê hoạt động lễ tân\n\n*Chúc bạn làm việc hiệu quả! Hãy hỏi tôi bất cứ điều gì bạn cần.* 💪",
            sender: 'bot',
            timestamp: new Date().toISOString(),
            quickReplies: ['🏨 Tình trạng phòng', '📋 Booking hôm nay', '� Hóa đơn', '📊 Thống kê', '🌤️ Thời tiết HN']
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

    // ✅ NEW: Check if message requires database access for receptionist
    const requiresDatabaseAccess = (message) => {
        const lowerMessage = message.toLowerCase();
        return lowerMessage.includes('phòng') || 
               lowerMessage.includes('booking') || 
               lowerMessage.includes('hóa đơn') ||
               lowerMessage.includes('invoice') ||
               lowerMessage.includes('thanh toán') ||
               lowerMessage.includes('thống kê') ||
               lowerMessage.includes('tình trạng') ||
               lowerMessage.includes('trạng thái') ||
               lowerMessage.includes('available') ||
               lowerMessage.includes('occupied');
    };

    // ✅ NEW: Handle database queries for receptionist
    const handleDatabaseQuery = async (message) => {
        const lowerMessage = message.toLowerCase();
        
        try {
            if (lowerMessage.includes('phòng') || lowerMessage.includes('tình trạng') || lowerMessage.includes('trạng thái')) {
                console.log('🔍 Fetching room data for receptionist...');
                const result = await ChatBotDatabaseService.getReceptionistData(message);
                
                if (result.success && result.data.rooms) {
                    const rooms = result.data.rooms;
                    const summary = result.data.summary;
                    
                    let responseText = `🏨 **Tình trạng phòng hiện tại:**\n\n`;
                    responseText += `📊 **Tổng quan:**\n`;
                    responseText += `• Tổng số phòng: ${summary.totalRooms}\n`;
                    responseText += `• Phòng trống: ${summary.availableRoomsCount}\n`;
                    responseText += `• Booking hôm nay: ${summary.todayBookings}\n\n`;
                    
                    // Hiển thị phòng theo trạng thái
                    const availableRooms = rooms.filter(r => r.Status === 'Available');
                    const occupiedRooms = rooms.filter(r => r.Status === 'Occupied');
                    const maintenanceRooms = rooms.filter(r => r.Status === 'Maintenance');
                    
                    if (availableRooms.length > 0) {
                        responseText += `✅ **Phòng trống (${availableRooms.length}):**\n`;
                        responseText += availableRooms.slice(0, 10).map(room => 
                            `• Phòng ${room.RoomNumber} (${room.TypeName || 'N/A'}) - Tầng ${room.Floor}`
                        ).join('\n');
                        if (availableRooms.length > 10) {
                            responseText += `\n... và ${availableRooms.length - 10} phòng khác`;
                        }
                        responseText += '\n\n';
                    }
                    
                    if (occupiedRooms.length > 0) {
                        responseText += `🛏️ **Phòng đang sử dụng (${occupiedRooms.length}):**\n`;
                        responseText += occupiedRooms.slice(0, 5).map(room => 
                            `• Phòng ${room.RoomNumber} (${room.TypeName || 'N/A'})`
                        ).join('\n');
                        if (occupiedRooms.length > 5) {
                            responseText += `\n... và ${occupiedRooms.length - 5} phòng khác`;
                        }
                        responseText += '\n\n';
                    }
                    
                    if (maintenanceRooms.length > 0) {
                        responseText += `🔧 **Phòng bảo trì (${maintenanceRooms.length}):**\n`;
                        responseText += maintenanceRooms.map(room => 
                            `• Phòng ${room.RoomNumber} (${room.TypeName || 'N/A'})`
                        ).join('\n');
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['🔄 Cập nhật trạng thái', '📋 Booking hôm nay', '🏨 Phòng trống', '💰 Hóa đơn']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy thông tin phòng."
                    };
                }
                
            } else if (lowerMessage.includes('booking')) {
                console.log('🔍 Fetching booking data for receptionist...');
                const result = await ChatBotDatabaseService.getReceptionistData(message);
                
                if (result.success && result.data.bookings) {
                    const bookings = result.data.bookings;
                    const summary = result.data.summary;
                    
                    let responseText = `📋 **Thông tin booking:**\n\n`;
                    responseText += `📊 **Tổng quan:** ${bookings.length} booking\n`;
                    responseText += `📅 **Hôm nay:** ${summary.todayBookings} booking\n\n`;
                    
                    if (bookings.length === 0) {
                        responseText += "Không có booking nào.\n\n🏨 Sẵn sàng đón khách mới!";
                    } else {
                        // Booking hôm nay
                        const todayBookings = bookings.filter(b => 
                            new Date(b.BookingAt).toDateString() === new Date().toDateString()
                        );
                        
                        if (todayBookings.length > 0) {
                            responseText += `📅 **Booking hôm nay (${todayBookings.length}):**\n`;
                            responseText += todayBookings.slice(0, 5).map((booking, index) => 
                                `${index + 1}. **Booking #${booking.BookingID}**\n` +
                                `   👤 Khách: ${booking.GuestName || 'N/A'}\n` +
                                `   📊 Trạng thái: ${booking.BookingStatus}\n` +
                                `   🏨 Loại phòng: ${booking.RoomTypes || 'N/A'}`
                            ).join('\n\n');
                            
                            if (todayBookings.length > 5) {
                                responseText += `\n\n... và ${todayBookings.length - 5} booking khác`;
                            }
                        }
                        
                        // Booking cần xử lý
                        const pendingBookings = bookings.filter(b => 
                            ['Pending', 'Confirmed'].includes(b.BookingStatus)
                        );
                        
                        if (pendingBookings.length > 0) {
                            responseText += `\n\n⏳ **Booking cần xử lý (${pendingBookings.length}):**\n`;
                            responseText += pendingBookings.slice(0, 3).map(booking => 
                                `• #${booking.BookingID} - ${booking.BookingStatus} (${new Date(booking.BookingAt).toLocaleDateString('vi-VN')})`
                            ).join('\n');
                        }
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['📋 Chi tiết booking', '🏨 Tình trạng phòng', '✅ Check-in', '💰 Hóa đơn']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy thông tin booking."
                    };
                }
                
            } else if (lowerMessage.includes('hóa đơn') || lowerMessage.includes('invoice') || lowerMessage.includes('thanh toán')) {
                console.log('🔍 Fetching invoice data for receptionist...');
                const result = await ChatBotDatabaseService.getReceptionistData(message);
                
                if (result.success && result.data.invoices) {
                    const invoices = result.data.invoices;
                    const summary = result.data.summary;
                    
                    let responseText = `💰 **Thông tin hóa đơn:**\n\n`;
                    responseText += `📊 **Tổng quan:** ${invoices.length} hóa đơn\n`;
                    responseText += `⏳ **Chưa thanh toán:** ${summary.pendingInvoices}\n\n`;
                    
                    if (invoices.length === 0) {
                        responseText += "Không có hóa đơn nào.";
                    } else {
                        // Hóa đơn chưa thanh toán
                        const unpaidInvoices = invoices.filter(inv => inv.PaymentStatus !== 'Paid');
                        
                        if (unpaidInvoices.length > 0) {
                            responseText += `⏳ **Hóa đơn chưa thanh toán (${unpaidInvoices.length}):**\n`;
                            responseText += unpaidInvoices.slice(0, 5).map((invoice, index) => 
                                `${index + 1}. **#${invoice.InvoiceID}**\n` +
                                `   📋 Booking: #${invoice.BookingID}\n` +
                                `   💰 Số tiền: ${invoice.TotalAmount?.toLocaleString('vi-VN') || 'N/A'} VND\n` +
                                `   📊 Trạng thái: ${invoice.PaymentStatus}`
                            ).join('\n\n');
                            
                            if (unpaidInvoices.length > 5) {
                                responseText += `\n\n... và ${unpaidInvoices.length - 5} hóa đơn khác`;
                            }
                        }
                        
                        // Hóa đơn hôm nay
                        const todayInvoices = invoices.filter(inv => 
                            new Date(inv.CreatedAt).toDateString() === new Date().toDateString()
                        );
                        
                        if (todayInvoices.length > 0) {
                            responseText += `\n\n📅 **Hóa đơn hôm nay:** ${todayInvoices.length} hóa đơn\n`;
                            const todayTotal = todayInvoices.reduce((sum, inv) => sum + (inv.TotalAmount || 0), 0);
                            responseText += `💰 **Tổng doanh thu hôm nay:** ${todayTotal.toLocaleString('vi-VN')} VND`;
                        }
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['💳 Xử lý thanh toán', '📋 Chi tiết hóa đơn', '📊 Doanh thu', '🏨 Quay lại phòng']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy thông tin hóa đơn."
                    };
                }
                
            } else if (lowerMessage.includes('thống kê')) {
                console.log('🔍 Fetching stats for receptionist...');
                const result = await ChatBotDatabaseService.getReceptionistStats();
                
                if (result.success) {
                    const { rooms, bookings } = result.data;
                    
                    let responseText = `📊 **Thống kê lễ tân:**\n\n`;
                    
                    if (rooms) {
                        responseText += `🏨 **Thống kê phòng:**\n`;
                        responseText += `• Tổng phòng: ${rooms.total || 'N/A'}\n`;
                        responseText += `• Phòng trống: ${rooms.available || 'N/A'}\n`;
                        responseText += `• Tỷ lệ lấp đầy: ${rooms.occupancyRate || 'N/A'}%\n\n`;
                    }
                    
                    if (bookings) {
                        responseText += `📋 **Thống kê booking:**\n`;
                        responseText += `• Booking hôm nay: ${bookings.today || 'N/A'}\n`;
                        responseText += `• Booking tuần này: ${bookings.thisWeek || 'N/A'}\n`;
                        responseText += `• Check-in hôm nay: ${bookings.checkInToday || 'N/A'}\n`;
                        responseText += `• Check-out hôm nay: ${bookings.checkOutToday || 'N/A'}`;
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['🏨 Chi tiết phòng', '📋 Chi tiết booking', '💰 Doanh thu', '📊 Báo cáo']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy thống kê."
                    };
                }
            }
            
            return { success: false, message: "Không hiểu yêu cầu database." };
            
        } catch (error) {
            console.error('❌ Receptionist Database query error:', error);
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
                        background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '8px 16px',
                        color: '#333',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginTop: '8px'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 2px 8px rgba(255, 215, 0, 0.3)';
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
            // ✅ CHECK IF MESSAGE REQUIRES DATABASE ACCESS
            if (requiresDatabaseAccess(text)) {
                console.log('🗄️ Message requires database access, handling locally...');
                const dbResult = await handleDatabaseQuery(text);
                
                const botMessage = {
                    id: Date.now() + 1,
                    text: dbResult.message,
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: dbResult.quickReplies || getReceptionistQuickReplies(text),
                    isDatabaseResponse: true,
                    isError: !dbResult.success
                };
                
                setMessages(prev => [...prev, botMessage]);
                setIsTyping(false);
                return;
            }

            const response = await fetch('http://localhost:3000/api/chatbot/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    userRole: 'receptionist',
                    userId: user?.UserID || null,
                    userName: user?.Fullname || 'Guest',
                    userRoles: getUserRolesList(),
                    sessionId: `receptionist_${user?.UserID || 'anonymous'}_${Date.now()}`,
                    context: {
                        hasRoomAccess: true,
                        hasBookingAccess: true,
                        hasCustomerData: true,
                        canProcessPayments: true,
                        accessLevel: 'receptionist',
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
                    quickReplies: data.quickReplies || getReceptionistQuickReplies(text),
                    navigation: data.navigation || null,
                    isReceptionistMode: true
                };
                setMessages(prev => [...prev, botMessage]);

                if (data.navigation) {
                    handleNavigationResponse(data.navigation, botMessage.id);
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Receptionist Chat error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "Hệ thống tạm thời gặp sự cố. Vui lòng:\n\n🔄 Thử lại sau ít phút\n💻 Sử dụng hệ thống quản lý trực tiếp tại /receptionist\n📞 Liên hệ IT Support: 0865.124.996\n📧 Email: datltthe194235@gmail.com\n\nHoặc sử dụng các chức năng offline trong dashboard lễ tân.",
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true,
                quickReplies: ['🔄 Thử lại', '💻 Dashboard lễ tân', '📞 IT Support', '🏨 Quản lý phòng']
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleNavigationResponse = (navigationData, messageId) => {
        console.log('🧭 Handling navigation response:', navigationData);
        
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
        console.log('🚀 Executing navigation to:', route);
        
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
                text: `❌ Bạn không có quyền truy cập trang "${route}".`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const getReceptionistQuickReplies = (message) => {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('phòng') || lowerMessage.includes('room')) {
            return ['🏨 Tình trạng 120 phòng', '🔄 Cập nhật status', '🧹 Housekeeping schedule', '🔧 Maintenance requests'];
        } else if (lowerMessage.includes('booking') || lowerMessage.includes('đặt phòng')) {
            return ['📋 Booking hôm nay', '✅ Check-in queue', '🚪 Check-out list', '📝 Modify reservation'];
        } else if (lowerMessage.includes('khách') || lowerMessage.includes('customer') || lowerMessage.includes('guest')) {
            return ['👥 Guest information', '📞 VIP requests', '🛎️ Room service orders', '💬 Feedback handling'];
        } else if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment')) {
            return ['💳 Process payment', '🧾 Print receipt', '💰 Shift reconcile', '📊 Payment analytics'];
        } else if (lowerMessage.includes('báo cáo') || lowerMessage.includes('report')) {
            return ['📊 Daily report', '📈 Occupancy rate', '💰 Revenue today', '👥 Guest satisfaction'];
        } else if (lowerMessage.includes('thời tiết') || lowerMessage.includes('weather')) {
            return ['🌤️ Hà Nội hôm nay', '📅 Dự báo tuần', '🧳 Khuyến nghị cho khách', '🌧️ Weather alerts'];
        } else if (lowerMessage.includes('email') || lowerMessage.includes('viết')) {
            return ['📧 Welcome email', '📝 Booking confirmation', '🔔 Policy update', '💼 Professional template'];
        }
        
        return ['🏨 Room management', '📋 Booking tasks', '👥 Guest services', '📊 Reports', '🌤️ Weather info'];
    };

    const handleQuickReply = (reply) => {
        const routeMap = {
            '💻 Dashboard lễ tân': '/receptionist',
            '🏨 Quản lý phòng': '/rooms',
            '📞 IT Support': 'tel:0865124996',
            '🔄 Thử lại': null,
            '🧭 Đi đến trang chủ': '/',
            '👤 Hồ sơ của tôi': '/profile'
        };

        const route = routeMap[reply];
        if (route === 'tel:0865124996') {
            window.open(route, '_self');
            return;
        } else if (route) {
            executeNavigationAction(route);
            return;
        } else if (reply === '🔄 Thử lại') {
            sendMessage('Xin chào, tôi cần hỗ trợ quản lý khách sạn');
            return;
        }
        
        const receptionistQuickActions = {
            '🏨 Tình trạng 120 phòng': 'Cho tôi xem tình trạng tất cả phòng hiện tại và thống kê occupancy rate',
            '📋 Booking hôm nay': 'Hiển thị danh sách booking hôm nay, check-in và check-out schedule',
            '👥 Hỗ trợ khách': 'Tôi cần hỗ trợ xử lý yêu cầu của khách hàng và guest services',
            '📊 Báo cáo': 'Tạo báo cáo hoạt động hôm nay bao gồm doanh thu và occupancy',
            '🌤️ Thời tiết HN': 'Thời tiết Hà Nội hôm nay và khuyến nghị cho khách du lịch',
            '🔄 Cập nhật status': 'Hướng dẫn cập nhật tình trạng phòng sau housekeeping',
            '✅ Check-in queue': 'Danh sách khách hàng cần check-in hôm nay',
            '🚪 Check-out list': 'Danh sách khách check-out và quy trình',
            '📞 VIP requests': 'Xử lý yêu cầu đặc biệt của khách VIP',
            '💳 Process payment': 'Hướng dẫn xử lý thanh toán và các phương thức payment',
            '📧 Welcome email': 'Viết email chào mừng cho khách mới check-in'
        };
        
        const expandedMessage = receptionistQuickActions[reply] || reply;
        sendMessage(expandedMessage);
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

    // ✅ ADD renderMessage function with cleanup
    const renderMessage = (message) => {
        return (
            <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                <div className={styles['message-content']}>
                    <div className={`${styles['message-bubble']} ${
                        message.isError ? styles.error : 
                        message.isReceptionistMode ? styles.system : 
                        message.isNavigationSuccess ? styles.success : ''
                    }`}>
                        <p style={{whiteSpace: 'pre-line'}}>
                            {(() => {
                                let textToRender = typeof message.text === 'string' 
                                    ? message.text 
                                    : JSON.stringify(message.text);
                                
                                // ✅ CLEAN DEBUG INFO
                                textToRender = textToRender
                                    .replace(/Model: [^|]+ \| Type: [^\n]+/gi, '')
                                    .replace(/fas fa-[a-z-]+ [^\n]+/gi, '')
                                    .replace(/\n\s*\n\s*\n/g, '\n\n')
                                    .trim();
                                
                                return textToRender;
                            })()}
                        </p>
                        
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
                            {message.isReceptionistMode && (
                                <small style={{display: 'block', fontSize: '0.7rem', opacity: 0.8}}>
                                    🛎️ Receptionist Mode • Real-time Hotel Data
                                </small>
                            )}
                        </span>
                    </div>
                    
                    {/* Quick replies */}
                    {message.quickReplies && message.quickReplies.length > 0 && (
                        <div className={styles['quick-replies']}>
                            {message.quickReplies.map((reply, index) => (
                                <button
                                    key={index}
                                    className={styles['quick-reply-btn']}
                                    onClick={() => handleQuickReply(reply)}
                                    style={{
                                        background: reply.includes('🏨') || reply.includes('📋') ? 
                                            'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' : '',
                                        color: reply.includes('🏨') || reply.includes('📋') ? '#333' : ''
                                    }}
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ✅ UPDATE MESSAGES RENDERING
    return (
        <div className={`${styles['chatbot-window']} ${styles.open}`}>
            {/* Header */}
            <div className={styles['chatbot-header']} style={{background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'}}>
                <div className={styles['header-info']}>
                    <div className={styles['bot-avatar']}>
                        <i className="fas fa-concierge-bell"></i>
                    </div>
                    <div className={styles['header-text']}>
                        <h4>Lễ tân Assistant</h4>
                        <span className={styles.status}>
                            <span className={styles['status-dot']}></span>
                            🛎️ 120 phòng • Real-time data
                        </span>
                    </div>
                </div>
                <div className={styles['header-actions']}>
                    <button 
                        className={styles['btn-refresh']} 
                        onClick={() => {
                            sendMessage('Cập nhật dữ liệu thời gian thực về tình trạng phòng và booking');
                        }}
                        title="Cập nhật dữ liệu real-time"
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                    <button 
                        className={styles['btn-prompt']} 
                        onClick={() => {
                            sendMessage('Tạo báo cáo tổng hợp hoạt động khách sạn hôm nay');
                        }}
                        title="Tạo báo cáo nhanh"
                    >
                        <i className="fas fa-chart-bar"></i>
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
                {messages.map(renderMessage)}
                
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
                        placeholder="Hỏi về quản lý phòng, booking, khách hàng, báo cáo..."
                        disabled={isTyping}
                        maxLength={500}
                    />
                    <button 
                        className={styles['send-button']}
                        onClick={() => sendMessage()}
                        disabled={!inputMessage.trim() || isTyping}
                        style={{background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'}}
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div className={styles['input-footer']}>
                    <small>
                        {inputMessage.length}/500 • 🛎️ Lễ tân Assistant • Real-time Hotel Data • 120 phòng available
                    </small>
                </div>
            </div>
        </div>
    );
};

export default ReceptionistChatBot;