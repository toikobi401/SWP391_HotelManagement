import React, { useState, useEffect, useRef } from 'react';
import styles from './ChatBot.module.css';

const ReceptionistChatBot = ({ isOpen, onClose, user }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Xin chào! Tôi là Hotel HUB AI Assistant dành cho lễ tân. Tôi có thể hỗ trợ bạn:\n\n🏨 **Quản lý phòng thông minh:**\n• Kiểm tra tình trạng 120 phòng real-time\n• Cập nhật trạng thái phòng nhanh chóng\n• Thống kê occupancy và availability\n• Quản lý booking và reservation\n\n👥 **Hỗ trợ khách hàng chuyên nghiệp:**\n• Trả lời thông tin phòng và dịch vụ\n• Xử lý yêu cầu đặc biệt của khách\n• Hướng dẫn check-in/check-out\n• Giải quyết khiếu nại và phản hồi\n\n💰 **Quản lý thanh toán:**\n• Xử lý các phương thức thanh toán\n• In hóa đơn và receipt\n• Theo dõi doanh thu theo ca\n• Báo cáo payment method statistics\n\n📊 **Báo cáo và thống kê:**\n• Báo cáo hoạt động hàng ngày\n• Thống kê booking patterns\n• Occupancy rate analysis\n• Guest feedback summary\n\n🌤️ **Thông tin du lịch Hà Nội:**\n• Thời tiết và khí hậu theo mùa\n• Địa điểm tham quan gần hotel\n• Hướng dẫn di chuyển cho khách\n• Gợi ý ẩm thực địa phương\n\n📝 **AI Assistant cho công việc:**\n• Viết email thông báo cho khách\n• Tạo thông báo nội bộ\n• Phân tích feedback và review\n• Hướng dẫn quy trình hotel\n\n*Chúc bạn làm việc hiệu quả! Hãy hỏi tôi bất cứ điều gì bạn cần.* 💪",
            sender: 'bot',
            timestamp: new Date().toISOString(),
            quickReplies: ['🏨 Tình trạng phòng', '📋 Booking hôm nay', '👥 Hỗ trợ khách', '📊 Báo cáo', '🌤️ Thời tiết HN']
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
                    userRole: 'receptionist',
                    userId: user?.UserID || null,
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
                // ✅ FIX: Đảm bảo response là string
                const responseText = typeof data.response === 'string' 
                    ? data.response 
                    : JSON.stringify(data.response);

                const botMessage = {
                    id: Date.now() + 1,
                    text: responseText, // ✅ Luôn là string
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: data.quickReplies || getReceptionistQuickReplies(text),
                    isReceptionistMode: true
                };
                setMessages(prev => [...prev, botMessage]);
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
        if (reply === '💻 Dashboard lễ tân' || reply === '🏨 Quản lý phòng') {
            window.location.href = '/receptionist';
            return;
        }
        if (reply === '📞 IT Support') {
            window.open('tel:0865124996', '_self');
            return;
        }
        if (reply === '🔄 Thử lại') {
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

    return (
        <div className={`${styles['chatbot-window']} ${styles.open}`}>
            {/* Header */}
            <div className={styles['chatbot-header']} style={{background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'}}>
                <div className={styles['header-info']}>
                    <div className={styles['bot-avatar']}>
                        {/* ✅ THAY ĐỔI ICON TỪ fas fa-cog THÀNH fas fa-concierge-bell */}
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
                {messages.map((message) => (
                    <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                        <div className={styles['message-content']}>
                            <div className={`${styles['message-bubble']} ${
                                message.isError ? styles.error : 
                                message.isReceptionistMode ? styles.system : ''
                            }`}>
                                {/* ✅ FIX: Đảm bảo render string */}
                                <p style={{whiteSpace: 'pre-line'}}>
                                    {typeof message.text === 'string' 
                                        ? message.text 
                                        : JSON.stringify(message.text)
                                    }
                                </p>
                                <span className={styles['message-time']}>
                                    {formatTime(message.timestamp)}
                                    {message.isReceptionistMode && (
                                        <small style={{display: 'block', fontSize: '0.7rem', opacity: 0.8}}>
                                            🛎️ Receptionist Mode • Real-time Hotel Data
                                        </small>
                                    )}
                                </span>
                            </div>
                            
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