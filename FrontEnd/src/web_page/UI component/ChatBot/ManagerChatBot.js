import React, { useState, useEffect, useRef } from 'react';
import styles from './ChatBot.module.css';

const ManagerChatBot = ({ isOpen, onClose, user }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Chào mừng Manager! Tính năng ChatBot dành cho quản lý đang được phát triển.\n\n🔧 Các tính năng sắp có:\n\n📊 Báo cáo và phân tích chi tiết\n💰 Quản lý doanh thu và chi phí\n👥 Quản lý nhân sự và ca làm việc\n🏨 Giám sát toàn bộ hoạt động khách sạn\n📈 Dashboard thông minh\n🔔 Cảnh báo và thông báo quan trọng\n\n*Hiện tại bạn có thể sử dụng chức năng chat cơ bản.*",
            sender: 'bot',
            timestamp: new Date().toISOString(),
            quickReplies: ['📊 Xem báo cáo', '👥 Quản lý nhân sự', '🏨 Tình trạng KS', '💰 Doanh thu']
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

        // Simulate typing delay
        setTimeout(() => {
            const botMessage = {
                id: Date.now() + 1,
                text: `Cảm ơn bạn đã sử dụng. Tính năng Manager ChatBot đang được phát triển.\n\nHiện tại bạn có thể:\n• Sử dụng dashboard quản lý trực tiếp\n• Liên hệ IT support: 0865.124.996\n• Kiểm tra báo cáo hệ thống\n\nChúng tôi sẽ cập nhật sớm nhất có thể!`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                quickReplies: ['💻 Dashboard', '📞 IT Support', '📊 Báo cáo', '🔄 Thử lại']
            };
            setMessages(prev => [...prev, botMessage]);
            setIsTyping(false);
        }, 1500);
    };

    const handleQuickReply = (reply) => {
        if (reply === '💻 Dashboard') {
            // Redirect to manager dashboard (future feature)
            const botMessage = {
                id: Date.now(),
                text: "Dashboard quản lý đang được phát triển. Hiện tại bạn có thể sử dụng chức năng quản lý cơ bản trong hệ thống.",
                sender: 'bot',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMessage]);
            return;
        }
        if (reply === '📞 IT Support') {
            window.open('tel:0865124996', '_self');
            return;
        }
        if (reply === '🔄 Thử lại') {
            sendMessage('Xin chào Manager');
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
            <div className={styles['chatbot-header']} style={{background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'}}>
                <div className={styles['header-info']}>
                    <div className={styles['bot-avatar']}>
                        <i className="fas fa-shield-alt"></i>
                    </div>
                    <div className={styles['header-text']}>
                        <h4>Manager Assistant</h4>
                        <span className={styles.status}>
                            <span className={styles['status-dot']}></span>
                            ⚠️ Đang phát triển
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
                                <p style={{whiteSpace: 'pre-line'}}>{message.text}</p>
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