import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import ChatBotDBContext from '../dal/ChatBotDBContext.js'; // ✅ THÊM IMPORT

dotenv.config();

class ChatBotService {
    constructor() {
        // ✅ KIỂM TRA VÀ VALIDATE API KEY MỚI
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        
        if (!apiKey) {
            console.error('❌ GOOGLE_AI_API_KEY is not set in .env file');
            throw new Error('Google AI API key is required');
        }
        
        if (!apiKey.startsWith('AIza')) {
            console.error('❌ Invalid Google AI API key format. Should start with "AIza"');
            throw new Error('Invalid Google AI API key format');
        }
        
        // ✅ CHỈ LOG PHẦN ĐẦU CỦA API KEY ĐỂ BẢO MẬT
        console.log('✅ Google AI API Key loaded:', apiKey.substring(0, 10) + '...' + apiKey.slice(-4));
        
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            
            // ✅ SỬ DỤNG MODEL GEMINI 1.5 FLASH (ỔN ĐỊNH)
            const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
            console.log('✅ Using model:', modelName);
            
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
            
            console.log('✅ ChatBotService initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ChatBotService:', error);
            throw error;
        }
        
        // ✅ HOTEL CONTEXT CHO HOTEL HUB
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

        // ✅ THÊM DATABASE CONTEXT
        this.dbContext = new ChatBotDBContext();
        
