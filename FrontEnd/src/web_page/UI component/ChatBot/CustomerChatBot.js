import React, { useState, useEffect, useRef } from 'react';
import styles from './ChatBot.module.css';

const CustomerChatBot = ({ isOpen, onClose, user }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Xin chào! Tôi là Hotel HUB AI Assistant dành cho khách hàng. Tôi có thể giúp bạn:\n\n🏨 Đặt phòng và kiểm tra phòng trống\n💰 Xem giá phòng và khuyến mãi\n🛎️ Thông tin dịch vụ khách sạn\n🌤️ Thời tiết và địa điểm tham quan Hà Nội\n🚗 Hướng dẫn di chuyển từ sân bay\n🍜 Gợi ý món ăn địa phương\n\n*Chào mừng bạn đến với Hotel HUB!*",
            sender: 'bot',
            timestamp: new Date().toISOString(),
            quickReplies: ['🛏️ Xem phòng trống', '💰 Bảng giá', '🎁 Khuyến mãi', '🌤️ Thời tiết HN']
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
            console.log('🚀 Sending customer chat request:', {
                message: text,
                userRole: 'customer',
                userId: user?.UserID || null
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
                    sessionId: `customer_${Date.now()}`
                })
            });

            const data = await response.json();
            
            console.log('📦 Received response:', {
                success: data.success,
                responseType: typeof data.response,
                responseLength: data.response?.length || 0,
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
                    // If response is object, try to extract text or stringify safely
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
                    metadata: {
                        model: data.model,
                        timestamp: data.timestamp,
                        originalResponseType: typeof data.response
                    }
                };
                
                console.log('✅ Adding bot message:', {
                    textType: typeof botMessage.text,
                    textLength: botMessage.text.length,
                    hasQuickReplies: !!botMessage.quickReplies
                });
                
                setMessages(prev => [...prev, botMessage]);
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

    const handleQuickReply = (reply) => {
        if (reply === '📞 Gọi hotline') {
            window.open('tel:0865124996', '_self');
            return;
        }
        if (reply === '🔄 Thử lại') {
            sendMessage('Xin chào');
            return;
        }
        if (reply === '🏠 Trang chủ') {
            window.location.href = '/';
            return;
        }
        sendMessage(reply);
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
                        <i className="fas fa-user"></i>
                    </div>
                    <div className={styles['header-text']}>
                        <h4>Hỗ trợ khách hàng</h4>
                        <span className={styles.status}>
                            <span className={styles['status-dot']}></span>
                            🏨 Dịch vụ khách hàng
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
                                message.isError ? styles.error : ''
                            }`}>
                                {/* ✅ SAFE TEXT RENDERING WITH DEBUGGING */}
                                <p style={{whiteSpace: 'pre-line'}}>
                                    {(() => {
                                        const textToRender = typeof message.text === 'string' 
                                            ? message.text 
                                            : JSON.stringify(message.text);
                                        
                                        // Debug in development
                                        if (process.env.NODE_ENV === 'development') {
                                            console.log('📝 Rendering message:', {
                                                id: message.id,
                                                textType: typeof message.text,
                                                textValue: textToRender.substring(0, 100) + '...'
                                            });
                                        }
                                        
                                        return textToRender;
                                    })()}
                                </p>
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
                        placeholder="Hỏi về phòng, giá cả, dịch vụ, thời tiết HN..."
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
                        {inputMessage.length}/500 • 💬 Hỗ trợ khách hàng • Powered by Hotel HUB AI
                    </small>
                </div>
            </div>
        </div>
    );
};

export default CustomerChatBot;