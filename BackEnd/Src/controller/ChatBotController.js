import express from 'express';
import ChatBotService from '../services/ChatBotService.js';

const router = express.Router();
const chatBotService = new ChatBotService();

// Store conversation history (trong production nên dùng Redis/Database)
const conversationStore = new Map();

// ✅ CORS MIDDLEWARE PHẢI Ở ĐẦU FILE
router.use((req, res, next) => {
    // Log incoming requests
    console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.path}`, {
        body: req.body ? Object.keys(req.body) : 'no body',
        headers: {
            'content-type': req.headers['content-type'],
                'origin': req.headers['origin']
        }
    });

    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('✅ Handling OPTIONS preflight request');
        res.sendStatus(200);
        return;
    }
    
    next();
});

// ✅ HEALTH CHECK ENDPOINT
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'ChatBot API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            chat: '/api/chatbot/chat',
            prompt: '/api/chatbot/prompt',
            modelInfo: '/api/chatbot/model-info',
            health: '/api/chatbot/health'
        }
    });
});

// ✅ TEST DATABASE CONNECTION
router.get('/test-db', async (req, res) => {
    try {
        const dbTests = await chatBotService.dbContext.testDatabaseConnection();
        res.json({
            success: true,
            message: 'Database connection test completed',
            results: dbTests,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection test failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ CACHE STATUS ENDPOINT
router.get('/cache-status', (req, res) => {
    const cacheStatus = chatBotService.getCacheStatus();
    res.json({
        success: true,
        cache: cacheStatus,
        timestamp: new Date().toISOString()
    });
});

// ✅ REFRESH CACHE ENDPOINT
router.post('/refresh-cache', async (req, res) => {
    try {
        const data = await chatBotService.refreshCache();
        res.json({
            success: true,
            message: 'Cache refreshed successfully',
            data: {
                roomTypes: data.roomTypes?.length || 0,
                availableRooms: data.availableRooms?.length || 0,
                promotions: data.promotions?.length || 0,
                services: data.services?.length || 0
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to refresh cache',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ PROMPT ENDPOINT - MUST BE POST
router.post('/prompt', async (req, res) => {
    try {
        console.log('📨 Prompt endpoint hit:', {
            method: req.method,
            body: req.body,
            headers: {
                'content-type': req.headers['content-type']
            }
        });

        const { prompt, sessionId } = req.body;

        if (!prompt || prompt.trim() === '') {
            console.log('❌ Invalid prompt:', prompt);
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        // Validate prompt length
        if (prompt.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Prompt too long. Maximum 2000 characters.',
                response: 'Prompt quá dài. Vui lòng viết ngắn gọn hơn (tối đa 2000 ký tự).'
            });
        }

        // Tạo session ID nếu không có
        const userSessionId = sessionId || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Lấy lịch sử hội thoại
        let conversationHistory = conversationStore.get(userSessionId) || [];

        console.log(`[Direct Prompt] Session: ${userSessionId}, Prompt: ${prompt.substring(0, 100)}...`);

        // Gọi AI để xử lý prompt trực tiếp
        const aiResponse = await chatBotService.handleDirectPrompt(prompt, conversationHistory);

        // Cập nhật lịch sử hội thoại
        conversationHistory.push(
            { role: 'user', content: prompt, timestamp: new Date().toISOString(), type: 'prompt' },
            { role: 'assistant', content: aiResponse.response, timestamp: aiResponse.timestamp, type: 'prompt_response' }
        );

        // Giới hạn lịch sử
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }

        // Lưu lại lịch sử
        conversationStore.set(userSessionId, conversationHistory);

        // Session cleanup
        setTimeout(() => {
            if (conversationStore.has(userSessionId)) {
                console.log(`[Direct Prompt] Cleaned up session: ${userSessionId}`);
                conversationStore.delete(userSessionId);
            }
        }, 2 * 60 * 60 * 1000); // 2 hours for prompts

        // Tạo quick replies cho prompt
        const quickReplies = chatBotService.getQuickReplies('direct_prompt');

        res.json({
            success: aiResponse.success,
            response: aiResponse.response,
            sessionId: userSessionId,
            intent: 'direct_prompt',
            quickReplies: quickReplies,
            timestamp: aiResponse.timestamp,
            model: aiResponse.model || 'gemini-1.5-flash',
            promptType: aiResponse.promptType || 'direct',
            originalPrompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
            conversationLength: conversationHistory.length
        });

    } catch (error) {
        console.error('❌ Direct Prompt API Error:', error);
        
        const errorResponse = {
            success: false,
            error: 'Internal server error',
            response: 'Xin lỗi, tôi không thể xử lý prompt này lúc này. Vui lòng thử lại sau.',
            model: 'gemini-1.5-flash-error',
            timestamp: new Date().toISOString(),
            promptType: 'direct'
        };

        res.status(500).json(errorResponse);
    }
});

// ✅ ENHANCED ROLE-BASED CONTEXT
router.post('/chat', async (req, res) => {
    try {
        const { 
            message, 
            sessionId = `session_${Date.now()}`,
            userRole = 'customer',
            userId = null,
            context = {}
        } = req.body;

        console.log('💬 Enhanced Chat request:', {
            message: message?.substring(0, 50) + '...',
            userRole,
            userId,
            hasContext: Object.keys(context).length > 0,
            contextKeys: Object.keys(context)
        });

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Message cannot be empty'
            });
        }

        // ✅ ENHANCED ROLE-BASED CONTEXT WITH REAL DATA
        let enhancedContext = '';
        
        switch (userRole) {
            case 'manager':
                enhancedContext = `
                Bạn đang hỗ trợ MANAGER của Hotel HUB. Cung cấp thông tin executive-level:
                - Strategic insights và business analytics
                - Revenue optimization và market analysis  
                - Staff performance và operational efficiency
                - Long-term planning và growth strategies
                - Competitive analysis và industry trends
                - Executive summary format với key metrics
                - Decision support với data-driven recommendations
                Tone: Professional, strategic, data-focused
                Response format: Trả lời CHÍNH XÁC bằng text string, không format JSON
                `;
                break;
                
            case 'receptionist':
                enhancedContext = `
                Bạn đang hỗ trợ LỄTÂN của Hotel HUB với full access to real-time data. Ưu tiên:
                - Real-time room status và booking management (120 phòng available)
                - Check-in/check-out procedures và guest handling
                - Payment processing và billing operations
                - Guest services và special requests handling
                - Housekeeping coordination và maintenance scheduling
                - Complaint resolution và customer satisfaction
                - Daily operations reporting và shift handover
                - VIP guest management và protocol
                - Emergency procedures và security protocols
                
                Current Hotel Data Available:
                • 120 phòng với real-time status tracking
                • 6 loại phòng với pricing tiers khác nhau
                • 5 dịch vụ premium available
                • 2 khuyến mãi hiện tại đang active
                • Payment systems: VNPay, MoMo, QR Banking
                • Hotline: 0865.124.996 (24/7 support)
                
                Tone: Professional, helpful, solution-oriented, detailed
                Response style: Provide actionable information với step-by-step guidance
                Response format: Trả lời CHÍNH XÁC bằng text string, không format JSON
                `;
                break;
                
            case 'customer':
            default:
                enhancedContext = `
                Bạn đang hỗ trợ KHÁCH HÀNG của Hotel HUB. Tập trung:
                - Thông tin đặt phòng và room availability
                - Giá cả, promotions, và booking packages  
                - Hotel amenities và premium services
                - Local attractions và travel recommendations
                - Friendly, welcoming tone với sales opportunities
                - Guest satisfaction và memorable experience
                - Upselling cơ hội với các dịch vụ premium
                
                Current Offers:
                • 120 phòng available với 6 room types
                • Promotions active: Student discount, Birthday special
                • Services: Spa, Restaurant, Airport transfer
                • Location: FPT University area, Hòa Lạc, Hà Nội
                
                Tone: Warm, welcoming, sales-oriented
                Response format: Trả lời CHÍNH XÁC bằng text string, không format JSON hoặc object
                `;
                break;
        }

        // ✅ BUILD ROLE-BASED PROMPT WITH ENHANCED CONTEXT
        const roleBasedPrompt = `${enhancedContext}\n\nIMPORTANT: Chỉ trả lời bằng TEXT THUẦN TÚY, không dùng JSON format, không dùng object.\n\nUser (${userRole}): ${message}`;

        // Generate response with enhanced role context
        const response = await chatBotService.generateResponse(
            roleBasedPrompt, 
            [] // conversation history can be added later
        );

        // ✅ ENHANCED ROLE-BASED QUICK REPLIES
        const quickReplies = getEnhancedRoleQuickReplies(userRole, message);

        // ✅ STRICT RESPONSE TYPE VALIDATION
        let finalResponse;
        if (typeof response === 'string') {
            finalResponse = response;
        } else if (response && typeof response === 'object') {
            // Extract text from object response
            if (response.text) {
                finalResponse = response.text;
            } else if (response.message) {
                finalResponse = response.message;
            } else if (response.response) {
                finalResponse = response.response;
            } else {
                finalResponse = JSON.stringify(response);
            }
        } else {
            finalResponse = String(response || 'Không thể tạo phản hồi');
        }

        // Validate final response
        if (!finalResponse || finalResponse.trim() === '') {
            finalResponse = `Xin lỗi, tôi không thể trả lời câu hỏi "${message}" lúc này. Vui lòng thử hỏi theo cách khác hoặc liên hệ hotline 0865.124.996 để được hỗ trợ trực tiếp.`;
        }

        console.log('✅ Final response validation:', {
            originalType: typeof response,
            finalType: typeof finalResponse,
            length: finalResponse.length,
            preview: finalResponse.substring(0, 100) + '...'
        });

        res.json({
            success: true,
            response: finalResponse, // ✅ GUARANTEED STRING
            quickReplies: quickReplies,
            sessionId: sessionId,
            userRole: userRole,
            timestamp: new Date().toISOString(),
            model: 'gemini-1.5-flash',
            dataStatus: {
                roomsAvailable: 120,
                roomTypes: 6,
                activePromotions: 2,
                servicesOffered: 5
            }
        });

    } catch (error) {
        console.error('❌ Enhanced Chat endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            response: 'Hệ thống chatbot tạm thời gặp sự cố. Vui lòng thử lại sau hoặc liên hệ hotline 0865.124.996.',
            fallbackActions: {
                receptionist: ['Use dashboard at /receptionist', 'Call IT: 0865.124.996'],
                customer: ['Browse rooms manually', 'Call hotline: 0865.124.996'],
                manager: ['Check analytics dashboard', 'Contact IT support']
            }
        });
    }
});

// ✅ ENHANCED HELPER FUNCTION FOR ROLE-BASED QUICK REPLIES
function getEnhancedRoleQuickReplies(userRole, message) {
    const lowerMessage = message.toLowerCase();
    
    switch (userRole) {
        case 'manager':
            if (lowerMessage.includes('báo cáo') || lowerMessage.includes('report')) {
                return ['📊 Executive Dashboard', '💰 Revenue Analysis', '👥 Staff Performance', '📈 Market Trends'];
            }
            if (lowerMessage.includes('doanh thu') || lowerMessage.includes('revenue')) {
                return ['💰 Today Revenue', '📈 Monthly Trends', '🏆 Best Performers', '💡 Optimization Tips'];
            }
            return ['📊 Analytics', '💰 Revenue', '👥 Staff', '📈 Growth Strategy'];
            
        case 'receptionist':
            if (lowerMessage.includes('phòng') || lowerMessage.includes('room')) {
                return ['🏨 120 Phòng Status', '🧹 Housekeeping', '🔧 Maintenance', '📋 Reservations'];
            } else if (lowerMessage.includes('khách') || lowerMessage.includes('guest')) {
                return ['✅ Check-in Today', '🚪 Check-out List', '🛎️ VIP Requests', '📞 Guest Issues'];
            } else if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment')) {
                return ['💳 Payment Process', '🧾 Print Receipt', '💰 Reconcile Shift', '📊 Payment Stats'];
            } else if (lowerMessage.includes('thời tiết') || lowerMessage.includes('weather')) {
                return ['🌤️ HN Weather Today', '📅 Weekly Forecast', '🧳 Guest Recommendations', '🌧️ Weather Alerts'];
            }
            return ['🏨 Room Status', '📋 Bookings', '👥 Guests', '💳 Payments', '📊 Reports'];
            
        case 'customer':
        default:
            if (lowerMessage.includes('phòng') || lowerMessage.includes('room')) {
                return ['🛏️ Room Types', '💰 Best Prices', '📅 Availability', '🎁 Special Offers'];
            } else if (lowerMessage.includes('thời tiết') || lowerMessage.includes('weather')) {
                return ['🌤️ HN Weather', '🧳 What to Pack', '📅 Best Season', '🌧️ Rain Forecast'];
            }
            return ['🛏️ Book Room', '🌟 Services', '🎁 Promotions', '📍 Location', '🌤️ Weather'];
    }
}

// ✅ MODEL INFO ENDPOINT
router.get('/model-info', (req, res) => {
    res.json({
        success: true,
        model: {
            name: 'Gemini 1.5 Flash',
            version: '1.5',
            provider: 'Google AI',
            capabilities: ['text-generation', 'conversation', 'prompt-processing'],
            maxTokens: 8192,
            temperature: 0.7
        },
        features: [
            'Hotel booking assistance',
            'Room information',
            'Local attractions guide',
            'Weather information',
            'Travel recommendations'
        ],
        timestamp: new Date().toISOString()
    });
});

// ✅ PROMPT EXAMPLES ENDPOINT
router.get('/prompt-examples', (req, res) => {
    res.json({
        success: true,
        examples: [
            "Viết email chào mừng khách hàng đến Hotel HUB",
            "Tạo mô tả chi tiết về phòng Suite cao cấp",
            "Hướng dẫn chuẩn bị đồ dùng theo thời tiết Hà Nội",
            "Lập kế hoạch tham quan Hà Nội 3 ngày 2 đêm",
            "So sánh các loại phòng và dịch vụ của hotel",
            "Phân tích thời tiết theo mùa ở khu vực Hòa Lạc"
        ],
        categories: [
            "Hotel & Accommodation",
            "Weather & Climate", 
            "Travel Planning",
            "Local Attractions",
            "Food & Culture"
        ],
        timestamp: new Date().toISOString()
    });
});

// ✅ WEATHER INFO ENDPOINT
router.get('/weather-info', (req, res) => {
    res.json({
        success: true,
        location: "Hà Nội, Việt Nam",
        seasons: {
            spring: { months: "Feb-Apr", temp: "18-25°C", description: "Mát mẻ, ít mưa" },
            summer: { months: "May-Aug", temp: "25-35°C", description: "Nóng ẩm, mưa nhiều" },
            autumn: { months: "Sep-Nov", temp: "20-28°C", description: "Mát mẻ, đẹp nhất năm" },
            winter: { months: "Dec-Jan", temp: "10-20°C", description: "Lạnh, khô ráo" }
        },
        currentSeason: getCurrentSeason(),
        timestamp: new Date().toISOString()
    });
});

// ✅ LOCAL ATTRACTIONS ENDPOINT
router.get('/local-attractions', (req, res) => {
    res.json({
        success: true,
        nearHotel: [
            { name: "Chùa Hương", distance: "15km", time: "30 phút", type: "Tâm linh" },
            { name: "Ba Vì National Park", distance: "40km", time: "1 giờ", type: "Thiên nhiên" },
            { name: "Đầm Vạc - Vân Hòa", distance: "20km", time: "40 phút", type: "Sinh thái" }
        ],
        inHanoi: [
            { name: "Phố Cổ Hà Nội", distance: "45km", time: "1 giờ", type: "Văn hóa" },
            { name: "Hồ Gươm", distance: "45km", time: "1 giờ", type: "Danh lam" },
            { name: "Văn Miếu", distance: "40km", time: "50 phút", type: "Lịch sử" }
        ],
        timestamp: new Date().toISOString()
    });
});

// Helper function
function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

// ✅ EXPORT ROUTER
export default router;