        // Cache cho dữ liệu database
        this.dataCache = {
            roomTypes: null,
            availableRooms: null,
            promotions: null,
            services: null,
            bookingStats: null,
            databaseCounts: null,
            lastUpdate: null
        };
        
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    }

    // ✅ PHƯƠNG THỨC LOAD DỮ LIỆU TỪ DATABASE VỚI ENHANCED ERROR HANDLING
    async loadDatabaseData() {
        try {
            const now = new Date();
            
            // Check cache
            if (this.dataCache.lastUpdate && 
                (now - this.dataCache.lastUpdate) < this.cacheTimeout) {
                console.log('✅ Using cached database data');
                return this.dataCache;
            }

            console.log('🔄 Loading fresh data from database...');

            // Load data
            const [roomTypes, availableRooms, promotions, services, bookingStats, databaseCounts] = 
                await Promise.allSettled([
                    this.dbContext.getRoomTypes(),
                    this.dbContext.getAvailableRooms(),
                    this.dbContext.getPromotions(),
                    this.dbContext.getServices(),
                    this.dbContext.getBookingStats(),
                    this.dbContext.getDatabaseCounts()
                ]);

            // Update cache
            this.dataCache = {
                roomTypes: roomTypes.status === 'fulfilled' ? roomTypes.value : [],
                availableRooms: availableRooms.status === 'fulfilled' ? availableRooms.value : [],
                promotions: promotions.status === 'fulfilled' ? promotions.value : [],
                services: services.status === 'fulfilled' ? services.value : [],
                bookingStats: bookingStats.status === 'fulfilled' ? bookingStats.value : {},
                databaseCounts: databaseCounts.status === 'fulfilled' ? databaseCounts.value : {},
                lastUpdate: now
            };

            console.log('✅ Database data loaded successfully', {
                roomTypes: this.dataCache.roomTypes.length,
                availableRooms: this.dataCache.availableRooms.length,
                promotions: this.dataCache.promotions.length,
                services: this.dataCache.services.length
            });

            return this.dataCache;
        } catch (error) {
            console.error('❌ Error loading database data:', error);
            return this.dataCache;
        }
    }

    // ✅ BUILD DYNAMIC CONTEXT WITH DATABASE DATA
    async buildDynamicContext() {
        const data = await this.loadDatabaseData();
        
        let dynamicContext = "\n\n📊 DỮ LIỆU THỜI GIAN THỰC:\n\n";

        // Room Types
        if (data.roomTypes && data.roomTypes.length > 0) {
            dynamicContext += "🛏️ LOẠI PHÒNG HIỆN CÓ:\n";
            data.roomTypes.forEach(type => {
                const price = new Intl.NumberFormat('vi-VN').format(type.BasePrice);
                dynamicContext += `- ${type.TypeName}: ${price}đ/đêm - ${type.Description}\n`;
                if (type.AvailableRooms !== undefined) {
                    dynamicContext += `  (Còn trống: ${type.AvailableRooms}/${type.TotalRooms} phòng)\n`;
                }
            });
            dynamicContext += "\n";
        }

        // Available Rooms
        if (data.availableRooms && data.availableRooms.length > 0) {
            dynamicContext += `🟢 PHÒNG CÒN TRỐNG (${data.availableRooms.length} phòng):\n`;
            const roomsByType = {};
            data.availableRooms.forEach(room => {
                if (!roomsByType[room.TypeName]) {
                    roomsByType[room.TypeName] = [];
                }
                roomsByType[room.TypeName].push(room);
            });

            Object.keys(roomsByType).forEach(typeName => {
                const rooms = roomsByType[typeName];
                const roomNumbers = rooms.map(r => r.RoomNumber).join(', ');
                dynamicContext += `- ${typeName}: Phòng ${roomNumbers}\n`;
            });
            dynamicContext += "\n";
        }

        // Promotions
        if (data.promotions && data.promotions.length > 0) {
            dynamicContext += "🎁 KHUYẾN MÃI ĐANG DIỄN RA:\n";
            data.promotions.forEach(promo => {
                const endDate = new Date(promo.EndDate).toLocaleDateString('vi-VN');
                dynamicContext += `- ${promo.PromotionName}: Giảm ${promo.DiscountPercentage}% (đến ${endDate})\n`;
                if (promo.Description) {
                    dynamicContext += `  ${promo.Description}\n`;
                }
            });
            dynamicContext += "\n";
        }

        // Services
        if (data.services && data.services.length > 0) {
            dynamicContext += "🏨 DỊCH VỤ KHÁCH SẠN:\n";
            data.services.forEach(service => {
                const price = service.Price ? new Intl.NumberFormat('vi-VN').format(service.Price) + 'đ' : 'Liên hệ';
                dynamicContext += `- ${service.ServiceName}: ${price}\n`;
            });
            dynamicContext += "\n";
        }

        // Booking Stats
        if (data.bookingStats && Object.keys(data.bookingStats).length > 0) {
            dynamicContext += "📈 THỐNG KÊ HÔM NAY:\n";
            dynamicContext += `- Tổng booking: ${data.bookingStats.TotalBookings || 0}\n`;
            dynamicContext += `- Đã xác nhận: ${data.bookingStats.ConfirmedBookings || 0}\n`;
            dynamicContext += `- Đang chờ: ${data.bookingStats.PendingBookings || 0}\n`;
            if (data.bookingStats.AverageAmount) {
                const avgAmount = new Intl.NumberFormat('vi-VN').format(data.bookingStats.AverageAmount);
                dynamicContext += `- Giá trung bình: ${avgAmount}đ\n`;
            }
            dynamicContext += "\n";
        }

        dynamicContext += "⏰ Cập nhật lúc: " + new Date().toLocaleString('vi-VN') + "\n";
        
        return dynamicContext;
    }

    // ✅ UPDATE GENERATE RESPONSE TO ENSURE STRING RETURN
    async generateResponse(message, conversationHistory = []) {
        try {
            console.log('🤖 Generating response for:', message.substring(0, 50) + '...');

            // Get fresh data from database
            const dynamicContext = await this.buildDynamicContext();
            
            // Build full prompt with all context
            const fullPrompt = `${this.hotelContext}\n\n${dynamicContext}\n\nUser: ${message}\n\nInstructions: Respond with PLAIN TEXT only, no JSON format, no objects. Trả lời bằng tiếng Việt thân thiện và chuyên nghiệp.`;

            console.log('📝 Full prompt length:', fullPrompt.length);

            const completion = await this.genAI.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: fullPrompt }]
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

            console.log('🤖 Raw AI response:', {
                type: typeof responseText,
                length: responseText?.length || 0,
                preview: responseText?.substring(0, 100) + '...'
            });

            // ✅ STRICT STRING VALIDATION AND CLEANING
            if (typeof responseText !== 'string') {
                console.warn('⚠️ Response is not string, converting...');
                responseText = String(responseText || '');
            }

            // Clean up response if it contains unwanted formatting
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

            // Validate final response
            if (!responseText || responseText.length < 10) {
                console.warn('⚠️ Response too short, using fallback');
                responseText = "Xin lỗi, tôi không thể tạo phản hồi phù hợp lúc này. Vui lòng thử hỏi câu khác hoặc liên hệ hotline 0865.124.996.";
            }

            console.log('✅ Final response:', {
                type: typeof responseText,
                length: responseText.length,
                isValid: typeof responseText === 'string' && responseText.length > 0
            });

            return responseText;

        } catch (error) {
            console.error('❌ Error generating response:', error);
            
            return "Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng thử lại sau hoặc liên hệ với chúng tôi qua hotline 0865.124.996 để được hỗ trợ trực tiếp.";
        }
    }

    // ✅ REFRESH CACHE
    async refreshCache() {
        this.dataCache.lastUpdate = null;
        return await this.loadDatabaseData();
    }

    // ✅ GET CACHE STATUS
    getCacheStatus() {
        return {
            hasCache: !!this.dataCache.lastUpdate,
            lastUpdate: this.dataCache.lastUpdate,
            dataCount: {
                roomTypes: this.dataCache.roomTypes?.length || 0,
                availableRooms: this.dataCache.availableRooms?.length || 0,
                promotions: this.dataCache.promotions?.length || 0,
                services: this.dataCache.services?.length || 0
            }
        };
    }

    // ✅ THÊM PHƯƠNG THỨC XỬ LÝ PROMPT TRỰC TIẾP
    async handleDirectPrompt(prompt, conversationHistory = []) {
        try {
            console.log('🔄 Processing expanded hotel/local prompt:', prompt.substring(0, 100) + '...');
            
            // ✅ XÓA KIỂM TRA isRelevant VÌ ĐÃ KIỂM TRA TRONG detectDirectPrompt
            // Nếu đến được đây có nghĩa là prompt đã hợp lệ
            
            // Build enhanced context với thông tin local
            const dynamicContext = await this.buildDynamicContext();
            
            // ✅ THÊM THỜI GIAN VÀ RANDOM ELEMENT ĐỂ TRÁNH CACHE
            const currentTime = new Date().toLocaleString('vi-VN');
            const randomId = Math.random().toString(36).substr(2, 9);
            
            let fullContext = `
            Bạn là AI Assistant chuyên gia về Hotel HUB và khu vực Hà Nội. Hãy trả lời prompt một cách chi tiết và hữu ích.
            
            ⏰ THỜI GIAN HIỆN TẠI: ${currentTime}
            🆔 Session ID: ${randomId}
            
            🏨 THÔNG TIN HOTEL HUB:
            - Tên: Hotel HUB - Khách sạn 5 sao hàng đầu
            - Địa chỉ: FPT University, Khu CNC Hòa Lạc, Hà Nội
            - Vị trí: Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất
            - Hotline: 0865.124.996 (24/7)
            - Email: datltthe194235@gmail.com
            - Website: hotelhub.vn
            
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
            
            📋 HƯỚNG DẪN CHUẨN BỊ ĐỒ DÙNG THEO MÙA:
            
            🌸 MÙA XUÂN (Feb-Apr):
            - Quần áo: Áo dài tay, quần dài, áo khoác nhẹ
            - Phụ kiện: Khăn mỏng, giày đóng gót
            - Đặc biệt: Kem chống nắng, thuốc dị ứng (mùa phấn hoa)
            - Lưu ý: Thời tiết thay đổi bất thường, mang theo áo ấm nhẹ
            
            ☀️ MÙA HÈ (May-Aug):
            - Quần áo: Áo cotton thoáng mát, quần short, váy mỏng
            - Phụ kiện: Mũ rộng vành, kính râm, dép/sandal
            - Thiết yếu: Ô dù (che nắng và mưa), kem chống nắng SPF 50+
            - Đồ mưa: Áo mưa, túi chống nước cho điện thoại
            - Thuốc: Thuốc chống nóng trong, muối bù nước
            
            🍂 MÙA THU (Sep-Nov):
            - Quần áo: Áo dài tay, quần âu, áo vest nhẹ
            - Phụ kiện: Khăn choàng, giày bốt thấp
            - Đặc biệt: Áo khoác mỏng cho buổi sáng/tối
            - Camera: Mùa chụp ảnh đẹp nhất, chuẩn bị máy ảnh
            
            ❄️ MÙA ĐÔNG (Dec-Jan):
            - Quần áo: Áo phao, áo len dày, quần nỉ ấm
            - Phụ kiện: Mũ len, găng tay, khăn quàng cổ
            - Giày dép: Boots cao cổ, tất dày
            - Chăm sóc: Kem dưỡng ẩm, son dưỡng môi
            - Lưu ý: Nhiệt độ có thể xuống 5-8°C về đêm
            
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
            
            🎭 SỰ KIỆN & LỄ HỘI:
            - Tết Nguyên Đán (Jan-Feb): Lễ hội lớn nhất, cần book sớm
            - Lễ hội Chùa Hương (Feb-Mar): Mùa hành hương
            - Trung thu (Sep): Lễ hội trăng rằm, phố xá sôi động
            
            🎯 YÊU CẦU ĐẶC BIỆT:
            - Hãy cung cấp lời khuyên cụ thể và thực tế
            - Đề xuất những vật dụng cần thiết nhất
            - Giải thích lý do tại sao cần mỗi món đồ
            - Kết hợp với thông tin về Hotel HUB và dịch vụ
            - Cập nhật theo thời gian thực: ${currentTime}
            
            ${dynamicContext}
            
            📚 LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
            `;
            
            // Thêm lịch sử hội thoại gần đây
            const recentHistory = conversationHistory.slice(-6);
            recentHistory.forEach((msg) => {
                const role = msg.role === 'user' ? '👤 Khách hàng' : '🤖 Hotel Assistant';
                fullContext += `${role}: ${msg.content.substring(0, 100)}...\n`;
            });
            
            fullContext += `\n🎯 YÊU CẦU PROMPT HIỆN TẠI:\n👤 Khách hàng: "${prompt}"\n\n🤖 Hotel HUB & Hanoi Expert (${currentTime}):`;

            // ✅ THÊM GENERATION CONFIG ĐỂ TĂNG ĐỘ NGẪU NHIÊN
            const result = await this.model.generateContent(fullContext, {
                generationConfig: {
                    temperature: 0.9, // Tăng từ 0.7 lên 0.9
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                    candidateCount: 1,
                }
            });
            
            const response = await result.response;
            const text = response.text();

            console.log(`✅ Expanded prompt response generated at ${currentTime}`);

            // Clean response
            const cleanedText = text
                .replace(/^🤖\s*(Trợ lý|Assistant)?:?\s*/i, '')
                .replace(/^\s*-\s*/, '')
                .trim();

            return {
                success: true,
                response: cleanedText,
                timestamp: new Date().toISOString(),
                model: 'gemini-1.5-flash',
                promptType: 'hotel_local_prompt',
                originalPrompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
                sessionId: randomId,
                processedAt: currentTime
            };
        } catch (error) {
            console.error('❌ Expanded Prompt Error:', error);
            
            return {
                success: false,
                response: `Xin lỗi, tôi không thể xử lý yêu cầu này lúc này. Vui lòng thử lại sau hoặc liên hệ hotline 0865.124.996 để được hỗ trợ trực tiếp.`,
                error: error.message,
                timestamp: new Date().toISOString(),
                model: 'fallback',
                promptType: 'expanded_error'
            };
        }
    }

    // ✅ CẬP NHẬT DETECT DIRECT PROMPT - MỞ RỘNG PHẠM VI
    detectDirectPrompt(message) {
        const lowerMessage = message.toLowerCase();
        
        // ✅ KIỂM TRA HOTEL & LOCAL KEYWORDS TRƯỚC
        const hotelLocalKeywords = [
            // Hotel keywords
            'đặt phòng', 'booking', 'phòng', 'room', 'hotel', 'khách sạn',
            'giá', 'price', 'dịch vụ', 'service', 'amenity', 'tiện nghi',
            'promotion', 'khuyến mãi', 'check in', 'check out', 'reservation',
            'resort', 'villa', 'suite', 'deluxe', 'standard', 'penthouse',
            'spa', 'massage', 'gym', 'pool', 'restaurant', 'buffet',
            'concierge', 'receptionist', 'housekeeping', 'room service',
            
            // Local area keywords
            'hà nội', 'hanoi', 'hòa lạc', 'hoa lac', 'fpt university',
            'thạch thất', 'thach that', 'ba vì', 'ba vi', 'chùa hương',
            'chua huong', 'đầm vạc', 'dam vac', 'vân hòa', 'van hoa',
            'phố cổ', 'pho co', 'hồ gươm', 'ho guom', 'hoàn kiếm',
            'hoan kiem', 'long biên', 'long bien', 'cầu long biên',
            'cau long bien', 'văn miếu', 'van mieu', 'temple of literature',
            
            // Travel & tourism
            'travel', 'du lịch', 'nghỉ dưỡng', 'vacation', 'holiday',
            'business trip', 'công tác', 'conference', 'hội nghị',
            'wedding', 'cưới', 'event', 'sự kiện', 'party', 'tiệc',
            'tham quan', 'visit', 'explore', 'khám phá', 'trip', 'chuyến đi',
            
            // Weather & climate - ✅ QUAN TRỌNG: THÊM ĐẦY ĐỦ TỪ KHÓA THỜI TIẾT
            'thời tiết', 'weather', 'khí hậu', 'climate', 'mùa', 'season',
            'mưa', 'rain', 'nắng', 'sunny', 'lạnh', 'cold', 'nóng', 'hot',
            'ẩm ướt', 'humid', 'khô ráo', 'dry', 'gió', 'wind', 'bão', 'storm',
            'đồ dùng', 'chuẩn bị', 'prepare', 'clothing', 'trang phục', 'clothes',
            'nhiệt độ', 'temperature', 'độ ẩm', 'humidity', 'dự báo', 'forecast',
            'hôm nay', 'today', 'ngày mai', 'tomorrow', 'tuần này', 'this week',
            'tháng này', 'this month', 'mùa xuân', 'spring', 'mùa hè', 'summer',
            'mùa thu', 'autumn', 'fall', 'mùa đông', 'winter',
            
            // Transportation
            'sân bay', 'airport', 'nội bài', 'noi bai', 'taxi', 'grab',
            'xe buýt', 'bus', 'xe máy', 'motorbike', 'ô tô', 'car',
            'tàu hóa', 'train', 'ga hà nội', 'ga hanoi', 'metro', 'brt',
            
            // Food & culture
            'phở', 'pho', 'bún chả', 'bun cha', 'bánh mì', 'banh mi',
            'cà phê', 'coffee', 'bia hơi', 'bia hoi', 'chả cá', 'cha ca',
            'bánh cuốn', 'banh cuon', 'nem rán', 'nem ran', 'spring roll',
            'văn hóa', 'culture', 'lịch sử', 'history', 'truyền thống', 'traditional',
            
            // Local events & festivals
            'tết', 'tet', 'trung thu', 'trung thu', 'lễ hội', 'festival',
            'đền', 'temple', 'pagoda', 'chùa', 'chua', 'lăng', 'mausoleum',
            'bảo tàng', 'museum', 'theater', 'nhà hát', 'nha hat'
        ];

        const hasRelevantKeywords = hotelLocalKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // ✅ NẾU KHÔNG CÓ KEYWORDS LIÊN QUAN THÌ TỪNG CHỐI
        if (!hasRelevantKeywords) {
            console.log('🚫 No relevant keywords found in message:', lowerMessage.substring(0, 50) + '...');
            return false;        
        }

        // ✅ DETECT PROMPT INDICATORS - CHỈ KHI ĐÃ CÓ RELEVANT KEYWORDS
        const expandedPromptIndicators = [
            // Content creation
            'viết email', 'viết thư', 'viết mô tả', 'viết review', 'viết blog',
            'viết quảng cáo', 'viết chính sách', 'viết quy định', 'viết hướng dẫn',
            'tạo slogan', 'tạo menu', 'tạo bảng giá', 'tạo nội dung',
            'soạn thư', 'soạn email', 'draft email', 'compose letter',
            
            // Analysis & comparison
            'phân tích thời tiết', 'phân tích khí hậu', 'phân tích dịch vụ',
            'so sánh loại phòng', 'so sánh dịch vụ', 'so sánh địa điểm',
            'so sánh phương tiện', 'so sánh nhà hàng', 'so sánh hotel',
            'đánh giá chất lượng', 'đánh giá dịch vụ', 'đánh giá địa điểm',
            'tóm tắt thông tin', 'tóm tắt dịch vụ', 'summarize',
            
            // Local guidance & planning - ✅ KEY FIX HERE
            'hướng dẫn đi', 'hướng dẫn tham quan', 'hướng dẫn di chuyển',
            'hướng dẫn sử dụng', 'hướng dẫn chuẩn bị', 'hướng dẫn', 'guide to', 'how to get to',
            'lập kế hoạch du lịch', 'lập kế hoạch tham quan', 'plan trip',
            'thiết kế tour', 'thiết kế lịch trình', 'design itinerary',
            'sắp xếp lịch trình', 'organize schedule', 'arrange trip',
            
            // Weather & seasonal advice - ✅ KEY FIX HERE  
            'dự báo thời tiết', 'weather forecast', 'thời tiết hôm nay',
            'khí hậu theo mùa', 'seasonal climate', 'mùa nào đẹp nhất',
            'best time to visit', 'thời điểm lý tưởng', 'ideal season',
            'chuẩn bị đồ dùng', 'chuẩn bị', 'prepare clothes', 'what to bring',
            'đồ dùng theo thời tiết', 'weather preparation', 'seasonal clothing',
            'mặc gì', 'what to wear', 'trang phục', 'outfit',
            
            // ✅ THÊM CÁC DẠNG CÂU HỎI THỜI TIẾT THÔNG THƯỜNG
            'thời tiết', 'weather', 'nóng không', 'lạnh không', 'mưa không',
            'có nắng', 'có mưa', 'nhiệt độ', 'temperature', 'khí hậu', 'climate',
            
            // Local recommendations
            'giới thiệu địa điểm', 'recommend places', 'suggest attractions',
            'địa điểm nên thăm', 'places to visit', 'tourist spots',
            'nhà hàng ngon', 'good restaurants', 'local food',
            'món ăn đặc sản', 'local specialties', 'traditional food',
            'quán cà phê', 'coffee shops', 'địa điểm vui chơi',
            
            // Transportation guidance
            'cách di chuyển', 'how to travel', 'transportation options',
            'từ sân bay đến', 'from airport to', 'airport transfer',
            'thuê xe', 'rent vehicle', 'public transport', 'xe công cộng',
            'taxi grab', 'ride sharing', 'bus route', 'tuyến xe buýt',
            
            // Cultural & event information
            'lễ hội gì', 'what festivals', 'sự kiện văn hóa', 'cultural events',
            'truyền thống việt nam', 'vietnamese traditions', 'customs',
            'lịch sử địa phương', 'local history', 'historical sites',
            'ý nghĩa lễ hội', 'festival meaning', 'cultural significance',
            
            // General prompt indicators with context
            'viết cho', 'tạo cho', 'giải thích', 'phân tích', 'tóm tắt',
            'so sánh', 'liệt kê', 'mô tả', 'đánh giá', 'lập kế hoạch',
            'thiết kế', 'sáng tác', 'tutorial', 'explain',
            'describe', 'analyze', 'compare', 'list', 'create', 'write'
        ];

        // ✅ CHECK FOR PROMPT INDICATORS
        const hasPromptIndicators = expandedPromptIndicators.some(indicator => 
            lowerMessage.includes(indicator)
        );

        // ✅ HOẶC LÀ CÂU HỎI TRỰC TIẾP VỀ THỜI TIẾT/ĐỊA ĐIỂM
        const isDirectQuestion = 
            lowerMessage.includes('thời tiết') ||
            lowerMessage.includes('weather') ||
            lowerMessage.includes('khí hậu') ||
            lowerMessage.includes('nhiệt độ') ||
            lowerMessage.includes('mưa') ||
            lowerMessage.includes('nắng') ||
            lowerMessage.includes('lạnh') ||
            lowerMessage.includes('nóng') ||
            lowerMessage.includes('hôm nay') ||
            lowerMessage.includes('ngày mai') ||
            lowerMessage.includes('chuẩn bị') ||
            lowerMessage.includes('mặc gì') ||
            lowerMessage.includes('dự báo');

        const finalResult = hasPromptIndicators || isDirectQuestion;

        console.log('🔍 Prompt Detection Debug:', {
            message: lowerMessage.substring(0, 50) + '...',
            hasRelevantKeywords: hasRelevantKeywords,
            hasPromptIndicators: hasPromptIndicators,
            isDirectQuestion: isDirectQuestion,
            finalResult: finalResult
        });

        return finalResult;
    }

    // ✅ FIX HANDLE DIRECT PROMPT - XÓA KIỂM TRA RELEVANT
    async handleDirectPrompt(prompt, conversationHistory = []) {
        try {
            console.log('🔄 Processing expanded hotel/local prompt:', prompt.substring(0, 100) + '...');
            
            // ✅ XÓA KIỂM TRA isRelevant VÌ ĐÃ KIỂM TRA TRONG detectDirectPrompt
            // Nếu đến được đây có nghĩa là prompt đã hợp lệ
            
            // Build enhanced context với thông tin local
            const dynamicContext = await this.buildDynamicContext();
            
            // ✅ THÊM THỜI GIAN VÀ RANDOM ELEMENT ĐỂ TRÁNH CACHE
            const currentTime = new Date().toLocaleString('vi-VN');
            const randomId = Math.random().toString(36).substr(2, 9);
            
            let fullContext = `
            Bạn là AI Assistant chuyên gia về Hotel HUB và khu vực Hà Nội. Hãy trả lời prompt một cách chi tiết và hữu ích.
            
            ⏰ THỜI GIAN HIỆN TẠI: ${currentTime}
            🆔 Session ID: ${randomId}
            
            🏨 THÔNG TIN HOTEL HUB:
            - Tên: Hotel HUB - Khách sạn 5 sao hàng đầu
            - Địa chỉ: FPT University, Khu CNC Hòa Lạc, Hà Nội
            - Vị trí: Km29 Đại lộ Thăng Long, Thạch Hoà, Thạch Thất
            - Hotline: 0865.124.996 (24/7)
            - Email: datltthe194235@gmail.com
            - Website: hotelhub.vn
            
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
            
            📋 HƯỚNG DẪN CHUẨN BỊ ĐỒ DÙNG THEO MÙA:
            
            🌸 MÙA XUÂN (Feb-Apr):
            - Quần áo: Áo dài tay, quần dài, áo khoác nhẹ
            - Phụ kiện: Khăn mỏng, giày đóng gót
            - Đặc biệt: Kem chống nắng, thuốc dị ứng (mùa phấn hoa)
            - Lưu ý: Thời tiết thay đổi bất thường, mang theo áo ấm nhẹ
            
            ☀️ MÙA HÈ (May-Aug):
            - Quần áo: Áo cotton thoáng mát, quần short, váy mỏng
            - Phụ kiện: Mũ rộng vành, kính râm, dép/sandal
            - Thiết yếu: Ô dù (che nắng và mưa), kem chống nắng SPF 50+
            - Đồ mưa: Áo mưa, túi chống nước cho điện thoại
            - Thuốc: Thuốc chống nóng trong, muối bù nước
            
            🍂 MÙA THU (Sep-Nov):
            - Quần áo: Áo dài tay, quần âu, áo vest nhẹ
            - Phụ kiện: Khăn choàng, giày bốt thấp
            - Đặc biệt: Áo khoác mỏng cho buổi sáng/tối
            - Camera: Mùa chụp ảnh đẹp nhất, chuẩn bị máy ảnh
            
            ❄️ MÙA ĐÔNG (Dec-Jan):
            - Quần áo: Áo phao, áo len dày, quần nỉ ấm
            - Phụ kiện: Mũ len, găng tay, khăn quàng cổ
            - Giày dép: Boots cao cổ, tất dày
            - Chăm sóc: Kem dưỡng ẩm, son dưỡng môi
            - Lưu ý: Nhiệt độ có thể xuống 5-8°C về đêm
            
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
            
            🎭 SỰ KIỆN & LỄ HỘI:
            - Tết Nguyên Đán (Jan-Feb): Lễ hội lớn nhất, cần book sớm
            - Lễ hội Chùa Hương (Feb-Mar): Mùa hành hương
            - Trung thu (Sep): Lễ hội trăng rằm, phố xá sôi động
            
            🎯 YÊU CẦU ĐẶC BIỆT:
            - Hãy cung cấp lời khuyên cụ thể và thực tế
            - Đề xuất những vật dụng cần thiết nhất
            - Giải thích lý do tại sao cần mỗi món đồ
            - Kết hợp với thông tin về Hotel HUB và dịch vụ
            - Cập nhật theo thời gian thực: ${currentTime}
            
            ${dynamicContext}
            
            📚 LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
            `;
            
            // Thêm lịch sử hội thoại gần đây
            const recentHistory = conversationHistory.slice(-6);
            recentHistory.forEach((msg) => {
                const role = msg.role === 'user' ? '👤 Khách hàng' : '🤖 Hotel Assistant';
                fullContext += `${role}: ${msg.content.substring(0, 100)}...\n`;
            });
            
            fullContext += `\n🎯 YÊU CẦU PROMPT HIỆN TẠI:\n👤 Khách hàng: "${prompt}"\n\n🤖 Hotel HUB & Hanoi Expert (${currentTime}):`;

            // ✅ THÊM GENERATION CONFIG ĐỂ TĂNG ĐỘ NGẪU NHIÊN
            const result = await this.model.generateContent(fullContext, {
                generationConfig: {
                    temperature: 0.9, // Tăng từ 0.7 lên 0.9
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                    candidateCount: 1,
                }
            });
            
            const response = await result.response;
            const text = response.text();

            console.log(`✅ Expanded prompt response generated at ${currentTime}`);

            // Clean response
            const cleanedText = text
                .replace(/^🤖\s*(Trợ lý|Assistant)?:?\s*/i, '')
                .replace(/^\s*-\s*/, '')
                .trim();

            return {
                success: true,
                response: cleanedText,
                timestamp: new Date().toISOString(),
                model: 'gemini-1.5-flash',
                promptType: 'hotel_local_prompt',
                originalPrompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
                sessionId: randomId,
                processedAt: currentTime
            };
        } catch (error) {
            console.error('❌ Expanded Prompt Error:', error);
            
            return {
                success: false,
                response: `Xin lỗi, tôi không thể xử lý yêu cầu này lúc này. Vui lòng thử lại sau hoặc liên hệ hotline 0865.124.996 để được hỗ trợ trực tiếp.`,
                error: error.message,
                timestamp: new Date().toISOString(),
                model: 'fallback',
                promptType: 'expanded_error'
            };
        }
    }

    // ✅ CẬP NHẬT DETECT DIRECT PROMPT - MỞ RỘNG PHẠM VI
    detectDirectPrompt(message) {
        const lowerMessage = message.toLowerCase();
        
        // ✅ KIỂM TRA HOTEL & LOCAL KEYWORDS TRƯỚC
        const hotelLocalKeywords = [
            // Hotel keywords
            'đặt phòng', 'booking', 'phòng', 'room', 'hotel', 'khách sạn',
            'giá', 'price', 'dịch vụ', 'service', 'amenity', 'tiện nghi',
            'promotion', 'khuyến mãi', 'check in', 'check out', 'reservation',
            'resort', 'villa', 'suite', 'deluxe', 'standard', 'penthouse',
            'spa', 'massage', 'gym', 'pool', 'restaurant', 'buffet',
            'concierge', 'receptionist', 'housekeeping', 'room service',
            
            // Local area keywords
            'hà nội', 'hanoi', 'hòa lạc', 'hoa lac', 'fpt university',
            'thạch thất', 'thach that', 'ba vì', 'ba vi', 'chùa hương',
            'chua huong', 'đầm vạc', 'dam vac', 'vân hòa', 'van hoa',
            'phố cổ', 'pho co', 'hồ gươm', 'ho guom', 'hoàn kiếm',
            'hoan kiem', 'long biên', 'long bien', 'cầu long biên',
            'cau long bien', 'văn miếu', 'van mieu', 'temple of literature',
            
            // Travel & tourism
            'travel', 'du lịch', 'nghỉ dưỡng', 'vacation', 'holiday',
            'business trip', 'công tác', 'conference', 'hội nghị',
            'wedding', 'cưới', 'event', 'sự kiện', 'party', 'tiệc',
            'tham quan', 'visit', 'explore', 'khám phá', 'trip', 'chuyến đi',
            
            // Weather & climate - ✅ QUAN TRỌNG: THÊM ĐẦY ĐỦ TỪ KHÓA THỜI TIẾT
            'thời tiết', 'weather', 'khí hậu', 'climate', 'mùa', 'season',
            'mưa', 'rain', 'nắng', 'sunny', 'lạnh', 'cold', 'nóng', 'hot',
            'ẩm ướt', 'humid', 'khô ráo', 'dry', 'gió', 'wind', 'bão', 'storm',
            'đồ dùng', 'chuẩn bị', 'prepare', 'clothing', 'trang phục', 'clothes',
            'nhiệt độ', 'temperature', 'độ ẩm', 'humidity', 'dự báo', 'forecast',
            'hôm nay', 'today', 'ngày mai', 'tomorrow', 'tuần này', 'this week',
            'tháng này', 'this month', 'mùa xuân', 'spring', 'mùa hè', 'summer',
            'mùa thu', 'autumn', 'fall', 'mùa đông', 'winter',
            
            // Transportation
            'sân bay', 'airport', 'nội bài', 'noi bai', 'taxi', 'grab',
            'xe buýt', 'bus', 'xe máy', 'motorbike', 'ô tô', 'car',
            'tàu hóa', 'train', 'ga hà nội', 'ga hanoi', 'metro', 'brt',
            
            // Food & culture
            'phở', 'pho', 'bún chả', 'bun cha', 'bánh mì', 'banh mi',
            'cà phê', 'coffee', 'bia hơi', 'bia hoi', 'chả cá', 'cha ca',
            'bánh cuốn', 'banh cuon', 'nem rán', 'nem ran', 'spring roll',
            'văn hóa', 'culture', 'lịch sử', 'history', 'truyền thống', 'traditional',
            
            // Local events & festivals
            'tết', 'tet', 'trung thu', 'trung thu', 'lễ hội', 'festival',
            'đền', 'temple', 'pagoda', 'chùa', 'chua', 'lăng', 'mausoleum',
            'bảo tàng', 'museum', 'theater', 'nhà hát', 'nha hat'
        ];

        const hasRelevantKeywords = hotelLocalKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // ✅ NẾU KHÔNG CÓ KEYWORDS LIÊN QUAN THÌ TỪNG CHỐI
        if (!hasRelevantKeywords) {
            console.log('🚫 No relevant keywords found in message:', lowerMessage.substring(0, 50) + '...');
            return false;        
        }

        // ✅ DETECT PROMPT INDICATORS - CHỈ KHI ĐÃ CÓ RELEVANT KEYWORDS
        const expandedPromptIndicators = [
            // Content creation
            'viết email', 'viết thư', 'viết mô tả', 'viết review', 'viết blog',
            'viết quảng cáo', 'viết chính sách', 'viết quy định', 'viết hướng dẫn',
            'tạo slogan', 'tạo menu', 'tạo bảng giá', 'tạo nội dung',
            'soạn thư', 'soạn email', 'draft email', 'compose letter',
            
            // Analysis & comparison
            'phân tích thời tiết', 'phân tích khí hậu', 'phân tích dịch vụ',
            'so sánh loại phòng', 'so sánh dịch vụ', 'so sánh địa điểm',
            'so sánh phương tiện', 'so sánh nhà hàng', 'so sánh hotel',
            'đánh giá chất lượng', 'đánh giá dịch vụ', 'đánh giá địa điểm',
            'tóm tắt thông tin', 'tóm tắt dịch vụ', 'summarize',
            
            // Local guidance & planning - ✅ KEY FIX HERE
            'hướng dẫn đi', 'hướng dẫn tham quan', 'hướng dẫn di chuyển',
            'hướng dẫn sử dụng', 'hướng dẫn chuẩn bị', 'hướng dẫn', 'guide to', 'how to get to',
            'lập kế hoạch du lịch', 'lập kế hoạch tham quan', 'plan trip',
            'thiết kế tour', 'thiết kế lịch trình', 'design itinerary',
            'sắp xếp lịch trình', 'organize schedule', 'arrange trip',
            
            // Weather & seasonal advice - ✅ KEY FIX HERE  
            'dự báo thời tiết', 'weather forecast', 'thời tiết hôm nay',
            'khí hậu theo mùa', 'seasonal climate', 'mùa nào đẹp nhất',
            'best time to visit', 'thời điểm lý tưởng', 'ideal season',
            'chuẩn bị đồ dùng', 'chuẩn bị', 'prepare clothes', 'what to bring',
            'đồ dùng theo thời tiết', 'weather preparation', 'seasonal clothing',
            'mặc gì', 'what to wear', 'trang phục', 'outfit',
            
            // ✅ THÊM CÁC DẠNG CÂU HỎI THỜI TIẾT THÔNG THƯỜNG
            'thời tiết', 'weather', 'nóng không', 'lạnh không', 'mưa không',
            'có nắng', 'có mưa', 'nhiệt độ', 'temperature', 'khí hậu', 'climate',
            
            // Local recommendations
            'giới thiệu địa điểm', 'recommend places', 'suggest attractions',
            'địa điểm nên thăm', 'places to visit', 'tourist spots',
            'nhà hàng ngon', 'good restaurants', 'local food',
            'món ăn đặc sản', 'local specialties', 'traditional food',
            'quán cà phê', 'coffee shops', 'địa điểm vui chơi',
            
            // Transportation guidance
            'cách di chuyển', 'how to travel', 'transportation options',
            'từ sân bay đến', 'from airport to', 'airport transfer',
            'thuê xe', 'rent vehicle', 'public transport', 'xe công cộng',
            'taxi grab', 'ride sharing', 'bus route', 'tuyến xe buýt',
            
            // Cultural & event information
            'lễ hội gì', 'what festivals', 'sự kiện văn hóa', 'cultural events',
            'truyền thống việt nam', 'vietnamese traditions', 'customs',
            'lịch sử địa phương', 'local history', 'historical sites',
            'ý nghĩa lễ hội', 'festival meaning', 'cultural significance',
            
            // General prompt indicators with context
            'viết cho', 'tạo cho', 'giải thích', 'phân tích', 'tóm tắt',
            'so sánh', 'liệt kê', 'mô tả', 'đánh giá', 'lập kế hoạch',
            'thiết kế', 'sáng tác', 'tutorial', 'explain',
            'describe', 'analyze', 'compare', 'list', 'create', 'write'
        ];

        // ✅ CHECK FOR PROMPT INDICATORS
        const hasPromptIndicators = expandedPromptIndicators.some(indicator => 
            lowerMessage.includes(indicator)
        );

        // ✅ HOẶC LÀ CÂU HỎI TRỰC TIẾP VỀ THỜI TIẾT/ĐỊA ĐIỂM
        const isDirectQuestion = 
            lowerMessage.includes('thời tiết') ||
            lowerMessage.includes('weather') ||
            lowerMessage.includes('khí hậu') ||
            lowerMessage.includes('nhiệt độ') ||
            lowerMessage.includes('mưa') ||
            lowerMessage.includes('nắng') ||
            lowerMessage.includes('lạnh') ||
            lowerMessage.includes('nóng') ||
            lowerMessage.includes('hôm nay') ||
            lowerMessage.includes('ngày mai') ||
            lowerMessage.includes('chuẩn bị') ||
            lowerMessage.includes('mặc gì') ||
            lowerMessage.includes('dự báo');

        const finalResult = hasPromptIndicators || isDirectQuestion;

        console.log('🔍 Prompt Detection Debug:', {
            message: lowerMessage.substring(0, 50) + '...',
            hasRelevantKeywords: hasRelevantKeywords,
            hasPromptIndicators: hasPromptIndicators,
            isDirectQuestion: isDirectQuestion,
            finalResult: finalResult
        });

        return finalResult;
    }

    // ✅ ENHANCED GENERATE RESPONSE VỚI PROMPT DETECTION
    async generateResponse(message, conversationHistory = []) {
        try {
            // Detect if this is a direct prompt request
            const isDirectPrompt = this.detectDirectPrompt(message);
            
            if (isDirectPrompt) {
                console.log('🎯 Detected direct prompt request');
                return await this.handleDirectPrompt(message, conversationHistory);
            }

            // ✅ BUILD CONTEXT VỚI DỮ LIỆU DATABASE (ORIGINAL FLOW)
            const staticContext = this.hotelContext;
            const dynamicContext = await this.buildDynamicContext();
            
            // Build enhanced context
            let fullContext = staticContext + dynamicContext + "\n\n📚 LỊCH SỬ HỘI THOẠI:\n";
            
            const recentHistory = conversationHistory.slice(-8);
            recentHistory.forEach((msg) => {
                const role = msg.role === 'user' ? '👤 Khách hàng' : '🤖 Trợ lý';
                fullContext += `${role}: ${msg.content}\n`;
            });
            
            fullContext += `\n🎯 YÊU CẦU MỚI:\n👤 Khách hàng: "${message}"\n\n🤖 Trợ lý Hotel HUB:`;

            console.log('🔄 Sending request to Gemini with database data...');
            
            const result = await this.model.generateContent(fullContext);
            const response = await result.response;
            const text = response.text();

            console.log('✅ Received response from Gemini');

            // Clean response
            const cleanedText = text
                .replace(/^🤖\s*(Trợ lý|Assistant)?:?\s*/i, '')
                .replace(/^\s*-\s*/, '')
                .trim();

            return {
                success: true,
                response: cleanedText,
                timestamp: new Date().toISOString(),
                model: 'gemini-1.5-flash',
                dataSource: 'database',
                promptType: 'hotel'
            };
        } catch (error) {
            console.error('❌ ChatBot Error:', error);
            
            let errorMessage = "Xin lỗi, tôi đang gặp sự cố kỹ thuật.";
            
            if (error.message?.includes('API_KEY_INVALID')) {
                errorMessage = "Lỗi xác thực API. Hệ thống đang được cập nhật.";
            } else if (error.message?.includes('QUOTA_EXCEEDED')) {
                errorMessage = "Hệ thống đang quá tải. Vui lòng thử lại sau vài phút.";
            } else if (error.message?.includes('SAFETY')) {
                errorMessage = "Tin nhắn không phù hợp. Vui lòng diễn đạt lại câu hỏi.";
            }
            
            return {
                success: false,
                response: `${errorMessage} Trong lúc chờ đợi, bạn có thể liên hệ hotline 0865.124.996 để được hỗ trợ trực tiếp.`,
                error: error.message,
                timestamp: new Date().toISOString(),
                model: 'fallback'
            };
        }
    }

    // ✅ THÊM PHƯƠNG THỨC DETECT DIRECT PROMPT
    detectDirectPrompt(message) {
        const lowerMessage = message.toLowerCase();
        
        // ✅ KIỂM TRA HOTEL KEYWORDS TRƯỚC
        const hotelKeywords = [
            'đặt phòng', 'booking', 'phòng', 'room', 'hotel', 'khách sạn',
            'giá', 'price', 'dịch vụ', 'service', 'amenity', 'tiện nghi',
            'promotion', 'khuyến mãi', 'check in', 'check out', 'reservation',
            'resort', 'villa', 'suite', 'deluxe', 'standard', 'penthouse',
            'spa', 'massage', 'gym', 'pool', 'restaurant', 'buffet',
            'concierge', 'receptionist', 'housekeeping', 'room service',
            'travel', 'du lịch', 'nghỉ dưỡng', 'vacation', 'holiday',
            'business trip', 'công tác', 'conference', 'hội nghị',
            'wedding', 'cưới', 'event', 'sự kiện', 'party', 'tiệc'
        ];

        const hasHotelKeywords = hotelKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // ✅ CHỈ CHO PHÉP PROMPT NÀO CÓ LIÊN QUAN ĐẾN KHÁCH SẠN
        if (!hasHotelKeywords) {
            return false; // Không phải hotel-related prompt
        }

        // ✅ DETECT HOTEL-RELATED PROMPT INDICATORS
        const hotelPromptIndicators = [
            // Viết nội dung khách sạn
            'viết email đặt phòng',
            'viết thư cảm ơn khách hàng',
            'viết mô tả phòng',
            'viết review khách sạn',
            'viết quảng cáo khách sạn',
            'viết chính sách khách sạn',
            'viết quy định khách sạn',
            'tạo slogan khách sạn',
            'tạo menu nhà hàng',
            'tạo bảng giá dịch vụ',
            
            // Phân tích khách sạn
            'phân tích dịch vụ khách sạn',
            'so sánh loại phòng',
            'đánh giá chất lượng phòng',
            'tóm tắt dịch vụ',
            'liệt kê tiện nghi',
            'mô tả không gian khách sạn',
            'giải thích quy trình check-in',
            'hướng dẫn sử dụng dịch vụ',
            
            // Kế hoạch khách sạn
            'lập kế hoạch du lịch',
            'thiết kế tour',
            'sắp xếp lịch trình nghỉ dưỡng',
            'kế hoạch tổ chức sự kiện',
            'kế hoạch đám cưới',
            'thiết kế menu buffet',
            
            // Từ khóa chung nhưng với context hotel
            'viết cho', 'tạo cho', 'giải thích', 'phân tích', 'tóm tắt',
            'so sánh', 'liệt kê', 'mô tả', 'đánh giá', 'lập kế hoạch',
            'thiết kế', 'sáng tác', 'hướng dẫn', 'tutorial'
        ];

        const hasHotelPromptIndicators = hotelPromptIndicators.some(indicator => 
            lowerMessage.includes(indicator)
        );

        return hasHotelPromptIndicators;
    }

    // ✅ ENHANCED ANALYZE INTENT VỚI HOTEL PROMPT DETECTION
    analyzeIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check if it's a hotel-related prompt first
        if (this.detectDirectPrompt(message)) {
            return 'hotel_prompt';
        }

        // ✅ HOTEL INTENTS CHÍNH
        const intents = {
            booking: ['đặt phòng', 'booking', 'reserve', 'đặt', 'book', 'có phòng'],
            pricing: ['giá', 'price', 'cost', 'chi phí', 'tiền', 'bao nhiêu', 'phí'],
            location: ['địa chỉ', 'location', 'ở đâu', 'chỗ nào', 'vị trí', 'đường'],
            services: ['dịch vụ', 'service', 'tiện nghi', 'amenity', 'facilities'],
            contact: ['liên hệ', 'contact', 'gọi', 'call', 'hotline', 'phone'],
            checkin: ['check in', 'checkin', 'nhận phòng', 'check-in'],
            checkout: ['check out', 'checkout', 'trả phòng', 'check-out'],
            promotion: ['khuyến mãi', 'discount', 'giảm giá', 'promotion', 'offer'],
            room_types: ['loại phòng', 'room type', 'suite', 'deluxe', 'standard'],
            payment: ['thanh toán', 'payment', 'pay', 'vnpay', 'banking', 'thẻ'],
            restaurant: ['nhà hàng', 'restaurant', 'buffet', 'menu', 'ăn uống'],
            spa: ['spa', 'massage', 'wellness', 'thư giãn', 'chăm sóc'],
            events: ['sự kiện', 'event', 'hội nghị', 'conference', 'tiệc', 'party']
        };

        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                return intent;
            }
        }
        
        return 'general';
    }

    // ✅ CẬP NHẬT QUICK REPLIES VỚI HOTEL PROMPT OPTIONS
    getQuickReplies(intent) {
        const quickReplies = {
            hotel_prompt: [
                "📝 Viết email đặt phòng", 
                "🏨 Mô tả dịch vụ khách sạn", 
                "📊 So sánh loại phòng", 
                "🎯 Lập kế hoạch nghỉ dưỡng"
            ],
            booking: ["🛏️ Xem phòng trống", "💰 Báo giá hôm nay", "📱 Đặt online", "🎁 Ưu đãi hiện tại"],
            pricing: ["📋 Bảng giá chi tiết", "🏷️ Khuyến mãi đặc biệt", "🔄 So sánh phòng", "💳 Thanh toán"],
            location: ["🗺️ Hướng dẫn đường", "🚗 Đưa đón sân bay", "🎯 Địa điểm gần", "🚌 Xe công cộng"],
            services: ["🍽️ Nhà hàng & Bar", "🏊 Hồ bơi & Gym", "💆 Spa & Wellness", "🏢 Hội nghị"],
            contact: ["📞 Hotline 24/7", "📧 Email hỗ trợ", "💬 Live chat", "📱 App Hotel HUB"],
            checkin: ["⏰ Giờ nhận phòng", "📱 Check-in online", "🎫 Giấy tờ cần thiết", "🚗 Dịch vụ đón"],
            checkout: ["⏰ Giờ trả phòng", "💳 Thanh toán bill", "🎒 Gửi hành lý", "🚖 Đặt xe về"],
            promotion: ["🎉 Ưu đãi tháng này", "🎂 Giảm giá sinh nhật", "📚 Discount sinh viên", "💑 Package couple"],
            room_types: ["🏠 Phòng Standard", "👨‍👩‍👧‍👦 Suite gia đình", "💎 Phòng VIP", "🏙️ Penthouse view"],
            payment: ["💳 Thẻ tín dụng", "📱 VNPay/MoMo", "🏦 QR Banking", "💰 Tiền mặt"],
            restaurant: ["🍽️ Menu buffet", "🍷 Wine & Dine", "🎂 Tiệc sinh nhật", "👨‍👩‍👧‍👦 Ăn gia đình"],
            spa: ["💆‍♀️ Massage thư giãn", "🧖‍♀️ Chăm sóc da", "🏃‍♂️ Fitness & Yoga", "💑 Spa couple"],
            events: ["💒 Tổ chức đám cưới", "🏢 Hội nghị doanh nghiệp", "🎉 Tiệc sinh nhật", "📚 Sự kiện công ty"],
            general: ["🛏️ Đặt phòng ngay", "💰 Xem bảng giá", "📞 Liên hệ hỗ trợ", "🎁 Khuyến mãi hot"]
        };
        
        return quickReplies[intent] || quickReplies.general;
    }

    getModelInfo() {
        return {
            name: 'Gemini 1.5 Flash',
            version: '1.5',
            provider: 'Google AI',
            maxTokens: 2048,
            temperature: 0.7,
            hasValidApiKey: !!process.env.GOOGLE_AI_API_KEY,
            capabilities: [
                'Vietnamese language support',
                'Hotel domain knowledge', 
                'Multi-turn conversation',
                'Intent recognition',
                'Quick replies generation'
            ]
        };
    }

    // ✅ PHƯƠNG THỨC TÌM PHÒNG THEO YÊU CẦU
    async findRoomsByRequirement(message) {
        try {
            const data = await this.loadDatabaseData();
            const lowerMessage = message.toLowerCase();
            
            let filteredRooms = data.availableRooms || [];

            // Filter theo loại phòng
            if (lowerMessage.includes('standard') || lowerMessage.includes('thường')) {
                filteredRooms = filteredRooms.filter(r => r.TypeName.toLowerCase().includes('standard') || r.TypeName.toLowerCase().includes('thường'));
            }
            if (lowerMessage.includes('deluxe') || lowerMessage.includes('cao cấp')) {
                filteredRooms = filteredRooms.filter(r => r.TypeName.toLowerCase().includes('deluxe') || r.TypeName.toLowerCase().includes('cao cấp'));
            }
            if (lowerMessage.includes('family') || lowerMessage.includes('gia đình')) {
                // ✅ SỬA LỖI: Thêm dấu chấm (.) trước TypeName
                filteredRooms = filteredRooms.filter(r => r.TypeName.toLowerCase().includes('family') || r.TypeName.toLowerCase().includes('gia đình'));
            }

            // Filter theo giá
            if (lowerMessage.includes('rẻ') || lowerMessage.includes('tiết kiệm')) {
                filteredRooms = filteredRooms.filter(r => r.BasePrice <= 300000);
            }
            if (lowerMessage.includes('đắt') || lowerMessage.includes('cao cấp')) {
                filteredRooms = filteredRooms.filter(r => r.BasePrice >= 500000);
            }

            return filteredRooms;
        } catch (error) {
            console.error('Error finding rooms:', error);
            return [];
        }
    }

    // ✅ REFRESH CACHE THỦ CÔNG
    async refreshCache() {
        this.dataCache.lastUpdate = null;
        return await this.loadDatabaseData();
    }

    // ✅ GET CACHE STATUS
    getCacheStatus() {
        return {
            hasCache: !!this.dataCache.lastUpdate,
            lastUpdate: this.dataCache.lastUpdate,
            dataCount: {
                roomTypes: this.dataCache.roomTypes?.length || 0,
                availableRooms: this.dataCache.availableRooms?.length || 0,
                promotions: this.dataCache.promotions?.length || 0,
                services: this.dataCache.services?.length || 0
            }
        };
    }
}

export default ChatBotService;// ✅ THÊM ENDPOINT REFRESH DATABASE CACHErouter.post('/refresh-cache', async (req, res) => {    try {        const refreshedData = await chatBotService.refreshCache();        const cacheStatus = chatBotService.getCacheStatus();                res.json({            success: true,            message: 'Database cache refreshed successfully',            cacheStatus: cacheStatus,            timestamp: new Date().toISOString()        });    } catch (error) {        console.error('Refresh cache error:', error);        res.status(500).json({            success: false,            error: 'Failed to refresh cache',            message: error.message        });    }});// ✅ ENDPOINT KIỂM TRA CACHE STATUSrouter.get('/cache-status', (req, res) => {    try {        const cacheStatus = chatBotService.getCacheStatus();                res.json({            success: true,            cacheStatus: cacheStatus,            timestamp: new Date().toISOString()        });    } catch (error) {        console.error('Get cache status error:', error);        res.status(500).json({            success: false,            error: 'Failed to get cache status'        });    }});