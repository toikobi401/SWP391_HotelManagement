import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import styles from './ChatBot.module.css';
import dotenv from 'dotenv';

const ChatBot = () => {
    const { user, hasRole } = useAuth(); // Get user context
    
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);
    const [promptMode, setPromptMode] = useState(false);
    const [promptExamples, setPromptExamples] = useState(null);
    const [weatherInfo, setWeatherInfo] = useState(null);
    const [localAttractions, setLocalAttractions] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // ✅ DETERMINE USER ROLE AND GET APPROPRIATE WELCOME MESSAGE
    const getUserRole = () => {
        if (!user) return 'guest';
        if (hasRole(1)) return 'manager';
        if (hasRole(2)) return 'receptionist';
        if (hasRole(3)) return 'customer';
        return 'customer'; // default
    };

    const getWelcomeMessage = () => {
        const role = getUserRole();
        
        const welcomeMessages = {
            guest: {
                text: "Xin chào! Tôi là Hotel HUB AI Assistant được hỗ trợ bởi Gemini 1.5 Flash. Tôi có thể giúp bạn về:\n\n🏨 Khách sạn: đặt phòng, giá cả, dịch vụ\n🌤️ Thời tiết: khí hậu Hà Nội theo mùa\n🗺️ Du lịch: địa điểm tham quan, lịch trình\n🚗 Di chuyển: hướng dẫn từ sân bay, phương tiện\n🍜 Ẩm thực: món ngon địa phương\n🎭 Văn hóa: lễ hội, sự kiện\n📝 Prompt: viết nội dung, phân tích, hướng dẫn\n\n*Tôi chuyên về Hotel HUB và khu vực Hà Nội.*",
                quickReplies: ['🛏️ Đặt phòng', '🌤️ Thời tiết', '🗺️ Tham quan', '📝 AI Prompt']
            },
            customer: {
                text: `Xin chào ${user?.Fullname || 'quý khách'}! 👋\n\nTôi là Hotel HUB AI Assistant dành cho khách hàng. Tôi có thể hỗ trợ bạn:\n\n🏨 **Dịch vụ khách hàng:**\n• Thông tin đặt phòng và giá cả\n• Hướng dẫn check-in/check-out\n• Dịch vụ phòng và tiện nghi\n• Khuyến mãi hiện tại\n\n🌤️ **Du lịch Hà Nội:**\n• Thời tiết theo mùa\n• Địa điểm tham quan\n• Ẩm thực địa phương\n• Hướng dẫn di chuyển\n\n📝 **AI Assistant:**\n• Lập kế hoạch du lịch\n• Tư vấn lịch trình\n• Viết email, đánh giá\n\n*Chúc bạn có kỳ nghỉ tuyệt vời tại Hotel HUB!* ✨`,
                quickReplies: ['🛏️ Đặt phòng', '💰 Khuyến mãi', '🌤️ Thời tiết', '🗺️ Tham quan', '📝 AI Prompt']
            },
            receptionist: {
                text: `Xin chào ${user?.Fullname || 'Lễ tân'}! 👨‍💼\n\nTôi là Hotel HUB AI Assistant dành cho đội ngũ lễ tân. Tôi có thể hỗ trợ bạn:\n\n🏨 **Quản lý khách sạn:**\n• Thông tin phòng và tình trạng\n• Quy trình check-in/check-out\n• Giá phòng và chính sách\n• Xử lý yêu cầu đặc biệt\n\n👥 **Hỗ trợ khách hàng:**\n• Trả lời câu hỏi của khách\n• Thông tin dịch vụ và tiện nghi\n• Hướng dẫn sử dụng\n• Giải quyết khiếu nại\n\n🌤️ **Thông tin địa phương:**\n• Thời tiết Hà Nội\n• Địa điểm tham quan\n• Nhà hàng và mua sắm\n• Phương tiện di chuyển\n\n📝 **Công cụ AI:**\n• Viết email cho khách\n• Tạo hướng dẫn\n• Phân tích yêu cầu\n• Giải quyết vấn đề\n\n*Chúc bạn làm việc hiệu quả!* 💪`,
                quickReplies: ['🏨 Quản lý phòng', '👥 Hỗ trợ khách', '🌤️ Thời tiết', '📧 Viết email', '📝 AI Prompt']
            },
            manager: {
                text: `Xin chào ${user?.Fullname || 'Quản lý'}! 👨‍💼\n\nTôi là Hotel HUB AI Assistant dành cho ban quản lý. Hiện tại đang trong giai đoạn phát triển.\n\n🔧 **Tính năng sắp ra mắt:**\n• Báo cáo kinh doanh\n• Phân tích dữ liệu\n• Quản lý nhân sự\n• Chiến lược marketing\n\n*Vui lòng sử dụng chế độ AI Prompt để được hỗ trợ tốt nhất hiện tại.*`,
                quickReplies: ['📝 AI Prompt', '🌤️ Thời tiết', '🗺️ Tham quan']
            }
        };

        return welcomeMessages[role] || welcomeMessages.guest;
    };

    const getPlaceholderText = () => {
        const role = getUserRole();
        
        if (promptMode) {
            return role === 'receptionist' 
                ? "Nhập AI prompt cho lễ tân... (quản lý phòng, hỗ trợ khách, email)"
                : "Nhập AI prompt... (khách sạn, thời tiết, du lịch HN)";
        }
        
        const placeholders = {
            guest: "Hỏi về khách sạn & Hà Nội...",
            customer: "Hỏi về đặt phòng, dịch vụ, du lịch...",
            receptionist: "Hỏi về quản lý phòng, hỗ trợ khách hàng...",
            manager: "Sử dụng AI Prompt để được hỗ trợ tốt nhất..."
        };
        
        return placeholders[role] || placeholders.guest;
    };

    const getChatBotTitle = () => {
        const role = getUserRole();
        
        const titles = {
            guest: "Hotel HUB Assistant",
            customer: "Khách hàng Support",
            receptionist: "Lễ tân Assistant", 
            manager: "Quản lý Assistant"
        };
        
        return titles[role] || titles.guest;
    };

    const getStatusText = () => {
        const role = getUserRole();
        
        if (promptMode) return '🤖 AI Prompt Mode';
        
        const statusTexts = {
            guest: modelInfo ? `${modelInfo.name} • 🏨 Hanoi Expert` : '🏨 Hanoi Expert',
            customer: '👤 Khách hàng • Hotel HUB',
            receptionist: '👨‍💼 Lễ tân • Hotel HUB',
            manager: '👔 Quản lý • Hotel HUB'
        };
        
        return statusTexts[role] || statusTexts.guest;
    };

    // ✅ INITIALIZE WITH ROLE-BASED WELCOME MESSAGE
    useEffect(() => {
        const welcomeMsg = getWelcomeMessage();
        setMessages([{
            id: 1,
            text: welcomeMsg.text,
            sender: 'bot',
            timestamp: new Date().toISOString(),
            quickReplies: welcomeMsg.quickReplies
        }]);
    }, [user]); // Re-initialize when user changes

    // ✅ FETCH EXPANDED DATA ON MOUNT
    useEffect(() => {
        const fetchExpandedData = async () => {
            try {
                // Fetch prompt examples
                const promptResponse = await fetch('http://localhost:3000/api/chatbot/prompt-examples');
                if (promptResponse.ok) {
                    const promptData = await promptResponse.json();
                    setPromptExamples(promptData.examples);
                }

                // Fetch weather info
                const weatherResponse = await fetch('http://localhost:3000/api/chatbot/weather-info');
                if (weatherResponse.ok) {
                    const weatherData = await weatherResponse.json();
                    setWeatherInfo(weatherData.weatherInfo);
                }

                // Fetch local attractions
                const attractionsResponse = await fetch('http://localhost:3000/api/chatbot/local-attractions');
                if (attractionsResponse.ok) {
                    const attractionsData = await attractionsResponse.json();
                    setLocalAttractions(attractionsData.attractions);
                }
            } catch (error) {
                console.error('Error fetching expanded data:', error);
            }
        };

        fetchExpandedData();
    }, []);

    // ✅ FETCH MODEL INFO ON MOUNT
    useEffect(() => {
        const fetchModelInfo = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/chatbot/model-info');
                if (response.ok) {
                    const data = await response.json();
                    setModelInfo(data.modelInfo);
                }
            } catch (error) {
                console.error('Error fetching model info:', error);
            }
        };

        fetchModelInfo();
    }, []);

    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    // ✅ ENHANCED SEND MESSAGE WITH ROLE CONTEXT
    const sendMessage = async (messageText = null, isPrompt = false) => {
        const text = messageText || inputMessage.trim();
        if (!text) return;

        const timestamp = Date.now();
        const cacheBreaker = Math.random().toString(36).substr(2, 9);
        const userRole = getUserRole();

        // ✅ VALIDATE MESSAGE LENGTH
        const maxLength = isPrompt || promptMode ? 2000 : 1000;
        if (text.length > maxLength) {
            const errorMessage = {
                id: Date.now() + 1,
                text: `${isPrompt ? 'Prompt' : 'Tin nhắn'} quá dài! Vui lòng viết ngắn gọn hơn (tối đa ${maxLength} ký tự). 📝`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        const userMessage = {
            id: timestamp,
            text: text,
            sender: 'user',
            timestamp: new Date().toISOString(),
            isPrompt: isPrompt || promptMode
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);

        try {
            console.log('🔍 Sending message to chatbot with role context...');

            // ✅ AUTO-DETECT PROMPT MODE FOR WEATHER/LOCAL QUERIES
            const isWeatherOrLocalQuery = 
                text.toLowerCase().includes('thời tiết') ||
                text.toLowerCase().includes('hướng dẫn') ||
                text.toLowerCase().includes('chuẩn bị') ||
                text.toLowerCase().includes('weather') ||
                text.toLowerCase().includes('climate') ||
                text.toLowerCase().includes('prepare') ||
                text.toLowerCase().includes('hà nội') ||
                text.toLowerCase().includes('hòa lạc') ||
                text.toLowerCase().includes('nhiệt độ') ||
                text.toLowerCase().includes('mưa') ||
                text.toLowerCase().includes('nắng') ||
                text.toLowerCase().includes('lạnh') ||
                text.toLowerCase().includes('nóng') ||
                text.toLowerCase().includes('khí hậu') ||
                text.toLowerCase().includes('mùa');

            // ✅ CHOOSE ENDPOINT BASED ON MODE OR CONTENT
            const endpoint = (isPrompt || promptMode || isWeatherOrLocalQuery) ? 'prompt' : 'chat';
            const bodyField = (isPrompt || promptMode || isWeatherOrLocalQuery) ? 'prompt' : 'message';
            
            console.log('🔍 Sending message:', {
                text: text.substring(0, 50) + '...',
                endpoint: endpoint,
                bodyField: bodyField,
                userRole: userRole,
                isWeatherOrLocalQuery: isWeatherOrLocalQuery,
                promptMode: promptMode,
                timestamp: timestamp,
                cacheBreaker: cacheBreaker
            });
            
            // ✅ REQUEST BODY WITH ROLE CONTEXT
            const requestBody = {
                [bodyField]: text,
                sessionId: sessionId || `session_${timestamp}`,
                userRole: userRole, // Add user role context
                userId: user?.UserID || null,
                userName: user?.Fullname || 'Guest',
                timestamp: timestamp,
                cacheBreaker: cacheBreaker
            };
            
            console.log('📤 Request body:', requestBody);
            
            // ✅ SEND REQUEST
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(`http://localhost:3000/api/chatbot/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📨 ChatBot response:', data);

            if (data.success) {
                // Save sessionId if provided
                if (data.sessionId && !sessionId) {
                    setSessionId(data.sessionId);
                }

                const botMessage = {
                    id: Date.now() + 1,
                    text: data.message || data.response || 'Tôi đã nhận được tin nhắn của bạn.',
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: data.quickReplies || [],
                    isPromptResponse: isPrompt || promptMode || data.isPromptResponse,
                    model: data.model,
                    intent: data.intent
                };

                setMessages(prev => [...prev, botMessage]);
            } else {
                throw new Error(data.error || 'Phản hồi không hợp lệ từ server');
            }

        } catch (error) {
            console.error('❌ ChatBot error:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi kết nối với AI Assistant.';
            let quickReplies = ['🔄 Thử lại', '🌐 Kiểm tra kết nối'];

            if (error.name === 'AbortError') {
                errorMessage = 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại với tin nhắn ngắn hơn.';
            } else if (error.message.includes('429')) {
                errorMessage = 'Quá nhiều yêu cầu. Vui lòng chờ một chút rồi thử lại.';
                quickReplies = ['⏰ Thử lại sau', '📞 Liên hệ hỗ trợ'];
            } else if (error.message.includes('500')) {
                errorMessage = 'Lỗi hệ thống AI. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
                quickReplies = ['🔄 Thử lại', '📞 Gọi hotline', '📧 Gửi email'];
            }

            const errorBotMessage = {
                id: Date.now() + 2,
                text: `❌ ${errorMessage}\n\n💡 Gợi ý:\n• Kiểm tra kết nối internet\n• Thử với tin nhắn ngắn hơn\n• Liên hệ hỗ trợ: 0865.124.996`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true,
                quickReplies: quickReplies
            };

            setMessages(prev => [...prev, errorBotMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ✅ ENHANCED HANDLE QUICK REPLY WITH ROLE-BASED RESPONSES
    const handleQuickReply = (reply) => {
        const userRole = getUserRole();
        
        // ✅ ROLE-SPECIFIC QUICK REPLIES
        if (userRole === 'receptionist') {
            // Receptionist-specific quick replies
            if (reply === '🏨 Quản lý phòng') {
                sendMessage('Cho tôi thông tin về tình trạng phòng hiện tại, cách quản lý check-in/check-out và quy trình xử lý yêu cầu đặc biệt của khách.', true);
                return;
            }
            
            if (reply === '👥 Hỗ trợ khách') {
                sendMessage('Hướng dẫn tôi cách trả lời các câu hỏi thường gặp của khách, xử lý khiếu nại và cung cấp thông tin dịch vụ một cách chuyên nghiệp.', true);
                return;
            }
            
            if (reply === '📧 Viết email') {
                sendMessage('Giúp tôi viết email chuyên nghiệp để trả lời khách hàng về đặt phòng, xác nhận booking, hoặc giải quyết khiếu nại.', true);
                return;
            }
        }

        // ✅ HANDLE CONNECTION CHECK
        if (reply === '🌐 Kiểm tra kết nối') {
            checkConnection();
            return;
        }

        // ✅ HANDLE FIX GUIDE
        if (reply === '🔧 Hướng dẫn fix') {
            const fixGuideMessage = {
                id: Date.now(),
                text: "🔧 **HƯỚNG DẪN KHẮC PHỤC SỰ CỐ:**\n\n1️⃣ **Kiểm tra kết nối mạng**\n• Wifi/4G ổn định\n• Tốc độ > 1Mbps\n\n2️⃣ **Làm mới trình duyệt**\n• Ctrl+F5 (Windows)\n• Cmd+R (Mac)\n\n3️⃣ **Xóa cache**\n• Settings > Privacy > Clear Data\n\n4️⃣ **Thử trình duyệt khác**\n• Chrome, Firefox, Safari\n\n5️⃣ **Liên hệ hỗ trợ**\n• Hotline: 0865.124.996\n• Email: datltthe194235@gmail.com",
                sender: 'bot',
                timestamp: new Date().toISOString(),
                quickReplies: ['🌐 Test lại', '📞 Gọi hotline', '📧 Gửi email']
            };
            setMessages(prev => [...prev, fixGuideMessage]);
            return;
        }

        // ✅ HANDLE TEST CONNECTION
        if (reply === '🌐 Test lại') {
            checkConnection();
            return;
        }

        // ✅ HANDLE AI PROMPT MODE TOGGLE
        if (reply === '📝 AI Prompt') {
            setPromptMode(true);
            const promptModeMessage = {
                id: Date.now(),
                text: `🤖 **ĐÃ BẬT CHẾ ĐỘ AI PROMPT**\n\nBạn có thể yêu cầu AI:\n${
                    userRole === 'receptionist' 
                        ? '• Viết email chuyên nghiệp cho khách\n• Tạo hướng dẫn check-in/check-out\n• Phân tích yêu cầu khách hàng\n• Soạn thảo thông báo khách sạn\n• Xử lý khiếu nại và phản hồi\n• Lập kế hoạch dịch vụ\n\n💼 *Chế độ chuyên nghiệp cho lễ tân*'
                        : '• Viết email, thư, mô tả, review\n• Phân tích thời tiết, địa điểm\n• Lập kế hoạch du lịch\n• Tạo lịch trình tham quan\n• Hướng dẫn di chuyển\n• So sánh dịch vụ\n\n✨ *Chế độ AI sáng tạo và phân tích*'
                }`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                quickReplies: userRole === 'receptionist' 
                    ? ['📧 Email khách', '📋 Hướng dẫn', '🎯 Phân tích', '🔙 Chat thường']
                    : ['📝 Viết nội dung', '🌤️ Phân tích thời tiết', '🗺️ Lập kế hoạch', '🔙 Chat thường']
            };
            setMessages(prev => [...prev, promptModeMessage]);
            return;
        }

        // ✅ HANDLE WEATHER QUICK REPLY  
        if (reply === '🌤️ Thời tiết') {
            if (weatherInfo) {
                const weatherMessage = generateWeatherMessage();
                const weatherBotMessage = {
                    id: Date.now(),
                    text: weatherMessage,
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: ['🌤️ Hôm nay', '📅 Theo mùa', '👕 Chuẩn bị gì', '🗓️ Thời điểm đẹp']
                };
                setMessages(prev => [...prev, weatherBotMessage]);
            } else {
                sendMessage('Cho tôi thông tin thời tiết Hà Nội hiện tại và theo mùa, cùng lời khuyên chuẩn bị gì khi đến khách sạn.', true);
            }
            return;
        }

        // ✅ HANDLE ATTRACTIONS QUICK REPLY
        if (reply === '🗺️ Tham quan') {
            if (localAttractions) {
                const attractionsMessage = generateAttractionsMessage();
                const attractionsBotMessage = {
                    id: Date.now(),
                    text: attractionsMessage,
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: ['🏛️ Chùa Hương', '🌲 Ba Vì', '🏮 Phố Cổ', '🚗 Hướng dẫn đi']
                };
                setMessages(prev => [...prev, attractionsBotMessage]);
            } else {
                sendMessage('Giới thiệu cho tôi các địa điểm tham quan gần Hotel HUB và trung tâm Hà Nội, cùng cách di chuyển.', true);
            }
            return;
        }

        // ✅ HANDLE EXPANDED PROMPT CATEGORY SELECTION
        if (reply.startsWith('📝 ') || reply.startsWith('🌤️ ') || reply.startsWith('🗺️ ')) {
            setPromptMode(true);
            let promptText = '';
            
            if (reply.includes('Viết nội dung')) {
                promptText = 'Giúp tôi viết nội dung marketing cho khách sạn, email khách hàng, hoặc mô tả dịch vụ chuyên nghiệp.';
            } else if (reply.includes('Phân tích thời tiết')) {
                promptText = 'Phân tích thời tiết Hà Nội theo mùa và đưa ra lời khuyên chuẩn bị cho khách du lịch.';
            } else if (reply.includes('Lập kế hoạch')) {
                promptText = 'Giúp tôi lập kế hoạch du lịch Hà Nội 2-3 ngày, bao gồm lịch trình, địa điểm, ăn uống.';
            } else if (reply.includes('Email khách')) {
                promptText = 'Viết email chuyên nghiệp trả lời khách hàng về đặt phòng, xác nhận booking, hoặc giải quyết vấn đề.';
            } else if (reply.includes('Hướng dẫn')) {
                promptText = 'Tạo hướng dẫn chi tiết cho quy trình check-in/check-out và các dịch vụ khách sạn.';
            } else if (reply.includes('Phân tích')) {
                promptText = 'Phân tích yêu cầu của khách hàng và đưa ra giải pháp phù hợp.';
            }
            
            sendMessage(promptText, true);
            return;
        }

        // ✅ HANDLE WEATHER SPECIFIC QUERIES
        if (['🌤️ Hôm nay', '📅 Theo mùa', '👕 Chuẩn bị gì', '🗓️ Thời điểm đẹp'].includes(reply)) {
            const weatherPrompts = {
                '🌤️ Hôm nay': 'Thời tiết Hà Nội hôm nay như thế nào? Nhiệt độ, độ ẩm, có mưa không?',
                '📅 Theo mùa': 'Khí hậu Hà Nội thay đổi như thế nào theo từng mùa trong năm?',
                '👕 Chuẩn bị gì': 'Du khách nên chuẩn bị trang phục và đồ dùng gì cho thời tiết Hà Nội?',
                '🗓️ Thời điểm đẹp': 'Thời điểm nào trong năm là lý tưởng nhất để du lịch Hà Nội?'
            };
            sendMessage(weatherPrompts[reply], true);
            return;
        }

        // ✅ HANDLE ATTRACTIONS SPECIFIC QUERIES
        if (['🏛️ Chùa Hương', '🌲 Ba Vì', '🏮 Phố Cổ', '🚗 Hướng dẫn đi'].includes(reply)) {
            const attractionPrompts = {
                '🏛️ Chùa Hương': 'Hướng dẫn chi tiết đi Chùa Hương từ Hotel HUB, thời gian, chi phí và lưu ý.',
                '🌲 Ba Vì': 'Thông tin du lịch Ba Vì từ Hòa Lạc, các hoạt động và địa điểm tham quan.',
                '🏮 Phố Cổ': 'Lịch trình tham quan Phố Cổ Hà Nội, món ăn đặc sản và cách di chuyển.',
                '🚗 Hướng dẫn đi': 'Hướng dẫn các phương tiện di chuyển từ Hotel HUB đến các địa điểm du lịch nổi tiếng.'
            };
            sendMessage(attractionPrompts[reply], true);
            return;
        }

        // ✅ HANDLE BACK TO NORMAL CHAT
        if (reply === '🔙 Chat thường') {
            setPromptMode(false);
            const normalModeMessage = {
                id: Date.now(),
                text: `✅ **ĐÃ TẮT CHẾ ĐỘ AI PROMPT**\n\n${
                    userRole === 'receptionist'
                        ? '💼 Bạn đã quay lại chế độ chat thường cho lễ tân.\nTôi sẽ trả lời các câu hỏi về quản lý khách sạn và hỗ trợ khách hàng.'
                        : '💬 Bạn đã quay lại chế độ chat thường.\nTôi sẽ trả lời các câu hỏi về khách sạn và du lịch Hà Nội.'
                }`,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                quickReplies: userRole === 'receptionist' 
                    ? ['🏨 Quản lý phòng', '👥 Hỗ trợ khách', '🌤️ Thời tiết', '📧 Viết email']
                    : ['🛏️ Đặt phòng', '🌤️ Thời tiết', '🗺️ Tham quan', '📝 AI Prompt']
            };
            setMessages(prev => [...prev, normalModeMessage]);
            return;
        }

        // ✅ HANDLE SPECIAL ACTIONS
        if (reply === '📞 Gọi hotline') {
            window.open('tel:0865124996');
            return;
        }
        if (reply === '📧 Gửi email') {
            window.open('mailto:datltthe194235@gmail.com');
            return;
        }
        if (reply === '🔄 Thử lại') {
            sendMessage(messages[messages.length - 2]?.text || 'Xin chào!');
            return;
        }
        
        // ✅ DETECT IF REPLY IS A PROMPT
        const isPromptReply = promptExamples && Object.values(promptExamples).flat().includes(reply);
        sendMessage(reply, isPromptReply || promptMode);
    };

    // ✅ CONNECTION CHECK FUNCTION
    const checkConnection = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/chatbot/health');
            const data = await response.json();
            
            if (response.ok && data.status === 'OK') {
                const successMessage = {
                    id: Date.now(),
                    text: "✅ **KẾT NỐI THÀNH CÔNG!**\n\nHệ thống AI đang hoạt động bình thường.\n\n📊 Trạng thái:\n• Server: Online ✅\n• AI Model: " + (data.aiModel || 'Gemini 1.5 Flash') + " ✅\n• Database: Connected ✅\n• Response Time: " + (data.responseTime || '< 500ms') + "\n\n🎉 Bạn có thể tiếp tục sử dụng chatbot!",
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    quickReplies: ['🤖 Test AI', '🏨 Hỏi về khách sạn', '🌤️ Thời tiết']
                };
                setMessages(prev => [...prev, successMessage]);
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            const errorMessage = {
                id: Date.now(),
                text: "❌ **KẾT NỐI THẤT BẠI!**\n\nKhông thể kết nối đến server AI.\n\n🔧 Hướng dẫn khắc phục:\n1. Kiểm tra kết nối internet\n2. Thử tải lại trang (F5)\n3. Chờ 1-2 phút rồi thử lại\n4. Liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn\n\n📞 Hỗ trợ: 0865.124.996",
                sender: 'bot',
                timestamp: new Date().toISOString(),
                isError: true,
                quickReplies: ['🔄 Thử lại', '🔧 Hướng dẫn fix', '📞 Gọi hotline']
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    // ✅ HELPER FUNCTIONS TO GENERATE CONTENT (same as before)
    const generateWeatherMessage = () => {
        if (!weatherInfo) return "Đang tải thông tin thời tiết...";
        
        const currentSeason = weatherInfo.currentSeason;
        const seasonData = weatherInfo.seasonalTips[currentSeason];
        
        return `🌤️ THỜI TIẾT HÀ NỘI - MÙA ${currentSeason.toUpperCase()}:\n\n` +
               `🌡️ Nhiệt độ: ${seasonData.temperature}\n` +
               `👕 Trang phục: ${seasonData.clothing}\n` +
               `🎯 Hoạt động: ${seasonData.activities}\n` +
               `💡 Lời khuyên: ${seasonData.tips}\n\n` +
               `📋 Dự báo 7 ngày tới:\n${weatherInfo.weeklyForecast.slice(0, 3).map(day => 
                   `${day.date}: ${day.temperature}, ${day.condition}`
               ).join('\n')}`;
    };

    const generateAttractionsMessage = () => {
        if (!localAttractions) return "Đang tải thông tin địa điểm...";
        
        return `🗺️ ĐỊA ĐIỂM THAM QUAN GẦN HOTEL HUB:\n\n` +
               localAttractions.nearbyAttractions.map(place => 
                   `📍 ${place.name}\n` +
                   `   📏 Cách: ${place.distance} (${place.duration})\n` +
                   `   📝 Mô tả: ${place.description}\n` +
                   `   ⭐ Thời điểm: ${place.bestTime}\n`
               ).join('\n') +
               `\n🏙️ TRUNG TÂM HÀ NỘI:\n` +
               localAttractions.hanoiAttractions.slice(0, 2).map(place => 
                   `📍 ${place.name}: ${place.distance} (${place.duration})`
               ).join('\n');
    };

    // ✅ ENHANCED CLEAR CHAT WITH CONFIRMATION
    const clearChat = () => {
        if (messages.length > 1) {
            const confirmed = window.confirm('Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện không?');
            if (!confirmed) return;
        }
        
        const welcomeMsg = getWelcomeMessage();
        setMessages([{
            id: 1,
            text: welcomeMsg.text,
            sender: 'bot',
            timestamp: new Date().toISOString(),
            quickReplies: welcomeMsg.quickReplies
        }]);
        setSessionId(null);
        setPromptMode(false);
    };

    // ✅ REFRESH CACHE FUNCTION
    const refreshChatBotCache = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/chatbot/refresh-cache', {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                toast.success('Đã cập nhật dữ liệu mới!');
                
                const refreshMessage = {
                    id: Date.now(),
                    text: `🔄 **DỮ LIỆU ĐÃ ĐƯỢC CẬP NHẬT!**\n\n✅ Thông tin mới nhất từ hệ thống:\n• Tình trạng phòng\n• Khuyến mãi hiện tại\n• Dịch vụ khách sạn\n• Thống kê booking\n\n⏰ Cập nhật lúc: ${new Date().toLocaleString('vi-VN')}`,
                    sender: 'bot',
                    timestamp: new Date().toISOString(),
                    isSystem: true,
                    quickReplies: ['🏨 Xem phòng mới', '💰 Khuyến mãi', '📊 Thống kê']
                };
                setMessages(prev => [...prev, refreshMessage]);
            } else {
                throw new Error('Refresh failed');
            }
        } catch (error) {
            console.error('Refresh cache error:', error);
            toast.error('Không thể cập nhật dữ liệu');
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            {/* Chat Button */}
            <div className={`${styles['chatbot-toggle']} ${isOpen ? styles.active : ''}`} onClick={toggleChat}>
                {isOpen ? (
                    <i className="fas fa-times"></i>
                ) : (
                    <div className={styles['chat-icon']}>
                        <i className="fas fa-robot"></i>
                        <div className={styles['chat-badge']}>
                            {getUserRole() === 'receptionist' ? '🛎️' : 
                             getUserRole() === 'manager' ? '👔' : 
                             getUserRole() === 'customer' ? '👤' : '🏨'}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Window */}
            <div className={`${styles['chatbot-window']} ${isOpen ? styles.open : ''}`}>
                {/* Header */}
                <div className={styles['chatbot-header']}>
                    <div className={styles['header-info']}>
                        <div className={styles['bot-avatar']}>
                            <i className="fas fa-robot"></i>
                        </div>
                        <div className={styles['header-text']}>
                            <h4>{getChatBotTitle()}</h4>
                            <span className={styles.status}>
                                <span className={styles['status-dot']}></span>
                                {getStatusText()}
                            </span>
                        </div>
                    </div>
                    <div className={styles['header-actions']}>
                        {/* ✅ AI PROMPT MODE TOGGLE */}
                        <button 
                            className={`${styles['btn-prompt']} ${promptMode ? styles.active : ''}`}
                            onClick={() => handleQuickReply(promptMode ? '🔙 Chat thường' : '📝 AI Prompt')} 
                            title={promptMode ? "Thoát chế độ prompt" : "Chế độ AI prompt"}
                        >
                            <i className={promptMode ? "fas fa-comments" : "fas fa-magic"}></i>
                        </button>
                        <button 
                            className={styles['btn-refresh']} 
                            onClick={refreshChatBotCache} 
                            title="Cập nhật dữ liệu mới"
                        >
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button 
                            className={styles['btn-clear']} 
                            onClick={clearChat} 
                            title="Xóa cuộc trò chuyện"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                        <button 
                            className={styles['btn-close']} 
                            onClick={toggleChat} 
                            title="Đóng chat"
                        >
                            <i className="fas fa-minus"></i>
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
                                    message.isSystem ? styles.system :
                                    message.isPrompt ? styles.prompt :
                                    message.isPromptResponse ? styles.promptResponse : ''
                                }`}>
                                    <p style={{whiteSpace: 'pre-line'}}>{message.text}</p>
                                    <span className={styles['message-time']}>
                                        {formatTime(message.timestamp)}
                                        {/* ✅ SHOW MESSAGE TYPE INFO */}
                                        {(message.isPrompt || message.isPromptResponse) && (
                                            <small style={{display: 'block', fontSize: '0.7rem', opacity: 0.7}}>
                                                {message.isPrompt ? '🤖 AI Prompt' : '✨ AI Response'}
                                            </small>
                                        )}
                                        {message.model && process.env.NODE_ENV === 'development' && (
                                            <small style={{display: 'block', fontSize: '0.7rem', opacity: 0.7}}>
                                                {message.model} • {message.intent}
                                            </small>
                                        )}
                                    </span>
                                </div>
                                
                                {/* Quick Replies */}
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
                    
                    {/* Typing Indicator */}
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
                            placeholder={getPlaceholderText()}
                            disabled={isTyping}
                            maxLength={promptMode ? 2000 : 1000}
                        />
                        <button 
                            className={styles['send-button']}
                            onClick={() => sendMessage()}
                            disabled={!inputMessage.trim() || isTyping}
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div className={styles['input-footer']}>
                        <small>
                            {/* ✅ SHOW CHARACTER COUNT AND MODE */}
                            {inputMessage.length}/{promptMode ? 2000 : 1000} • 
                            {promptMode ? ' 🤖 AI Prompt' : ' 💬 Chat'} • 
                            Powered by {modelInfo?.name || 'Gemini AI'} • 
                            {getUserRole() === 'receptionist' ? '👨‍💼 Lễ tân' : 
                             getUserRole() === 'manager' ? '👔 Quản lý' : 
                             getUserRole() === 'customer' ? '👤 Khách hàng' : '🏨 Hanoi Expert'}
                        </small>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatBot;