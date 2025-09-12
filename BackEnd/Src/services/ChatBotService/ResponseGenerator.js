import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class ResponseGenerator {
    constructor(contextManager) {
        this.contextManager = contextManager;
        
        // Initialize Google AI
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        
        if (!apiKey) {
            console.error('❌ GOOGLE_AI_API_KEY is not set in .env file');
            throw new Error('Google AI API key is required');
        }
        
        this.genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        
        this.model = this.genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
                candidateCount: 1,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                }
            ],
        });

        console.log('✅ ResponseGenerator initialized with model:', modelName);
    }

    // ✅ ENHANCED CHAT RESPONSE WITH DATABASE INTEGRATION
    async generateChatResponse(message, conversationHistory = []) {
        try {
            console.log('🤖 Generating enhanced chat response for:', message.substring(0, 50) + '...');

            // ✅ GET ENHANCED CONTEXT WITH ALL DATABASE DATA
            const dynamicContext = await this.contextManager.buildDynamicContext();
            const hotelContext = this.contextManager.getHotelContext();
            
            // ✅ CHECK FOR SPECIFIC DATA QUERIES
            const specificData = await this.handleSpecificQueries(message);
            
            let enhancedPrompt = `${hotelContext}\n\n${dynamicContext}`;
            
            if (specificData) {
                enhancedPrompt += `\n\n🔍 DỮ LIỆU CỤ THỂ CHO TRUY VẤN:\n${specificData}\n`;
            }
            
            enhancedPrompt += `\n\nUser: ${message}\n\nInstructions: Trả lời bằng tiếng Việt thân thiện và chuyên nghiệp. Sử dụng dữ liệu thời gian thực để đưa ra thông tin chính xác nhất. Nếu có dữ liệu cụ thể, hãy tham khảo và trích dẫn.`;

            const completion = await this.model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: enhancedPrompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            });

            const response = completion.response;
            let responseText = response.text();

            // Clean and validate response
            responseText = this.cleanResponse(responseText);

            console.log('✅ Enhanced chat response generated successfully');

            return {
                text: responseText,
                type: 'enhanced_chat_with_database',
                model: 'gemini-1.5-flash',
                databaseIntegrated: true,
                hasSpecificData: !!specificData
            };

        } catch (error) {
            console.error('❌ Error generating enhanced chat response:', error);
            return {
                text: "Xin lỗi, tôi không thể tạo phản hồi phù hợp lúc này. Vui lòng thử hỏi câu khác hoặc liên hệ hotline 0865.124.996.",
                type: 'error',
                error: error.message
            };
        }
    }

    // ✅ HANDLE SPECIFIC DATABASE QUERIES
    async handleSpecificQueries(message) {
        const lowerMessage = message.toLowerCase();
        let specificData = '';

        try {
            // ✅ ROOM QUERIES
            if (lowerMessage.includes('phòng số') || lowerMessage.includes('room number')) {
                const roomNumberMatch = message.match(/phòng số (\w+)|room number (\w+)/i);
                if (roomNumberMatch) {
                    const roomNumber = roomNumberMatch[1] || roomNumberMatch[2];
                    const room = await this.contextManager.getRoomByNumber(roomNumber);
                    if (room) {
                        specificData += `🏨 THÔNG TIN PHÒNG ${roomNumber}:\n`;
                        specificData += `- Loại phòng: ${room.TypeName || 'N/A'}\n`;
                        specificData += `- Tầng: ${room.Floor}\n`;
                        specificData += `- Sức chứa: ${room.Capacity} người\n`;
                        specificData += `- Giá hiện tại: ${room.CurrentPrice?.toLocaleString('vi-VN')}đ/đêm\n`;
                        specificData += `- Trạng thái: ${room.Status}\n`;
                        if (room.Description) specificData += `- Mô tả: ${room.Description}\n`;
                        specificData += `\n`;
                    }
                }
            }

            // ✅ PROMOTION QUERIES
            if (lowerMessage.includes('khuyến mãi') || lowerMessage.includes('promotion')) {
                const promotionMatch = message.match(/khuyến mãi (.+)|promotion (.+)/i);
                if (promotionMatch) {
                    const promotionName = promotionMatch[1] || promotionMatch[2];
                    const promotion = await this.contextManager.getPromotionByName(promotionName);
                    if (promotion) {
                        specificData += `🎁 THÔNG TIN KHUYẾN MÃI "${promotion.PromotionName}":\n`;
                        specificData += `- Giảm giá: ${promotion.DiscountPercent}%\n`;
                        if (promotion.StartDate) {
                            specificData += `- Bắt đầu: ${new Date(promotion.StartDate).toLocaleDateString('vi-VN')}\n`;
                        }
                        if (promotion.EndDate) {
                            specificData += `- Kết thúc: ${new Date(promotion.EndDate).toLocaleDateString('vi-VN')}\n`;
                        }
                        if (promotion.Description) specificData += `- Mô tả: ${promotion.Description}\n`;
                        specificData += `\n`;
                    }
                }
            }

            // ✅ SERVICE QUERIES
            if (lowerMessage.includes('dịch vụ') || lowerMessage.includes('service')) {
                const serviceMatch = message.match(/dịch vụ (.+)|service (.+)/i);
                if (serviceMatch) {
                    const serviceName = serviceMatch[1] || serviceMatch[2];
                    const service = await this.contextManager.getServiceByName(serviceName);
                    if (service) {
                        specificData += `🛎️ THÔNG TIN DỊCH VỤ "${service.ServiceName}":\n`;
                        if (service.Price) specificData += `- Giá: ${service.Price.toLocaleString('vi-VN')}đ\n`;
                        if (service.Category) specificData += `- Danh mục: ${service.Category}\n`;
                        if (service.Duration) specificData += `- Thời gian: ${service.Duration} phút\n`;
                        if (service.MaxCapacity) specificData += `- Sức chứa: ${service.MaxCapacity} người\n`;
                        if (service.Description) specificData += `- Mô tả: ${service.Description}\n`;
                        specificData += `\n`;
                    }
                }
            }

            // ✅ OCCUPANCY QUERIES
            if (lowerMessage.includes('tỷ lệ lấp đầy') || lowerMessage.includes('occupancy') || 
                lowerMessage.includes('tình trạng phòng') || lowerMessage.includes('room status')) {
                const occupancyStats = this.contextManager.dataCache.occupancyStats;
                if (occupancyStats && Object.keys(occupancyStats).length > 0) {
                    specificData += `📊 TÌNH TRẠNG PHÒNG CHI TIẾT:\n`;
                    specificData += `- Tổng số phòng: ${occupancyStats.totalRooms}\n`;
                    specificData += `- Phòng trống: ${occupancyStats.availableRooms} (${Math.round((occupancyStats.availableRooms/occupancyStats.totalRooms)*100)}%)\n`;
                    specificData += `- Đang sử dụng: ${occupancyStats.occupiedRooms} phòng\n`;
                    specificData += `- Đã đặt trước: ${occupancyStats.reservedRooms} phòng\n`;
                    specificData += `- Đang bảo trì: ${occupancyStats.maintenanceRooms} phòng\n`;
                    specificData += `- Tỷ lệ lấp đầy: ${occupancyStats.occupancyRate}%\n`;
                    specificData += `\n`;
                }
            }

            // ✅ USER ROLE QUERIES
            if (lowerMessage.includes('quyền hạn') || lowerMessage.includes('role') || 
                lowerMessage.includes('phân quyền') || lowerMessage.includes('nhân sự')) {
                const roleStats = await this.contextManager.getUserRoleStats();
                if (roleStats && roleStats.length > 0) {
                    specificData += `👥 THỐNG KÊ PHÂN QUYỀN HỆ THỐNG:\n`;
                    roleStats.forEach(role => {
                        specificData += `- ${role.RoleName}: ${role.UserCount} người`;
                        if (role.Description) specificData += ` (${role.Description})`;
                        specificData += `\n`;
                    });
                    specificData += `\n`;
                }
            }

            return specificData || null;

        } catch (error) {
            console.error('❌ Error handling specific queries:', error);
            return null;
        }
    }

    // ✅ ENHANCED QUICK REPLIES BASED ON MESSAGE CONTENT
    getQuickReplies(intent, message = '') {
        const lowerMessage = message.toLowerCase();
        
        // ✅ CONTEXT-AWARE QUICK REPLIES
        if (lowerMessage.includes('phòng') || lowerMessage.includes('room')) {
            return [
                '🏨 Tình trạng tất cả phòng',
                '🛏️ Phòng trống hôm nay', 
                '💰 Bảng giá phòng',
                '🔍 Tìm phòng theo loại'
            ];
        }
        
        if (lowerMessage.includes('khuyến mãi') || lowerMessage.includes('promotion')) {
            return [
                '🎁 Khuyến mãi đang có',
                '💯 Ưu đãi sinh viên',
                '🎂 Khuyến mãi sinh nhật',
                '📅 Gói cuối tuần'
            ];
        }
        
        if (lowerMessage.includes('dịch vụ') || lowerMessage.includes('service')) {
            return [
                '🛎️ Tất cả dịch vụ',
                '🍽️ Nhà hàng & Bar',
                '💆 Spa & Massage',
                '🏊 Hồ bơi & Gym'
            ];
        }
        
        if (lowerMessage.includes('booking') || lowerMessage.includes('đặt phòng')) {
            return [
                '📅 Đặt phòng online',
                '📞 Gọi để đặt phòng',
                '💳 Hình thức thanh toán',
                '📋 Chính sách hủy'
            ];
        }
        
        if (lowerMessage.includes('thống kê') || lowerMessage.includes('báo cáo')) {
            return [
                '📊 Tỷ lệ lấp đầy',
                '💰 Doanh thu hôm nay',
                '👥 Số lượng khách',
                '🏆 Phòng phổ biến'
            ];
        }

        // ✅ DEFAULT ENHANCED QUICK REPLIES
        const quickReplies = {
            hotel_prompt: [
                "📝 Viết email đặt phòng", 
                "🏨 Mô tả dịch vụ khách sạn", 
                "📊 So sánh loại phòng", 
                "🎯 Lập kế hoạch nghỉ dưỡng"
            ],
            direct_prompt: [
                "🌤️ Thời tiết Hà Nội",
                "🗺️ Hướng dẫn tham quan",
                "🍜 Món ăn đặc sản",
                "🚗 Phương tiện di chuyển"
            ],
            booking: ["🛏️ Xem phòng trống", "💰 Báo giá hôm nay", "📱 Đặt online", "🎁 Ưu đãi hiện tại"],
            pricing: ["📋 Bảng giá chi tiết", "🏷️ Khuyến mãi đặc biệt", "🔄 So sánh phòng", "💳 Thanh toán"],
            general: [
                "🛏️ Tình trạng phòng", 
                "💰 Xem bảng giá", 
                "🎁 Khuyến mãi hot",
                "📊 Thống kê khách sạn"
            ]
        };
        
        return quickReplies[intent] || quickReplies.general;
    }

    // ✅ ENHANCED DIRECT PROMPT HANDLING
    async handleDirectPrompt(prompt, conversationHistory = []) {
        try {
            console.log('🔄 Processing enhanced direct prompt:', prompt.substring(0, 100) + '...');
            
            const dynamicContext = await this.contextManager.buildDynamicContext();
            const hotelContext = this.contextManager.getHotelContext();
            const localContext = this.contextManager.getLocalContext();
            
            const currentTime = new Date().toLocaleString('vi-VN');
            const randomId = Math.random().toString(36).substr(2, 9);
            
            // ✅ ADD SPECIFIC DATA FOR PROMPT
            const specificData = await this.handleSpecificQueries(prompt);
            
            let fullContext = `
            Bạn là AI Assistant chuyên gia về Hotel HUB và khu vực Hà Nội với quyền truy cập toàn bộ dữ liệu khách sạn.
            
            ⏰ THỜI GIAN HIỆN TẠI: ${currentTime}
            🆔 Session ID: ${randomId}
            
            ${hotelContext}
            ${localContext}
            ${dynamicContext}
            `;
            
            if (specificData) {
                fullContext += `\n\n🔍 DỮ LIỆU CỤ THỂ:\n${specificData}\n`;
            }
            
            // Add conversation history
            fullContext += `\n📚 LỊCH SỬ HỘI THOẠI GẦN ĐÂY:\n`;
            const recentHistory = conversationHistory.slice(-6);
            recentHistory.forEach((msg) => {
                const role = msg.role === 'user' ? '👤 Khách hàng' : '🤖 Hotel Assistant';
                fullContext += `${role}: ${msg.content.substring(0, 100)}...\n`;
            });
            
            fullContext += `\n🎯 YÊU CẦU PROMPT HIỆN TẠI:\n👤 Khách hàng: "${prompt}"\n\n🤖 Hotel HUB Expert với toàn bộ dữ liệu thời gian thực (${currentTime}):`;

            const result = await this.model.generateContent(fullContext, {
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                    candidateCount: 1,
                }
            });
            
            const response = await result.response;
            const text = response.text();

            console.log(`✅ Enhanced direct prompt response generated at ${currentTime}`);

            const cleanedText = text
                .replace(/^🤖\s*(Trợ lý|Assistant)?:?\s*/i, '')
                .replace(/^\s*-\s*/, '')
                .trim();

            return {
                success: true,
                response: cleanedText,
                timestamp: new Date().toISOString(),
                model: 'gemini-1.5-flash-enhanced',
                promptType: 'hotel_database_prompt',
                originalPrompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
                sessionId: randomId,
                processedAt: currentTime,
                hasSpecificData: !!specificData,
                databaseIntegrated: true
            };
        } catch (error) {
            console.error('❌ Enhanced direct prompt error:', error);
            
            return {
                success: false,
                response: `Xin lỗi, tôi không thể xử lý yêu cầu này lúc này. Vui lòng thử lại sau hoặc liên hệ hotline 0865.124.996 để được hỗ trợ trực tiếp.`,
                error: error.message,
                timestamp: new Date().toISOString(),
                model: 'fallback',
                promptType: 'enhanced_direct_error'
            };
        }
    }

    // Keep existing methods: cleanResponse, getModelInfo
    cleanResponse(responseText) {
        if (typeof responseText !== 'string') {
            responseText = String(responseText || '');
        }

        responseText = responseText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .replace(/^\{.*\}$/s, (match) => {
                try {
                    const parsed = JSON.parse(match);
                    return parsed.text || parsed.message || parsed.response || match;
                } catch {
                    return match;
                }
            })
            .trim();

        if (!responseText || responseText.length < 10) {
            responseText = "Xin lỗi, tôi không thể tạo phản hồi phù hợp lúc này. Vui lòng thử hỏi câu khác hoặc liên hệ hotline 0865.124.996.";
        }

        return responseText;
    }

    getModelInfo() {
        return {
            name: 'Gemini 1.5 Flash Enhanced',
            version: '1.5',
            provider: 'Google AI',
            maxTokens: 2048,
            temperature: 0.7,
            hasValidApiKey: !!process.env.GOOGLE_AI_API_KEY,
            databaseIntegration: 'Full',
            capabilities: [
                'Vietnamese language support',
                'Full database integration',
                'Real-time hotel data',
                'Room management queries',
                'Booking statistics',
                'Promotion information',
                'Service details',
                'User role management',
                'Occupancy analytics',
                'Multi-turn conversation',
                'Intent recognition',
                'Quick replies generation',
                'Navigation assistance',
                'Specific data queries'
            ]
        };
    }
}

export default ResponseGenerator;