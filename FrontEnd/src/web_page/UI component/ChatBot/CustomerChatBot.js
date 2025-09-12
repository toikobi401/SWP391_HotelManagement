import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleNavigation } from '../../../hooks/useRoleNavigation';
import ChatBotDatabaseService from '../../../services/ChatBotDatabaseService';
import styles from './ChatBot.module.css';

const CustomerChatBot = ({ isOpen, onClose, user }) => {
    const navigate = useNavigate();
    const { executeNavigation, getUserRoles, canAccessRoute } = useRoleNavigation();
    
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Xin chào! Tôi là Hotel HUB AI Assistant dành cho khách hàng. Tôi có thể giúp bạn:\n\n🏨 Đặt phòng và kiểm tra phòng trống\n💰 Xem giá phòng và khuyến mãi\n🛎️ Thông tin dịch vụ khách sạn\n📋 Xem lịch sử booking của bạn\n👤 Kiểm tra thông tin cá nhân\n📊 Thống kê booking cá nhân\n🌤️ Thời tiết và địa điểm tham quan Hà Nội\n🚗 Hướng dẫn di chuyển từ sân bay\n🍜 Gợi ý món ăn địa phương\n🧭 Điều hướng trong website\n\n*Bạn có thể hỏi: \"Lịch sử booking của tôi\" hoặc \"Thông tin cá nhân\" hoặc \"Đưa tôi đến trang đặt phòng\"*",
            sender: 'bot',
            timestamp: new Date().toISOString(),
            quickReplies: ['📋 Lịch sử booking', '� Thông tin cá nhân', '�🛏️ Xem phòng trống', '💰 Bảng giá', '🎁 Khuyến mãi']
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

    // ✅ GET USER ROLES FOR NAVIGATION
    const getUserRolesList = () => {
        if (!user || !user.roles) return [];
        return user.roles.map(role => role.RoleID || role.roleId || role.id).filter(Boolean);
    };

    // ✅ NEW: Check if message requires database access
    const requiresDatabaseAccess = (message) => {
        const lowerMessage = message.toLowerCase();
        return lowerMessage.includes('lịch sử') || 
               lowerMessage.includes('booking') || 
               lowerMessage.includes('thông tin cá nhân') ||
               lowerMessage.includes('hồ sơ') ||
               lowerMessage.includes('thống kê') ||
               lowerMessage.includes('đặt phòng của tôi') ||
               lowerMessage.includes('booking của tôi');
    };

    // ✅ NEW: Handle database queries for customer
    const handleDatabaseQuery = async (message) => {
        const lowerMessage = message.toLowerCase();
        
        if (!user || !user.UserID) {
            return {
                success: false,
                message: "Vui lòng đăng nhập để xem thông tin cá nhân."
            };
        }

        try {
            if (lowerMessage.includes('lịch sử') || lowerMessage.includes('booking')) {
                console.log('🔍 Fetching booking history for user:', user.UserID);
                const result = await ChatBotDatabaseService.getCustomerData(user.UserID);
                
                console.log('📊 Database result:', result); // Debug log
                
                if (result.success && result.data) {
                    // ✅ SỬA: Kiểm tra an toàn data structure
                    const bookings = Array.isArray(result.data.bookings) ? result.data.bookings : [];
                    const summary = result.data.summary || { totalBookings: 0 };
                    
                    console.log('📋 Processed bookings:', bookings); // Debug log
                    
                    let responseText = `📋 **Lịch sử booking của bạn:**\n\n`;
                    responseText += `📊 **Tổng quan:** ${summary.totalBookings} booking\n\n`;
                    
                    if (bookings.length === 0) {
                        responseText += "Bạn chưa có booking nào.\n\n🏨 Hãy đặt phòng đầu tiên của bạn!";
                    } else {
                        responseText += bookings.slice(0, 5).map((booking, index) => {
                            // ✅ SỬA: Sử dụng đúng field names từ BookingDBContext
                            const bookingId = booking.BookingID || booking.bookingID || 'N/A';
                            const bookingDate = booking.CreateAt || booking.createAt || booking.BookingAt || booking.bookingAt;
                            const roomTypes = booking.roomTypesDisplay || 
                                            (booking.RoomTypes && Array.isArray(booking.RoomTypes) ? 
                                                booking.RoomTypes.map(rt => `${rt.TypeName} (${rt.Quantity})`).join(', ') : 
                                                'N/A');
                            const status = booking.BookingStatus || booking.bookingStatus || 'N/A';
                            const checkin = booking.checkInDate || booking.CheckInDate;
                            const checkout = booking.checkOutDate || booking.CheckOutDate;
                            
                            return `${index + 1}. **Booking #${bookingId}**\n` +
                                   `   📅 Ngày đặt: ${bookingDate ? new Date(bookingDate).toLocaleDateString('vi-VN') : 'N/A'}\n` +
                                   `   🏨 Loại phòng: ${roomTypes}\n` +
                                   `   📊 Trạng thái: ${status}\n` +
                                   `   � Check-in: ${checkin ? new Date(checkin).toLocaleDateString('vi-VN') : 'N/A'}\n` +
                                   `   📅 Check-out: ${checkout ? new Date(checkout).toLocaleDateString('vi-VN') : 'N/A'}`;
                        }).join('\n\n');
                        
                        if (bookings.length > 5) {
                            responseText += `\n\n... và ${bookings.length - 5} booking khác`;
                        }
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['📋 Xem chi tiết', '🏨 Đặt phòng mới', '👤 Thông tin cá nhân']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy lịch sử booking."
                    };
                }
                
            } else if (lowerMessage.includes('thông tin cá nhân') || lowerMessage.includes('hồ sơ')) {
                console.log('🔍 Fetching profile for user:', user.UserID);
                const result = await ChatBotDatabaseService.getCustomerData(user.UserID);
                
                if (result.success && result.data.profile) {
                    const profile = result.data.profile;
                    const summary = result.data.summary;
                    
                    let responseText = `👤 **Thông tin cá nhân:**\n\n`;
                    responseText += `📝 **Họ tên:** ${profile.FullName || 'Chưa cập nhật'}\n`;
                    responseText += `📧 **Email:** ${profile.Email || 'Chưa cập nhật'}\n`;
                    responseText += `📱 **Điện thoại:** ${profile.PhoneNumber || 'Chưa cập nhật'}\n`;
                    responseText += `📅 **Ngày tạo:** ${new Date(profile.CreatedAt).toLocaleDateString('vi-VN')}\n`;
                    responseText += `📊 **Trạng thái:** ${profile.Status || 'Active'}\n\n`;
                    responseText += `🏨 **Thống kê booking:**\n`;
                    responseText += `   • Tổng số booking: ${summary.totalBookings}\n`;
                    if (summary.latestBooking) {
                        responseText += `   • Booking gần nhất: #${summary.latestBooking.BookingID} (${summary.latestBooking.BookingStatus})`;
                    }
                    
                    return {
                        success: true,
                        message: responseText,
                        quickReplies: ['📋 Lịch sử booking', '✏️ Cập nhật thông tin', '🏨 Đặt phòng']
                    };
                } else {
                    return {
                        success: false,
                        message: result.message || "Không thể lấy thông tin cá nhân."
                    };
                }
                
            } else if (lowerMessage.includes('thống kê')) {
                console.log('🔍 Fetching stats for user:', user.UserID);
                const result = await ChatBotDatabaseService.getCustomerStats(user.UserID);
                
                if (result.success) {
                    return {
                        success: true,
                        message: `📊 **Thống kê cá nhân:**\n\n${JSON.stringify(result.data, null, 2)}`,
                        quickReplies: ['📋 Lịch sử booking', '👤 Thông tin cá nhân']
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
            console.error('❌ Database query error:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                user: user?.UserID
            });
            return {
                success: false,
                message: `Lỗi khi truy cập database: ${error.message || 'Unknown error'}. Vui lòng thử lại sau.`
            };
        }
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
                    quickReplies: dbResult.quickReplies || getCustomerQuickReplies(text),
                    isDatabaseResponse: true,
                    isError: !dbResult.success
                };
                
                setMessages(prev => [...prev, botMessage]);
                setIsTyping(false);
                return;
            }

            console.log('🚀 Sending customer chat request with navigation support:', {
                message: text,
                userRole: 'customer',
                userId: user?.UserID || null,
                userRoles: getUserRolesList() // ✅ THÊM USER ROLES
            });

            const response = await fetch('http://localhost:3000/api/chatbot/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    userRole: 'customer',
                    userId: user?.UserID || null,
                    userName: user?.Fullname || 'Guest',
                    userRoles: getUserRolesList(), // ✅ THÊM USER ROLES CHO NAVIGATION
                    sessionId: `customer_${Date.now()}`,
                    context: {
                        hasBookingAccess: true,
                        hasCustomerData: true,
                        accessLevel: 'customer',
                        hotelData: true,
                        realtimeData: true
                    }
                })
            });

            const data = await response.json();
            
            console.log('📦 Received response with navigation:', {
                success: data.success,
                responseType: typeof data.response,
                hasNavigation: !!data.navigation, // ✅ CHECK NAVIGATION
                navigationAction: data.navigation?.action,
                hasQuickReplies: !!data.quickReplies,
                fullResponse: data
            });

            if (data.success) {
                // ✅ ENHANCED RESPONSE TYPE CHECKING AND CONVERSION
                let responseText;
                
                if (typeof data.response === 'string') {
                    responseText = data.response;
                    console.log('✅ Response is string:', responseText.substring(0, 50) + '...');
                } else if (typeof data.response === 'object' && data.response !== null) {
                    if (data.response.text) {
                        responseText = data.response.text;
                        console.log('✅ Extracted text from response object');
                    } else if (data.response.message) {
                        responseText = data.response.message;
                        console.log('✅ Extracted message from response object');
                    } else {
                        responseText = JSON.stringify(data.response, null, 2);
                        console.log('⚠️ Stringified response object');
                    }
                } else {
                    responseText = String(data.response || 'Phản hồi trống');
                    console.log('⚠️ Converted response to string:', responseText);
                }

                // ✅ VALIDATE RESPONSE TEXT
                if (!responseText || responseText.trim() === '') {
                    responseText = 'Xin lỗi, tôi không thể tạo phản hồi phù hợp lúc này. Vui lòng thử hỏi câu khác.';
                    console.log('⚠️ Empty response, using fallback message');
                }

                const botMessage = {
                    id: Date.now() + 1,
                    text: responseText,
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: data.quickReplies || getCustomerQuickReplies(text),
                    // ✅ ADD NAVIGATION DATA
                    navigation: data.navigation || null,
                    metadata: {
                        model: data.model,
                        timestamp: data.timestamp,
                        originalResponseType: typeof data.response
                    }
                };
                
                console.log('✅ Adding bot message with navigation:', {
                    textType: typeof botMessage.text,
                    textLength: botMessage.text.length,
                    hasQuickReplies: !!botMessage.quickReplies,
                    hasNavigation: !!botMessage.navigation // ✅ LOG NAVIGATION
                });
                
                setMessages(prev => [...prev, botMessage]);

                // ✅ HANDLE NAVIGATION RESPONSE
                if (data.navigation) {
                    handleNavigationResponse(data.navigation, botMessage.id);
                }

            } else {
                throw new Error(data.error || 'Response không thành công');
            }
        } catch (error) {
            console.error('❌ Customer Chat error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng:\n\n🔄 Thử lại sau ít phút\n📞 Gọi hotline: 0865.124.996\n💬 Sử dụng tính năng chat trực tiếp\n📧 Email: datltthe194235@gmail.com\n\nChúng tôi sẽ hỗ trợ bạn ngay lập tức!",
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true,
                quickReplies: ['📞 Gọi hotline', '🔄 Thử lại', '🏠 Trang chủ']
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    // ✅ HANDLE NAVIGATION RESPONSE FROM BACKEND
    const handleNavigationResponse = (navigationData, messageId) => {
        console.log('🧭 Handling navigation response:', navigationData);
        
        if (navigationData.action === 'NAVIGATE') {
            // ✅ ADD NAVIGATION BUTTON TO THE MESSAGE
            setMessages(prev => {
                const newMessages = [...prev];
                const messageIndex = newMessages.findIndex(msg => msg.id === messageId);
                if (messageIndex !== -1) {
                    newMessages[messageIndex].navigationAction = navigationData.actionData;
                }
                return newMessages;
            });
            
        } else if (navigationData.action === 'SHOW_AVAILABLE_ROUTES') {
            // ✅ ADD AVAILABLE ROUTES TO THE MESSAGE
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

    // ✅ EXECUTE NAVIGATION ACTION
    const executeNavigationAction = (route) => {
        console.log('🚀 Executing navigation to:', route);
        
        if (canAccessRoute(route)) {
            navigate(route);
            
            // Add success message
            const successMessage = {
                id: Date.now(),
                text: `✅ Đang chuyển đến trang "${route}"...`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isNavigationSuccess: true
            };
            setMessages(prev => [...prev, successMessage]);
            
        } else {
            // Add error message
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

    const getCustomerQuickReplies = (message) => {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('phòng') || lowerMessage.includes('đặt')) {
            return ['🛏️ Loại phòng', '📅 Kiểm tra ngày', '💰 Giá phòng', '🎁 Khuyến mãi'];
        } else if (lowerMessage.includes('giá') || lowerMessage.includes('tiền')) {
            return ['💰 Bảng giá chi tiết', '🎁 Ưu đãi hiện tại', '💳 Hình thức thanh toán'];
        } else if (lowerMessage.includes('dịch vụ')) {
            return ['🍽️ Nhà hàng', '🏊 Hồ bơi', '💆 Spa', '🚗 Đưa đón sân bay'];
        } else if (lowerMessage.includes('thời tiết') || lowerMessage.includes('weather')) {
            return ['🌤️ Hôm nay', '📅 Tuần này', '🧳 Chuẩn bị', '🌧️ Dự báo'];
        }
        return ['🛏️ Đặt phòng', '🌤️ Thời tiết', '🗺️ Tham quan', '📞 Liên hệ'];
    };

    // ✅ ENHANCED HANDLE QUICK REPLY WITH NAVIGATION AND DATABASE
    const handleQuickReply = (reply) => {
        console.log('⚡ Quick reply selected:', reply);
        
        // ✅ Handle database quick replies first
        if (reply === '📋 Lịch sử booking') {
            sendMessage('Lịch sử booking của tôi');
            return;
        }
        if (reply === '👤 Thông tin cá nhân') {
            sendMessage('Thông tin cá nhân của tôi');
            return;
        }
        if (reply === '📊 Thống kê cá nhân') {
            sendMessage('Thống kê cá nhân của tôi');
            return;
        }
        
        // Check if it's a navigation quick reply
        const routeMap = {
            '🏠 Trang chủ': '/',
            '👤 Hồ sơ của tôi': '/profile',
            '📞 Liên hệ hỗ trợ': '/contact',
            'ℹ️ Về chúng tôi': '/about',
            '🛏️ Quản lý phòng': '/rooms',
            '📅 Đặt phòng': '/booking',
            '👨‍💼 Quản lý': '/manager',
            '🛎️ Lễ tân': '/receptionist',
            '👤 Khách hàng': '/customer',
            '🧭 Đi đến trang chủ': '/',
            '🧭 Hồ sơ của tôi': '/profile',
            '🧭 Đặt phòng': '/booking',
            '🛏️ Xem phòng trống': '/room-types',
            '🏨 Đặt phòng': '/booking',
            '🏨 Đặt phòng mới': '/booking'
        };

        const route = routeMap[reply];
        if (route) {
            executeNavigationAction(route);
            return;
        }

        // Handle other actions
        if (reply === '📞 Gọi hotline') {
            window.open('tel:0865124996', '_self');
            return;
        }
        if (reply === '🔄 Thử lại') {
            sendMessage('Xin chào');
            return;
        }
        if (reply === '🏠 Trang chủ') {
            executeNavigationAction('/');
            return;
        }
        
        // Regular message
        sendMessage(reply);
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
                        background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
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
                        e.target.style.boxShadow = '0 2px 8px rgba(78, 205, 196, 0.3)';
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
            {/* Header */}
            <div className={styles['chatbot-header']} style={{background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)'}}>
                <div className={styles['header-info']}>
                    <div className={styles['bot-avatar']}>
                        <i className="fas fa-user-circle"></i>
                    </div>
                    <div className={styles['header-text']}>
                        <h4>Hỗ trợ khách hàng</h4>
                        <span className={styles.status}>
                            <span className={styles['status-dot']}></span>
                            🧭 Dịch vụ khách hàng + Navigation
                        </span>
                    </div>
                </div>
                <div className={styles['header-actions']}>
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
                                message.isNavigationSuccess ? styles.success : ''
                            }`}>
                                {/* ✅ SAFE TEXT RENDERING */}
                                <p style={{whiteSpace: 'pre-line'}}>
                                    {(() => {
                                        const textToRender = typeof message.text === 'string' 
                                            ? message.text 
                                            : JSON.stringify(message.text);
                                        
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
                                    {/* Debug info in development */}
                                    {process.env.NODE_ENV === 'development' && message.metadata && (
                                        <small style={{display: 'block', fontSize: '0.7rem', opacity: 0.7}}>
                                            Model: {message.metadata.model} | Type: {message.metadata.originalResponseType}
                                        </small>
                                    )}
                                </span>
                            </div>
                            
                            {/* ✅ QUICK REPLIES */}
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
                        placeholder="Hỏi về phòng, giá cả, dịch vụ, điều hướng..."
                        disabled={isTyping}
                        maxLength={500}
                    />
                    <button 
                        className={styles['send-button']}
                        onClick={() => sendMessage()}
                        disabled={!inputMessage.trim() || isTyping}
                        style={{background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)'}}
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div className={styles['input-footer']}>
                    <small>
                        {inputMessage.length}/500 • 🧭 Hỗ trợ khách hàng + Navigation • Hotel HUB AI
                    </small>
                </div>
            </div>
        </div>
    );
};

export default CustomerChatBot;